
const test = require('../../../index')

const options = require('../../../lib/options')

const Mock = function () {
  const sandbox = test.sinon.createSandbox()

  const stubs = {
    get: sandbox.stub(options, 'get').usingPromise().resolves({})
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
