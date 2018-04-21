
const test = require('../../../index')

const mocks = require('../mocks')

test.describe('service coverage runner', () => {
  const fooServicePath = 'fooServicePath'
  const originalServicePath = process.env.servicePath
  const sandbox = test.sinon.sandbox.create()
  let requireError
  let tracerMock
  let processMock

  const ProcessMock = function () {
    let onMessageCallback

    const fake = function (event, cb) {
      onMessageCallback = cb
    }

    const sendMessage = function (data) {
      onMessageCallback(data)
    }

    return {
      fake: fake,
      sendMessage: sendMessage
    }
  }

  test.before(() => {
    tracerMock = new mocks.Tracer()
    processMock = new ProcessMock()
    sandbox.stub(process, 'on').callsFake(processMock.fake)
    sandbox.stub(process, 'exit')
    process.env.servicePath = fooServicePath
    try {
      require('../../../lib/service-coverage-runner')
    } catch (err) {
      requireError = err.message
    }
  })

  test.after(() => {
    tracerMock.restore()
    sandbox.restore()
    process.env.servicePath = originalServicePath
  })

  test.it('should print a log and exit process when process receives a message with option "exit" as true', () => {
    processMock.sendMessage({
      exit: true
    })
    test.expect(process.on).to.have.been.calledWith('message')
    test.expect(tracerMock.stubs.info).to.have.been.called()
    test.expect(process.exit).to.have.been.called()
  })

  test.it('should do nothing when process receives any other message', () => {
    process.exit.reset()
    processMock.sendMessage({
      exit: false
    })
    processMock.sendMessage(null)
    processMock.sendMessage('fooMessage')
    test.expect(process.exit).to.not.have.been.called()
  })

  test.it('should require the file defined in the "servicePath" environment variable', () => {
    test.expect(requireError).to.contain(fooServicePath)
  })
})
