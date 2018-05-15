
const childProcess = require('child_process')

const test = require('../../../index')

const processes = require('../../../lib/processes')
const ChildProcessMocks = require('./childProcess.mocks')
const utils = require('../utils')

const Mock = function () {
  const sandbox = test.sinon.sandbox.create()
  const handlerOnFake = new utils.CallBackRunnerFake({
    runOnRegister: false
  })

  const childProcessMock = new ChildProcessMocks()
  childProcessMock.stubs.spawn.on.runOnRegister(false)

  const stubs = {
    fork: sandbox.stub(processes, 'fork'),
    spawn: sandbox.stub(processes, 'spawn').usingPromise().resolves(childProcess.spawn()),
    execSync: sandbox.stub(processes, 'execSync'),
    Handler: sandbox.stub(processes, 'Handler').returns({
      on: handlerOnFake.fake
    }),
    childProcess: childProcessMock
  }

  stubs.spawn.on = childProcessMock.stubs.spawn.on

  stubs.Handler.on = {
    returns: handlerOnFake.returns,
    runOnRegister: handlerOnFake.runOnRegister
  }

  const restore = function () {
    sandbox.restore()
    childProcessMock.restore()
  }

  return {
    stubs: stubs,
    restore: restore
  }
}

module.exports = Mock
