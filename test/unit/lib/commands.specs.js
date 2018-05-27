
const os = require('os')
const Boom = require('boom')
const path = require('path')

const test = require('../../../index')
const mocks = require('../mocks')

const commands = require('../../../lib/commands')

test.describe('commands', () => {
  const fooCommand = 'fooCommand'
  const fooCmdWindowsPath = 'fooCmdWindowsPath'
  let sandbox
  let oldComSpec
  let mocksSandbox

  test.beforeEach(() => {
    sandbox = test.sinon.sandbox.create()
    mocksSandbox = new mocks.Sandbox([
      'options',
      'processes',
      'paths',
      'logs',
      'utils',
      'config'
    ])
    sandbox.stub(os, 'platform').returns('linux')
    oldComSpec = process.env.ComSpec
    process.env.ComSpec = fooCmdWindowsPath
  })

  test.afterEach(() => {
    process.env.ComSpec = oldComSpec
    sandbox.restore()
    mocksSandbox.restore()
  })

  test.describe('run method', () => {
    test.it('should return a promise', () => {
      return commands.run(fooCommand)
        .then(() => {
          return test.expect(true).to.be.true()
        })
    })

    test.it('should call to execute an "sh -c" spawn child process in Unix systems', () => {
      return commands.run(fooCommand)
        .then(() => {
          const spawnCall = mocksSandbox.processes.stubs.spawn.getCall(0)
          return Promise.all([
            test.expect(spawnCall.args[0]).to.equal('sh'),
            test.expect(spawnCall.args[1].args[0]).to.equal('-c')
          ])
        })
    })

    test.it('should execute a "cmd.exe /d /s /c" spawn child process in Windows systems', () => {
      os.platform.returns('win32')
      return commands.run(fooCommand)
        .then(() => {
          const spawnCall = mocksSandbox.processes.stubs.spawn.getCall(0)
          return Promise.all([
            test.expect(spawnCall.args[0]).to.equal(fooCmdWindowsPath),
            test.expect(spawnCall.args[1].args[0]).to.equal('/d'),
            test.expect(spawnCall.args[1].args[1]).to.equal('/s'),
            test.expect(spawnCall.args[1].args[2]).to.equal('/c')
          ])
        })
    })

    test.it('should execute a custom spawn child process when option shell is received', () => {
      const fooShell = 'custom/path/to/command.exe'
      mocksSandbox.options.stubs.get.resolves({
        shell: `${fooShell} /f /g /h`
      })
      mocksSandbox.utils.stubs.commandArguments.returns({
        command: fooShell,
        arguments: ['/f', '/g', '/h']
      })
      return commands.run(fooCommand)
        .then(() => {
          const spawnCall = mocksSandbox.processes.stubs.spawn.getCall(0)
          return Promise.all([
            test.expect(spawnCall.args[0]).to.equal(fooShell),
            test.expect(spawnCall.args[1].args[0]).to.equal('/f'),
            test.expect(spawnCall.args[1].args[1]).to.equal('/g'),
            test.expect(spawnCall.args[1].args[2]).to.equal('/h')
          ])
        })
    })

    test.it('should add the cwd path to the received command', () => {
      return commands.run(fooCommand)
        .then(() => {
          return test.expect(mocksSandbox.processes.stubs.spawn.getCall(0).args[1].args[1].indexOf(process.cwd())).to.equal(0)
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
          const envVars = mocksSandbox.processes.stubs.spawn.getCall(0).args[1].options.env
          return Promise.all([
            test.expect(envVars.fooVar1).to.equal(fooEnv.fooVar1),
            test.expect(envVars.fooVar2).to.equal(fooEnv.fooVar2)
          ])
        })
    })

    test.it('should create a logs Handler that will emit an event when closed, passing the created child process and the suite information', () => {
      const fooSuiteData = {
        type: 'fooType',
        suite: 'fooSuite',
        service: 'fooService'
      }
      return commands.run(fooCommand, fooSuiteData).then(() => {
        const handlerArguments = mocksSandbox.processes.stubs.Handler.getCall(0).args
        return Promise.all([
          test.expect(handlerArguments[0].on).to.not.be.undefined(),
          test.expect(handlerArguments[1]).to.deep.equal(fooSuiteData),
          test.expect(handlerArguments[2]).to.deep.equal({
            close: true
          })
        ])
      })
    })

    test.it('should reject the promise if the process emits an error', () => {
      const errorMessage = 'foo error message'
      const err = new Error(errorMessage)
      mocksSandbox.processes.stubs.spawn.on.runOnRegister(true)
      mocksSandbox.processes.stubs.spawn.on.returns(err)
      return commands.run(fooCommand)
        .then(() => {
          return Promise.reject(new Error())
        })
        .catch((error) => {
          return Promise.all([
            test.expect(mocksSandbox.logs.stubs.errorRunningCommand).to.have.been.calledWith({
              message: errorMessage
            }),
            test.expect(error.message).to.equal(err.message)
          ])
        })
    })

    test.it('should resolve the promise with the initialized process and the logs Handler when option "sync" is not received', () => {
      return commands.run(fooCommand)
        .then((result) => {
          return Promise.all([
            test.expect(result.process.on).to.not.be.undefined(),
            test.expect(result.logs.on).to.not.be.undefined()
          ])
        })
    })

    test.describe('when the option "sync" is received', () => {
      const option = {
        sync: true
      }

      test.beforeEach(() => {
        mocksSandbox.processes.stubs.Handler.on.runOnRegister(true)
      })

      test.it('should resolve the promise with 0 when the logs process is closed with code 0 or null', () => {
        mocksSandbox.processes.stubs.Handler.on.returns({
          processCode: 0
        })
        return commands.run(fooCommand, option)
          .then((code) => {
            return test.expect(code).to.equal(0)
          })
      })

      test.it('should reject the promise with an error specifying the code when the process is closed with code different to 0 or null', () => {
        const errorCode = 3
        const fooErrorMessage = 'foo error'
        mocksSandbox.processes.stubs.Handler.on.returns({
          processCode: errorCode
        })
        mocksSandbox.logs.stubs.errorRunningCommandCode.returns(fooErrorMessage)
        return commands.run(fooCommand, option)
          .then(() => {
            return Promise.reject(new Error())
          })
          .catch((err) => {
            return Promise.all([
              test.expect(mocksSandbox.logs.stubs.errorRunningCommandCode).to.have.been.calledWith({
                code: errorCode
              }),
              test.expect(err.message).to.equal(fooErrorMessage)
            ])
          })
      })
    })
  })

  test.describe('runBefore method', () => {
    const beforeCommand = 'foo-before-command.sh'
    let configMock
    let loggerMock

    test.beforeEach(() => {
      mocksSandbox.processes.stubs.Handler.on.returns({
        processCode: 0
      })
      mocksSandbox.processes.stubs.Handler.on.runOnRegister(true)
      configMock = new mocksSandbox.config.stubs.SuiteResolver()
      configMock.beforeCommand.returns(beforeCommand)
      loggerMock = new mocksSandbox.logs.stubs.SuiteLogger()
    })

    test.it('should log the execution of the "before" command', () => {
      return commands.runBefore(configMock, loggerMock)
        .then(() => {
          return test.expect(loggerMock.beforeCommand).to.have.been.calledWith({
            command: beforeCommand
          })
        })
    })

    test.it('should run the "before" command retrieved from suite config resolver, adding the cwd path to it', () => {
      mocksSandbox.utils.stubs.commandArguments.returns({
        command: beforeCommand,
        joinedArguments: ''
      })
      sandbox.stub(process, 'cwd').returns('fooCwdPath')

      return commands.runBefore(configMock, loggerMock)
        .then(() => {
          const spawnArguments = mocksSandbox.processes.stubs.spawn.getCall(0).args
          return test.expect(spawnArguments[1].args[spawnArguments[1].args.length - 1]).to.include(path.join('fooCwdPath', beforeCommand))
        })
    })

    test.it('should respect the arguments of the command and pass them as they are, not changing folder separators', () => {
      const joinedArguments = '//testing\\fol///der//paths\\seps/'
      mocksSandbox.utils.stubs.commandArguments.returns({
        command: beforeCommand,
        joinedArguments: joinedArguments
      })

      return commands.runBefore(configMock, loggerMock)
        .then(() => {
          const spawnArguments = mocksSandbox.processes.stubs.spawn.getCall(0).args
          return test.expect(spawnArguments[1].args[spawnArguments[1].args.length - 1]).to.include(joinedArguments)
        })
    })

    test.it('should pass the suite data retrieved from config to the "run" method', () => {
      const fooType = 'foo suite type'
      const fooSuite = 'foo suite name'
      const fooEnvVal = 'foo environment value'
      const fooEnvVars = {
        fooEnv: fooEnvVal
      }
      configMock.typeName.returns(fooType)
      configMock.name.returns(fooSuite)
      configMock.beforeEnvVars.returns(fooEnvVars)

      return commands.runBefore(configMock, loggerMock)
        .then(() => {
          const handlerArguments = mocksSandbox.processes.stubs.Handler.getCall(0).args[1]
          return Promise.all([
            test.expect(mocksSandbox.processes.stubs.spawn.getCall(0).args[1].options.env.fooEnv).to.equal(fooEnvVal),
            test.expect(handlerArguments.type).to.equal(fooType),
            test.expect(handlerArguments.suite).to.equal(fooSuite),
            test.expect(handlerArguments.service).to.equal('before')
          ])
        })
    })

    test.it('should do nothing if no "before" command is returned by config', () => {
      configMock.beforeCommand.returns(null)
      return commands.runBefore(configMock, loggerMock)
        .then(() => {
          return test.expect(mocksSandbox.processes.stubs.spawn).to.not.have.been.called()
        })
    })
  })

  test.describe('runComposeSync method', () => {
    const fooCommand = 'foo compose command'

    test.it('should print a log about the the compose execution', () => {
      return commands.runComposeSync(fooCommand)
        .then(() => {
          return test.expect(mocksSandbox.logs.stubs.runningComposeCommand).to.have.been.calledWith({
            command: fooCommand
          })
        })
    })

    test.it('should call to exec a compose process synchronously with the received command', () => {
      return commands.runComposeSync(fooCommand)
        .then(() => {
          const execSyncArguments = mocksSandbox.processes.stubs.execSync.getCall(0).args
          return test.expect(execSyncArguments[0]).to.include(fooCommand)
        })
    })

    test.it('should extend the base docker options with the received options', () => {
      const fooOptionVal = 'foo value'
      const fooDockerPath = 'foo docker path'
      mocksSandbox.paths.stubs.docker.returns(fooDockerPath)
      return commands.runComposeSync(fooCommand, {
        fooOption: fooOptionVal
      })
        .then(() => {
          const execSyncArguments = mocksSandbox.processes.stubs.execSync.getCall(0).args
          return Promise.all([
            test.expect(execSyncArguments[1].fooOption).to.equal(fooOptionVal),
            test.expect(execSyncArguments[1].encoding).to.equal('utf8'),
            test.expect(execSyncArguments[1].cwd).to.equal(fooDockerPath)
          ])
        })
    })

    test.it('should reject the promise with a controlled error if the command execution fails', () => {
      const fooErrorMessage = 'foo merror message'
      mocksSandbox.logs.stubs.composeCommandFailed.returns(fooErrorMessage)
      sandbox.spy(Boom, 'badImplementation')
      mocksSandbox.processes.stubs.execSync.throws(new Error())
      return commands.runComposeSync(fooCommand)
        .then(() => {
          return Promise.reject(new Error())
        })
        .catch((err) => {
          return Promise.all([
            test.expect(err.message).to.equal(fooErrorMessage),
            test.expect(mocksSandbox.logs.stubs.composeCommandFailed).to.have.been.calledWith({
              command: fooCommand
            }),
            test.expect(Boom.badImplementation).to.have.been.calledWith(fooErrorMessage)
          ])
        })
    })
  })
})
