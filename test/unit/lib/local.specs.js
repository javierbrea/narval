
const Boom = require('boom')
const _ = require('lodash')
const mochaSinonChaiRunner = require('mocha-sinon-chai/runner')

const test = require('../../../index')
const mocks = require('../mocks')
const fixtures = require('../fixtures')

const local = require('../../../lib/local')

const options = require('../../../lib/options')
const treeKill = require('../../../lib/tree-kill')

test.describe('local', () => {
  test.describe('run method', () => {
    let sandbox
    let tracerMock
    let waitOnMock
    let childProcessMock

    test.beforeEach(() => {
      sandbox = test.sinon.sandbox.create()
      tracerMock = new mocks.Tracer()
      waitOnMock = new mocks.WaitOn()
      childProcessMock = new mocks.ChildProcess()
      sandbox.stub(mochaSinonChaiRunner, 'run').usingPromise().resolves()
      sandbox.stub(options, 'get').usingPromise().resolves({})
      sandbox.stub(treeKill, 'kill')
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
      options.get.resolves({
        local: 'fooService'
      })
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
      options.get.resolves({
        local: 'fooService'
      })
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
      const serviceName = 'fooService2'
      options.get.resolves({
        local: serviceName
      })
      return local.run(fixtures.config.localSuite).then(() => {
        return test.expect(tracerMock.stubs.debug.getCall(tracerMock.stubs.debug.callCount - 1).args[0]).to.contain(`Service "${serviceName}" closed`)
      })
    })

    test.it('should reject the promise if the service execution fails, adding the service name to the error message', () => {
      const serviceName = 'fooService'
      childProcessMock.stubs.execFile.on.returns(1)
      options.get.resolves({
        local: serviceName
      })
      return local.run(fixtures.config.localSuite).catch((err) => {
        return test.expect(err.message).to.contain(serviceName)
      })
    })

    test.it('should run all services and test when no specific test or service is defined in "local" option', () => {
      return local.run(fixtures.config.localSuite).then(() => {
        return Promise.all([
          test.expect(mochaSinonChaiRunner.run).to.have.been.called(),
          test.expect(childProcessMock.stubs.execFile).to.have.been.calledTwice()
        ])
      })
    })
  })
})
