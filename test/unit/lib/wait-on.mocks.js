
const test = require('../../../index')

const waitOn = require('../../../lib/wait-on')

const Mock = function () {
  const sandbox = test.sinon.createSandbox()

  const stubs = {
    wait: sandbox.stub(waitOn, 'wait').usingPromise().resolves(),
    configToArguments: sandbox.stub(waitOn, 'configToArguments')
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
