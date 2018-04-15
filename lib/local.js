'use strict'

const childProcess = require('child_process')
const path = require('path')

const _ = require('lodash')
const Boom = require('boom')

const istabulMocha = require('./istanbul-mocha')
const options = require('./options')
const tracer = require('./tracer')

const getServiceConfig = function (suite, suiteName, serviceName) {
  let errorMessage = `The service ${serviceName} was not found`
  let serviceConfig
  _.each(suite.services, (service) => {
    if (service['docker-service'] === serviceName) {
      serviceConfig = service
    }
  })
  if (serviceConfig) {
    return Promise.resolve(serviceConfig)
  }
  tracer.error(errorMessage)
  return Promise.reject(Boom.notFound(errorMessage))
}

const runTest = function (suite, suiteName) {
  return require('mocha-sinon-chai/runner').run(`--istanbul ${istabulMocha.istanbul.params(suite, suiteName)} --mocha ${istabulMocha.mocha.params(suite)}`)
}

const runCoveragedService = function (suite, service, suiteName, serviceName) {
  const serviceDescription = `locally service "${serviceName}" with coverage`
  tracer.info(`Starting ${serviceDescription}`)

  return new Promise((resolve, reject) => {
    const stdin = process.stdin
    const coverageOptions = istabulMocha.istanbul.params(suite, suiteName).split(' ')
    const commandAndParams = istabulMocha.getCommandAndParams(service.commands.local)
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
        tracer.warn('CTRL-C received. Sending exit signal to service')
        proc.send({ exit: true })
      }
    })

    proc = childProcess.fork(path.resolve(__dirname, 'bin', 'msc-istanbul.js'), runServiceOptions, {
      cwd: process.cwd(),
      env: _.extend({}, process.env, {
        servicePath: path.resolve(process.cwd(), commandAndParams.command)
      })
    })

    proc.on('close', (code) => {
      stdin.pause()
      let error
      if (code !== 0) {
        error = new Error(`Error running ${serviceDescription}`)
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

const runServiceCommand = function (suite, service, suiteName, serviceName) {
  tracer.info(`Starting locally service "${serviceName}"`)
  return new Promise((resolve, reject) => {
    childProcess.execFileSync(service.commands.local, [], {
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
      if (!service.commands.local) {
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

const run = function (suite, suiteName) {
  return options.get()
    .then(opts => {
      if (!opts.local || opts.local === 'test') {
        return runTest(suite, suiteName)
      }
      return runService(suite, suiteName, opts.local)
    })
}

module.exports = {
  run: run
}
