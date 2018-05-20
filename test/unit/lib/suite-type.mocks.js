
const test = require('../../../index')

const suiteTypes = {
  suitedocker: require('../../../lib/suite-docker'),
  suitelocal: require('../../../lib/suite-local')
}

const Mock = function (mockToCreate) {
  const sandbox = test.sinon.sandbox.create()

  const runnerStubs = {
    run: sandbox.stub().usingPromise().resolves()
  }

  let stubs = {
    run: runnerStubs.run,
    Runner: sandbox.stub(suiteTypes[mockToCreate], 'Runner').returns(runnerStubs)
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
