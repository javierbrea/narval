
const test = require('../../../index')

const commands = require('../../../lib/commands')

const Mock = function () {
  const sandbox = test.sinon.sandbox.create()

  let stubs = {
    run: sandbox.stub(commands, 'run').usingPromise().resolves(),
    runBefore: sandbox.stub(commands, 'runBefore').usingPromise().resolves(),
    runComposeSync: sandbox.stub(commands, 'runComposeSync').usingPromise().resolves()
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
