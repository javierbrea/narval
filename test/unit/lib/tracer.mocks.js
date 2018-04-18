
const test = require('../../../index')

const tracer = require('../../../lib/tracer')

const Mock = function () {
  const sandbox = test.sinon.sandbox.create()

  const stubs = {
    log: sandbox.stub(tracer, 'log'),
    trace: sandbox.stub(tracer, 'trace'),
    info: sandbox.stub(tracer, 'info'),
    warn: sandbox.stub(tracer, 'warn'),
    debug: sandbox.stub(tracer, 'debug')
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
