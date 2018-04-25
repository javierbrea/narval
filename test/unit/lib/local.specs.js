
const Boom = require('boom')
const mochaSinonChaiRunner = require('mocha-sinon-chai/runner')

const test = require('../../../index')
const mocks = require('../mocks')
const fixtures = require('../fixtures')

const local = require('../../../lib/local')

const commands = require('../../../lib/commands')
const options = require('../../../lib/options')
const treeKill = require('../../../lib/tree-kill')

const deepClone = function (obj) {
  return JSON.parse(JSON.stringify(obj))
}

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

test.describe.only('local', () => {
  test.describe('run method', () => {
    let sandbox
    let tracerMock
    let waitOnMock
    let childProcessMock
    let stdinOnFake
    let localSuiteFixture
    let localSuiteWithNoServiceFixture

    test.beforeEach(() => {
      localSuiteFixture = deepClone(fixtures.config.localSuite)
      localSuiteWithNoServiceFixture = deepClone(fixtures.config.localSuiteWithNoService)

      sandbox = test.sinon.sandbox.create()
      tracerMock = new mocks.Tracer()
      waitOnMock = new mocks.WaitOn()
      childProcessMock = new mocks.ChildProcess()
      stdinOnFake = new StdinOnFake()
      sandbox.stub(mochaSinonChaiRunner, 'run').usingPromise().resolves()
      sandbox.stub(options, 'get').usingPromise().resolves({
        local: 'fooService'
      })
      sandbox.stub(treeKill, 'kill')
      sandbox.stub(commands, 'run').usingPromise().resolves({
        on: childProcessMock.stubs.spawn.on.fake
      })
      sandbox.stub(process.stdin, 'setRawMode')
      sandbox.stub(process.stdin, 'resume')
      sandbox.stub(process.stdin, 'setEncoding')
      sandbox.stub(process.stdin, 'pause')
      sandbox.stub(process.stdin, 'on').callsFake(stdinOnFake.fake)
      sandbox.spy(console, 'log')
      waitOnMock.stubs.wait.returns()
      childProcessMock.stubs.fork.on.returns(0)
    })

    test.afterEach(() => {
      tracerMock.restore()
      waitOnMock.restore()
      childProcessMock.restore()
      sandbox.restore()
    })

    test.it('should return a promise', (done) => {
      const execution = local.run(localSuiteFixture)
        .then(() => {
          test.expect(execution).to.be.an.instanceof(Promise)
          done()
        })
    })

    test.describe.only('when runs "before" command', () => {
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

      test.it('should not execute the "before" command if it is running an specific service or test', () => {
        options.get.resolves({
          local: 'fooService'
        })
        return local.run(localSuiteFixture).then(() => {
          return Promise.all([
            test.expect(commands.run).to.have.been.calledOnce(),
            test.expect(commands.run).to.not.have.been.calledWith(commandPath)
          ])
          
        })
      })

      test.it('should execute the "before" command if it is defined in suite', () => {
        return local.run(localSuiteFixture).then(() => {
          return Promise.all([
            test.expect(commands.run).to.have.been.calledWith(commandPath),
            test.expect(commands.run.getCall(0).args[1].sync).to.be.true()
          ])
        })
      })

      test.it('should add the suite details to environment variables when runs "before" command', () => {
        const fooSuiteTypeName = 'fooTypeName'
        return local.run(localSuiteFixture, fooSuiteTypeName).then(() => {
          const envValues = commands.run.getCall(0).args[1].env
          return Promise.all([
            test.expect(envValues.narval_is_docker).to.equal(false),
            test.expect(envValues.narval_service).to.equal('clean'),
            test.expect(envValues.narval_suite).to.equal('fooLocalSuite'),
            test.expect(envValues.narval_suite_type).to.equal(fooSuiteTypeName)
          ])
        })
      })

      test.it('should add custom environment variables when runs "before" command', () => {
        return local.run(localSuiteFixture).then(() => {
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
      return local.run(localSuiteFixture).then(() => {
        return Promise.all([
          test.expect(mochaSinonChaiRunner.run).to.have.been.called(),
          test.expect(commands.run).to.not.have.been.called()
        ])
      })
    })

    test.it('should execute only an specific service if it is defined in "local" option', () => {
      return local.run(localSuiteFixture).then(() => {
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
      return local.run(localSuiteFixture).then(() => {
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
      return local.run(localSuiteFixture).then(() => {
        return Promise.all([
          test.expect(commands.run).to.have.been.calledOnce(),
          test.expect(mochaSinonChaiRunner.run).to.not.have.been.called(),
          test.expect(childProcessMock.stubs.fork).to.not.have.been.called()
        ])
      })
    })

    test.it('should execute an specific service without coverage by default', () => {
      return local.run(localSuiteFixture).then(() => {
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
      return local.run(localSuiteFixture)
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
      return local.run(localSuiteFixture)
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
      return local.run(localSuiteFixture).then(() => {
        return test.expect(tracerMock.stubs.debug.getCall(tracerMock.stubs.debug.callCount - 1).args[0]).to.contain(`Service "fooService" closed`)
      })
    })

    test.it('should reject the promise if the service execution fails, adding the service name to the error message', () => {
      childProcessMock.stubs.spawn.on.returns(1)
      return local.run(localSuiteFixture)
        .then(() => {
          return test.expect(false).to.be.true()
        })
        .catch((err) => {
          return test.expect(err.message).to.contain('fooService')
        })
    })

    test.it('should run all services and test when no specific test or service is defined in "local" option', () => {
      options.get.resolves({})
      return local.run(localSuiteFixture).then(() => {
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
        return local.run(localSuiteFixture).then(() => {
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
        return local.run(localSuiteWithNoServiceFixture).then(() => {
          return Promise.all([
            test.expect(childProcessMock.stubs.fork).to.not.have.been.called(),
            test.expect(commands.run).to.not.have.been.called(),
            test.expect(mochaSinonChaiRunner.run).to.have.been.called()
          ])
        })
      })

      test.it('should reject the promise if the test execution fails', () => {
        mochaSinonChaiRunner.run.rejects(new Error())
        return local.run(localSuiteWithNoServiceFixture).then(() => {
          return test.expect(false).to.be.true()
        }).catch((error) => {
          return Promise.all([
            test.expect(Boom.isBoom(error)).to.be.true(),
            test.expect(error.message).to.contain('fooLocalSuite2')
          ])
        })
      })

      test.it('should kill all not coveraged services when test finish', () => {
        return local.run(localSuiteFixture).then(() => {
          return test.expect(treeKill.kill).to.have.been.calledTwice()
        })
      })

      test.it('should send an exit signal to coveraged services when test finish', () => {
        return local.run(localSuiteFixture).then(() => {
          return Promise.all([
            test.expect(childProcessMock.stubs.fork.send).to.have.been.calledOnce(),
            test.expect(childProcessMock.stubs.fork.send).to.have.been.calledWith({exit: true})
          ])
        })
      })

      test.it('should print a debug trace for each closed service', () => {
        return local.run(localSuiteFixture).then(() => {
          return test.expect(tracerMock.stubs.debug.callCount).to.equal(8)
        })
      })
    })

    test.it('should run coveraged tests when coverage is not specified for a service in configuration', () => {
      options.get.resolves({})
      return local.run(localSuiteWithNoServiceFixture).then(() => {
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
      return local.run(localSuiteWithNoServiceFixture).then(() => {
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
      return local.run(localSuiteWithNoServiceFixture).then(() => {
        return Promise.all([
          test.expect(mochaSinonChaiRunner.run).to.not.have.been.called(),
          test.expect(childProcessMock.stubs.fork).to.have.been.called()
        ])
      })
    })

    test.it('should reject the promise if the test execution fails, specifying it in the error message', () => {
      options.get.resolves({})
      mochaSinonChaiRunner.run.rejects(new Error())
      return local.run(localSuiteWithNoServiceFixture)
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
      test.beforeEach(() => {
        options.get.resolves({})
      })

      test.it('should print a debug message with details about execution type', () => {
        return local.run(localSuiteWithNoServiceFixture).then(() => {
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
        return local.run(localSuiteWithNoServiceFixture).then(() => {
          return Promise.all([
            test.expect(mochaSinonChaiRunner.run).to.have.been.called(),
            test.expect(mochaSinonChaiRunner.run.getCall(0).args[0]).to.equal('--istanbul --include-all-sources --root=. --colors --print=summary --dir=.coverage/fooLocalSuite2/fooLocalSuite2 --fooIstanbulParam=fooValue --mocha --recursive --colors --reporter spec --fooMochaParam1 foo --fooParam2 fake foo/path/specs')
          ])
        })
      })
    })

    test.describe('when runs not coveraged tests', () => {
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

      test.it('should print a debug message with details about execution type', () => {
        return local.run(localSuiteWithNoServiceFixture).then(() => {
          return test.expect(tracerMock.stubs.debug.getCall(0).args[0]).to.contain('without coverage')
        })
      })

      test.it('should open a mocha child process fork, passing the mocha configuration', () => {
        return local.run(localSuiteWithNoServiceFixture).then(() => {
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
        return local.run(localSuiteWithNoServiceFixture).then(() => {
          return test.expect(true).to.be.true()
        })
      })

      test.it('should reject the promise when mocha execution fails', () => {
        childProcessMock.stubs.fork.on.returns(1)
        return local.run(localSuiteWithNoServiceFixture)
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
      return local.run(localSuiteFixture)
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
        return local.run(localSuiteFixture)
          .then(() => {
            return Promise.all([
              test.expect(tracerMock.stubs.debug.getCall(2).args[0]).to.contain('Waiting'),
              test.expect(tracerMock.stubs.debug.getCall(2).args[0]).to.contain(fooServiceUrl)
            ])
          })
      })

      test.it('should call to waitOn, passing the configuration', () => {
        return local.run(localSuiteFixture)
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
        return local.run(localSuiteFixture)
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

    test.describe('when runs a coveraged service', () => {
      const fakeServiceName = 'fooService2'

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

      test.it('should set the process stdin to raw mode, in order to intercept CTRL-C and stop only the coveraged service when service is started alone', () => {
        return local.run(localSuiteFixture).then(() => {
          return Promise.all([
            test.expect(process.stdin.setRawMode).to.have.been.called(),
            test.expect(process.stdin.resume).to.have.been.called()
          ])
        })
      })

      test.it('should not set the process stdin to raw mode when all suite is ran', () => {
        options.get.resolves({
          local: true
        })
        return local.run(localSuiteFixture).then(() => {
          return Promise.all([
            test.expect(process.stdin.setRawMode).to.not.have.been.called(),
            test.expect(process.stdin.resume).to.not.have.been.called()
          ])
        })
      })

      test.it('should fork an istanbul child process, passing to it the istanbul and command arguments', () => {
        return local.run(localSuiteFixture).then(() => {
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
        return local.run(localSuiteFixture).then(() => {
          return test.expect(childProcessMock.stubs.fork.getCall(0).args[2].env.servicePath).to.contain('foo-local-command2.js')
        })
      })

      test.it('should intercept the CTRL-C and send and exit signal to service', () => {
        stdinOnFake.returns('\u0003')
        return local.run(localSuiteFixture).then(() => {
          return Promise.all([
            test.expect(childProcessMock.stubs.fork.send).to.have.been.calledWith({exit: true}),
            test.expect(tracerMock.stubs.debug.getCall(1).args[0]).to.contain('CTRL-C')
          ])
        })
      })

      test.it('should restore the stdin raw mode, and stop intercepting CTRL-C when process finish', () => {
        return local.run(localSuiteFixture).then(() => {
          return Promise.all([
            test.expect(process.stdin.setRawMode).to.have.been.calledTwice(),
            test.expect(process.stdin.pause).to.have.been.called()
          ])
        })
      })
    })
  })
})
