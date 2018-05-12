'use strict'

const childProcess = require('child_process')
const path = require('path')

const Boom = require('boom')
const _ = require('lodash')
const Promise = require('bluebird')
const fsExtra = require('fs-extra')
const fs = require('fs')

const docker = require('./docker')
const paths = require('./paths')
const config = require('./config')
const options = require('./options')
const istanbulMocha = require('./istanbul-mocha')
const states = require('./states')
const commands = require('./commands')
const tracer = require('./tracer')
const processes = require('./processes')
const utils = require('./utils')

const waitOnConfigToCommandLine = function (waitOnConfig) {
  let options = []

  options.push(waitOnConfig.timeout ? `--timeout=${waitOnConfig.timeout}` : null)
  options.push(waitOnConfig.delay ? `--delay=${waitOnConfig.delay}` : null)
  options.push(waitOnConfig.interval ? `--interval=${waitOnConfig.interval}` : null)
  options.push(waitOnConfig.reverse ? '--reverse' : null)
  options = options.concat(waitOnConfig.resources)

  return _.compact(options).join(' ')
}

const getWaitOn = function (test) {
  const waitOnConfig = test.docker['wait-on'] || ''
  if (_.isString(waitOnConfig)) {
    return waitOnConfig
  }
  return waitOnConfigToCommandLine(waitOnConfig)
}

const getExitAfter = function (test) {
  return test.docker.exit_after || ''
}

const coverageIsEnabled = function (suite, serviceName, def) {
  if (!suite.coverage) {
    return def || false
  }
  if (suite.coverage.enabled === false) {
    return false
  }
  if (suite.coverage.from) {
    return suite.coverage.from === serviceName
  }
  return def || false
}

const extendProcessEnvVars = function (vars) {
  return _.extend({}, process.env, vars)
}

const addEnvironmentContainerVars = function (object, containerVarName, values) {
  _.each(values, (value, key) => {
    object[`${containerVarName}_${key}`] = value
  })
}

const composeEnvVars = function (suite, suiteTypeName) {
  return config.get()
    .then((configuration) => {
      let vars = {
        coverage_options: istanbulMocha.istanbul.params(suite, suiteTypeName)
      }
      const testDockerContainer = suite.test.docker && suite.test.docker.container
      const testCoverageIsEnabled = coverageIsEnabled(suite, 'test', true)
      const testCommand = 'narval-default-test-command'
      let testCommandParams = istanbulMocha.mocha.params(suite)

      if (!testDockerContainer) {
        return Promise.reject(Boom.notFound('No docker configuration found for test'))
      }

      let testVarName = utils.serviceNameToVarName(testDockerContainer)

      if (testCoverageIsEnabled) {
        testCommandParams = '-- ' + testCommandParams
      }

      addEnvironmentContainerVars(vars, testVarName, _.extend({
        command: testCommand,
        command_params: testCommandParams,
        coverage_enabled: testCoverageIsEnabled,
        wait_on: getWaitOn(suite.test),
        exit_after: getExitAfter(suite.test)
      }, suite.test.docker.env || {}, {
        narval_suite_type: suiteTypeName,
        narval_suite: suite.name,
        narval_service: 'test',
        narval_is_docker: true
      }))

      _.each(suite.services, (service) => {
        const commandAndParams = utils.commandArguments(service.docker.command)
        const varName = utils.serviceNameToVarName(service.docker.container)
        const serviceCoverageIsEnabled = coverageIsEnabled(suite, service.name)
        let exitAfter = getExitAfter(service)

        if (serviceCoverageIsEnabled && commandAndParams.joinedArguments.length) {
          commandAndParams.joinedArguments = '-- ' + commandAndParams.joinedArguments
        }
        addEnvironmentContainerVars(vars, varName, _.extend({
          command: commandAndParams.command,
          command_params: commandAndParams.joinedArguments,
          coverage_enabled: coverageIsEnabled(suite, service.name),
          wait_on: getWaitOn(service),
          exit_after: exitAfter
        }, service.docker.env || {}, {
          narval_suite_type: suiteTypeName,
          narval_suite: suite.name,
          narval_service: service.name,
          narval_is_docker: true
        }))
      })

      return Promise.resolve(extendProcessEnvVars(vars))
    })
}

