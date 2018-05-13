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
const states = require('./states')
const commands = require('./commands')
const tracer = require('./tracer')
const processes = require('./processes')

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

const Runner = function (config, logger) {
  const name = config.name()
  const type = config.typeName()
  const envVars = config.dockerEnvVars() // TODO, implement in config

  const writeCloseLog = function (service, code) {
    const filePath = path.resolve(paths.logs(), type, name, service)
    const fileFolder = path.join(filePath, 'exit-code.log')
    fsExtra.ensureDirSync(filePath)
    fs.writeFileSync(fileFolder, code)
  }

  const getExitCode = function (log) {
    let result = /code\s*(\d*)/g.exec(log)
    return (result && result[1]) || '1'
  }

  const runComposeSync = function (command) {
    return docker.runComposeSync(command, {
      env: envVars
    })
  }

  const stopServiceContainer = function (dockerService) {
    tracer.debug(`Stopping Docker service "${dockerService.service}"`) // TODO, logger
    return runComposeSync(`stop ${dockerService.container}`)
  }

  const runBefore = function () {
    return commands.runBefore(config, logger)
      .then(() => {
        if (config.runDownVolumes()) {
          return docker.downVolumes()
        }
        return Promise.resolve()
      })
  }

  const runDockerUp = function () {
    let build = ''
    if (config.buildDocker() && !states.get('docker-built')) { // TODO, implement in config
      states.set('docker-built', true)
      build = ' --build'
    }
    return runComposeSync(`up --no-start${build}`)
  }

  const runService = function (service) {
    // TODO, refactor
    return getContainerAndRun(config.suite(), type, service.name(), envVars)
  }

  const runTest = function () {
    // TODO, refactor
    return getContainerAndRun(config.suite(), type, 'test', envVars)
  }

  const runServicesAndTest = function () {
    return runComposeSync('down').then(() => {
      return runDockerUp().then(() => {
        return Promise.map(config.services(), runService).then(startedServices => {
          startedServices = _.compact(startedServices)
          return runTest()
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
                    tracer.debug(`Services "${notStopped.join(', ')}" are still running. Waiting...`) // TODO, logger
                  } else {
                    tracer.debug(`Service "${notStopped[0]}" is still running. Waiting...`) // TODO, logger
                  }
                }

                const stopAll = function (error) {
                  stopAllExecuted = true
                  suiteError = error
                  tracer.debug('Stopping all docker services') // TODO, logger
                  Promise.map(startedServices, stopServiceContainer)
                    .then(() => {
                      return runComposeSync('down')
                    })
                    .then(checkStopped)
                }

                _.each(startedServices, (serviceData) => {
                  serviceData.logs.on('close', (logData) => {
                    let exitCode = getExitCode(logData.lastLog)
                    let error
                    let traceMethod = 'debug'

                    serviceData.closed = true
                    writeCloseLog(serviceData.service, exitCode)
                    if (exitCode !== '0') {
                      traceMethod = 'warn'
                      if (serviceData.abortOnError && !stopAllExecuted) {
                        error = Boom.badImplementation(`Docker service exited with code ${exitCode}`) // TODO, logger
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
  }

  const run = function () {
    states.set('docker-executed', true)
    return runBefore()
      .then(runServicesAndTest)
  }

  return {
    run: run
  }
}

module.exports = {
  Runner: Runner
}
