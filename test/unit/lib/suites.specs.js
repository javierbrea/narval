
const Promise = require('bluebird')
const Boom = require('boom')

const test = require('../../../index')
const mocks = require('../mocks')
const fixtures = require('../fixtures')

const local = require('../../../lib/local')
const docker = require('../../../lib/docker')
const config = require('../../../lib/config')
const options = require('../../../lib/options')

const suites = require('../../../lib/suites')

test.describe('suites', () => {
  test.describe('run method', () => {
    const sandbox = test.sinon.sandbox.create()
    const specDockerUsed = function () {
      return Promise.all([
        test.expect(docker.createFiles).to.have.been.called(),
        test.expect(docker.run).to.have.been.called(),
        test.expect(local.run).to.not.have.been.called()
      ])
    }
    let tracerMock
    let pathsMock

    test.beforeEach(() => {
      tracerMock = new mocks.Tracer()
      pathsMock = new mocks.Paths()
      sandbox.stub(local, 'run').usingPromise().resolves()
      sandbox.stub(docker, 'createFiles').usingPromise().resolves()
      sandbox.stub(docker, 'run').usingPromise().resolves()
      sandbox.stub(docker, 'downVolumes').usingPromise().resolves()
      sandbox.stub(config, 'get').usingPromise().resolves(fixtures.config.manySuitesAndTypes)
      sandbox.stub(options, 'get').usingPromise().resolves(fixtures.options.suite)
    })

    test.afterEach(() => {
      sandbox.restore()
      tracerMock.restore()
      pathsMock.restore()
    })

    test.it('should return a promise', () => {
      return suites.run()
        .then(() => {
          return test.expect(true).to.be.true()
        })
    })

    test.it('should log the execution of a suite type, an specific suite, and print an info log when suite execution finish OK', () => {
      return suites.run()
        .then(() => {
          return Promise.all([
            test.expect(tracerMock.stubs.info.callCount).to.equal(4), // try to run the other type and log it too
            test.expect(tracerMock.stubs.info.getCall(0).args[0]).to.contain('fooType'),
            test.expect(tracerMock.stubs.info.getCall(1).args[0]).to.contain('fooSuite'),
            test.expect(tracerMock.stubs.info.getCall(2).args[0]).to.contain('finished OK')
          ])
        })
    })

    test.it('should run suite locally if local option is received', () => {
      options.get.resolves({
        local: true,
        suite: 'fooDockerSuite'
      })

      return suites.run()
        .then(() => {
          return Promise.all([
            test.expect(docker.run).to.not.have.been.called(),
            test.expect(local.run).to.have.been.called()
          ])
        })
    })

    test.it('should run suite using docker if suite has any docker property in test', () => {
      options.get.resolves(fixtures.options.dockerSuite)

      return suites.run()
        .then(specDockerUsed)
    })

    test.it('should run suite using docker if suite has any service configured for docker', () => {
      options.get.resolves({
        suite: 'fooDockerSuite2'
      })

      return suites.run()
        .then(specDockerUsed)
    })

    test.it('should run suite locally if suite test is not configured for docker and has not any service configured for docker', () => {
      options.get.resolves({
        suite: 'fooSuite2'
      })

      return suites.run()
        .then(() => {
          return Promise.all([
            test.expect(docker.createFiles).to.not.have.been.called(),
            test.expect(docker.run).to.not.have.been.called(),
            test.expect(local.run).to.have.been.called()
          ])
        })
    })

    test.it('should trace the error from an errored suite execution if it is not controlled by developer', () => {
      options.get.resolves(fixtures.options.suite)
      local.run.rejects(new Error())
      return suites.run()
        .then(() => {
          return Promise.reject(new Error())
        })
        .catch(() => {
          return test.expect(tracerMock.stubs.error.callCount).to.equal(1)
        })
    })

    test.it('should reject the promise with a controlled error if suite execution fails', () => {
      options.get.resolves(fixtures.options.suite)
      local.run.rejects(Boom.notImplemented('foo message'))
      return suites.run()
        .then(() => {
          return Promise.reject(new Error())
        })
        .catch((error) => {
          return Promise.all([
            test.expect(Boom.isBoom(error)).to.be.true(),
            test.expect(error.message).to.contain('Error running')
          ])
        })
    })

    test.it('should clean logs folder before executing suites', () => {
      const fooLogsPath = 'fooPath'
      options.get.resolves(fixtures.options.suite)
      pathsMock.stubs.logs.returns(fooLogsPath)
      return suites.run()
        .then(() => {
          return test.expect(pathsMock.stubs.cwd.remove).to.have.been.calledWith(fooLogsPath)
        })
    })

    test.it('should call to clean docker volumes after suites execution is OK', () => {
      options.get.resolves(fixtures.options.suite)
      return suites.run()
        .then(() => {
          return test.expect(docker.downVolumes).to.have.been.called()
        })
    })

    test.it('should call to clean docker volumes even when suites execution fails', () => {
      options.get.resolves(fixtures.options.suite)
      local.run.rejects(Boom.notImplemented('foo message'))
      return suites.run()
        .catch(() => {
          return test.expect(docker.downVolumes).to.have.been.called()
        })
    })

    test.describe('when options do not specify to run all suites, an specific suite, or a suite type', () => {
      test.it('should print a warning log and resolve promise', () => {
        options.get.resolves(fixtures.options.standard)
        return suites.run()
          .then(() => {
            return test.expect(tracerMock.stubs.warn).to.have.been.called()
          })
      })
    })

    test.describe('when an specific suite to be executed is defined in options', () => {
      test.it('should skip all other suites executions, and execute that one', () => {
        options.get.resolves(fixtures.options.suite)
        return suites.run()
          .then(() => {
            return Promise.all([
              test.expect(tracerMock.stubs.warn.getCall(0).args[0]).to.contain('Skipping'),
              test.expect(tracerMock.stubs.warn.callCount).to.equal(3),
              test.expect(local.run.callCount).to.equal(1)
            ])
          })
      })

      test.it('should not execute any suite if provided one does not exists in config', () => {
        options.get.resolves({
          suite: 'unrealSuite'
        })
        return suites.run()
          .then(() => {
            return Promise.all([
              test.expect(tracerMock.stubs.warn.callCount).to.equal(4),
              test.expect(local.run).to.not.have.been.called()
            ])
          })
      })
    })

    test.describe('when an specific suite type to be executed is defined in options', () => {
      test.it('should skip all other suites types executions, and run all suites in that type', () => {
        options.get.resolves(fixtures.options.suiteType)
        return suites.run()
          .then(() => {
            return Promise.all([
              test.expect(tracerMock.stubs.warn.getCall(0).args[0]).to.contain('Skipping'),
              test.expect(tracerMock.stubs.warn.callCount).to.equal(1),
              test.expect(local.run.callCount).to.equal(2)
            ])
          })
      })

      test.it('should not execute any suite type if provided one does not exists in config', () => {
        options.get.resolves({
          type: 'unrealType'
        })
        return suites.run()
          .then(() => {
            return Promise.all([
              test.expect(tracerMock.stubs.warn.callCount).to.equal(2),
              test.expect(local.run).to.not.have.been.called()
            ])
          })
      })

      test.it('should execute all suites in that specific type', () => {
        options.get.resolves({
          type: 'fakeType'
        })
        return suites.run()
          .then(() => {
            return Promise.all([
              test.expect(docker.createFiles).to.have.been.calledTwice(),
              test.expect(docker.run).to.have.been.calledTwice()
            ])
          })
      })
    })
  })
})
