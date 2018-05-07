
const os = require('os')

const Promise = require('bluebird')

const test = require('../../../index')
const mocks = require('../mocks')

const commands = require('../../../lib/commands')
const options = require('../../../lib/options')

test.describe.skip('commands', () => {
  test.describe('run method', () => {
    const fooCommand = 'fooCommand'
    const fooCmdWindowsPath = 'fooCmdWindowsPath'
    let sandbox
    let childProcessMock
    let oldComSpec

    test.beforeEach(() => {
      sandbox = test.sinon.sandbox.create()
      childProcessMock = new mocks.ChildProcess()
      sandbox.spy(console, 'log')
      sandbox.stub(os, 'platform').returns('linux')
      sandbox.stub(options, 'get').usingPromise().resolves({})
      childProcessMock.stubs.spawn.on.returns(0)
      oldComSpec = process.env.ComSpec
      process.env.ComSpec = fooCmdWindowsPath
    })

    test.afterEach(() => {
      process.env.ComSpec = oldComSpec
      childProcessMock.restore()
      sandbox.restore()
    })

    test.it('should return a promise', () => {
      return commands.run(fooCommand)
        .then(() => {
          return test.expect(true).to.be.true()
        })
    })

    test.it('should execute an "sh -c" spawn child process in Unix systems', () => {
      return commands.run(fooCommand)
        .then(() => {
          const spawnCall = childProcessMock.stubs.spawn.getCall(0)
          return Promise.all([
            test.expect(spawnCall.args[0]).to.equal('sh'),
            test.expect(spawnCall.args[1][0]).to.equal('-c')
          ])
        })
    })

    test.it('should execute a "cmd.exe /d /s /c" spawn child process in Windows systems', () => {
      os.platform.returns('win32')
      return commands.run(fooCommand)
        .then(() => {
          const spawnCall = childProcessMock.stubs.spawn.getCall(0)
          return Promise.all([
            test.expect(spawnCall.args[0]).to.equal(fooCmdWindowsPath),
            test.expect(spawnCall.args[1][0]).to.equal('/d'),
            test.expect(spawnCall.args[1][1]).to.equal('/s'),
            test.expect(spawnCall.args[1][2]).to.equal('/c')
          ])
        })
    })

    test.it('should execute a custom spawn child process when option shell is received', () => {
      options.get.resolves({
        shell: 'custom/path/to/command.exe /f /g /h'
      })
      return commands.run(fooCommand)
        .then(() => {
          const spawnCall = childProcessMock.stubs.spawn.getCall(0)
          return Promise.all([
            test.expect(spawnCall.args[0]).to.equal('custom/path/to/command.exe'),
            test.expect(spawnCall.args[1][0]).to.equal('/f'),
            test.expect(spawnCall.args[1][1]).to.equal('/g'),
            test.expect(spawnCall.args[1][2]).to.equal('/h')
          ])
        })
    })

    test.it('should add the cwd path to the received command', () => {
      return commands.run(fooCommand)
        .then(() => {
          return test.expect(childProcessMock.stubs.spawn.getCall(0).args[1][1].indexOf(process.cwd())).to.equal(0)
        })
    })

    test.it('should pass the environment variables received in options to the child process', () => {
      const fooEnv = {
        fooVar1: 'foo value 1',
        fooVar2: 'foo value 2'
      }
      return commands.run(fooCommand, {
        env: fooEnv
      })
        .then(() => {
          const envVars = childProcessMock.stubs.spawn.getCall(0).args[2].env
          return Promise.all([
            test.expect(envVars.fooVar1).to.equal(fooEnv.fooVar1),
            test.expect(envVars.fooVar2).to.equal(fooEnv.fooVar2)
          ])
        })
    })

    test.it('should resolve the promise with the initialized process when option "sync" is not received', () => {
      return commands.run(fooCommand)
        .then((result) => {
          return test.expect(result.on).to.not.be.undefined()
        })
    })

    test.describe('when the option "sync" is received', () => {
      const option = {
        sync: true
      }

      test.it('should resolve the promise with 0 when the process is closed with code 0', () => {
        return commands.run(fooCommand, option)
          .then((code) => {
            return test.expect(code).to.equal(0)
          })
      })

      test.it('should reject the promise with an error specifying the code when the process is closed with code different to 0', () => {
        const errorCode = 3
        childProcessMock.stubs.spawn.on.returns(errorCode)
        return commands.run(fooCommand, option)
          .catch((error) => {
            return test.expect(error.message).to.include(`Exit code ${errorCode}`)
          })
      })
    })

    test.describe('when logging data from the child process', () => {
      const option = {
        sync: true
      }
      test.beforeEach(() => {
        childProcessMock.stubs.spawn.stdout.on.runOnRegister(true)
      })

      test.it('should log the data received from the execution, aplying a trim function', () => {
        const fooData = 'foo process data'
        childProcessMock.stubs.spawn.stdout.on.returns(`   ${fooData}    `)

        return commands.run(fooCommand, option).then(() => {
          return test.expect(console.log).to.have.been.calledWith(fooData)
        })
      })

      test.it('should log the errors received from the execution, aplying a trim function', () => {
        const fooData = 'foo error data'
        childProcessMock.stubs.spawn.stderr.on.runOnRegister(true)
        childProcessMock.stubs.spawn.stderr.on.returns(`   ${fooData}    `)
        return commands.run(fooCommand, option).then(() => {
          return test.expect(console.log).to.have.been.calledWith(fooData)
        })
      })

      test.it('should not log empty data received from the execution', () => {
        const fooData = '   '
        childProcessMock.stubs.spawn.stdout.on.returns(fooData)
        return commands.run(fooCommand, option).then(() => {
          return test.expect(console.log).to.not.have.been.calledWith(fooData)
        })
      })
    })
  })
})
