'use strict'

const childProcess = require('child_process')
const path = require('path')
const Promise = require('bluebird')
const waitOn = require('wait-on')

const _ = require('lodash')
const Boom = require('boom')

const istabulMocha = require('./istanbul-mocha')
const options = require('./options')
const tracer = require('./tracer')

const getServiceConfig = function (suite, suiteName, serviceName) {
  let errorMessage = `The container ${serviceName} was not found`
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
    tracer.info(`Waiting until "${suite.test.local['wait-for']}" is available`)
    waitOn({
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

const runTest = function (suite, suiteName) {
  return waitForService(suite)
    .then(() => {
      return require('mocha-sinon-chai/runner').run(`--istanbul ${istabulMocha.istanbul.params(suite, suiteName)} --mocha ${istabulMocha.mocha.params(suite)}`)
        .catch(() => {
          return Promise.reject(Boom.expectationFailed(`Mocha execution of test suite "${suiteName}" failed`))
        })
    })
}

const runCoveragedService = function (suite, service, suiteName, serviceName) {
  const serviceDescription = `locally service "${serviceName}" with coverage`
  tracer.info(`Starting ${serviceDescription}`)

  const stdin = process.stdin
  const coverageOptions = istabulMocha.istanbul.params(suite, suiteName).split(' ')
  const commandAndParams = istabulMocha.getCommandAndParams(service.local.command)
  let runServiceOptions = coverageOptions.concat(['cover'])
    .concat([path.resolve(__dirname, 'service-coverage-runner.js')])
    .concat(['--'])
    .concat(commandAndParams.params.split(' '))
  let proc

  stdin.setRawMode(true)
  stdin.resume()
  stdin.setEncoding('utf8')

  stdin.on('data', function (key) {
    if (key === '\u0003') {
      tracer.info('CTRL-C received. Sending exit signal to service')
      proc.send({ exit: true })
    }
  })

  proc = childProcess.fork(path.resolve(__dirname, 'bin', 'msc-istanbul.js'), runServiceOptions, {
    cwd: process.cwd(),
    env: _.extend({}, process.env, {
      servicePath: path.resolve(process.cwd(), commandAndParams.command)
    })
  })

  proc.on('close', () => {
    stdin.setRawMode(false)
    stdin.pause()
  })

  return Promise.resolve({
    process: proc,
    name: serviceName
  })
}

const runServiceCommand = function (suite, service, suiteName, serviceName) {
  tracer.info(`Starting locally service "${serviceName}"`)
  return new Promise((resolve, reject) => {
    childProcess.execFileSync(service.local.command, [], {
      cwd: process.cwd(),
      shell: true,
      stdio: [0, 1, 2],
      windowsHide: true
    })
  })
}

const runService = function (suite, suiteName, serviceName) {
  return getServiceConfig(suite, suiteName, serviceName)
    .then((service) => {
      let errorMessage
      if (!service.local || !service.local.command) {
        errorMessage = `No local command found for service "${serviceName}" in suite "${suiteName}"`
        tracer.error(errorMessage)
        return Promise.reject(Boom.notFound(errorMessage))
      }
      if (suite.coverage && suite.coverage.from === serviceName) {
        return runCoveragedService(suite, service, suiteName, serviceName)
      }
      return runServiceCommand(suite, service, suiteName, serviceName)
    })
}

const resolveOnClose = function (localService) {
  return new Promise((resolve, reject) => {
    localService.process.on('close', (code) => {
      if (code !== 0) {
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
      tracer.info('Test execution finished. Closing related services')
      let closeServicesPromises = []
      _.each(startedServices, localService => {
        closeServicesPromises.push(resolveOnClose(localService))
        localService.process.send({
          exit: true
        })
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

const run = function (suite, suiteName) {
  return options.get()
    .then(opts => {
      if (_.isString(opts.local)) {
        if (opts.local === 'test') {
          return runTest(suite, suiteName)
        }
        return runService(suite, suiteName, opts.local)
          .then((localService) => {
            return resolveOnClose(localService)
          })
      }
      return runServicesAndTest(suite, suiteName)
    })
}

module.exports = {
  run: run
}
