
const Boom = require('boom')
const mochaSinonChaiRunner = require('mocha-sinon-chai/runner')

const childProcess = require('child_process')

const test = require('../../../index')
const mocks = require('../mocks')

const states = require('../../../lib/states')
const suiteLocal = require('../../../lib/suite-local')

const StdinOnFake = function (options) {
  options = options || {}

  const fake = function (eventName, cb) {
    cb(options.returns)
  }

  const returns = function (data) {
    options.returns = data
  }

  return {
    fake: fake,
    returns: returns
  }
}

test.describe('suite-local', () => {
  let sandbox
  let mocksSandbox
  let stdinOnFake

  test.beforeEach(() => {
    sandbox = test.sinon.sandbox.create()
    mocksSandbox = new mocks.Sandbox([
      'commands',
      'config',
      'logs',
      'waiton',
      'libs',
      'paths',
      'utils',
      'processes'
    ])
    stdinOnFake = new StdinOnFake()
    sandbox.stub(process.stdin, 'setRawMode')
    sandbox.stub(process.stdin, 'resume')
    sandbox.stub(process.stdin, 'setEncoding')
    sandbox.stub(process.stdin, 'pause')
    sandbox.stub(process.stdin, 'on').callsFake(stdinOnFake.fake)
  })

  test.afterEach(() => {
    sandbox.restore()
    mocksSandbox.restore()
  })

  test.describe('Runner constructor', () => {
    const fooCommand = 'foo-command'
    const fooServiceName = 'foo-service'
    const fooSuiteName = 'foo name'
    const fooTypeName = 'foo type name'
    let runner
    let configMock
    let loggerMock

    const run = function () {
      runner = new suiteLocal.Runner(configMock, loggerMock)
      return runner.run(configMock, loggerMock)
    }

    test.beforeEach(() => {
      configMock = new mocksSandbox.config.stubs.SuiteResolver()
      loggerMock = new mocksSandbox.logs.stubs.SuiteLogger()

      mocksSandbox.processes.stubs.Handler.on.runOnRegister(true)
      mocksSandbox.processes.stubs.childProcess.stubs.fork.on.runOnRegister(true)
      mocksSandbox.commands.stubs.run.resolves({
        process: mocksSandbox.processes.stubs.spawn,
        logs: new mocksSandbox.processes.stubs.Handler()
      })
      mocksSandbox.processes.stubs.fork.resolves(childProcess.fork())

      configMock.name.returns(fooSuiteName)
      configMock.typeName.returns(fooTypeName)
      mocksSandbox.config.stubs.serviceResolver.command.returns(fooCommand)
      mocksSandbox.config.stubs.serviceResolver.name.returns(fooServiceName)

      process.env.fooProcessEnv = 'foo process env'
    })

    test.afterEach(() => {
      delete process.env.fooProcessEnv
    })

    test.describe('when running a single service', () => {
      test.beforeEach(() => {
        mocksSandbox.processes.stubs.fork.resolves(childProcess.fork())
      })

      test.it('should not execute the "before" command', () => {
        return run().then(() => {
          return test.expect(mocksSandbox.commands.stubs.runBefore).to.not.have.been.called()
        })
      })
    })

    test.describe('when running a service', () => {
      test.it('should have executed the waitOn defined in config', () => {
        const fooWaitOn = 'foo-wait-on'
        mocksSandbox.config.stubs.serviceResolver.waitOn.returns(fooWaitOn)
        runner = new suiteLocal.Runner(configMock, loggerMock)
        return run().then(() => {
          return test.expect(mocksSandbox.waiton.stubs.wait).to.have.been.calledWith(fooWaitOn)
        })
      })

      test.describe('when service is not coveraged', () => {
        test.beforeEach(() => {
          mocksSandbox.processes.stubs.Handler.on.returns({
            processCode: 0
          })
          mocksSandbox.config.stubs.serviceResolver.isCoveraged.returns(false)
        })

        test.it('should print a log with service name', () => {
          return run().then(() => {
            return test.expect(mocksSandbox.logs.stubs.suiteLogger.startService).to.have.been.calledWith({
              service: fooServiceName
            })
          })
        })

        test.it('should resolve the promise if service has not command configured', () => {
          mocksSandbox.config.stubs.serviceResolver.command.returns(undefined)
          return run().then(() => {
            return Promise.all([
              test.expect(mocksSandbox.processes.stubs.fork).to.not.have.been.called(),
              test.expect(mocksSandbox.commands.stubs.run).to.not.have.been.called()
            ])
          })
        })

        test.it('should call to run command', () => {
          return run().then(() => {
            return Promise.all([
              test.expect(mocksSandbox.logs.stubs.suiteLogger.serviceClose.getCall(0).args[1]).to.equal('debug'),
              test.expect(mocksSandbox.commands.stubs.run).to.have.been.calledWith(fooCommand),
              test.expect(mocksSandbox.processes.stubs.fork).to.not.have.been.called()
            ])
          })
        })

        test.it('should send the environment variables from config to the command execution', () => {
          const fooEnvVars = {
            fooVar1: 'foo',
            fooVar2: 'foo var 2'
          }

          mocksSandbox.config.stubs.serviceResolver.envVars.returns(fooEnvVars)
          return run().then(() => {
            const commandArgs = mocksSandbox.commands.stubs.run.getCall(0).args
            return Promise.all([
              test.expect(commandArgs[0]).to.equal(fooCommand),
              test.expect(commandArgs[1].env).to.equal(fooEnvVars),
              test.expect(commandArgs[1].type).to.equal(fooTypeName),
              test.expect(commandArgs[1].suite).to.equal(fooSuiteName),
              test.expect(commandArgs[1].service).to.equal(fooServiceName)
            ])
          })
        })

        test.it('should not reject the promise if command is closed with a code different to 0, but config says that has not to abort on close', () => {
          mocksSandbox.config.stubs.serviceResolver.abortOnError.returns(false)
          mocksSandbox.processes.stubs.Handler.on.returns({
            processCode: 1
          })
          return run()
            .then(() => {
              return Promise.all([
                test.expect(mocksSandbox.logs.stubs.suiteLogger.serviceClose.getCall(0).args[1]).to.equal('warn'),
                test.expect(mocksSandbox.logs.stubs.suiteLogger.serviceClose.getCall(0).args[0].name).to.equal(fooServiceName)
              ])
            })
        })

        test.it('should trace the close code as "null" if receives null as close code', () => {
          mocksSandbox.config.stubs.serviceResolver.abortOnError.returns(false)
          mocksSandbox.processes.stubs.Handler.on.returns({
            processCode: null
          })
          return run()
            .then(() => {
              return Promise.all([
                test.expect(mocksSandbox.logs.stubs.suiteLogger.serviceClose.getCall(0).args[0].code).to.equal('null'),
                test.expect(mocksSandbox.logs.stubs.suiteLogger.serviceClose.getCall(0).args[0].name).to.equal(fooServiceName)
              ])
            })
        })

        test.it('should reject the promise with a controlled error if command is closed with a code different to 0 and config says that has to abort on close', () => {
          mocksSandbox.config.stubs.serviceResolver.abortOnError.returns(true)
          mocksSandbox.processes.stubs.Handler.on.returns({
            processCode: 1
          })
          return run()
            .then(() => {
              return Promise.reject(new Error())
            })
            .catch((err) => {
              return Promise.all([
                test.expect(mocksSandbox.logs.stubs.suiteLogger.serviceClose.getCall(0).args[1]).to.equal('error'),
                test.expect(mocksSandbox.logs.stubs.suiteLogger.serviceClose.getCall(0).args[0].name).to.equal(fooServiceName),
                test.expect(Boom.isBoom(err)).to.be.true()
              ])
            })
        })
      })

      test.describe('when service is coveraged', () => {
        test.beforeEach(() => {
          mocksSandbox.config.stubs.serviceResolver.isCoveraged.returns(true)
        })

        test.it('should print a log with service name', () => {
          return run().then(() => {
            return test.expect(mocksSandbox.logs.stubs.suiteLogger.startCoveragedService).to.have.been.calledWith({
              service: fooServiceName
            })
          })
        })

        test.it('should call to open a child process fork', () => {
          return run().then(() => {
            return Promise.all([
              test.expect(mocksSandbox.commands.stubs.run).to.not.have.been.called(),
              test.expect(mocksSandbox.processes.stubs.fork).to.have.been.called()
            ])
          })
        })

        test.it('should add istanbul configuration, environment variables and command arguments to the istanbul execution', () => {
          const fooIstanbulArgs = '--fooOption=foo --foo'
          const fooEnvVar = 'foo value'
          configMock.istanbulArguments.returns(fooIstanbulArgs)
          mocksSandbox.config.stubs.serviceResolver.envVars.returns({
            fooEnv: fooEnvVar
          })
          mocksSandbox.utils.stubs.commandArguments.returns({
            command: fooCommand,
            arguments: ['fooarg1', 'fooarg2']
          })
          return run().then(() => {
            const forkArgs = mocksSandbox.processes.stubs.fork.getCall(0).args
            return Promise.all([
              test.expect(forkArgs[1].options.env.servicePath).to.contain(fooCommand),
              test.expect(forkArgs[1].options.env.fooProcessEnv).to.equal('foo process env'),
              test.expect(forkArgs[1].options.env.fooEnv).to.equal(fooEnvVar),
              test.expect(forkArgs[1].args[0]).to.equal('--fooOption=foo'),
              test.expect(forkArgs[1].args[1]).to.equal('--foo'),
              test.expect(forkArgs[1].args[2]).to.equal('cover'),
              test.expect(forkArgs[1].args[forkArgs[1].args.length - 2]).to.equal('fooarg1'),
              test.expect(forkArgs[1].args[forkArgs[1].args.length - 1]).to.equal('fooarg2')
            ])
          })
        })

        test.describe('when it is started in "alone" mode', () => {
          test.it('should set the process stdin to raw mode, in order to intercept CTRL-C and stop the service', () => {
            return run().then(() => {
              return Promise.all([
                test.expect(process.stdin.setRawMode).to.have.been.called(),
                test.expect(process.stdin.resume).to.have.been.called()
              ])
            })
          })

          test.it('should intercept the CTRL-C and send and exit signal to service', () => {
            stdinOnFake.returns('\u0003')
            return run().then(() => {
              return Promise.all([
                test.expect(mocksSandbox.processes.stubs.childProcess.stubs.fork.send).to.have.been.calledWith({exit: true}),
                test.expect(mocksSandbox.logs.stubs.suiteLogger.forceServiceExit).to.have.been.called()
              ])
            })
          })

          test.it('should restore the stdin raw mode, and stop intercepting CTRL-C when process finish', () => {
            return run().then(() => {
              return Promise.all([
                test.expect(process.stdin.setRawMode).to.have.been.calledTwice(),
                test.expect(process.stdin.pause).to.have.been.called()
              ])
            })
          })
        })

        test.describe('when all suite is ran', () => {
          test.it('should not set the process stdin to raw mode when all suite is ran', () => {
            mocksSandbox.processes.stubs.fork.onCall(1).resolves(0)
            configMock.singleServiceToRun.returns(false)
            return run().then(() => {
              return Promise.all([
                test.expect(process.stdin.setRawMode).to.not.have.been.called(),
                test.expect(process.stdin.resume).to.not.have.been.called()
              ])
            })
          })
        })
      })
    })

    test.describe('when running test', () => {
      test.beforeEach(() => {
        configMock.singleServiceToRun.returns(false)
        configMock.runSingleTest.returns(true)
        mocksSandbox.processes.stubs.fork.resolves(0)
        sandbox.stub(states, 'set')
        sandbox.stub(mochaSinonChaiRunner, 'run').resolves()
      })

      test.it('should not execute the "before" command when it is ran alone', () => {
        return run().then(() => {
          return test.expect(mocksSandbox.commands.stubs.runBefore).to.not.have.been.called()
        })
      })

      test.it('should execute the "waitOn" specified in config', () => {
        const fooTestConfig = {
          fooConfig1: 'foo'
        }
        configMock.testWaitOn.returns(fooTestConfig)
        return run().then(() => {
          return test.expect(mocksSandbox.waiton.stubs.wait).to.have.been.calledWith(fooTestConfig)
        })
      })

      test.it('should mark the process as failed and reject the promise if waitOn fails', () => {
        const waitError = new Error('foo wait on error')
        const fooErrorMessage = 'foo error message'
        mocksSandbox.logs.stubs.suiteLogger.mochaFailed.returns(fooErrorMessage)
        mocksSandbox.waiton.stubs.wait.rejects(waitError)
        return run().then(() => {
          return Promise.reject(new Error())
        }).catch((err) => {
          return Promise.all([
            test.expect(states.set).to.have.been.calledWith('exit-with-error'),
            test.expect(Boom.isBoom(err)).to.be.true(),
            test.expect(err.message).to.equal(fooErrorMessage)
          ])
        })
      })

      test.describe('when running tests without coverage', () => {
        test.it('should print a log when starts test execution', () => {
          return run().then(() => {
            return test.expect(mocksSandbox.logs.stubs.suiteLogger.startTestNotCoveraged).to.have.been.called()
          })
        })

        test.it('should open a child process fork, passing the mocha configuration and environment variables', () => {
          const fooMochaArgs = 'fooArg1=fooVal --fooArg2=foo'
          const fooEnvVars = {
            fooEnv1: 'fooVal1'
          }
          configMock.testEnvVars.returns(fooEnvVars)
          configMock.mochaArguments.returns(fooMochaArgs)
          return run().then(() => {
            const forkArgs = mocksSandbox.processes.stubs.fork.getCall(0).args[1]
            return Promise.all([
              test.expect(forkArgs.args).to.deep.equal([
                'fooArg1=fooVal',
                '--fooArg2=foo'
              ]),
              test.expect(forkArgs.options.env.fooEnv1).to.equal('fooVal1'),
              test.expect(forkArgs.options.env.fooProcessEnv).to.equal('foo process env')
            ])
          })
        })

        test.it('should reject the promise if the process ends with a code different to 0', () => {
          const fooErrorMessage = 'foo error message 2'
          mocksSandbox.processes.stubs.fork.resolves(1)
          mocksSandbox.logs.stubs.suiteLogger.mochaFailed.returns(fooErrorMessage)
          return run().then(() => {
            return Promise.reject(new Error())
          }).catch((err) => {
            return Promise.all([
              test.expect(Boom.isBoom(err)).to.be.true(),
              test.expect(err.message).to.equal(fooErrorMessage)
            ])
          })
        })
      })

      test.describe('when running tests with coverage', () => {
        test.beforeEach(() => {
          configMock.testIsCoveraged.returns(true)
        })

        test.it('should print a log when starts test execution', () => {
          return run().then(() => {
            return test.expect(mocksSandbox.logs.stubs.suiteLogger.startTestCoveraged).to.have.been.called()
          })
        })

        test.it('should have ran mocha-sinon-chai passing the istanbul an mocha config, and environment variables from config', () => {
          const fooEnvVars = {
            fooEnv1: 'fooVal1'
          }
          configMock.testEnvVars.returns(fooEnvVars)
          configMock.mochaArguments.returns('--fooMocha=foo')
          configMock.istanbulArguments.returns('--fooIst=fooVal')
          return run().then(() => {
            const mochaArgs = mochaSinonChaiRunner.run.getCall(0).args
            return Promise.all([
              test.expect(mochaArgs[0]).to.equal('--istanbul --fooIst=fooVal --mocha --fooMocha=foo'),
              test.expect(mochaArgs[1].env).to.equal(fooEnvVars)
            ])
          })
        })

        test.it('should reject the promise if mocha-sinon-chai fails', () => {
          const fooErrorMessage = 'foo error message 3'
          mochaSinonChaiRunner.run.rejects(new Error())
          mocksSandbox.logs.stubs.suiteLogger.mochaFailed.returns(fooErrorMessage)
          return run().then(() => {
            return Promise.reject(new Error())
          }).catch((err) => {
            return Promise.all([
              test.expect(Boom.isBoom(err)).to.be.true(),
              test.expect(err.message).to.equal(fooErrorMessage)
            ])
          })
        })
      })
    })

    test.describe('when running all services and test', () => {
      test.beforeEach(() => {
        configMock.singleServiceToRun.returns(false)
        configMock.runSingleTest.returns(false)
        sandbox.stub(mochaSinonChaiRunner, 'run').resolves()
        mocksSandbox.processes.stubs.fork.resolves(0)
      })

      test.it('should print a log when test execution ends', () => {
        return run().then(() => {
          return test.expect(mocksSandbox.logs.stubs.suiteLogger.testFinished).to.have.been.called()
        })
      })

      test.it('should reject the promise if the test execution ends with an error', () => {
        const fooErrorMessage = 'foo error message 2'
        mocksSandbox.processes.stubs.fork.resolves(1)
        mocksSandbox.logs.stubs.suiteLogger.mochaFailed.returns(fooErrorMessage)
        return run().then(() => {
          return Promise.reject(new Error())
        }).catch((err) => {
          return Promise.all([
            test.expect(mocksSandbox.logs.stubs.suiteLogger.testFailed).to.have.been.called(),
            test.expect(Boom.isBoom(err)).to.be.true(),
            test.expect(err.message).to.equal(fooErrorMessage)
          ])
        })
      })

      test.it('should reject the promise if the test execution ends ok, but a service with "abort-on-error" config fails', () => {
        const fooErrorMessage = 'foo local service error message'
        mocksSandbox.config.stubs.serviceResolver.abortOnError.returns(true)
        configMock.testIsCoveraged.returns(true)
        mocksSandbox.processes.stubs.fork.resolves(1)
        mocksSandbox.logs.stubs.suiteLogger.localServiceError.returns(fooErrorMessage)
        return run().then(() => {
          return Promise.reject(new Error())
        }).catch((err) => {
          return Promise.all([
            test.expect(mocksSandbox.logs.stubs.suiteLogger.testFailed).to.not.have.been.called(),
            test.expect(Boom.isBoom(err)).to.be.true(),
            test.expect(err.message).to.equal(fooErrorMessage)
          ])
        })
      })

      test.describe('when test execution has finished, but services are still running', () => {
        test.beforeEach(() => {
          configMock.testIsCoveraged.returns(true)
          mocksSandbox.processes.stubs.childProcess.stubs.fork.on.runOnRegister(false)
          mocksSandbox.config.stubs.serviceResolver.isCoveraged.returns(true)
          mocksSandbox.processes.stubs.fork.resolves(childProcess.fork())
        })

        test.it('should send an exit signal to the service process if it is coveraged, and test has finished without error', () => {
          setTimeout(() => {
            mocksSandbox.processes.stubs.childProcess.stubs.fork.on.run(0)
          }, 200)
          return run().then(() => {
            return test.expect(mocksSandbox.processes.stubs.childProcess.stubs.fork.send).to.have.been.calledWith({
              exit: true
            })
          })
        })

        test.it('should force to exit processes if test has finished with error', () => {
          mochaSinonChaiRunner.run.rejects(new Error())
          setTimeout(() => {
            mocksSandbox.processes.stubs.childProcess.stubs.fork.on.run(0)
          }, 200)
          return run().then(() => {
            return Promise.reject(new Error())
          }).catch(() => {
            return Promise.all([
              test.expect(mocksSandbox.processes.stubs.childProcess.stubs.fork.send).to.not.have.been.called(),
              test.expect(mocksSandbox.libs.stubs.treeKill).to.have.been.called()
            ])
          })
        })
      })
    })
  })
})
