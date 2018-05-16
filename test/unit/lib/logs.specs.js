
const test = require('../../../index')
const mocks = require('../mocks')

const logs = require('../../../lib/logs')

test.describe('logs', () => {
  let sandbox
  let mocksSandbox

  test.beforeEach(() => {
    sandbox = test.sinon.sandbox.create()
    mocksSandbox = new mocks.Sandbox([
      'tracer',
      'config'
    ])
  })

  test.afterEach(() => {
    sandbox.restore()
    mocksSandbox.restore()
  })

  test.describe('SuiteLogger constructor', () => {
    const fooSuiteTypeName = 'foo-suite-type-name'
    const fooSuiteName = 'foo-suite-name'
    let logger
    let configMock

    test.beforeEach(() => {
      configMock = new mocksSandbox.config.stubs.SuiteResolver()
      configMock.typeName.returns(fooSuiteTypeName)
      configMock.name.returns(fooSuiteName)
      logger = new logs.SuiteLogger(configMock)
    })

    test.it('should log the message with the defined level and return it, replacing the received data', () => {
      const fooCommand = 'foo-full-name'
      const log = logger.beforeCommand({
        command: fooCommand
      })
      const result = `Executing before command "${fooCommand}"`
      test.expect(mocksSandbox.tracer.stubs.debug).to.have.been.calledWith(result)
      test.expect(log).to.equal(result)
    })

    test.it('should join an array using commas when "comma-separated" helper is used', () => {
      test.expect(logger.dockerServicesStillRunning({
        services: ['foo-service-name', 'foo-service-2']
      })).to.include('foo-service-name, foo-service-2')

      test.expect(logger.dockerServicesStillRunning({
        services: 'foo-service-name'
      })).to.include('foo-service-name')
    })

    test.it('should add to all templates predefined data from suite config', () => {
      const fooService = 'foo-service-name'
      const log = logger.noDockerServiceConfig({
        service: fooService
      })
      const result = `There is no Docker configuration for service "${fooService}" in suite "${fooSuiteName}" of type "${fooSuiteTypeName}"`
      test.expect(mocksSandbox.tracer.stubs.warn).to.have.been.calledWith(result)
      test.expect(log).to.equal(result)
    })

    test.it('should use a custom log level if it is defined in arguments', () => {
      const result = `Skipping "${fooSuiteTypeName}" suite "${fooSuiteName}"`
      let log = logger.skip('log')
      test.expect(mocksSandbox.tracer.stubs.log).to.have.been.calledWith(result)
      test.expect(log).to.equal(result)

      log = logger.skip({
        fooData: 'foo'
      }, 'debug')
      test.expect(mocksSandbox.tracer.stubs.debug).to.have.been.calledWith(result)
      test.expect(log).to.equal(result)

      log = logger.skip({
        fooData: 'foo'
      }, true, 'warn')
      test.expect(mocksSandbox.tracer.stubs.warn).to.have.been.calledWith(result)
      test.expect(log).to.equal(result)

      log = logger.skip(true, 'error')
      test.expect(mocksSandbox.tracer.stubs.error).to.have.been.calledWith(result)
      test.expect(log).to.equal(result)
    })

    test.it('should not trace the message if it is defined in arguments', () => {
      const result = `Skipping "${fooSuiteTypeName}" suite "${fooSuiteName}"`
      let log = logger.skip(false)
      test.expect(mocksSandbox.tracer.stubs.log).to.not.have.been.called()
      test.expect(log).to.equal(result)

      log = logger.skip({
        fooData: 'foo'
      }, false)
      test.expect(mocksSandbox.tracer.stubs.log).to.not.have.been.called()
      test.expect(log).to.equal(result)
    })
  })
})
