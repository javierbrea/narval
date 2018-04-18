
const Promise = require('bluebird')
const Boom = require('boom')
const mockery = require('mockery')

const test = require('../../../index')
const configFixtures = require('./config.fixtures')

test.describe('runner', () => {
  const optionsFixture = {
    standard: true
  }
  const dataFixture = {
    options: optionsFixture,
    config: configFixtures.customResult
  }
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

    sandbox.stub(config, 'get').usingPromise().resolves(configFixtures.customResult)
    sandbox.stub(options, 'get').usingPromise().resolves(optionsFixture)
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
          test.expect(standard.run.getCall(0).args[0]).to.deep.equal(dataFixture),
          test.expect(suites.run.getCall(0).args[0]).to.deep.equal(dataFixture)
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
