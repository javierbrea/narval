
const Boom = require('boom')

const test = require('../../../index')
const mocks = require('../mocks')

const standard = require('../../../lib/standard')

test.describe('standard', () => {
  test.describe('run method', () => {
    let options = {
      options: {
        standard: true
      }
    }
    let tracerMock
    let childProcessMock
    let pathsMocks

    test.beforeEach(() => {
      tracerMock = new mocks.Tracer()
      childProcessMock = new mocks.ChildProcess()
      pathsMocks = new mocks.Paths()
      childProcessMock.stubs.fork.on.returns(0)
    })

    test.afterEach(() => {
      tracerMock.restore()
      childProcessMock.restore()
      pathsMocks.restore()
    })

    test.it('should return a promise', () => {
      return test.expect(standard.run(options)).to.be.an.instanceof(Promise)
    })

    test.describe('when it is enabled in options', () => {
      test.it('should print an info log', () => {
        return standard.run(options)
        .then(() => {
          return test.expect(tracerMock.stubs.info).to.have.been.called()
        })
      })

      test.it('should open a child process running the standard binary', () => {
        const fooStandardPath = 'fooStandardPath'
        pathsMocks.stubs.findDependencyFile.returns(fooStandardPath)
        return standard.run(options)
          .then(() => {
            return Promise.all([
              test.expect(pathsMocks.stubs.findDependencyFile.getCall(0).args[0]).to.contain('standard'),
              test.expect(childProcessMock.stubs.fork.getCall(0).args[0]).to.equal(fooStandardPath)
            ])
          })
      })

      test.it('should reject the promise with a controlled error when process finish with code different to 0', () => {
        childProcessMock.stubs.fork.on.returns(1)
        return standard.run(options)
          .then(() => {
            return Promise.reject(new Error())
          })
          .catch((err) => {
            return test.expect(Boom.isBoom(err)).to.be.true()
          })
      })

      test.it('should print an info log and resolve the promise when process finish with code 0', () => {
        childProcessMock.stubs.fork.on.returns(0)
        return standard.run(options)
          .then(() => {
            return test.expect(tracerMock.stubs.info).to.have.been.calledTwice()
          })
      })
    })

    test.describe('when is disabled in options', () => {
      test.before(() => {
        options = {
          options: {
            standard: false
          }
        }
      })

      test.it('should print a warning log and resolve promise if it is not enabled in received options', () => {
        return standard.run(options)
          .then(() => {
            return test.expect(tracerMock.stubs.warn).to.have.been.called()
          })
      })
    })
  })
})
