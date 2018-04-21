
const Promise = require('bluebird')
const Boom = require('boom')
const mockery = require('mockery')

const test = require('../../../index')
const fixtures = require('../fixtures')

test.describe('runner', () => {
  let sandbox
  let config
  let options
  let tracer
  let standard
  let suites
  let waitForFinish

  test.beforeEach(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    })

    sandbox = test.sinon.sandbox.create()

    config = require('../../../lib/config')
    options = require('../../../lib/options')
    tracer = require('../../../lib/tracer')
    standard = require('../../../lib/standard')
    suites = require('../../../lib/suites')

    sandbox.stub(config, 'get').usingPromise().resolves(fixtures.config.customResult)
    sandbox.stub(options, 'get').usingPromise().resolves(fixtures.options.standard)
    sandbox.stub(standard, 'run').usingPromise().resolves()
    sandbox.stub(suites, 'run').usingPromise().resolves()
    sandbox.stub(tracer, 'error')
    sandbox.stub(process, 'exit')

    waitForFinish = function () {
      return new Promise((resolve, reject) => {
        let checkFinish = setInterval(() => {
          if (suites.run.callCount > 0 || tracer.error.callCount > 0) {
            clearInterval(checkFinish)
            resolve()
          }
        }, 10)
      })
    }
  })

  test.afterEach(() => {
    sandbox.restore()
    mockery.disable()
  })

  test.it('should run standard and suites, passing to them options and configuration', () => {
    require('../../../lib/runner')
    return waitForFinish()
      .then(() => {
        return Promise.all([
          test.expect(standard.run.getCall(0).args[0]).to.deep.equal(fixtures.options.standard),
          test.expect(standard.run.getCall(0).args[1]).to.deep.equal(fixtures.config.customResult),
          test.expect(suites.run.getCall(0).args[0]).to.deep.equal(fixtures.options.standard),
          test.expect(suites.run.getCall(0).args[1]).to.deep.equal(fixtures.config.customResult)
        ])
      })
  })

  test.it('should trace the error message when a controlled error is received', () => {
    const fooErrorMessage = 'foo error message'
    options.get.rejects(Boom.notFound(fooErrorMessage))
    require('../../../lib/runner')
    return waitForFinish()
      .then(() => {
        return Promise.all([
          test.expect(suites.run).to.not.have.been.called(),
          test.expect(standard.run).to.not.have.been.called(),
          test.expect(tracer.error).to.have.been.calledWith(fooErrorMessage)
        ])
      })
  })

  test.it('should trace the full error when a not controlled error is received', () => {
    const error = new Error()
    suites.run.rejects(error)
    require('../../../lib/runner')
    return waitForFinish()
      .then(() => {
        return test.expect(tracer.error).to.have.been.calledWith(error)
      })
  })

  test.it('should exit process when any error is received', () => {
    standard.run.rejects(new Error())
    require('../../../lib/runner')
    return waitForFinish()
      .then(() => {
        return test.expect(process.exit).to.have.been.called()
      })
  })
})
