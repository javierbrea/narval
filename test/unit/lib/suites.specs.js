
const Promise = require('bluebird')
const Boom = require('boom')

const test = require('../../../index')
const mocks = require('../mocks')
const fixtures = require('../fixtures')

const local = require('../../../lib/local')
const docker = require('../../../lib/docker')

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

    test.beforeEach(() => {
      tracerMock = new mocks.Tracer()
      sandbox.stub(local, 'run').usingPromise().resolves()
      sandbox.stub(docker, 'createFiles').usingPromise().resolves()
      sandbox.stub(docker, 'run').usingPromise().resolves()
      sandbox.stub(docker, 'downVolumes').usingPromise().resolves()
    })

    test.afterEach(() => {
      tracerMock.restore()
      sandbox.restore()
    })

    test.it('should return a promise', () => {
      return test.expect(suites.run()).to.be.an.instanceof(Promise)
    })

    test.it('should log the execution of a suite type, an specific suite, and print an info log when suite execution finish OK', () => {
      return suites.run(fixtures.options.suite, fixtures.config.manySuitesAndTypes)
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
      return suites.run({
        local: true,
        suite: 'fooDockerSuite'
      }, fixtures.config.manySuitesAndTypes)
        .then(() => {
          return Promise.all([
            test.expect(docker.run).to.not.have.been.called(),
            test.expect(local.run).to.have.been.called()
          ])
        })
    })

    test.it('should run suite using docker if suite has any docker property in test', () => {
      return suites.run(fixtures.options.dockerSuite, fixtures.config.manySuitesAndTypes)
        .then(specDockerUsed)
    })

    test.it('should run suite using docker if suite has any service configured for docker', () => {
      return suites.run({
        suite: 'fooDockerSuite2'
      }, fixtures.config.manySuitesAndTypes)
        .then(specDockerUsed)
    })

    test.it('should run suite locally if suite test is not configured for docker and has not any service configured for docker', () => {
      return suites.run({
        suite: 'fooSuite2'
      }, fixtures.config.manySuitesAndTypes)
        .then(() => {
          return Promise.all([
            test.expect(docker.createFiles).to.not.have.been.called(),
            test.expect(docker.run).to.not.have.been.called(),
            test.expect(local.run).to.have.been.called()
          ])
        })
    })

    test.it('should trace the error from an errored suite execution if it is not controlled by developer', () => {
      local.run.rejects(new Error())
      return suites.run(fixtures.options.suite, fixtures.config.manySuitesAndTypes)
        .then(() => {
          return Promise.reject(new Error())
        })
        .catch(() => {
          return test.expect(tracerMock.stubs.error.callCount).to.equal(1)
        })
    })

    test.it('should reject the promise with a controlled error if suite execution fails', () => {
      local.run.rejects(Boom.notImplemented('foo message'))
      return suites.run(fixtures.options.suite, fixtures.config.manySuitesAndTypes)
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

    test.it('should call to clean docker volumes after suites execution is OK', () => {
      return suites.run(fixtures.options.suite, fixtures.config.manySuitesAndTypes)
        .then(() => {
          return test.expect(docker.downVolumes).to.have.been.called()
        })
    })

    test.it('should call to clean docker volumes even when suites execution fails', () => {
      local.run.rejects(Boom.notImplemented('foo message'))
      return suites.run(fixtures.options.suite, fixtures.config.manySuitesAndTypes)
        .catch(() => {
          return test.expect(docker.downVolumes).to.have.been.called()
        })
    })

    test.describe('when options do not specify to run all suites, an specific suite, or a suite type', () => {
      test.it('should print a warning log and resolve promise', () => {
        return suites.run(fixtures.options.standard)
          .then(() => {
            return test.expect(tracerMock.stubs.warn).to.have.been.called()
          })
      })
    })

    test.describe('when an specific suite to be executed is defined in options', () => {
      test.it('should skip all other suites executions, and execute that one', () => {
        return suites.run(fixtures.options.suite, fixtures.config.manySuitesAndTypes)
          .then(() => {
            return Promise.all([
              test.expect(tracerMock.stubs.warn.getCall(0).args[0]).to.contain('Skipping'),
              test.expect(tracerMock.stubs.warn.callCount).to.equal(3),
              test.expect(local.run.callCount).to.equal(1)
            ])
          })
      })

      test.it('should not execute any suite if provided one does not exists in config', () => {
        return suites.run({
          suite: 'unrealSuite'
        }, fixtures.config.manySuitesAndTypes)
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
        return suites.run(fixtures.options.suiteType, fixtures.config.manySuitesAndTypes)
          .then(() => {
            return Promise.all([
              test.expect(tracerMock.stubs.warn.getCall(0).args[0]).to.contain('Skipping'),
              test.expect(tracerMock.stubs.warn.callCount).to.equal(1),
              test.expect(local.run.callCount).to.equal(2)
            ])
          })
      })

      test.it('should not execute any suite type if provided one does not exists in config', () => {
        return suites.run({
          type: 'unrealType'
        }, fixtures.config.manySuitesAndTypes)
          .then(() => {
            return Promise.all([
              test.expect(tracerMock.stubs.warn.callCount).to.equal(2),
              test.expect(local.run).to.not.have.been.called()
            ])
          })
      })

      test.it('should execute all suites in that specific type', () => {
        return suites.run({
          type: 'fakeType'
        }, fixtures.config.manySuitesAndTypes)
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
