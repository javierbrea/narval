'use strict'

const Promise = require('bluebird')
const Boom = require('boom')

const tracer = require('./tracer')
const docker = require('./docker')
const suiteLocal = require('./suite-local')
const suiteDocker = require('./suite-docker')
const options = require('./options')
const config = require('./config')
const logs = require('./logs')

const Suite = function (suiteData, suiteTypeName, options, suitesByType) {
  const configResolver = new config.SuiteResolver(suiteData, suiteTypeName, options, suitesByType)
  const logger = new logs.SuiteLogger(configResolver)

  const runDocker = function () {
    return docker.createFiles()
      .then(() => {
        return new suiteDocker.Runner(configResolver, logger).run()
      })
  }

  const runLocal = function () {
    return new suiteLocal.Runner(configResolver, logger).run()
  }

  const run = function () {
    let runner
    if (configResolver.hasToRun()) {
      logger.startRun({
        describe: configResolver.describe()
      })
      runner = configResolver.isDocker() ? runDocker : runLocal

      return runner().then(() => {
        logger.finishOk()
        return Promise.resolve()
      }).catch((error) => {
        if (!Boom.isBoom(error)) {
          tracer.error(error)
        }
        return Promise.reject(Boom.expectationFailed(logger.finishError(false)))
      })
    }

    logger.skip()
    return Promise.resolve()
  }

  return {
    run: run
  }
}

const runSuitesOfType = function (suitesOfType, options, suitesByType) {
  if (!options.type || (options.type && options.type === suitesOfType.name)) {
    logs.runningSuiteType({
      type: suitesOfType.name
    })
    return Promise.mapSeries(suitesOfType.suites, (suite) => {
      return new Suite(suite, suitesOfType.name, options, suitesByType).run()
    })
  }
  logs.skipSuiteType({
    type: suitesOfType.name
  })
  return Promise.resolve()
}

const run = function () {
  return Promise.props({
    options: options.get(),
    suitesByType: config.suitesByType()
  }).then(data => {
    if (!data.options.allSuites && !data.options.suite && !data.options.type) {
      logs.skipAllSuites()
      return Promise.resolve()
    }
    return Promise.mapSeries(data.suitesByType, (suitesOfType) => {
      return runSuitesOfType(suitesOfType, data.options, data.suitesByType)
    }).finally(docker.downVolumes)
  })
}

module.exports = {
  run: run
}
