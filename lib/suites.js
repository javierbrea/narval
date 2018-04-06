'use strict'

const _ = require('lodash')
const Promise = require('bluebird')

const tracer = require('./tracer')
const docker = require('./docker')
const local = require('./local')

const isDocker = function (suite, options) {
  const DOCKER_SERVICE = 'docker-service'
  let hasDockerService = false

  if (suite.test[DOCKER_SERVICE]) {
    return true
  }
  _.each(suite.services, (service) => {
    if (service[DOCKER_SERVICE]) {
      hasDockerService = true
    }
  })

  return hasDockerService
}

const runSuite = function (suite, suiteTypeName, options) {
  if (isDocker(suite, options)) {
    return docker.createFiles()
      .then(() => {
        return docker.run(suite, suiteTypeName, options)
      })
  }
  return local.run(suite, suiteTypeName, options)
}

const runOrSkipTest = function (suite, suiteTypeName, options) {
  const suiteDescription = ' "' + suiteTypeName + '" suite "' + suite.name + '"'
  if (!options.suite || (options.suite && options.suite === suite.name)) {
    tracer.info('Running' + suiteDescription)
    return runSuite(suite, suiteTypeName, options)
  }
  tracer.warn('Skipping' + suiteDescription)
  return Promise.resolve()
}

const runSuiteType = function (suiteType, options) {
  const suiteTypeDescription = ' type "' + suiteType.name + '"'
  if (!options.type || (options.type && options.type === suiteType.name)) {
    tracer.info('Running' + suiteTypeDescription)
    return Promise.mapSeries(suiteType.suites, (suite) => {
      return runOrSkipTest(suite, suiteType.name, options)
    })
  }
  tracer.warn('Skipping' + suiteTypeDescription)
  return Promise.resolve()
}

const run = function (data) {
  const suites = data.config.suites
  return Promise.mapSeries(suites, (suiteType) => {
    return runSuiteType(suiteType, data.options)
  }).then(() => {
    docker.downVolumes()
    return Promise.resolve()
  })
}

module.exports = {
  run: run
}
