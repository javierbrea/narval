'use strict'

const path = require('path')
const Promise = require('bluebird')
const mochaSinonChaiRunner = require('mocha-sinon-chai/runner')

const _ = require('lodash')
const Boom = require('boom')

const commands = require('./commands')
const waitOn = require('./wait-on')
const libs = require('./libs')
const utils = require('./utils')
const states = require('./states')
const paths = require('./paths')
const processes = require('./processes')

const Runner = function (config, logger) {
  const name = config.name()
  const type = config.typeName()

  const resolveOnClose = function (localService, options = {}) {
    if (!localService) {
      return Promise.resolve()
    }
    return new Promise((resolve, reject) => {
      const closeListener = localService.logs ? localService.logs : localService.process
      closeListener.on('close', (code) => {
        if (_.isObject(code)) {
          code = code.processCode
        }
        let logMethod = 'debug'
        localService.closed = true

        if (code !== null && code !== 0) {
          logMethod = 'warn'
          if (localService.abortOnError) {
            localService.error = Boom.badImplementation(logger.localServiceError(false))
            logMethod = 'error'
          }
        }

        logger.serviceClose({
          code: code === null ? 'null' : code, // TODO, print another log when null (maybe integration tests refactor is needed)
          name: localService.name
        }, logMethod)

        if (localService.error && !options.forceResolve) {
          reject(localService.error)
        } else {
          resolve()
        }
      })
    })
  }

  const runCoveragedServiceCommand = function (service, alone) {
    const serviceName = service.name()
    const stdin = process.stdin
    const coverageOptions = config.istanbulArguments().split(' ')
    const commandAndArguments = utils.commandArguments(service.command())
    const runCommandArguments = coverageOptions.concat(['cover'])
      .concat([path.resolve(__dirname, 'service-coverage-runner.js')])
      .concat(['--'])
      .concat(commandAndArguments.arguments)

    logger.startCoveragedService({
      service: serviceName
    })

    return processes.fork(path.resolve(__dirname, 'bin', 'msc-istanbul.js'), {
      args: runCommandArguments,
      options: {
        env: Object.assign({}, process.env, service.envVars(), {
          servicePath: path.resolve(process.cwd(), commandAndArguments.command)
        })
      }
    }).then(proc => {
      if (alone && stdin.setRawMode) {
        stdin.setRawMode(true)
        stdin.resume()
        stdin.setEncoding('utf8')

        stdin.on('data', key => {
          if (key === '\u0003') {
            logger.forceServiceExit({
              service: serviceName
            })
            proc.send({ exit: true })
          }
        })

        proc.on('close', () => {
          stdin.setRawMode(false)
          stdin.pause()
        })
      }

      return Promise.resolve({
        abortOnError: service.abortOnError(),
        process: proc,
        name: serviceName,
        isCoveraged: true
      })
    })
  }

  const runServiceCommand = function (service) {
    const serviceName = service.name()
    logger.startService({
      service: serviceName
    })
    return commands.run(service.command(), {
      env: service.envVars(),
      type: type,
      suite: name,
      service: serviceName
    })
      .then((proc) => {
        return Promise.resolve({
          abortOnError: service.abortOnError(),
          process: proc.process,
          logs: proc.logs,
          name: serviceName
        })
      })
  }

  const runService = function (service, alone) {
    return waitOn.wait(service.waitOn())
      .then(() => {
        if (!service.command()) {
          return Promise.resolve()
        }
        if (service.isCoveraged()) {
          return runCoveragedServiceCommand(service, alone)
        }
        return runServiceCommand(service)
      })
  }

  const runNotSingleService = function (service) {
    return runService(service, false)
  }

  const runSingleService = function (singleServiceToRun) {
    return runService(singleServiceToRun, true)
      .then(resolveOnClose)
  }

  const runTestNotCoveraged = function () {
    logger.startTestNotCoveraged()
    return processes.fork(path.resolve(__dirname, 'bin', 'msc_mocha.js'), {
      args: config.mochaArguments().split(' '),
      resolveOnClose: true,
      options: {
        env: Object.assign({}, process.env, config.testEnvVars())
      }
    }).then(closeCode => {
      if (closeCode !== 0) {
        return Promise.reject(new Error())
      }
      return Promise.resolve()
    })
  }

  const runTestCoveraged = function () {
    logger.startTestCoveraged()
    return mochaSinonChaiRunner.run(`--istanbul ${config.istanbulArguments()} --mocha ${config.mochaArguments()}`, {
      env: config.testEnvVars()
    })
  }

  const runTest = function () {
    return waitOn.wait(config.testWaitOn())
      .catch((err) => {
        states.set('exit-with-error', true)
        return Promise.reject(err)
      })
      .then(() => {
        return config.testIsCoveraged() ? runTestCoveraged() : runTestNotCoveraged()
      }).catch(() => {
        return Promise.reject(Boom.expectationFailed(logger.mochaFailed(false)))
      })
  }

  const runServicesAndTest = function () {
    let closeServicesPromises = []
    let startedServices = []

    return Promise.map(config.services(), (serviceData) => {
      return runNotSingleService(serviceData)
        .then((localService) => {
          startedServices.push(localService)
          closeServicesPromises.push(resolveOnClose(localService, {
            forceResolve: true
          }))
        })
    }).then(() => {
      return runTest()
        .catch(err => {
          logger.testFailed()
          return Promise.resolve(err)
        })
        .then((err) => {
          const testErr = err
          logger.testFinished()
          _.each(_.compact(startedServices), localService => {
            if (localService.error) {
              err = localService.error
            } else if (!localService.closed) {
              if (localService.isCoveraged && !testErr) {
                localService.process.send({
                  exit: true
                })
              } else {
                libs.treeKill(localService.process.pid)
              }
            }
          })
          return Promise.all(closeServicesPromises)
            .finally(() => {
              if (err) {
                return Promise.reject(err)
              }
              return Promise.resolve()
            })
        })
    })
  }

  const run = function () {
    const singleServiceToRun = config.singleServiceToRun()
    if (singleServiceToRun) {
      return paths.cwd.cleanLogs(type, name, singleServiceToRun.name())
        .then(() => {
          return runSingleService(singleServiceToRun)
        })
    }
    if (config.runSingleTest() === true) {
      return runTest()
    }

    return paths.cwd.cleanLogs(type, name)
      .then(() => {
        return commands.runBefore(config, logger)
      })
      .then(runServicesAndTest)
  }

  return {
    run: run
  }
}

module.exports = {
  Runner: Runner
}
