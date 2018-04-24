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
const waitOn = require('./wait-on')
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

const waitForService = function (suite) {
  if (!suite.test.local || !suite.test.local['wait-for']) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    tracer.debug(`Waiting until "${suite.test.local['wait-for']}" is available`)
    waitOn.wait({
      resources: [
        suite.test.local['wait-for']
      ],
      interval: 100,
      timeout: 30000
    }, (error) => {
      if (error) {
        reject(error)
      }
      resolve()
    })
  })
}

const getSuiteEnvVars = function (suite, suiteName, serviceName, service) {
  let baseEnvVars = {
    narval_suite: suiteName,
    narval_service: serviceName,
    narval_is_docker: false
  }
  let envVars

  if (serviceName === 'test') {
    envVars = (suite.test && suite.test.local && suite.test.local.env) || {}
  } else if (serviceName === 'clean') {
    envVars = (suite.before && suite.before.local && suite.before.local.env) || {}
  } else {
    envVars = (service && service.local && service.local.env) || {}
  }

  return _.extend(baseEnvVars, envVars)
}
 
const getTestEnvVars = function (suite) {
  return (suite.test && suite.test.local && suite.test.local.env) || {}
}

const runTestCoveraged = function (suite, suiteName) {
  tracer.debug(`Starting tests of suite "${suiteName}" with coverage enabled`)
  return mochaSinonChaiRunner.run(`--istanbul ${istabulMocha.istanbul.params(suite, suiteName)} --mocha ${istabulMocha.mocha.params(suite)}`, {
    env: getSuiteEnvVars(suite, suiteName, 'test')
  })
}

const runTestNotCoveraged = function (suite, suiteName) {
  tracer.debug(`Starting tests of suite "${suiteName}" without coverage`)
  return new Promise((resolve, reject) => {
    let proc = childProcess.fork(path.resolve(__dirname, 'bin', 'msc_mocha.js'), istabulMocha.mocha.params(suite).split(' '), {
      cwd: process.cwd(),
      env: _.extend({}, process.env, getSuiteEnvVars(suite, suiteName, 'test'))
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

const runTest = function (suite, suiteName) {
  return waitForService(suite)
    .then(() => {
      if (!suite.coverage || ((!suite.coverage.from || suite.coverage.from === 'test') && suite.coverage.enabled !== false)) {
        return runTestCoveraged(suite, suiteName)
      }
      return runTestNotCoveraged(suite, suiteName)
    }).catch(() => {
      return Promise.reject(Boom.expectationFailed(`Mocha execution of test suite "${suiteName}" failed`))
    })
}

const runCoveragedService = function (suite, service, suiteName, serviceName, alone) {
  const serviceDescription = `locally service "${serviceName}" of suite "${suiteName}" with coverage`
  tracer.debug(`Starting ${serviceDescription}`)

  const stdin = process.stdin
  const coverageOptions = istabulMocha.istanbul.params(suite, suiteName).split(' ')
  const commandAndParams = istabulMocha.getCommandAndParams(service.local.command)
  let runServiceOptions = coverageOptions.concat(['cover'])
    .concat([path.resolve(__dirname, 'service-coverage-runner.js')])
    .concat(['--'])
    .concat(commandAndParams.params.split(' '))
  let proc

  proc = childProcess.fork(path.resolve(__dirname, 'bin', 'msc-istanbul.js'), runServiceOptions, {
    cwd: process.cwd(),
    env: _.extend({}, process.env, getSuiteEnvVars(suite, suiteName, serviceName, service), {
      servicePath: path.resolve(process.cwd(), commandAndParams.command)
    })
  })

  if (alone) {
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
    process: proc,
    name: serviceName,
    isCoveraged: true
  })
}

const runServiceCommand = function (suite, service, suiteName, serviceName) {
  tracer.debug(`Starting locally service "${serviceName}" of suite "${suiteName}"`)
  return commands.run(service.local.command, {
    env: getSuiteEnvVars(suite, suiteName, serviceName, service)
  })
    .then((proc) => {
      return Promise.resolve({
        process: proc,
        name: serviceName
      })
    })
}

const runService = function (suite, suiteName, serviceName, alone) {
  return getServiceConfig(suite, suiteName, serviceName)
    .then((service) => {
      let errorMessage
      if (!service.local || !service.local.command) {
        errorMessage = `No local command found for service "${serviceName}" in suite "${suiteName}"`
        tracer.error(errorMessage)
        return Promise.reject(Boom.notFound(errorMessage))
      }
      if (suite.coverage && suite.coverage.from === serviceName && suite.coverage.enabled !== false) {
        return runCoveragedService(suite, service, suiteName, serviceName, alone)
      }
      return runServiceCommand(suite, service, suiteName, serviceName)
    })
}

const resolveOnClose = function (localService, options) {
  options = options || {}
  return new Promise((resolve, reject) => {
    localService.process.on('close', (code) => {
      tracer.debug(`Service "${localService.name}" closed with code ${code}`)
      if (code !== null && code !== 0 && !options.ignoreError) {
        reject(new Error(`Error running service "${localService.name}" locally`))
      } else {
        resolve()
      }
    })
  })
}

const runServicesAndTest = function (suite, suiteName) {
  return Promise.map(suite.services || [], (service) => {
    return runService(suite, suiteName, service.name)
  }).then(startedServices => {
    return runTest(suite, suiteName)
      .catch(err => {
        return Promise.resolve(err)
      })
      .then((err) => {
        tracer.debug('Test execution finished. Closing related services')
        let closeServicesPromises = []
        _.each(startedServices, localService => {
          closeServicesPromises.push(resolveOnClose(localService, {
            ignoreError: true
          }))
          if (localService.isCoveraged) {
            localService.process.send({
              exit: true
            })
          } else {
            treeKill.kill(localService.process.pid)
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

const runBeforeCommand = function (command, envVars) {
  tracer.debug(`Executing before command "${command}"`)
  return commands.run(command, {
    sync: true,
    env: envVars
  })
}

const runBefore = function (suite, suiteName) {
  if (suite.before && suite.before.local && suite.before.local.command) {
    return runBeforeCommand(suite.before.local.command, getSuiteEnvVars(suite, suiteName, 'clean'))
  }
  return Promise.resolve()
}

const run = function (suite, suiteTypeName) {
  const suiteName = suite.name
  return options.get()
    .then(opts => {
      if (_.isString(opts.local)) {
        if (opts.local === 'test') {
          return runTest(suite, suiteName)
        }
        return runService(suite, suiteName, opts.local, true)
          .then((localService) => {
            return resolveOnClose(localService)
          })
      }
      return runBefore(suite, suiteName)
        .then(() => {
          return runServicesAndTest(suite, suiteName)
        })
    })
}

module.exports = {
  run: run
}
