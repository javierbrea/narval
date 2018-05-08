
const Boom = require('boom')
const Promise = require('bluebird')

const test = require('../../../index')
const mocks = require('../mocks')
const fixtures = require('../fixtures')

const standard = require('../../../lib/standard')
const processes = require('../../../lib/processes')
const config = require('../../../lib/config')
const options = require('../../../lib/options')

test.describe('standard', () => {
  test.describe('run method', () => {
    let sandbox
    let tracerMock
    let pathsMocks

    test.beforeEach(() => {
      sandbox = test.sinon.sandbox.create()
      tracerMock = new mocks.Tracer()
      pathsMocks = new mocks.Paths()
      sandbox.stub(processes, 'fork').usingPromise().resolves(0)
      sandbox.stub(config, 'standard').usingPromise().resolves(fixtures.config.standard.empty)
      sandbox.stub(options, 'get').usingPromise().resolves(fixtures.options.standard)
    })

    test.afterEach(() => {
      tracerMock.restore()
      pathsMocks.restore()
      sandbox.restore()
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
            return test.expect(tracerMock.stubs.info).to.have.been.called()
          })
      })

      test.it('should call to processes for running the standard binary', () => {
        const fooStandardPath = 'fooStandardPath'
        pathsMocks.stubs.findDependencyFile.returns(fooStandardPath)
        return standard.run()
          .then(() => {
            return Promise.all([
              test.expect(pathsMocks.stubs.findDependencyFile.getCall(0).args[0]).to.contain('standard'),
              test.expect(processes.fork.getCall(0).args[0]).to.equal(fooStandardPath),
              test.expect(processes.fork.getCall(0).args[1].resolveOnClose).to.be.true()
            ])
          })
      })

      test.it('should pass the --fix option to the process if received in options', () => {
        options.get.resolves(fixtures.options.fix)
        return standard.run()
          .then(() => {
            const args = processes.fork.getCall(0).args[1].args
            return Promise.all([
              test.expect(args[args.length - 1]).to.equal('--fix')
            ])
          })
      })

      test.it('should pass the directories configuration to the process', () => {
        config.standard.resolves(fixtures.config.standard.customDirs)
        return standard.run()
          .then(() => {
            const args = processes.fork.getCall(0).args[1].args
            const dirs = fixtures.config.standard.customDirs.directories
            return Promise.all([
              test.expect(args[0]).to.equal(dirs[0]),
              test.expect(args[1]).to.equal(dirs[1])
            ])
          })
      })

      test.it('should reject the promise with a controlled error when process finish with code different to 0', () => {
        processes.fork.resolves(1)
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
            return Promise.all([
              test.expect(tracerMock.stubs.info).to.have.been.calledTwice(),
              test.expect(tracerMock.stubs.info.getCall(1).args[0]).to.include('finished OK')
            ])
          })
      })
    })

    test.describe('when it is disabled in options', () => {
      test.it('should print a warning log and resolve promise if it is not enabled in received options', () => {
        options.get.resolves({})
        return standard.run()
          .then(() => {
            return Promise.all([
              test.expect(tracerMock.stubs.warn).to.have.been.called(),
              test.expect(tracerMock.stubs.warn.getCall(0).args[0]).to.include('Skipping')
            ])
          })
      })
    })
  })
})