const runServiceContainer = function (serviceDockerConfig, suiteData, envVars) {
  tracer.debug(`Starting docker service "${suiteData.service}" of suite "${suiteData.suite}"`)
  return docker.runComposeSync(`start ${serviceDockerConfig.container}`, {
    env: envVars
  })
    .then(() => {
      return new Promise((resolve, reject) => {
        let logs
        const proc = childProcess.spawn('docker-compose', [
          '-f',
          'docker-compose.json',
          'logs',
          '-f',
          serviceDockerConfig.container
        ], {
          cwd: paths.cwd.resolve(paths.docker()),
          env: envVars
        })

        logs = new processes.Handler(proc, {
          type: suiteData.type,
          suite: suiteData.suite,
          service: suiteData.service
        })

        resolve({
          service: suiteData.service,
          container: serviceDockerConfig.container,
          process: proc,
          logs: logs,
          abortOnError: serviceDockerConfig.abortOnError,
          abortOnExit: serviceDockerConfig.abortOnExit
        })
      })
    })
}

const getContainerAndRun = function (suite, suiteTypeName, serviceName, envVars) {
  let serviceConfig
  let coverageFromService = suite.coverage && suite.coverage.from && suite.coverage.from !== 'test'

  if (serviceName === 'test' && suite.test && suite.test.docker && suite.test.docker.container) {
    serviceConfig = _.extend({}, suite.test.docker, {
      abortOnError: true,
      abortOnExit: !coverageFromService
    })
  } else {
    _.each(suite.services, (service) => {
      let isCoveraged = coverageIsEnabled(suite, service.name)
      if (service.name === serviceName && service.docker && service.docker.container) {
        serviceConfig = _.extend({}, service.docker, {
          abortOnError: isCoveraged ? true : service['abort-on-error'],
          abortOnExit: isCoveraged
        })
      }
    })
  }

  if (serviceConfig) {
    return runServiceContainer(serviceConfig, {
      type: suiteTypeName,
      service: serviceName,
      suite: suite.name
    }, envVars)
  }
  if (serviceName === 'test') {
    return Promise.reject(Boom.badImplementation(`There is no Docker configuration for test in suite "${suite.name}" of type "${suiteTypeName}"`))
  }
  tracer.warn(`There is no Docker configuration for service "${serviceName}" in suite "${suite.name}" of type "${suiteTypeName}"`)
  return Promise.resolve()
}

const stopServiceContainer = function (dockerService, envVars) {
  tracer.debug(`Stopping Docker service "${dockerService.service}"`)
  return docker.runComposeSync(`stop ${dockerService.container}`, {
    env: envVars
  })
}

const getExitCode = function (log) {
  let result = /code\s*(\d*)/g.exec(log)
  return (result && result[1]) || '1'
}

const writeCloseLog = function (service, suite, type, code) {
  const filePath = paths.cwd.resolve('.narval', 'logs', type, suite, service)
  const fileFolder = path.join(filePath, 'exit-code.log')
  fsExtra.ensureDirSync(filePath)
  fs.writeFileSync(fileFolder, code)
}

