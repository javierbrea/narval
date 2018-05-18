
const Boom = require('boom')
// const mochaSinonChaiRunner = require('mocha-sinon-chai/runner')

const childProcess = require('child_process')

const test = require('../../../index')
const mocks = require('../mocks')
// const fixtures = require('../fixtures')

const suiteLocal = require('../../../lib/suite-local')

/* const deepClone = function (obj) {
  return JSON.parse(JSON.stringify(obj))
} */

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
    })

    test.describe('when running a single service', () => {
      test.beforeEach(() => {
        mocksSandbox.processes.stubs.fork.resolves(childProcess.fork())
      })

      test.it('should not execute the "before" command', () => {
        runner = new suiteLocal.Runner(configMock, loggerMock)
        return runner.run(configMock, loggerMock)
          .then(() => {
            return test.expect(mocksSandbox.commands.stubs.runBefore).to.not.have.been.called()
          })
      })
    })

    test.describe('when running a service', () => {
      const fooCommand = 'foo-command'
      const fooServiceName = 'foo-service'
      const fooSuiteName = 'foo name'
      const fooTypeName = 'foo type name'

      test.beforeEach(() => {
        configMock.name.returns(fooSuiteName)
        configMock.typeName.returns(fooTypeName)
        mocksSandbox.config.stubs.serviceResolver.command.returns(fooCommand)
        mocksSandbox.config.stubs.serviceResolver.name.returns(fooServiceName)
      })

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
          configMock.istanbulArguments.returns(fooIstanbulArgs)
          mocksSandbox.utils.stubs.commandArguments.returns({
            command: fooCommand,
            arguments: ['fooarg1', 'fooarg2']
          })
          return run().then(() => {
            const forkArgs = mocksSandbox.processes.stubs.fork.getCall(0).args
            return Promise.all([
              // TODO, environment vars
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

        test.describe.skip('when all suite is ran', () => {
          test.it('should not set the process stdin to raw mode when all suite is ran', () => {
            // TODO, set not single mode
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
    /*
    */

    /* test.describe('when runs "before" command', () => {
      const commandPath = 'fooBeforeLocalCommand'
      const cleanEnv = {
        fooEnv1: 'fooEnv1',
        fooEnv2: 'fooEnv2'
      }

      test.beforeEach(() => {
        options.get.resolves({
        })
        localSuiteFixture.before = {
          local: {
            command: commandPath,
            env: cleanEnv
          }
        }
      })

      test.it('should execute the "before" command if it is defined in suite', () => {
        localSuiteFixture.before = {
          local: {
            command: commandPath
          }
        }
        return runner.run(localSuiteFixture).then(() => {
          return Promise.all([
            test.expect(commands.run).to.have.been.calledWith(commandPath),
            test.expect(commands.run.getCall(0).args[1].sync).to.be.true()
          ])
        })
      })

      test.it('should add custom environment variables', () => {
        return runner.run(localSuiteFixture).then(() => {
          const envValues = commands.run.getCall(0).args[1].env
          return Promise.all([
            test.expect(envValues.fooEnv1).to.equal(cleanEnv.fooEnv1),
            test.expect(envValues.fooEnv2).to.equal(cleanEnv.fooEnv2)
          ])
        })
      })
    })

    test.it('should execute only test if it is defined in "local" option', () => {
      options.get.resolves({
        local: 'test'
      })
      return runner.run(localSuiteFixture).then(() => {
        return Promise.all([
          test.expect(mochaSinonChaiRunner.run).to.have.been.called(),
          test.expect(commands.run).to.not.have.been.called()
        ])
      })
    })

    test.it('should execute only an specific service if it is defined in "local" option', () => {
      return runner.run(localSuiteFixture).then(() => {
        return Promise.all([
          test.expect(mochaSinonChaiRunner.run).to.not.have.been.called(),
          test.expect(commands.run).to.have.been.calledOnce()
        ])
      })
    })

    test.it('should execute an specific service with coverage if "coverage.from" option is defined in configuration', () => {
      const fakeServiceName = 'fooService2'
      localSuiteFixture.coverage = {
        from: fakeServiceName
      }
      options.get.resolves({
        local: fakeServiceName
      })
      return runner.run(localSuiteFixture).then(() => {
        return Promise.all([
          test.expect(commands.run).to.not.have.been.called(),
          test.expect(mochaSinonChaiRunner.run).to.not.have.been.called(),
          test.expect(childProcessMock.stubs.fork).to.have.been.called()
        ])
      })
    })

    test.it('should execute an specific service without coverage if "coverage.enabled" option is false even when coverage.from is defined in configuration', () => {
      const fakeServiceName = 'fooService2'
      localSuiteFixture.coverage = {
        from: fakeServiceName,
        enabled: false
      }
      options.get.resolves({
        local: fakeServiceName
      })
      return runner.run(localSuiteFixture).then(() => {
        return Promise.all([
          test.expect(commands.run).to.have.been.calledOnce(),
          test.expect(mochaSinonChaiRunner.run).to.not.have.been.called(),
          test.expect(childProcessMock.stubs.fork).to.not.have.been.called()
        ])
      })
    })

    test.it('should execute an specific service without coverage by default', () => {
      return runner.run(localSuiteFixture).then(() => {
        return Promise.all([
          test.expect(commands.run).to.have.been.calledOnce(),
          test.expect(commands.run.getCall(0).args[0]).to.equal('foo-local-command'),
          test.expect(mochaSinonChaiRunner.run).to.not.have.been.called(),
          test.expect(childProcessMock.stubs.fork).to.not.have.been.called()
        ])
      })
    })

    test.it('should trace an error and reject the promise with a controlled error if the specified service does not exist in suite', () => {
      const fakeServiceName = 'fooFakeService2'
      options.get.resolves({
        local: fakeServiceName
      })
      return runner.run(localSuiteFixture)
        .then(() => {
          return Promise.reject(new Error())
        }).catch((error) => {
          return Promise.all([
            test.expect(Boom.isBoom(error)).to.be.true(),
            test.expect(tracerMock.stubs.error.getCall(0).args[0]).to.contain(fakeServiceName),
            test.expect(commands.run).to.not.have.been.called(),
            test.expect(mochaSinonChaiRunner.run).to.not.have.been.called(),
            test.expect(childProcessMock.stubs.fork).to.not.have.been.called()
          ])
        })
    })

    test.it('should reject the promise with a controlled error if a service has not defined a command to execute in local', () => {
      const fakeServiceName = 'fooService2'
      localSuiteFixture.services = [
        {
          name: fakeServiceName
        }
      ]
      options.get.resolves({
        local: fakeServiceName
      })
      return runner.run(localSuiteFixture)
        .then(() => {
          return Promise.reject(new Error())
        })
        .catch((err) => {
          return Promise.all([
            test.expect(mochaSinonChaiRunner.run).to.not.have.been.called(),
            test.expect(commands.run).to.not.have.been.called(),
            test.expect(tracerMock.stubs.error.getCall(0).args[0]).to.contain(fakeServiceName),
            test.expect(Boom.isBoom(err)).to.be.true()
          ])
        })
    })

    test.it('should print a debug trace when an specific service is defined in "local" option and it has finished', () => {
      return runner.run(localSuiteFixture).then(() => {
        return test.expect(tracerMock.stubs.debug.getCall(tracerMock.stubs.debug.callCount - 1).args[0]).to.contain(`Service "fooService" closed`)
      })
    })

    test.it('should reject the promise if the service execution fails, adding the service name to the error message', () => {
      childProcessMock.stubs.spawn.on.returns(1)
      return runner.run(localSuiteFixture)
        .then(() => {
          return test.expect(false).to.be.true()
        })
        .catch((err) => {
          return test.expect(err.message).to.contain('fooService')
        })
    })

    test.it('should run all services and test when no specific test or service is defined in "local" option', () => {
      options.get.resolves({})
      return runner.run(localSuiteFixture).then(() => {
        return Promise.all([
          test.expect(mochaSinonChaiRunner.run).to.have.been.called(),
          test.expect(commands.run).to.have.been.calledTwice()
        ])
      })
    })

    test.describe('when runs all services and test', () => {
      const coveragedService = 'fooService2'
      test.beforeEach(() => {
        localSuiteFixture.coverage = {
          from: coveragedService
        }
        localSuiteFixture.services = JSON.parse(JSON.stringify(localSuiteFixture.services)).concat([{
          name: 'fooService3',
          local: {
            command: 'foo-local-command-3'
          }
        }])
        options.get.resolves({})
      })

      test.it('should first start all services, then run test', () => {
        return runner.run(localSuiteFixture).then(() => {
          return Promise.all([
            test.expect(commands.run).to.have.been.calledTwice(),
            test.expect(childProcessMock.stubs.fork).to.have.been.calledTwice(),
            test.expect(commands.run.getCall(0).args[0]).to.contain('foo-local-command'),
            test.expect(childProcessMock.stubs.fork.getCall(0).args[0]).to.contain('msc-istanbul.js'),
            test.expect(childProcessMock.stubs.fork.getCall(0).args[2].env.servicePath).to.contain('foo-local-command2.js'),
            test.expect(childProcessMock.stubs.fork.getCall(1).args[0]).to.contain('msc_mocha.js')
          ])
        })
      })

      test.it('should run only test when suite has no services', () => {
        return runner.run(localSuiteWithNoServiceFixture).then(() => {
          return Promise.all([
            test.expect(childProcessMock.stubs.fork).to.not.have.been.called(),
            test.expect(commands.run).to.not.have.been.called(),
            test.expect(mochaSinonChaiRunner.run).to.have.been.called()
          ])
        })
      })

      test.it('should reject the promise if the test execution fails', () => {
        mochaSinonChaiRunner.run.rejects(new Error())
        return runner.run(localSuiteWithNoServiceFixture).then(() => {
          return test.expect(false).to.be.true()
        }).catch((error) => {
          return Promise.all([
            test.expect(Boom.isBoom(error)).to.be.true(),
            test.expect(error.message).to.contain('fooLocalSuite2')
          ])
        })
      })

      test.it('should kill all not coveraged services when test finish', () => {
        return runner.run(localSuiteFixture).then(() => {
          return test.expect(libs.treeKill).to.have.been.calledTwice()
        })
      })

      test.it('should send an exit signal to coveraged services when test finish', () => {
        return runner.run(localSuiteFixture).then(() => {
          return Promise.all([
            test.expect(childProcessMock.stubs.fork.send).to.have.been.calledOnce(),
            test.expect(childProcessMock.stubs.fork.send).to.have.been.calledWith({exit: true})
          ])
        })
      })

      test.it('should print a debug trace for each closed service', () => {
        return runner.run(localSuiteFixture).then(() => {
          return test.expect(tracerMock.stubs.debug.callCount).to.equal(8)
        })
      })
    })

    test.it('should run coveraged tests when coverage is not specified for a service in configuration', () => {
      options.get.resolves({})
      return runner.run(localSuiteWithNoServiceFixture).then(() => {
        return Promise.all([
          test.expect(mochaSinonChaiRunner.run).to.have.been.called(),
          test.expect(childProcessMock.stubs.fork).to.not.have.been.called()
        ])
      })
    })

    test.it('should run coveraged tests when coverage is specified for test in configuration', () => {
      localSuiteWithNoServiceFixture.coverage = {
        from: 'test'
      }
      options.get.resolves({})
      return runner.run(localSuiteWithNoServiceFixture).then(() => {
        return Promise.all([
          test.expect(mochaSinonChaiRunner.run).to.have.been.called(),
          test.expect(childProcessMock.stubs.fork).to.not.have.been.called()
        ])
      })
    })

    test.it('should run not coveraged tests when coverage is disabled in configuration', () => {
      localSuiteWithNoServiceFixture.coverage = {
        enabled: false,
        from: 'test'
      }
      options.get.resolves({})
      return runner.run(localSuiteWithNoServiceFixture).then(() => {
        return Promise.all([
          test.expect(mochaSinonChaiRunner.run).to.not.have.been.called(),
          test.expect(childProcessMock.stubs.fork).to.have.been.called()
        ])
      })
    })

    test.it('should reject the promise if the test execution fails, specifying it in the error message', () => {
      options.get.resolves({})
      mochaSinonChaiRunner.run.rejects(new Error())
      return runner.run(localSuiteWithNoServiceFixture)
        .then(() => {
          return test.expect(false).to.be.true()
        })
        .catch((error) => {
          return Promise.all([
            test.expect(Boom.isBoom(error)).to.be.true(),
            test.expect(error.message).to.contain('fooLocalSuite2')
          ])
        })
    })

    test.describe('when runs coveraged tests', () => {
      const fooSuiteType = 'fooType'

      test.beforeEach(() => {
        options.get.resolves({})
      })

      test.it('should add the suite details to environment variables', () => {
        return runner.run(localSuiteWithNoServiceFixture, fooSuiteType).then(() => {
          let envValues = mochaSinonChaiRunner.run.getCall(0).args[1].env
          return Promise.all([
            test.expect(envValues.narval_is_docker).to.equal(false),
            test.expect(envValues.narval_service).to.equal('test'),
            test.expect(envValues.narval_suite).to.equal('fooLocalSuite2'),
            test.expect(envValues.narval_suite_type).to.equal(fooSuiteType)
          ])
        })
      })

      test.it('should add custom environment variables', () => {
        localSuiteWithNoServiceFixture.test.local = {
          env: {
            customVar: 'custom value'
          }
        }
        return runner.run(localSuiteWithNoServiceFixture, fooSuiteType).then(() => {
          return test.expect(mochaSinonChaiRunner.run.getCall(0).args[1].env.customVar).to.equal('custom value')
        })
      })

      test.it('should print a debug message with details about execution type', () => {
        return runner.run(localSuiteWithNoServiceFixture).then(() => {
          return test.expect(tracerMock.stubs.debug.getCall(0).args[0]).to.contain('coverage enabled')
        })
      })

      test.it('should call to mocha-sinon-chai runner, passing the istanbul and mocha configuration', () => {
        localSuiteWithNoServiceFixture.test = {
          specs: 'foo/path/specs',
          config: {
            fooMochaParam1: 'foo',
            fooParam2: 'fake'
          }
        }
        localSuiteWithNoServiceFixture.coverage = {
          config: {
            fooIstanbulParam: 'fooValue'
          }
        }
        return runner.run(localSuiteWithNoServiceFixture).then(() => {
          return Promise.all([
            test.expect(mochaSinonChaiRunner.run).to.have.been.called(),
            test.expect(mochaSinonChaiRunner.run.getCall(0).args[0]).to.equal('--istanbul --include-all-sources --root=. --colors --print=summary --dir=.coverage/fooLocalSuite2/fooLocalSuite2 --fooIstanbulParam=fooValue --mocha --recursive --colors --reporter spec --fooMochaParam1 foo --fooParam2 fake foo/path/specs')
          ])
        })
      })
    })

    test.describe('when runs not coveraged tests', () => {
      const fooSuiteType = 'foo-suite-type'
      test.beforeEach(() => {
        localSuiteWithNoServiceFixture.test = {
          specs: 'foo2/specs',
          config: {
            fooMochaParam1: 'foo',
            fooParam2: 'fake'
          }
        }
        localSuiteWithNoServiceFixture.coverage = {
          enabled: false
        }
        options.get.resolves({})
      })

      test.it('should add the suite details to environment variables', () => {
        return runner.run(localSuiteWithNoServiceFixture, fooSuiteType).then(() => {
          let envValues = childProcessMock.stubs.fork.getCall(0).args[2].env
          return Promise.all([
            test.expect(envValues.narval_is_docker).to.equal(false),
            test.expect(envValues.narval_service).to.equal('test'),
            test.expect(envValues.narval_suite).to.equal('fooLocalSuite2'),
            test.expect(envValues.narval_suite_type).to.equal(fooSuiteType)
          ])
        })
      })

      test.it('should add custom environment variables', () => {
        localSuiteWithNoServiceFixture.test.local = {
          env: {
            var1: 'value 1',
            var2: 'value 2'
          }
        }
        return runner.run(localSuiteWithNoServiceFixture, fooSuiteType).then(() => {
          const envValues = childProcessMock.stubs.fork.getCall(0).args[2].env
          return Promise.all([
            test.expect(envValues.var1).to.equal('value 1'),
            test.expect(envValues.var2).to.equal('value 2')
          ])
        })
      })

      test.it('should print a debug message with details about execution type', () => {
        return runner.run(localSuiteWithNoServiceFixture).then(() => {
          return test.expect(tracerMock.stubs.debug.getCall(0).args[0]).to.contain('without coverage')
        })
      })

      test.it('should open a mocha child process fork, passing the mocha configuration', () => {
        return runner.run(localSuiteWithNoServiceFixture).then(() => {
          return Promise.all([
            test.expect(childProcessMock.stubs.fork).to.have.been.calledOnce(),
            test.expect(childProcessMock.stubs.fork.getCall(0).args[0]).to.contain('msc_mocha.js'),
            test.expect(childProcessMock.stubs.fork.getCall(0).args[1]).to.deep.equal([
              '--recursive',
              '--colors',
              '--reporter',
              'spec',
              '--fooMochaParam1',
              'foo',
              '--fooParam2',
              'fake',
              'foo2/specs'
            ])
          ])
        })
      })

      test.it('should resolve the promise when mocha execution finish OK', () => {
        return runner.run(localSuiteWithNoServiceFixture).then(() => {
          return test.expect(true).to.be.true()
        })
      })

      test.it('should reject the promise when mocha execution fails', () => {
        childProcessMock.stubs.fork.on.returns(1)
        return runner.run(localSuiteWithNoServiceFixture)
          .then(() => {
            return test.expect(false).to.be.true()
          })
          .catch((error) => {
            return Promise.all([
              test.expect(Boom.isBoom(error)).to.be.true(),
              test.expect(error.message).to.contain('fooLocalSuite2')
            ])
          })
      })
    })

    test.it('should not call to wait-on when test has not a wait-for property in configuration', () => {
      return runner.run(localSuiteFixture)
        .then(() => {
          return test.expect(waitOnMock.stubs.wait).to.not.have.been.called()
        })
    })

    test.describe('when test has a wait-for property in configuration', () => {
      const fooServiceUrl = 'http://fake-service:3000'

      test.beforeEach(() => {
        localSuiteFixture.test = {
          specs: 'foo/wait/specs',
          local: {
            'wait-for': fooServiceUrl
          }
        }
        options.get.resolves({})
      })

      test.it('should print a debug trace', () => {
        return runner.run(localSuiteFixture)
          .then(() => {
            return Promise.all([
              test.expect(tracerMock.stubs.debug.getCall(2).args[0]).to.contain('Waiting'),
              test.expect(tracerMock.stubs.debug.getCall(2).args[0]).to.contain(fooServiceUrl)
            ])
          })
      })

      test.it('should call to waitOn, passing the configuration', () => {
        return runner.run(localSuiteFixture)
          .then(() => {
            return Promise.all([
              test.expect(waitOnMock.stubs.wait).to.have.been.called(),
              test.expect(waitOnMock.stubs.wait.getCall(0).args[0].resources[0]).to.equal(fooServiceUrl)
            ])
          })
      })

      test.it('should reject the promise if it receives an error from waitOn execution', () => {
        const fooErrorMessage = 'Wait on error'
        waitOnMock.stubs.wait.returns(new Error(fooErrorMessage))
        return runner.run(localSuiteFixture)
          .then(() => {
            throw new Error()
          })
          .catch((error) => {
            return Promise.all([
              test.expect(Boom.isBoom(error)).to.be.true(),
              test.expect(error.message).to.contain('fooLocalSuite')
            ])
          })
      })
    })

    test.describe('when runs a not coveraged service', () => {
      const fooSuiteTypeName = 'fooTypeName'

      test.it('should add the suite details to environment variables', () => {
        return runner.run(localSuiteFixture, fooSuiteTypeName).then(() => {
          const envValues = commands.run.getCall(0).args[1].env
          return Promise.all([
            test.expect(commands.run).to.have.been.calledOnce(),
            test.expect(commands.run.getCall(0).args[0]).to.equal('foo-local-command'),
            test.expect(envValues.narval_is_docker).to.equal(false),
            test.expect(envValues.narval_service).to.equal('fooService'),
            test.expect(envValues.narval_suite).to.equal('fooLocalSuite'),
            test.expect(envValues.narval_suite_type).to.equal(fooSuiteTypeName)
          ])
        })
      })

      test.it('should add custom environment variables', () => {
        return runner.run(localSuiteFixture, fooSuiteTypeName).then(() => {
          const envValues = commands.run.getCall(0).args[1].env
          return Promise.all([
            test.expect(envValues.fooEnvVar1).to.equal('fooEnvironment var 1'),
            test.expect(envValues.fooEnvVar2).to.equal('fooEnv2')
          ])
        })
      })
    })

    test.describe('when runs a coveraged service', () => {
      const fakeServiceName = 'fooService2'
      const fooSuiteTypeName = 'FooType'

      test.beforeEach(() => {
        localSuiteFixture.coverage = {
          from: fakeServiceName,
          config: {
            fooConfig1: 'config1',
            fooConfig2: 'config2'
          }
        }
        options.get.resolves({
          local: fakeServiceName
        })
      })

      test.it('should fork an istanbul child process, passing to it the istanbul and command arguments', () => {
        return runner.run(localSuiteFixture).then(() => {
          let forkCall = childProcessMock.stubs.fork.getCall(0)
          return Promise.all([
            test.expect(forkCall.args[0]).to.contain('msc-istanbul.js'),
            test.expect(forkCall.args[1][5]).to.equal('--fooConfig1=config1'),
            test.expect(forkCall.args[1][6]).to.equal('--fooConfig2=config2'),
            test.expect(forkCall.args[1][7]).to.equal('cover'),
            test.expect(forkCall.args[1][8]).to.contain('service-coverage-runner')
          ])
        })
      })

      test.it('should set the command path to be executed as "servicePath" environment variable, and pass it to the fork execution', () => {
        return runner.run(localSuiteFixture).then(() => {
          return test.expect(childProcessMock.stubs.fork.getCall(0).args[2].env.servicePath).to.contain('foo-local-command2.js')
        })
      })

      test.it('should add the suite details to environment variables', () => {
        return runner.run(localSuiteFixture, fooSuiteTypeName).then(() => {
          const envValues = childProcessMock.stubs.fork.getCall(0).args[2].env
          return Promise.all([
            test.expect(envValues.narval_is_docker).to.equal(false),
            test.expect(envValues.narval_service).to.equal('fooService2'),
            test.expect(envValues.narval_suite).to.equal('fooLocalSuite'),
            test.expect(envValues.narval_suite_type).to.equal(fooSuiteTypeName)
          ])
        })
      })

      test.it('should add custom environment variables', () => {
        return runner.run(localSuiteFixture, fooSuiteTypeName).then(() => {
          return test.expect(childProcessMock.stubs.fork.getCall(0).args[2].env.fooEnv).to.equal('fooEnv value')
        })
      })
    }) */
  })
})
