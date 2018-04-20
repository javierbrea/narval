
const Boom = require('boom')
const _ = require('lodash')
const mochaSinonChaiRunner = require('mocha-sinon-chai/runner')

const test = require('../../../index')
const mocks = require('../mocks')
const fixtures = require('../fixtures')

const local = require('../../../lib/local')

const options = require('../../../lib/options')
const treeKill = require('../../../lib/tree-kill')

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

test.describe('local', () => {
  test.describe('run method', () => {
    let sandbox
    let tracerMock
    let waitOnMock
    let childProcessMock
    let stdinOnFake

    test.beforeEach(() => {
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
      const execution = local.run(fixtures.config.localSuite)
        .then(() => {
          test.expect(execution).to.be.an.instanceof(Promise)
          done()
        })
    })

    test.it('should execute "before" command as a childProcess synchronous in shell if it is defined in suite', () => {
      const commandPath = 'fooBeforeLocalCommand'
      options.get.resolves({
      })
      return local.run(_.extend({}, fixtures.config.localSuite, {
        before: {
          local: {
            command: commandPath
          }
        }
      })).then(() => {
        return Promise.all([
          test.expect(childProcessMock.stubs.execFileSync).to.have.been.calledWith(commandPath),
          test.expect(childProcessMock.stubs.execFileSync.getCall(0).args[2].cwd).to.equal(process.cwd()),
          test.expect(childProcessMock.stubs.execFileSync.getCall(0).args[2].shell).to.be.true()
        ])
      })
    })

    test.it('should not execute the "before" command if it is running an specific service or test', () => {
      return local.run(fixtures.config.localSuite).then(() => {
        return test.expect(childProcessMock.stubs.execFileSync).to.not.have.been.called()
      })
    })

    test.it('should execute only test if it is defined in "local" option', () => {
      options.get.resolves({
        local: 'test'
      })
      return local.run(fixtures.config.localSuite).then(() => {
        return Promise.all([
          test.expect(mochaSinonChaiRunner.run).to.have.been.called(),
          test.expect(childProcessMock.stubs.execFile).to.not.have.been.called()
        ])
      })
    })

    test.it('should execute only an specific service if it is defined in "local" option', () => {
      return local.run(fixtures.config.localSuite).then(() => {
        return Promise.all([
          test.expect(mochaSinonChaiRunner.run).to.not.have.been.called(),
          test.expect(childProcessMock.stubs.execFile).to.have.been.calledOnce()
        ])
      })
    })

    test.it('should execute an specific service with coverage if "coverage.from" option is defined in configuration', () => {
      const fakeServiceName = 'fooService2'
      const suiteFixture = _.extend({}, fixtures.config.localSuite, {
        coverage: {
          from: fakeServiceName
        }
      })
      options.get.resolves({
        local: fakeServiceName
      })
      return local.run(suiteFixture).then(() => {
        return Promise.all([
          test.expect(childProcessMock.stubs.execFile).to.not.have.been.called(),
          test.expect(childProcessMock.stubs.execFileSync).to.not.have.been.called(),
          test.expect(mochaSinonChaiRunner.run).to.not.have.been.called(),
          test.expect(childProcessMock.stubs.fork).to.have.been.called()
        ])
      })
    })

    test.it('should execute an specific service without coverage if "coverage.enabled" option is false even when coverage.from is defined in configuration', () => {
      const fakeServiceName = 'fooService2'
      const suiteFixture = _.extend({}, fixtures.config.localSuite, {
        coverage: {
          from: fakeServiceName,
          enabled: false
        }
      })
      options.get.resolves({
        local: fakeServiceName
      })
      return local.run(suiteFixture).then(() => {
        return Promise.all([
          test.expect(childProcessMock.stubs.execFile).to.have.been.called(),
          test.expect(childProcessMock.stubs.execFileSync).to.not.have.been.called(),
          test.expect(mochaSinonChaiRunner.run).to.not.have.been.called(),
          test.expect(childProcessMock.stubs.fork).to.not.have.been.called()
        ])
      })
    })

    test.it('should execute an specific service without coverage by default', () => {
      return local.run(fixtures.config.localSuite).then(() => {
        return Promise.all([
          test.expect(childProcessMock.stubs.execFile.getCall(0).args[0]).to.equal('foo-local-command'),
          test.expect(childProcessMock.stubs.execFileSync).to.not.have.been.called(),
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
      return local.run(fixtures.config.localSuite)
      .then(() => {
        return Promise.reject(new Error())
      }).catch((error) => {
        return Promise.all([
          test.expect(Boom.isBoom(error)).to.be.true(),
          test.expect(tracerMock.stubs.error.getCall(0).args[0]).to.contain(fakeServiceName),
          test.expect(childProcessMock.stubs.execFile).to.not.have.been.called(),
          test.expect(childProcessMock.stubs.execFileSync).to.not.have.been.called(),
          test.expect(mochaSinonChaiRunner.run).to.not.have.been.called(),
          test.expect(childProcessMock.stubs.fork).to.not.have.been.called()
        ])
      })
    })

    test.it('should reject the promise with a controlled error if a service has not defined a command to execute in local', () => {
      const fakeServiceName = 'fooService2'
      const suiteFixture = _.extend({}, fixtures.config.localSuite, {
        services: [
          {
            name: fakeServiceName
          }
        ]
      })
      options.get.resolves({
        local: fakeServiceName
      })
      return local.run(suiteFixture)
      .then(() => {
        return Promise.reject(new Error())
      })
      .catch((err) => {
        return Promise.all([
          test.expect(mochaSinonChaiRunner.run).to.not.have.been.called(),
          test.expect(childProcessMock.stubs.execFile).to.not.have.been.called(),
          test.expect(tracerMock.stubs.error.getCall(0).args[0]).to.contain(fakeServiceName),
          test.expect(Boom.isBoom(err)).to.be.true()
        ])
      })
    })

    test.it('should print a debug trace when an specific service is defined in "local" option and it has finished', () => {
      return local.run(fixtures.config.localSuite).then(() => {
        return test.expect(tracerMock.stubs.debug.getCall(tracerMock.stubs.debug.callCount - 1).args[0]).to.contain(`Service "fooService" closed`)
      })
    })

    test.it('should reject the promise if the service execution fails, adding the service name to the error message', () => {
      childProcessMock.stubs.execFile.on.returns(1)
      return local.run(fixtures.config.localSuite).catch((err) => {
        return test.expect(err.message).to.contain('fooService')
      })
    })

    test.it('should run all services and test when no specific test or service is defined in "local" option', () => {
      options.get.resolves({})
      return local.run(fixtures.config.localSuite).then(() => {
        return Promise.all([
          test.expect(mochaSinonChaiRunner.run).to.have.been.called(),
          test.expect(childProcessMock.stubs.execFile).to.have.been.calledTwice()
        ])
      })
    })

    test.describe('when runs all services and test', () => {
      const coveragedService = 'fooService2'
      const suiteFixture = _.extend({}, fixtures.config.localSuite, {
        coverage: {
          from: coveragedService
        },
        services: JSON.parse(JSON.stringify(fixtures.config.localSuite.services)).concat([{
          name: 'fooService3',
          local: {
            command: 'foo-local-command-3'
          }
        }])
      })
      test.beforeEach(() => {
        options.get.resolves({})
      })

      test.it('should first start all services, then run test', () => {
        return local.run(suiteFixture).then(() => {
          return Promise.all([
            test.expect(childProcessMock.stubs.execFile).to.have.been.calledTwice(),
            test.expect(childProcessMock.stubs.fork).to.have.been.calledTwice(),
            test.expect(childProcessMock.stubs.execFile.getCall(0).args[0]).to.contain('foo-local-command'),
            test.expect(childProcessMock.stubs.fork.getCall(0).args[0]).to.contain('msc-istanbul.js'),
            test.expect(childProcessMock.stubs.fork.getCall(0).args[2].env.servicePath).to.contain('foo-local-command2.js'),
            test.expect(childProcessMock.stubs.fork.getCall(1).args[0]).to.contain('msc_mocha.js')
          ])
        })
      })

      test.it('should run only test when suite has no services', () => {
        return local.run(fixtures.config.localSuiteWithNoService).then(() => {
          return Promise.all([
            test.expect(childProcessMock.stubs.fork).to.not.have.been.called(),
            test.expect(childProcessMock.stubs.execFile).to.not.have.been.called(),
            test.expect(mochaSinonChaiRunner.run).to.have.been.called()
          ])
        })
      })

      test.it('should reject the promise if the test execution fails', () => {
        mochaSinonChaiRunner.run.rejects(new Error())
        return local.run(fixtures.config.localSuiteWithNoService).then(() => {
          return test.expect(false).to.be.true()
        }).catch((error) => {
          return Promise.all([
            test.expect(Boom.isBoom(error)).to.be.true(),
            test.expect(error.message).to.contain('fooLocalSuite2')
          ])
        })
      })

      test.it('should kill all not coveraged services when test finish', () => {
        return local.run(suiteFixture).then(() => {
          return test.expect(treeKill.kill).to.have.been.calledTwice()
        })
      })

      test.it('should send an exit signal to coveraged services when test finish', () => {
        return local.run(suiteFixture).then(() => {
          return Promise.all([
            test.expect(childProcessMock.stubs.fork.send).to.have.been.calledOnce(),
            test.expect(childProcessMock.stubs.fork.send).to.have.been.calledWith({exit: true})
          ])
        })
      })

      test.it('should print a debug trace for each closed service', () => {
        return local.run(suiteFixture).then(() => {
          return test.expect(tracerMock.stubs.debug.callCount).to.equal(9)
        })
      })
    })

    test.describe('when runs a not coveraged service', () => {
      test.it('should log the data received from the execution, aplying a trim function', () => {
        const fooData = 'foo process data'
        childProcessMock.stubs.execFile.stdout.on.returns(`   ${fooData}    `)
        return local.run(fixtures.config.localSuite).then(() => {
          return test.expect(console.log).to.have.been.calledWith(fooData)
        })
      })

      test.it('should log the errors received from the execution, aplying a trim function', () => {
        const fooData = 'foo error data'
        childProcessMock.stubs.execFile.stderr.on.runOnRegister(true)
        childProcessMock.stubs.execFile.stderr.on.returns(`   ${fooData}    `)
        return local.run(fixtures.config.localSuite).then(() => {
          return test.expect(console.log).to.have.been.calledWith(fooData)
        })
      })

      test.it('should not log empty data received from the execution', () => {
        const fooData = '   '
        childProcessMock.stubs.execFile.stdout.on.returns(fooData)
        return local.run(fixtures.config.localSuite).then(() => {
          return test.expect(console.log).to.not.have.been.calledWith(fooData)
        })
      })

      test.it('should not log empty data received from the execution', () => {
        const fooData = '   '
        childProcessMock.stubs.execFile.stdout.on.returns(fooData)
        return local.run(fixtures.config.localSuite).then(() => {
          return test.expect(console.log).to.not.have.been.calledWith(fooData)
        })
      })
    })

    test.describe('when runs a coveraged service', () => {
      const fakeServiceName = 'fooService2'
      const suiteFixture = _.extend({}, fixtures.config.localSuite, {
        coverage: {
          from: fakeServiceName,
          config: {
            fooConfig1: 'config1',
            fooConfig2: 'config2'
          }
        }
      })

      test.beforeEach(() => {
        options.get.resolves({
          local: fakeServiceName
        })
      })

      test.it('should set the process stdin to raw mode, in order to intercept CTRL-C and stop only the coveraged service', () => {
        return local.run(suiteFixture).then(() => {
          return Promise.all([
            test.expect(process.stdin.setRawMode).to.have.been.called(),
            test.expect(process.stdin.resume).to.have.been.called()
          ])
        })
      })

      test.it('should fork an istanbul child process, passing to it the istanbul and command arguments', () => {
        return local.run(suiteFixture).then(() => {
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
        return local.run(suiteFixture).then(() => {
          return test.expect(childProcessMock.stubs.fork.getCall(0).args[2].env.servicePath).to.contain('foo-local-command2.js')
        })
      })

      test.it('should intercept the CTRL-C and send and exit signal to service', () => {
        stdinOnFake.returns('\u0003')
        return local.run(suiteFixture).then(() => {
          return Promise.all([
            test.expect(childProcessMock.stubs.fork.send).to.have.been.calledWith({exit: true}),
            test.expect(tracerMock.stubs.debug.getCall(1).args[0]).to.contain('CTRL-C')
          ])
        })
      })

      test.it('should restore the stdin raw mode, and stop intercepting CTRL-C when process finish', () => {
        return local.run(suiteFixture).then(() => {
          return Promise.all([
            test.expect(process.stdin.setRawMode).to.have.been.calledTwice(),
            test.expect(process.stdin.pause).to.have.been.called()
          ])
        })
      })
    })
  })
})
