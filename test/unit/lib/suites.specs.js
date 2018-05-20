
const Promise = require('bluebird')
const Boom = require('boom')

const test = require('../../../index')
const mocks = require('../mocks')
const fixtures = require('../fixtures')

const suites = require('../../../lib/suites')

test.describe('suites', () => {
  test.describe('run method', () => {
    const sandbox = test.sinon.sandbox.create()
    let mocksSandbox

    test.beforeEach(() => {
      mocksSandbox = new mocks.Sandbox([
        'suitelocal',
        'suitedocker',
        'docker',
        'tracer',
        'paths',
        'options',
        'config',
        'logs'
      ])
      mocksSandbox.config.stubs.suitesByType.resolves(fixtures.config.manySuitesAndTypes.suitesByType)
      mocksSandbox.config.stubs.suiteResolver.hasToRun.returns(true)
      mocksSandbox.options.stubs.get.resolves(fixtures.options.suite)
    })

    test.afterEach(() => {
      sandbox.restore()
      mocksSandbox.restore()
    })

    test.it('should return a promise', () => {
      return suites.run()
        .then(() => {
          return test.expect(true).to.be.true()
        })
    })

    test.describe('when options do not specify to run all suites, an specific suite, or a suite type', () => {
      test.it('should print a warning log and resolve promise', () => {
        mocksSandbox.options.stubs.get.resolves(fixtures.options.standard)
        return suites.run()
          .then(() => {
            return Promise.all([
              test.expect(mocksSandbox.logs.stubs.skipAllSuites).to.have.been.called(),
              test.expect(mocksSandbox.suitedocker.stubs.Runner).to.not.have.been.called(),
              test.expect(mocksSandbox.suitelocal.stubs.Runner).to.not.have.been.called()
            ])
          })
      })
    })

    test.it('should print a log when starts the execution of a suite type', () => {
      return suites.run()
        .then(() => {
          return test.expect(mocksSandbox.logs.stubs.runningSuiteType).to.have.been.calledWith({
            type: 'fooType'
          })
        })
    })

    test.it('should clean logs folder before executing suites', () => {
      const fooLogsPath = 'fooPath'
      mocksSandbox.options.stubs.get.resolves(fixtures.options.suite)
      mocksSandbox.paths.stubs.logs.returns(fooLogsPath)
      mocksSandbox.paths.stubs.cwd.remove.resolves()
      return suites.run()
        .then(() => {
          return Promise.all([
            test.expect(mocksSandbox.paths.stubs.cwd.remove).to.have.been.calledWith(fooLogsPath),
            test.expect(mocksSandbox.paths.stubs.cwd.ensureDir).to.have.been.calledWith(fooLogsPath)
          ])
        })
    })

    test.it('should call to clean docker volumes after suites execution is OK', () => {
      mocksSandbox.options.stubs.get.resolves(fixtures.options.suite)
      return suites.run()
        .then(() => {
          return test.expect(mocksSandbox.docker.stubs.downVolumes).to.have.been.called()
        })
    })

    test.it('should call to clean docker volumes even when suites execution fails', () => {
      mocksSandbox.options.stubs.get.resolves(fixtures.options.suite)
      mocksSandbox.suitelocal.stubs.run.rejects(new Error())
      return suites.run()
        .catch(() => {
          return test.expect(mocksSandbox.docker.stubs.downVolumes).to.have.been.called()
        })
    })

    test.it('should run suite using docker if configuration specifies it', () => {
      mocksSandbox.config.stubs.suiteResolver.isDocker.returns(true)
      return suites.run()
        .then(() => {
          return Promise.all([
            test.expect(mocksSandbox.suitedocker.stubs.Runner).to.have.been.called(),
            test.expect(mocksSandbox.suitelocal.stubs.Runner).to.not.have.been.called()
          ])
        })
    })

    test.it('should call to create docker files if one suite has to be executed using docker', () => {
      mocksSandbox.config.stubs.suiteResolver.isDocker.returns(true)
      return suites.run()
        .then(() => {
          return test.expect(mocksSandbox.docker.stubs.createFiles).to.have.been.called()
        })
    })

    test.it('should run suite without using docker if configuration specifies it', () => {
      mocksSandbox.config.stubs.suiteResolver.isDocker.returns(false)
      return suites.run()
        .then(() => {
          return Promise.all([
            test.expect(mocksSandbox.suitedocker.stubs.Runner).to.not.have.been.called(),
            test.expect(mocksSandbox.suitelocal.stubs.Runner).to.have.been.called()
          ])
        })
    })

    test.it('should print a log before starting suite execution', () => {
      return suites.run()
        .then(() => {
          return test.expect(mocksSandbox.logs.stubs.suiteLogger.startRun).to.have.been.called()
        })
    })

    test.it('should print a log when suite execution finish ok', () => {
      return suites.run()
        .then(() => {
          return test.expect(mocksSandbox.logs.stubs.suiteLogger.finishOk).to.have.been.called()
        })
    })

    test.it('should no execute suite and print a log if configuration specifies it', () => {
      mocksSandbox.config.stubs.suiteResolver.hasToRun.returns(false)
      return suites.run()
        .then(() => {
          return Promise.all([
            test.expect(mocksSandbox.suitedocker.stubs.Runner).to.not.have.been.called(),
            test.expect(mocksSandbox.suitelocal.stubs.Runner).to.not.have.been.called(),
            test.expect(mocksSandbox.logs.stubs.suiteLogger.finishOk).to.not.have.been.called(),
            test.expect(mocksSandbox.logs.stubs.suiteLogger.startRun).to.not.have.been.called(),
            test.expect(mocksSandbox.logs.stubs.suiteLogger.skip).to.have.been.called()
          ])
        })
    })

    test.it('should trace the error from an errored suite execution if it is not controlled by developer', () => {
      mocksSandbox.config.stubs.suiteResolver.isDocker.returns(false)
      mocksSandbox.suitelocal.stubs.run.rejects(new Error())
      return suites.run()
        .then(() => {
          return Promise.reject(new Error())
        })
        .catch(() => {
          return test.expect(mocksSandbox.tracer.stubs.error.callCount).to.equal(1)
        })
    })

    test.it('should reject the promise with a controlled error if suite execution fails', () => {
      mocksSandbox.config.stubs.suiteResolver.isDocker.returns(false)
      mocksSandbox.suitelocal.stubs.run.rejects(Boom.notImplemented('foo message'))
      return suites.run()
        .then(() => {
          return Promise.reject(new Error())
        })
        .catch((error) => {
          return Promise.all([
            test.expect(mocksSandbox.logs.stubs.suiteLogger.finishError).to.have.been.called(),
            test.expect(Boom.isBoom(error)).to.be.true()
          ])
        })
    })

    test.describe('when an specific suite type to be executed is defined in options', () => {
      test.it('should skip all other suites types executions, and run all suites in that type', () => {
        mocksSandbox.options.stubs.get.resolves(fixtures.options.suiteType)
        return suites.run()
          .then(() => {
            return Promise.all([
              test.expect(mocksSandbox.logs.stubs.runningSuiteType).to.have.been.calledWith({ type: 'fooType' }),
              test.expect(mocksSandbox.logs.stubs.skipSuiteType).to.have.been.calledWith({ type: 'fakeType' }),
              test.expect(mocksSandbox.suitelocal.stubs.Runner.callCount).to.equal(2)
            ])
          })
      })

      test.it('should not execute any suite type if provided one does not exists in config', () => {
        mocksSandbox.options.stubs.get.resolves({
          type: 'unrealType'
        })
        return suites.run()
          .then(() => {
            return Promise.all([
              test.expect(mocksSandbox.logs.stubs.skipSuiteType.callCount).to.equal(2),
              test.expect(mocksSandbox.suitelocal.stubs.Runner).to.not.have.been.called()
            ])
          })
      })

      test.it('should execute all suites in that specific type', () => {
        mocksSandbox.config.stubs.suiteResolver.isDocker.returns(true)
        mocksSandbox.options.stubs.get.resolves({
          type: 'fakeType'
        })
        return suites.run()
          .then(() => {
            return Promise.all([
              test.expect(mocksSandbox.docker.stubs.createFiles).to.have.been.calledTwice(),
              test.expect(mocksSandbox.suitedocker.stubs.Runner).to.have.been.calledTwice()
            ])
          })
      })
    })
  })
})
