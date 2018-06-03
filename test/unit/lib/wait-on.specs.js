
const test = require('../../../index')

const mocks = require('../mocks')

const waitOn = require('../../../lib/wait-on')

test.describe('wait-on', () => {
  let mocksSandbox

  test.beforeEach(() => {
    mocksSandbox = new mocks.Sandbox([
      'libs',
      'logs'
    ])
  })

  test.afterEach(() => {
    mocksSandbox.restore()
  })

  test.describe('wait method', () => {
    test.it('should call to waitOn with the provided config, extended with default, and resolve the promise when it finish', () => {
      return waitOn.wait({
        resources: ['foo']
      }).then(() => {
        return test.expect(mocksSandbox.libs.stubs.waitOn).to.have.been.calledWith({
          interval: 100,
          timeout: 60000,
          resources: ['foo']
        })
      })
    })

    test.it('should resolve the promise if no configuration is provided', () => {
      return waitOn.wait().then(() => {
        return test.expect(mocksSandbox.libs.stubs.waitOn).to.not.have.been.called()
      })
    })

    test.it('should print a log before launching waitOn, with information about the configuration', () => {
      return waitOn.wait({
        resources: ['foo resource', 'foo'],
        reverse: true
      }).then(() => {
        return test.expect(mocksSandbox.logs.stubs.waitConfig).to.have.been.calledWith({
          config: JSON.stringify({
            resources: ['foo resource', 'foo'],
            reverse: true
          })
        })
      })
    })

    test.it('should print a log when the promise is resolved', () => {
      return waitOn.wait({
        resources: ['foo resource']
      }).then(() => {
        return test.expect(mocksSandbox.logs.stubs.waitFinish).to.have.been.calledWith({
          resources: ['foo resource']
        })
      })
    })

    test.it('should reject the promise when waitOn returns an error', () => {
      const error = new Error('foo error')
      mocksSandbox.libs.stubs.waitOn.returns(error)
      return waitOn.wait({
        resources: ['foo']
      })
        .then(() => {
          return Promise.reject(new Error())
        })
        .catch((err) => {
          return test.expect(err).to.equal(error)
        })
    })

    test.it('should print a log when the promise is rejected', () => {
      mocksSandbox.libs.stubs.waitOn.returns(new Error())
      return waitOn.wait({
        resources: ['resource', 'foo']
      }).catch(() => {
        return test.expect(mocksSandbox.logs.stubs.waitTimeOut).to.have.been.calledWith({
          resources: ['resource', 'foo']
        })
      })
    })
  })

  test.describe('configToArguments method', () => {
    test.it('should return an string containing commands arguments for wait-on library based on the provided configuration object', () => {
      test.expect(waitOn.configToArguments({
        timeout: 3000,
        delay: 4500,
        interval: 300,
        reverse: false,
        resources: ['fooValue', 'fooValue2']
      })).to.equal('--timeout=3000 --delay=4500 --interval=300 fooValue fooValue2')
    })

    test.it('should ignore false configuration values', () => {
      test.expect(waitOn.configToArguments({
        timeout: false,
        delay: false,
        interval: false,
        reverse: true,
        resources: 'fooValue'
      })).to.equal('--reverse fooValue')
    })

    test.it('should ignore not provided configuration values', () => {
      test.expect(waitOn.configToArguments({
        resources: 'fooValue'
      })).to.equal('fooValue')
    })
  })
})
