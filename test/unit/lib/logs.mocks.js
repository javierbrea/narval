
const _ = require('lodash')
const test = require('../../../index')

const logs = require('../../../lib/logs')

const Mock = function () {
  const sandbox = test.sinon.sandbox.create()

  let stubs = {
  }

  _.each(logs, (logMethod, logMethodKey) => {
    stubs[logMethodKey] = sandbox.stub(logs, logMethodKey)
  })

  stubs.SuiteLogger.restore()
  stubs.SuiteLogger = sandbox.stub(logs, 'SuiteLogger').returns() // TODO, Suite logger mock

  const restore = function () {
    sandbox.restore()
  }

  return {
    stubs: stubs,
    restore: restore
  }
}

module.exports = Mock
