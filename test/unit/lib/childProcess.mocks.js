
const childProcess = require('child_process')

const test = require('../../../index')

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

  const CallBackRunnerFake = function (options) {
    options = options || {}

    const fake = function (eventName, cb) {
      if (options.runOnRegister) {
        cb(options.returns)
      }
    }

    const returns = function (code) {
      options.returns = code
    }

    const runOnRegister = function (run) {
      options.runOnRegister = run
    }

    return {
      fake: fake,
      returns: returns,
      runOnRegister: runOnRegister
    }
  }

  forkOnFake = new CallBackRunnerFake({
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

  spawnStdoutOnFake = new CallBackRunnerFake({
    runOnRegister: true
  })
  spawnStderrOnFake = new CallBackRunnerFake()
  spawnOnFake = new CallBackRunnerFake({
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
      runOnRegister: spawnStdoutOnFake.runOnRegister
    }
  }

  spawnStub.stderr = {
    on: {
      returns: spawnStderrOnFake.returns,
      runOnRegister: spawnStderrOnFake.runOnRegister
    }
  }

  spawnStub.on = {
    fake: spawnOnFake.fake,
    returns: spawnOnFake.returns,
    runOnRegister: spawnOnFake.runOnRegister
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
