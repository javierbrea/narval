'use strict'

const childProcess = require('child_process')
const path = require('path')
const Promise = require('bluebird')
const mochaSinonChaiRunner = require('mocha-sinon-chai/runner')

const _ = require('lodash')
const Boom = require('boom')

const istabulMocha = require('./istanbul-mocha')
const tracer = require('./tracer')
const commands = require('./commands')
const waitOn = require('./wait-on')
const libs = require('./libs')
const utils = require('./utils')
const states = require('./states')
const processes = require('./processes')

const getServiceConfig = function (suite, suiteName, serviceName) {
  let errorMessage = `The service ${serviceName} was not found`
  let serviceConfig
  _.each(suite.services, (service) => {
    if (service.name === serviceName) {
      serviceConfig = service
    }
  })
  if (serviceConfig) {
    return Promise.resolve(serviceConfig)
  }
  tracer.error(errorMessage)
  return Promise.reject(Boom.notFound(errorMessage))
}

const getSuiteEnvVars = function (suite, suiteName, suiteTypeName, serviceName, service) {
  let baseEnvVars = {
    narval_suite_type: suiteTypeName,
    narval_suite: suiteName,
    narval_service: serviceName,
    narval_is_docker: false
  }
  let envVars

  if (serviceName === 'test') {
    envVars = (suite.test && suite.test.local && suite.test.local.env) || {}
  } else if (serviceName === 'before') {
    envVars = (suite.before && suite.before.local && suite.before.local.env) || {}
  } else {
    envVars = (service && service.local && service.local.env) || {}
  }

  return _.extend(baseEnvVars, envVars)
}

const runCoveragedService = function (suite, service, suiteName, suiteTypeName, serviceName, alone) {
  const serviceDescription = `locally service "${serviceName}" of suite "${suiteName}" with coverage`
  tracer.debug(`Starting ${serviceDescription}`)

  const stdin = process.stdin
  const coverageOptions = istabulMocha.istanbul.params(suite, suiteTypeName).split(' ')
  const commandAndParams = utils.commandArguments(service.local.command)
  let runServiceOptions = coverageOptions.concat(['cover'])
    .concat([path.resolve(__dirname, 'service-coverage-runner.js')])
    .concat(['--'])
    .concat(commandAndParams.arguments)
  let proc

  proc = childProcess.fork(path.resolve(__dirname, 'bin', 'msc-istanbul.js'), runServiceOptions, {
    cwd: process.cwd(),
    env: _.extend({}, process.env, getSuiteEnvVars(suite, suiteName, suiteTypeName, serviceName, service), {
      servicePath: path.resolve(process.cwd(), commandAndParams.command)
    })
  })

  if (alone && stdin.setRawMode) {
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')

    stdin.on('data', key => {
      if (key === '\u0003') {
        tracer.debug('CTRL-C received. Sending exit signal to service')
        proc.send({ exit: true })
      }
    })

    proc.on('close', () => {
      stdin.setRawMode(false)
      stdin.pause()
    })
  }

  return Promise.resolve({
    abortOnError: service['abort-on-error'],
    process: proc,
    name: serviceName,
    isCoveraged: true
  })
}

const runServiceCommand = function (suite, service, suiteName, suiteTypeName, serviceName) {
  tracer.debug(`Starting locally service "${serviceName}" of suite "${suiteName}"`)
  return commands.run(service.local.command, {
    env: getSuiteEnvVars(suite, suiteName, suiteTypeName, serviceName, service),
    suiteType: suiteTypeName,
    suite: suiteName,
    service: serviceName
  })
    .then((proc) => {
      return Promise.resolve({
        abortOnError: service['abort-on-error'],
        process: proc.process,
        logs: proc.logs,
        name: serviceName
      })
    })
}

const runService = function (suite, suiteName, suiteTypeName, serviceName, alone) {
  return getServiceConfig(suite, suiteName, serviceName)
    .then((service) => {
      return waitOn.wait(service.local && service.local['wait-on'])
        .then(() => {
          if (!service.local || !service.local.command) {
            return Promise.resolve()
          }
          if (suite.coverage && suite.coverage.from === serviceName && suite.coverage.enabled !== false) {
            return runCoveragedService(suite, service, suiteName, suiteTypeName, serviceName, alone)
          }
          return runServiceCommand(suite, service, suiteName, suiteTypeName, serviceName)
        })
    })
}

const Runner = function (config, logger) {
  const name = config.name()
  const type = config.typeName()

  const runBefore = function () {
    const beforeCommand = config.beforeCommand()
    if (beforeCommand) {
      logger.beforeCommand({
        command: beforeCommand
      })
      return commands.run(beforeCommand, {
        sync: true,
        env: config.beforeEnvVars(),
        type: type,
        suite: name,
        service: 'before'
      })
    }
    return Promise.resolve()
  }

  const resolveOnClose = function (localService, options) {
    options = options || {}
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
          code: code === null ? 'null' : code, // TODO, print another log when null
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

  const runNotSingleService = function (serviceName) {
    // TODO, change
    return runService(config.suite(), name, type, serviceName, false)
  }

  const runSingleService = function (singleServiceToRun) {
    // TODO, change
    return runService(config.suite(), name, type, singleServiceToRun, true)
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
    return Promise.map(config.services(), runNotSingleService).then(startedServices => {
      startedServices = _.compact(startedServices)
      let closeServicesPromises = []
      _.each(startedServices, localService => {
        closeServicesPromises.push(resolveOnClose(localService, {
          forceResolve: true
        }))
      })

      return runTest()
        .catch(err => {
          logger.testFailed()
          return Promise.resolve(err)
        })
        .then((err) => {
          const testErr = err
          logger.testFinished()
          _.each(startedServices, localService => {
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
      return runSingleService(singleServiceToRun)
    }
    if (config.runSingleTest() === true) {
      return runTest()
    }

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
