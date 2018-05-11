
const Promise = require('bluebird')
const mockery = require('mockery')
const Boom = require('boom')

const test = require('../../../index')
const fixtures = require('../fixtures')

test.describe('runner', () => {
  const runnerPath = '../../../lib/runner'
  let sandbox
  let config
  let options
  let states
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
    states = require('../../../lib/states')
    standard = require('../../../lib/standard')
    suites = require('../../../lib/suites')

    sandbox.stub(config, 'get').usingPromise().resolves(fixtures.config.customResult)
    sandbox.stub(options, 'get').usingPromise().resolves(fixtures.options.standard)
    sandbox.stub(standard, 'run').usingPromise().resolves()
    sandbox.stub(suites, 'run').usingPromise().resolves()
    sandbox.stub(states, 'get').returns(false)
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

  test.it('should run standard and suites', () => {
    require(runnerPath)
    return waitForFinish()
      .then(() => {
        return Promise.all([
          test.expect(standard.run).to.have.been.called(),
          test.expect(suites.run).to.have.been.called()
        ])
      })
  })

  test.it('should trace the full error when a not controlled error is received', () => {
    const error = new Error()
    suites.run.rejects(error)
    require(runnerPath)
    return waitForFinish()
      .then(() => {
        return test.expect(tracer.error).to.have.been.calledWith(error)
      })
  })

  test.it('should trace only the error message when a controlled error is received', () => {
    const fooMessage = 'Foo error message'
    const error = Boom.notFound(fooMessage)
    suites.run.rejects(error)
    require(runnerPath)
    return waitForFinish()
      .then(() => {
        return test.expect(tracer.error).to.have.been.calledWith(fooMessage)
      })
  })

  test.it('should mark process to exit with error when any error is received', () => {
    standard.run.rejects(new Error())
    require(runnerPath)
    return waitForFinish()
      .then(() => {
        return test.expect(process.exit).to.not.have.been.called()
      })
  })

  test.it('should exit process when any error is received and an state defines this behavior', () => {
    states.get.returns(true)
    standard.run.rejects(new Error())
    require(runnerPath)
    return waitForFinish()
      .then(() => {
        return test.expect(process.exit).to.have.been.called()
      })
  })
})
