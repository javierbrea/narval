
const test = require('../../../index')

const utils = require('../../../lib/utils')

const Mock = function () {
  const sandbox = test.sinon.sandbox.create()

  const stubs = {
    ObjectToArguments: sandbox.stub(utils, 'ObjectToArguments'),
    commandArguments: sandbox.stub(utils, 'commandArguments').returns({
      command: '',
      arguments: []
    }),
    serviceNameToVarName: sandbox.stub(utils, 'serviceNameToVarName'),
    extendProcessEnvVars: sandbox.stub(utils, 'extendProcessEnvVars')
  }

  const restore = function () {
    sandbox.restore()
  }

  return {
    stubs: stubs,
    restore: restore
  }
}

module.exports = Mock
