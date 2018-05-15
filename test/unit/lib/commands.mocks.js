
const test = require('../../../index')

const commands = require('../../../lib/commands')

const Mock = function () {
  const sandbox = test.sinon.sandbox.create()

  let stubs = {
    run: sandbox.stub(commands, 'run'),
    runBefore: sandbox.stub(commands, 'runBefore'),
    runComposeSync: sandbox.stub(commands, 'runComposeSync')
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
