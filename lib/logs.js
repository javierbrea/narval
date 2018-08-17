'use strict'

const _ = require('lodash')
const handlebars = require('handlebars')

const tracer = require('./tracer')
const utils = require('./utils')

handlebars.registerHelper('comma-separated', function (arr) {
  arr = _.isString(arr) ? [arr] : arr
  return arr.join(', ')
})

const SERVICE_LOGS = {
  skip: ['Skipping {{{data.fullName}}}', 'warn'],
  startRun: [`Running {{{data.fullName}}}:${utils.NO_COLOR_SEP} {{{data.describe}}}`, 'info'],
  finishOk: ['Execution of {{{data.fullName}}} finished OK', 'info'],
  finishError: ['Error running {{{data.fullName}}}', 'error'],
  beforeCommand: ['Executing before command "{{{data.command}}}"', 'debug'],
  mochaFailed: ['Mocha execution of {{{data.fullName}}} failed', 'error'],
  startTestCoveraged: ['Starting tests of {{{data.fullName}}} with coverage enabled', 'debug'],
  startTestNotCoveraged: ['Starting tests of {{{data.fullName}}} without coverage', 'debug'],
  testFailed: ['Error running tests of {{{data.fullName}}}', 'error'],
  testFinished: ['Test execution finished. Closing related services', 'debug'],
  localServiceError: ['Error running service "{{data.name}}" locally'],
  serviceClose: ['Service "{{data.name}}" closed with code {{data.code}}', 'debug'],
  startService: ['Starting locally service "{{data.service}}" of suite "{{data.suiteName}}"', 'debug'],
  startCoveragedService: ['Starting locally service "{{data.service}}" of suite "{{data.suiteName}}" with coverage', 'debug'],
  forceServiceExit: ['CTRL-C received. Sending exit signal to service "{{data.service}}"', 'debug'],
  stopDockerService: ['Stopping Docker service "{{data.service}}"', 'debug'],
  startDockerService: ['Starting docker service "{{data.service}}" of suite "{{data.suiteName}}"', 'debug'],
  noDockerServiceConfig: ['There is no Docker configuration for service "{{data.service}}" in suite "{{data.suiteName}}" of type "{{data.suiteTypeName}}"', 'warn'],
  noDockerTestConfig: ['There is no Docker configuration for test in suite "{{data.suiteName}}" of type "{{data.suiteTypeName}}"', 'error'],
  dockerServicesStillRunning: ['Services "{{comma-separated data.services}}" are still running. Waiting...', 'debug'],
  dockerServiceStillRunning: ['Service "{{comma-separated data.services}}" is still running. Waiting...', 'debug'],
  stopAllDockerServices: ['Stopping all docker services', 'debug'],
  dockerExitCodeError: ['Docker service exited with code {{data.exitCode}}', 'error'],
  dockerExitCode: ['Docker container "{{data.container}}" of service "{{data.service}}" exited with code "{{data.exitCode}}"', 'debug']
}

const LOGS = {
  skipAllSuites: ['Skipping all test suites', 'warn'],
  waitingOn: ['Waiting until "{{data.resources}}" is available.', 'debug'],
  waitTimeOut: ['Wait timed out. "{{data.resources}}" is not available.', 'error'],
  waitFinish: ['Wait finished. "{{data.resources}}" is available.', 'debug'],
  waitConfig: [`Waiting config =>${utils.NO_COLOR_SEP} {{{data.config}}}`, 'trace'],
  errorRunningCommand: ['Error trying to run command. {{{data.message}}}', 'error'],
  errorRunningCommandCode: ['Error running command. Exit code {{data.code}}', 'error'],
  runningComposeCommand: ['Running Docker command "docker-compose {{{data.command}}}"', 'trace'],
  composeCommandFailed: ['Docker compose command "{{{data.command}}}" failed', 'error'],
  configNotFound: ['Config file {{data.filePath}} not found', 'warn'],
  serviceNotFound: ['The service {{data.name}} was not found', 'warn'],
  noDockerTestConfig: ['No docker configuration found for test', 'error'],
  dependencyNotFound: ['"{{data.filePath}}" not found in dependencies', 'error'],
  writeLogsError: ['Error writing process logs from service "{{data.service}}", suite "{{data.suite}}" of type "{{data.type}}"', 'error'],
  exitSignalReceived: ['Exit signal received. Exiting coveraged service process', 'info'],
  runningStandard: ['Running Standard', 'info'],
  standardError: ['Error running Standard', 'error'],
  standardOk: ['Standard finished OK', 'info'],
  skipStandard: ['Skipping Standard', 'warn'],
  runningSuiteType: ['Running suites of type "{{data.type}}"', 'info'],
  skipSuiteType: ['Skipping suites of type "{{data.type}}"', 'warn'],
  serviceLog: [`"{{data.service}}" log =>${utils.NO_COLOR_SEP} {{{data.log}}}`, 'trace'],
  dockerComposeLogs: [`Docker logs =>`, 'log'],
  dockerVolumesDown: ['Unmounting docker-compose volumes', 'debug'],
  dockerDown: ['Stopping docker-compose', 'debug'],
  dockerUp: ['Starting docker-compose', 'debug']
}

const Log = function (message, level, preData = {}) {
  const template = handlebars.compile(message)
  return function (data, trace, customLevel) {
    let rendered
    if (_.isString(data)) {
      trace = true
      customLevel = data
    } else if (_.isString(trace)) {
      customLevel = trace
      trace = true
    } else if (_.isBoolean(data)) {
      customLevel = trace
      trace = data
    }
    data = Object.assign({}, preData, data)
    rendered = template({
      data: data
    })
    if (trace !== false) {
      tracer[customLevel || level](rendered)
    }
    return rendered
  }
}

const SuiteLogger = function (suiteConfig) {
  const suiteTypeName = suiteConfig.typeName()
  const suiteName = suiteConfig.name()
  const fullName = `"${suiteTypeName}" suite "${suiteName}"`
  let loggers = {}

  const SuiteLog = function (template) {
    return new Log(template[0], template[1], {
      suiteTypeName: suiteTypeName,
      suiteName: suiteName,
      fullName: fullName
    })
  }

  _.each(SERVICE_LOGS, (template, templateName) => {
    loggers[templateName] = new SuiteLog(template)
  })

  return loggers
}

const buildLogs = function () {
  let loggers = {}
  _.each(LOGS, (template, templateName) => {
    loggers[templateName] = new Log(template[0], template[1])
  })
  return loggers
}

module.exports = Object.assign({}, buildLogs(), {
  SuiteLogger: SuiteLogger
})
