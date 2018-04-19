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
const waitOn = require('./wait-on')
const treeKill = require('./tree-kill')

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

const runTestCoveraged = function (suite, suiteName) {
  tracer.debug(`Starting tests of suite "${suiteName}" with coverage enabled`)
  return mochaSinonChaiRunner.run(`--istanbul ${istabulMocha.istanbul.params(suite, suiteName)} --mocha ${istabulMocha.mocha.params(suite)}`)
}

const runTestNotCoveraged = function (suite, suiteName) {
  tracer.debug(`Starting tests of suite "${suiteName}" without coverage`)
  return new Promise((resolve, reject) => {
    let proc = childProcess.fork(path.resolve(__dirname, 'bin', 'msc_mocha.js'), istabulMocha.mocha.params(suite).split(' '), {
      cwd: process.cwd()
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

const runCoveragedService = function (suite, service, suiteName, serviceName) {
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

  stdin.setRawMode(true)
  stdin.resume()
  stdin.setEncoding('utf8')

  stdin.on('data', function (key) {
    if (key === '\u0003') {
      tracer.debug('CTRL-C received. Sending exit signal to service')
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
    name: serviceName,
    isCoveraged: true
  })
}

const logProcessData = function (data) {
  data = _.trim(data)
  if (data.length) {
    console.log(data)
  }
}

const runServiceCommand = function (suite, service, suiteName, serviceName) {
  tracer.debug(`Starting locally service "${serviceName}" of suite "${suiteName}"`)
  let proc = childProcess.execFile(service.local.command, [], {
    cwd: process.cwd(),
    env: _.extend({}, process.env, {
      FORCE_COLOR: true
    }),
    shell: true,
    windowsHide: true
  })

  proc.stdout.setEncoding('utf8')

  proc.stdout.on('data', (data) => {
    logProcessData(data)
  })

  proc.stderr.on('data', (data) => {
    logProcessData(data)
  })

  return Promise.resolve({
    process: proc,
    name: serviceName
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
      if (suite.coverage && suite.coverage.from === serviceName && suite.coverage.enabled !== false) {
        return runCoveragedService(suite, service, suiteName, serviceName)
      }
      return runServiceCommand(suite, service, suiteName, serviceName)
    })
}

const resolveOnClose = function (localService) {
  return new Promise((resolve, reject) => {
    localService.process.on('close', (code) => {
      tracer.debug(`Service "${localService.name}" closed with code ${code}`)
      if (code !== null && code !== 0) {
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
        closeServicesPromises.push(resolveOnClose(localService))
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

const runBeforeCommand = function (command) {
  tracer.debug(`Executing before command "${command}"`)
  return new Promise((resolve, reject) => {
    childProcess.execFileSync(command, [], {
      cwd: process.cwd(),
      env: _.extend({}, process.env, {
        FORCE_COLOR: true
      }),
      shell: true,
      windowsHide: true
    })
    resolve()
  })
}

const runBefore = function (suite) {
  if (suite.before && suite.before.local && suite.before.local.command) {
    return runBeforeCommand(suite.before.local.command)
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
        return runService(suite, suiteName, opts.local)
          .then((localService) => {
            return resolveOnClose(localService)
          })
      }
      return runBefore(suite)
        .then(() => {
          return runServicesAndTest(suite, suiteName)
        })
    })
}

module.exports = {
  run: run
}
