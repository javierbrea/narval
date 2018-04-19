
const Boom = require('boom')
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
  })
})
