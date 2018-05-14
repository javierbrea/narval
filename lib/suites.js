'use strict'

const _ = require('lodash')
const Promise = require('bluebird')
const Boom = require('boom')
const handlebars = require('handlebars')

const tracer = require('./tracer')
const docker = require('./docker')
const suiteLocal = require('./suite-local')
const suiteDocker = require('./suite-docker')
const paths = require('./paths')
const options = require('./options')
const config = require('./config')

const Logger = function (suiteConfig) {
  const suiteTypeName = suiteConfig.typeName()
  const name = suiteConfig.name()
  const fullName = `"${suiteTypeName}" suite "${name}"`

  const Log = function (message, level) {
    const template = handlebars.compile(message)
    return function (data, trace, customLevel) {
      if (_.isString(data)) {
        trace = true
        customLevel = data
      } else if (_.isString(trace)) {
        customLevel = trace
        trace = true
      } else if (_.isBoolean(data)) {
        trace = data
        customLevel = trace
      }
      if (trace !== false) {
        tracer[customLevel || level](template({
          data: data
        }))
      }
      return message
    }
  }

  const loggers = {
    skip: new Log(`Skipping ${fullName}`, 'warn'),
    startRun: new Log(`Running ${fullName}`, 'info'),
    finishOk: new Log(`Execution of ${fullName} finished OK`, 'info'),
    finishError: new Log(`Error running ${fullName}`, 'error'),
    beforeCommand: new Log(`Executing before command "{{data.command}}"`, 'debug'),
    mochaFailed: new Log(`Mocha execution of ${fullName} failed`, 'error'),
    startTestCoveraged: new Log(`Starting tests of ${fullName} with coverage enabled`, 'debug'),
    startTestNotCoveraged: new Log(`Starting tests of ${fullName} without coverage`, 'debug'),
    testFailed: new Log(`Error running tests of ${fullName}`, 'error'),
    testFinished: new Log(`Test execution finished. Closing related services`, 'debug'),
    localServiceError: new Log(`Error running service "${name}" locally`), // TODO, union with docker log
    serviceClose: new Log(`Service "{{data.name}}" closed with code {{data.code}}`, 'debug'),
    startService: new Log(`Starting locally service "{{data.service}}" of suite "${name}"`, 'debug'),
    startCoveragedService: new Log(`Starting locally service "{{data.service}}" of suite "${name}" with coverage`, 'debug'),
    forceServiceExit: new Log(`CTRL-C received. Sending exit signal to service "{{data.service}}"`, 'debug'),
    stopDockerService: new Log(`Stopping Docker service "{{data.service}}"`, 'debug'),
    startDockerService: new Log(`Starting docker service "{{data.service}}" of suite "${name}"`, 'debug'),
    noDockerServiceConfig: new Log(`There is no Docker configuration for service "{{data.service}}" in suite "${name}" of type "${suiteTypeName}"`, 'warn'),
    noDockerTestConfig: new Log(`There is no Docker configuration for test in suite "${name}" of type "${suiteTypeName}"`, 'error'),
    dockerServicesStillRunning: new Log(`Services "{{data.services}}" are still running. Waiting...`, 'debug'),
    dockerServiceStillRunning: new Log(`Service "{{data.services}}" is still running. Waiting...`, 'debug'),
    stopAllDockerServices: new Log(`Stopping all docker services`, 'debug'),
    dockerExitCodeError: new Log(`Docker service exited with code {{data.exitCode}}`, 'error'),
    dockerExitCode: new Log(`Docker container "{{data.container}}" of service "{{data.service}}" exited with code "{{data.exitCode}}"`, 'debug')
  }

  return loggers
}

const Suite = function (suiteData, suiteTypeName, options) {
  const configResolver = new config.SuiteResolver(suiteData, suiteTypeName, options)
  const logger = new Logger(configResolver)

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
      logger.startRun()
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

const runSuitesOfType = function (suitesOfType, options) {
  const suiteTypeDescription = `suites of type "${suitesOfType.name}"`
  if (!options.type || (options.type && options.type === suitesOfType.name)) {
    tracer.info(`Running ${suiteTypeDescription}`)
    return Promise.mapSeries(suitesOfType.suites, (suite) => {
      return new Suite(suite, suitesOfType.name, options).run()
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
    suitesByType: config.suitesByType()
  }).then(data => {
    if (!data.options.allSuites && !data.options.suite && !data.options.type) {
      tracer.warn('Skipping all test suites')
      return Promise.resolve()
    }
    return cleanLogs()
      .then(() => {
        return Promise.mapSeries(data.suitesByType, (suitesOfType) => {
          return runSuitesOfType(suitesOfType, data.options)
        }).finally(docker.downVolumes)
      })
  })
}

module.exports = {
  run: run
}