const runServicesAndTest = function (suite, suiteTypeName, envVars) {
  return options.get()
    .then(opts => {
      return docker.runComposeSync('down', {
        env: envVars
      }).then(() => {
        let build = ''
        if (opts.build && !states.get('docker-built')) {
          states.set('docker-built', true)
          build = ' --build'
        }
        return docker.runComposeSync(`up --no-start${build}`, {
          env: envVars
        }).then(() => {
          return Promise.map(suite.services || [], (service) => {
            return getContainerAndRun(suite, suiteTypeName, service.name, envVars)
          }).then(startedServices => {
            startedServices = _.compact(startedServices)
            return getContainerAndRun(suite, suiteTypeName, 'test', envVars)
              .then((startedTest) => {
                return new Promise((resolve, reject) => {
                  let stopAllExecuted = false
                  let suiteError

                  startedServices.push(startedTest)

                  const checkStopped = function () {
                    let notStopped = []
                    _.each(startedServices, (serviceData) => {
                      if (!serviceData.closed) {
                        notStopped.push(serviceData.service)
                      }
                    })
                    if (notStopped.length < 1) {
                      if (suiteError) {
                        reject(suiteError)
                      } else {
                        resolve()
                      }
                    } else if (notStopped.length > 1) {
                      tracer.debug(`Services "${notStopped.join(', ')}" are still running. Waiting...`)
                    } else {
                      tracer.debug(`Service "${notStopped[0]}" is still running. Waiting...`)
                    }
                  }

                  const stopAll = function (error) {
                    stopAllExecuted = true
                    suiteError = error
                    tracer.debug('Stopping all docker services')
                    Promise.map(startedServices, (service) => {
                      return stopServiceContainer(service, envVars)
                    })
                      .then(() => {
                        return docker.runComposeSync('down', {
                          env: envVars
                        })
                      })
                      .then(() => {
                        checkStopped()
                      })
                  }

                  _.each(startedServices, (serviceData) => {
                    serviceData.logs.on('close', (logData) => {
                      let exitCode = getExitCode(logData.lastLog)
                      let error
                      let traceMethod = 'debug'

                      serviceData.closed = true
                      writeCloseLog(serviceData.service, suite.name, suiteTypeName, exitCode)
                      if (exitCode !== '0') {
                        traceMethod = 'warn'
                        if (serviceData.abortOnError && !stopAllExecuted) {
                          error = Boom.badImplementation(`Docker service exited with code ${exitCode}`)
                          traceMethod = 'error'
                        }
                      }

                      tracer[traceMethod](`Docker container "${serviceData.container}" of service "${serviceData.service}" exited with code "${exitCode}"`)
                      if ((error || serviceData.abortOnExit) && !stopAllExecuted) {
                        stopAll(error)
                      } else {
                        checkStopped()
                      }
                    })
                  })
                })
              })
          })
        })
      })
    })
}

const runDownVolumes = function (suite) {
  return suite.before && suite.before.docker && suite.before.docker['down-volumes'] ? docker.downVolumes() : Promise.resolve()
}

const runBefore = function (suite, suiteTypeName) {
  if (suite.before && suite.before.docker && suite.before.docker.command) {
    tracer.debug(`Executing before command "${suite.before.docker.command}"`)
    return commands.run(suite.before.docker.command, {
      suiteType: suiteTypeName,
      suite: suite.name,
      service: 'before',
      sync: true,
      env: _.extend({
        narval_suite_type: suiteTypeName,
        narval_suite: suite.name,
        narval_service: 'before',
        narval_is_docker: true
      },
      (suite.before && suite.before.docker && suite.before.docker.env) || {}
      )
    })
  }
  return Promise.resolve()
}

const before = function (suite, suiteTypeName) {
  return runBefore(suite, suiteTypeName)
    .then(() => {
      return runDownVolumes(suite)
    })
}

const run = function (suite, suiteTypeName) {
  states.set('docker-executed', true)
  return composeEnvVars(suite, suiteTypeName)
    .then((envVars) => {
      return before(suite, suiteTypeName)
        .then(() => {
          return runServicesAndTest(suite, suiteTypeName, envVars)
        })
    })
}

const Runner = function (config, logger) {
  const _run = function () {
    return run(config.suite(), config.suiteTypeName())
  }

  return {
    run: _run
  }
}

module.exports = {
  Runner: Runner
}
