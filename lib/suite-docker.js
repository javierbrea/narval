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

const Runner = function (config, logger) {
  const name = config.name()
  const type = config.typeName()
  const envVars = config.dockerEnvVars()

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
    if (config.buildDocker() && !states.get('docker-built')) {
      states.set('docker-built', true)
      build = ' --build'
    }
    return runComposeSync(`up --no-start${build}`)
  }

  const runContainer = function (serviceName, container, abortOnError, abortOnExit) {
    tracer.debug(`Starting docker service "${serviceName}" of suite "${name}"`)
    return runComposeSync(`start ${container}`)
      .then(() => {
        // TODO, move to processes
        return new Promise((resolve, reject) => {
          let logs
          const proc = childProcess.spawn('docker-compose', [
            '-f',
            'docker-compose.json',
            'logs',
            '-f',
            container
          ], {
            cwd: paths.cwd.resolve(paths.docker()),
            env: envVars
          })

          logs = new processes.Handler(proc, {
            type: type,
            suite: name,
            service: serviceName
          })

          resolve({
            service: serviceName,
            container: container,
            process: proc,
            logs: logs,
            abortOnError: abortOnError,
            abortOnExit: abortOnExit
          })
        })
      })
  }

  const runService = function (service) {
    const container = service.dockerContainer()
    if (!container) {
      tracer.warn(`There is no Docker configuration for service "${service.name()}" in suite "${name}" of type "${type}"`) // TODO, logger
      return Promise.resolve()
    }
    return runContainer(service.name(), container, service.abortOnError(), service.isCoveraged())
  }

  const runTest = function () {
    const container = config.testDockerContainer()
    if (!container) {
      return Promise.reject(Boom.badImplementation(`There is no Docker configuration for test in suite "${name}" of type "${type}"`)) // TODO, logger
    }
    return runContainer('test', container, true, !config.coverageFromService())
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
