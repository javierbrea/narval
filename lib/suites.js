'use strict'

const _ = require('lodash')
const Promise = require('bluebird')

const tracer = require('./tracer')
const docker = require('./docker')

const isDocker = function (test, options) {
  const DOCKER_SERVICE = 'docker-service'
  let hasDockerService = false

  if (test.test[DOCKER_SERVICE]) {
    return true
  }
  _.each(test.services, (service) => {
    if (service[DOCKER_SERVICE]) {
      hasDockerService = true
    }
  })

  return hasDockerService
}

const runTest = function (test, suiteName, options) {
  if (isDocker(test, options)) {
    return docker.createFiles()
      .then(() => {
        return docker.run(test, suiteName, options)
      })
  }
  return Promise.resolve()
}

const runOrSkipTest = function (test, suiteName, options) {
  const testDescription = ' ' + suiteName + ' test "' + test.name + '"'
  if (!options.test || (options.test && options.test === test.name)) {
    tracer.info('Running' + testDescription)
    return runTest(test, suiteName, options)
  }
  tracer.warn('Skipping' + testDescription)
  return Promise.resolve()
}

const runSuite = function (suite, options) {
  const suiteDescription = ' test suite "' + suite.name + '"'
  if (options.suites || options.test || (options.suite && options.suite === suite.name)) {
    tracer.info('Running' + suiteDescription)
    return Promise.mapSeries(suite.tests, (test) => {
      return runOrSkipTest(test, suite.name, options)
    })
  }
  tracer.warn('Skipping' + suiteDescription)
  return Promise.resolve()
}

const run = function (data) {
  const suites = data.config.test.suites
  return Promise.mapSeries(suites, (suite) => {
    return runSuite(suite, data.options)
  })
}

module.exports = {
  run: run
}
