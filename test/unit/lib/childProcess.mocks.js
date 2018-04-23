
const childProcess = require('child_process')

const test = require('../../../index')

const Mock = function () {
  const sandbox = test.sinon.sandbox.create()
  let forkStub
  let forkOnFake
  let forkSendFake
  let execSync
  let execFileSyncStub
  let execFileStub
  let execFileStdoutOnFake
  let execFileStderrOnFake
  let execFileOnFake

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
  execFileSyncStub = sandbox.stub(childProcess, 'execFileSync')

  execFileStdoutOnFake = new CallBackRunnerFake({
    runOnRegister: true
  })
  execFileStderrOnFake = new CallBackRunnerFake()
  execFileOnFake = new CallBackRunnerFake({
    runOnRegister: true,
    returns: 0
  })

  execFileStub = sandbox.stub(childProcess, 'execFile').returns({
    stdout: {
      setEncoding: sandbox.stub(),
      on: execFileStdoutOnFake.fake
    },
    stderr: {
      on: execFileStderrOnFake.fake
    },
    on: execFileOnFake.fake
  })

  execFileStub.stdout = {
    on: {
      returns: execFileStdoutOnFake.returns,
      runOnRegister: execFileStdoutOnFake.runOnRegister
    }
  }

  execFileStub.stderr = {
    on: {
      returns: execFileStderrOnFake.returns,
      runOnRegister: execFileStderrOnFake.runOnRegister
    }
  }

  execFileStub.on = {
    fake: execFileOnFake.fake,
    returns: execFileOnFake.returns,
    runOnRegister: execFileOnFake.runOnRegister
  }

  const restore = function () {
    sandbox.restore()
  }

  return {
    stubs: {
      fork: forkStub,
      execSync: execSync,
      execFileSync: execFileSyncStub,
      execFile: execFileStub
    },
    restore: restore
  }
}

module.exports = Mock
