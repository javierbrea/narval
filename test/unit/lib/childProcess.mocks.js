
const childProcess = require('child_process')

const test = require('../../../index')
const utils = require('../utils')

const Mock = function () {
  const sandbox = test.sinon.sandbox.create()
  let forkStub
  let forkOnFake
  let forkSendFake
  let execSync
  let spawnStub
  let spawnStdoutOnFake
  let spawnStderrOnFake
  let spawnOnFake

  forkOnFake = new utils.CallBackRunnerFake({
    runOnRegister: true
  })
  forkSendFake = sandbox.stub()

  forkStub = sandbox.stub(childProcess, 'fork').returns({
    on: forkOnFake.fake,
    send: forkSendFake
  })

  forkStub.on = {
    returns: forkOnFake.returns,
    runOnRegister: forkOnFake.runOnRegister
  }

  forkStub.send = forkSendFake

  execSync = sandbox.stub(childProcess, 'execSync')

  spawnStdoutOnFake = new utils.CallBackRunnerFake({
    runOnRegister: true
  })
  spawnStderrOnFake = new utils.CallBackRunnerFake()
  spawnOnFake = new utils.CallBackRunnerFake({
    runOnRegister: true,
    returns: 0
  })

  spawnStub = sandbox.stub(childProcess, 'spawn').returns({
    stdout: {
      setEncoding: sandbox.stub(),
      on: spawnStdoutOnFake.fake
    },
    stderr: {
      on: spawnStderrOnFake.fake
    },
    on: spawnOnFake.fake
  })

  spawnStub.stdout = {
    on: {
      returns: spawnStdoutOnFake.returns,
      runOnRegister: spawnStdoutOnFake.runOnRegister,
      run: spawnStdoutOnFake.run
    }
  }

  spawnStub.stderr = {
    on: {
      returns: spawnStderrOnFake.returns,
      runOnRegister: spawnStderrOnFake.runOnRegister,
      run: spawnStderrOnFake.run
    }
  }

  spawnStub.on = {
    fake: spawnOnFake.fake,
    returns: spawnOnFake.returns,
    runOnRegister: spawnOnFake.runOnRegister,
    run: spawnOnFake.run
  }

  const restore = function () {
    sandbox.restore()
  }

  return {
    stubs: {
      fork: forkStub,
      execSync: execSync,
      spawn: spawnStub
    },
    restore: restore
  }
}

module.exports = Mock
