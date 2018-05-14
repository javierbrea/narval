'use strict'

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
    logger.stopDockerService({
      service: dockerService.service
    })
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
    logger.startDockerService({
      service: serviceName
    })
    return runComposeSync(`start ${container}`)
      .then(() => {
        return processes.spawn('docker-compose', {
          args: [
            '-f',
            'docker-compose.json',
            'logs',
            '-f',
            container
          ],
          options: {
            cwd: paths.docker(),
            env: envVars
          }
        }).then(proc => {
          const logs = new processes.Handler(proc, {
            type: type,
            suite: name,
            service: serviceName
          })

          return Promise.resolve({
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
    const serviceName = service.name()
    if (!container) {
      logger.noDockerServiceConfig({
        service: serviceName
      })
      return Promise.resolve()
    }
    return runContainer(serviceName, container, service.abortOnError(), service.isCoveraged())
  }

  const runTest = function () {
    const container = config.testDockerContainer()
    if (!container) {
      return Promise.reject(Boom.badImplementation(logger.noDockerTestConfig(false)))
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
                    logger.dockerServicesStillRunning({
                      services: notStopped.join(', ') // TODO, pass only services, use Handlebars helpers to join them
                    })
                  } else {
                    logger.dockerServiceStillRunning({
                      service: notStopped[0] // TODO, pass only services, use Handlebars helpers to join them
                    })
                  }
                }

                const stopAll = function (error) {
                  stopAllExecuted = true
                  suiteError = error
                  logger.stopAllDockerServices()
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
                    let logMethod = 'debug'

                    serviceData.closed = true
                    writeCloseLog(serviceData.service, exitCode)
                    if (exitCode !== '0') {
                      logMethod = 'warn'
                      if (serviceData.abortOnError && !stopAllExecuted) {
                        error = Boom.badImplementation(logger.dockerExitCodeError({
                          exitCode: exitCode
                        }, false))
                        logMethod = 'error'
                      }
                    }

                    logger.dockerExitCode({
                      container: serviceData.container,
                      service: serviceData.service,
                      exitCode: exitCode
                    }, logMethod)

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
