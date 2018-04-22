'use strict'

const _ = require('lodash')
const Promise = require('bluebird')
const Boom = require('boom')

const tracer = require('./tracer')
const docker = require('./docker')
const local = require('./local')

const isDocker = function (suite) {
  let hasDockerService = false

  if (suite.test && suite.test.docker && suite.test.docker.container) {
    return true
  }
  _.each(suite.services, (service) => {
    if (service.docker && service.docker.container) {
      hasDockerService = true
    }
  })

  return hasDockerService
}

const runSuite = function (suite, suiteTypeName, options) {
  if (!options.local && isDocker(suite)) {
    return docker.createFiles()
      .then(() => {
        return docker.run(suite, suiteTypeName)
      })
  }
  return local.run(suite, suiteTypeName)
}

const runOrSkipTest = function (suite, suiteTypeName, options) {
  const suiteDescription = ' "' + suiteTypeName + '" suite "' + suite.name + '"'
  if (!options.suite || (options.suite && options.suite === suite.name)) {
    tracer.info('Running' + suiteDescription)
    return runSuite(suite, suiteTypeName, options).then(() => {
      tracer.info('Execution of "' + suiteTypeName + '" suite "' + suite.name + '" finished OK')
      return Promise.resolve()
    })
      .catch((error) => {
        if (!Boom.isBoom(error)) {
          tracer.error(error)
        }
        return Promise.reject(Boom.expectationFailed(`Error running "${suiteTypeName}" suite "${suite.name}"`))
      })
  }
  tracer.warn('Skipping' + suiteDescription)
  return Promise.resolve()
}

const runSuiteType = function (suiteType, options) {
  const suiteTypeDescription = ' suites of type "' + suiteType.name + '"'
  if (!options.type || (options.type && options.type === suiteType.name)) {
    tracer.info('Running' + suiteTypeDescription)
    return Promise.mapSeries(suiteType.suites, (suite) => {
      return runOrSkipTest(suite, suiteType.name, options)
    })
  }
  tracer.warn('Skipping' + suiteTypeDescription)
  return Promise.resolve()
}

const run = function (options, config) {
  options = options || {}
  config = config || {}
  if (!options.allSuites && !options.suite && !options.type) {
    tracer.warn('Skipping all test suites')
    return Promise.resolve()
  }
  return Promise.mapSeries(config.suitesByType, (suiteType) => {
    return runSuiteType(suiteType, options)
  }).finally(docker.downVolumes)
}

module.exports = {
  run: run
}
