
const Boom = require('boom')
const Promise = require('bluebird')

const test = require('../../../index')
const mocks = require('../mocks')
const fixtures = require('../fixtures')

const standard = require('../../../lib/standard')

test.describe('standard', () => {
  test.describe('run method', () => {
    let sandbox
    let mocksSandbox

    test.beforeEach(() => {
      sandbox = test.sinon.sandbox.create()
      mocksSandbox = new mocks.Sandbox([
        'logs',
        'paths',
        'options',
        'config',
        'processes'
      ])
      mocksSandbox.processes.stubs.fork.resolves(0)
      mocksSandbox.config.stubs.standard.resolves(fixtures.config.standard.empty)
      mocksSandbox.options.stubs.get.resolves(fixtures.options.standard)
    })

    test.afterEach(() => {
      sandbox.restore()
      mocksSandbox.restore()
    })

    test.it('should return a promise', () => {
      return standard.run()
        .then(() => {
          return test.expect(true).to.be.true()
        })
    })

    test.describe('when it is enabled in options', () => {
      test.it('should print an info log', () => {
        return standard.run()
          .then(() => {
            return test.expect(mocksSandbox.logs.stubs.runningStandard).to.have.been.called()
          })
      })

      test.it('should call to processes for running the standard binary', () => {
        const fooStandardPath = 'fooStandardPath'
        mocksSandbox.paths.stubs.findDependencyFile.returns(fooStandardPath)
        return standard.run()
          .then(() => {
            return Promise.all([
              test.expect(mocksSandbox.paths.stubs.findDependencyFile.getCall(0).args[0]).to.contain('standard'),
              test.expect(mocksSandbox.processes.stubs.fork.getCall(0).args[0]).to.equal(fooStandardPath),
              test.expect(mocksSandbox.processes.stubs.fork.getCall(0).args[1].resolveOnClose).to.be.true()
            ])
          })
      })

      test.it('should pass the --fix option to the process if received in options', () => {
        mocksSandbox.options.stubs.get.resolves(fixtures.options.fix)
        return standard.run()
          .then(() => {
            const args = mocksSandbox.processes.stubs.fork.getCall(0).args[1].args
            return Promise.all([
              test.expect(args[args.length - 1]).to.equal('--fix')
            ])
          })
      })

      test.it('should pass the directories configuration to the process', () => {
        mocksSandbox.config.stubs.standard.resolves(fixtures.config.standard.customDirs)
        return standard.run()
          .then(() => {
            const args = mocksSandbox.processes.stubs.fork.getCall(0).args[1].args
            const dirs = fixtures.config.standard.customDirs.directories
            return Promise.all([
              test.expect(args[0]).to.equal(dirs[0]),
              test.expect(args[1]).to.equal(dirs[1])
            ])
          })
      })

      test.it('should reject the promise with a controlled error when process finish with code different to 0', () => {
        mocksSandbox.processes.stubs.fork.resolves(1)
        return standard.run()
          .then(() => {
            return Promise.reject(new Error())
          })
          .catch((err) => {
            return test.expect(Boom.isBoom(err)).to.be.true()
          })
      })

      test.it('should print an info log and resolve the promise when process finish with code 0', () => {
        return standard.run()
          .then(() => {
            return test.expect(mocksSandbox.logs.stubs.standardOk).to.have.been.called()
          })
      })
    })

    test.describe('when it is disabled in options', () => {
      test.it('should print a warning log and resolve promise if it is not enabled in received options', () => {
        mocksSandbox.options.stubs.get.resolves({})
        return standard.run()
          .then(() => {
            return test.expect(mocksSandbox.logs.stubs.skipStandard).to.have.been.called()
          })
      })
    })
  })
})
