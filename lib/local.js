'use strict'

const childProcess = require('child_process')
const path = require('path')
const Promise = require('bluebird')
const mochaSinonChaiRunner = require('mocha-sinon-chai/runner')

const _ = require('lodash')
const Boom = require('boom')

const istabulMocha = require('./istanbul-mocha')
const options = require('./options')
const tracer = require('./tracer')
const commands = require('./commands')
const waitOnLib = require('./wait-on')
const treeKill = require('./tree-kill')

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

const waitOnService = function (waitOn) {
  let waitOnDefaultOptions = {
    interval: 100,
    timeout: 30000
  }
  let customConfigLog = ''
  let waitOnOptions = {}
  let resourcesLog
  if (!waitOn) {
    return Promise.resolve()
  }
  if (_.isString(waitOn)) {
    waitOnOptions.resources = waitOn.split(' ')
  } else {
    customConfigLog = ` Applying custom config: ${JSON.stringify(waitOn)}`
    waitOnOptions = waitOn
  }
  resourcesLog = waitOnOptions.resources.join(',')
  return new Promise((resolve, reject) => {
    tracer.debug(`Waiting until "${resourcesLog}" is available.${customConfigLog}`)
    waitOnLib.wait(_.extend({}, waitOnDefaultOptions, waitOnOptions), (error) => {
      if (error) {
        tracer.error(`Wait timed out. "${resourcesLog}" is not available.`)
        reject(error)
      } else {
        tracer.debug(`Wait finished. "${resourcesLog}" is available.`)
        resolve()
      }
    })
  })
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

const runTestCoveraged = function (suite, suiteName, suiteTypeName) {
  tracer.debug(`Starting tests of suite "${suiteName}" with coverage enabled`)
  return mochaSinonChaiRunner.run(`--istanbul ${istabulMocha.istanbul.params(suite, suiteName)} --mocha ${istabulMocha.mocha.params(suite)}`, {
    env: getSuiteEnvVars(suite, suiteName, suiteTypeName, 'test')
  })
}

const runTestNotCoveraged = function (suite, suiteName, suiteTypeName) {
  tracer.debug(`Starting tests of suite "${suiteName}" without coverage`)
  return new Promise((resolve, reject) => {
    let proc = childProcess.fork(path.resolve(__dirname, 'bin', 'msc_mocha.js'), istabulMocha.mocha.params(suite).split(' '), {
      cwd: process.cwd(),
      env: _.extend({}, process.env, getSuiteEnvVars(suite, suiteName, suiteTypeName, 'test'))
    })
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error())
      } else {
        resolve()
      }
    })
  })
}

const runTest = function (suite, suiteName, suiteTypeName) {
  return waitOnService(suite.test.local && suite.test.local['wait-on'])
    .catch((err) => {
      process.env.forceExit = true
      return Promise.reject(err)
    })
    .then(() => {
      if (!suite.coverage || ((!suite.coverage.from || suite.coverage.from === 'test') && suite.coverage.enabled !== false)) {
        return runTestCoveraged(suite, suiteName, suiteTypeName)
      }
      return runTestNotCoveraged(suite, suiteName, suiteTypeName)
    }).catch(() => {
      return Promise.reject(Boom.expectationFailed(`Mocha execution of test suite "${suiteName}" failed`))
    })
}

const runCoveragedService = function (suite, service, suiteName, suiteTypeName, serviceName, alone) {
  const serviceDescription = `locally service "${serviceName}" of suite "${suiteName}" with coverage`
  tracer.debug(`Starting ${serviceDescription}`)

  const stdin = process.stdin
  const coverageOptions = istabulMocha.istanbul.params(suite, suiteTypeName).split(' ')
  const commandAndParams = istabulMocha.getCommandAndParams(service.local.command)
  let runServiceOptions = coverageOptions.concat(['cover'])
    .concat([path.resolve(__dirname, 'service-coverage-runner.js')])
    .concat(['--'])
    .concat(commandAndParams.params.split(' '))
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
      return waitOnService(service.local && service.local['wait-on'])
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

const resolveOnClose = function (localService, options) {
  options = options || {}
  return new Promise((resolve, reject) => {
    const closeListener = localService.logs ? localService.logs : localService.process
    closeListener.on('close', (code) => {
      if(_.isObject(code)) {
        code = code.processCode
      }
      const closeTrace = `Service "${localService.name}" closed with code ${code}`
      let traceMethod = 'debug'
      localService.closed = true

      if (code !== null && code !== 0) {
        traceMethod = 'warn'
        if (localService.abortOnError) {
          localService.error = Boom.badImplementation(`Error running service "${localService.name}" locally`)
          traceMethod = 'error'
        }
      }
      tracer[traceMethod](closeTrace)

      if (localService.error && !options.forceResolve) {
        reject(localService.error)
      } else {
        resolve()
      }
    })
  })
}

const runServicesAndTest = function (suite, suiteName, suiteTypeName) {
  return Promise.map(suite.services || [], (service) => {
    return runService(suite, suiteName, suiteTypeName, service.name)
  }).then(startedServices => {
    startedServices = _.compact(startedServices)
    let closeServicesPromises = []
    _.each(startedServices, localService => {
      closeServicesPromises.push(resolveOnClose(localService, {
        forceResolve: true
      }))
    })

    return runTest(suite, suiteName, suiteTypeName)
      .catch(err => {
        tracer.error(`Error running tests of suite "${suiteName}" locally`)
        return Promise.resolve(err)
      })
      .then((err) => {
        const testErr = err
        tracer.debug('Test execution finished. Closing related services')
        _.each(startedServices, localService => {
          if (localService.error) {
            err = localService.error
          } else if (!localService.closed) {
            if (localService.isCoveraged && !testErr) {
              localService.process.send({
                exit: true
              })
            } else {
              treeKill.kill(localService.process.pid)
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

const runBeforeCommand = function (command, envVars, suiteData) {
  tracer.debug(`Executing before command "${command}"`)
  return commands.run(command, _.extend({
    sync: true,
    env: envVars
  }, suiteData))
}

const runBefore = function (suite, suiteName, suiteTypeName) {
  if (suite.before && suite.before.local && suite.before.local.command) {
    return runBeforeCommand(suite.before.local.command, getSuiteEnvVars(suite, suiteName, suiteTypeName, 'before'), {
      suiteType: suiteTypeName,
      suite: suiteName,
      service: 'before'
    })
  }
  return Promise.resolve()
}

const run = function (suite, suiteTypeName) {
  const suiteName = suite.name
  return options.get()
    .then(opts => {
      if (_.isString(opts.local)) {
        if (opts.local === 'test') {
          return runTest(suite, suiteName, suiteTypeName)
        }
        return runService(suite, suiteName, suiteTypeName, opts.local, true)
          .then((localService) => {
            return resolveOnClose(localService)
          })
      }
      return runBefore(suite, suiteName, suiteTypeName)
        .then(() => {
          return runServicesAndTest(suite, suiteName, suiteTypeName)
        })
    })
}

module.exports = {
  run: run
}
