
const _ = require('lodash')
const test = require('../../../index')

const logs = require('../../../lib/logs')

const Mock = function () {
  const sandbox = test.sinon.createSandbox()

  const suiteLoggerStubs = {
    skip: sandbox.stub(),
    startRun: sandbox.stub(),
    finishOk: sandbox.stub(),
    finishError: sandbox.stub(),
    beforeCommand: sandbox.stub(),
    mochaFailed: sandbox.stub(),
    startTestCoveraged: sandbox.stub(),
    startTestNotCoveraged: sandbox.stub(),
    testFailed: sandbox.stub(),
    testFinished: sandbox.stub(),
    localServiceError: sandbox.stub(),
    serviceClose: sandbox.stub(),
    startService: sandbox.stub(),
    startCoveragedService: sandbox.stub(),
    forceServiceExit: sandbox.stub(),
    stopDockerService: sandbox.stub(),
    startDockerService: sandbox.stub(),
    noDockerServiceConfig: sandbox.stub(),
    noDockerTestConfig: sandbox.stub(),
    dockerServicesStillRunning: sandbox.stub(),
    dockerServiceStillRunning: sandbox.stub(),
    stopAllDockerServices: sandbox.stub(),
    dockerExitCodeError: sandbox.stub(),
    dockerExitCode: sandbox.stub()
  }

  let stubs = {
    suiteLogger: suiteLoggerStubs
  }

  _.each(logs, (logMethod, logMethodKey) => {
    stubs[logMethodKey] = sandbox.stub(logs, logMethodKey)
  })

  stubs.SuiteLogger.restore()
  stubs.SuiteLogger = sandbox.stub(logs, 'SuiteLogger').returns(suiteLoggerStubs)

  const restore = function () {
    sandbox.restore()
  }

  return {
    stubs: stubs,
    restore: restore
  }
}

module.exports = Mock
