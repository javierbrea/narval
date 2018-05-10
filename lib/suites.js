'use strict'

const _ = require('lodash')

const Promise = require('bluebird')
const Boom = require('boom')

const tracer = require('./tracer')
const docker = require('./docker')
const local = require('./local')
const paths = require('./paths')
const options = require('./options')
const config = require('./config')

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
  const suiteDescription = `"${suiteTypeName} " suite "${suite.name}"`
  if (!options.suite || (options.suite && options.suite === suite.name)) {
    tracer.info(`Running ${suiteDescription}`)
    return runSuite(suite, suiteTypeName, options).then(() => {
      tracer.info(`Execution of "${suiteTypeName}" suite "${suite.name}" finished OK`)
      return Promise.resolve()
    })
      .catch((error) => {
        if (!Boom.isBoom(error)) {
          tracer.error(error)
        }
        return Promise.reject(Boom.expectationFailed(`Error running "${suiteTypeName}" suite "${suite.name}"`))
      })
  }
  tracer.warn(`Skipping ${suiteDescription}`)
  return Promise.resolve()
}

const runSuitesOfType = function (suitesOfType, options) {
  const suiteTypeDescription = `suites of type "${suitesOfType.name}"`
  if (!options.type || (options.type && options.type === suitesOfType.name)) {
    tracer.info(`Running ${suiteTypeDescription}`)
    return Promise.mapSeries(suitesOfType.suites, (suite) => {
      return runOrSkipTest(suite, suitesOfType.name, options)
    })
  }
  tracer.warn(`Skipping ${suiteTypeDescription}`)
  return Promise.resolve()
}

const cleanLogs = function () {
  const logsPath = paths.logs()
  return paths.cwd.remove(logsPath)
    .then(() => {
      return paths.cwd.ensureDir(logsPath)
    })
}

const run = function () {
  return Promise.props({
    options: options.get(),
    config: config.get()
  }).then(data => {
    if (!data.options.allSuites && !data.options.suite && !data.options.type) {
      tracer.warn('Skipping all test suites')
      return Promise.resolve()
    }
    return cleanLogs()
      .then(() => {
        return Promise.mapSeries(data.config.suitesByType, (suitesOfType) => {
          return runSuitesOfType(suitesOfType, data.options)
        }).finally(docker.downVolumes)
      })
  })
}

module.exports = {
  run: run
}
