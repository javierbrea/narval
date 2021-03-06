
const test = require('../../../../index')

const utils = require('../../../../utils')

test.describe('services logs', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  const expectServiceSuite = function (suiteNumber, serviceNumber) {
    test.expect(outerrLog).to.include(`Foo command of service service-${serviceNumber} of suite suite-${suiteNumber} has been executed`)
    test.expect(outerrLog).to.include(`docker_service-${serviceNumber}-container_1 exited with code 0`)
  }

  test.it('should have executed and log exit of all services in suite-1', () => {
    expectServiceSuite('1', '1')
    expectServiceSuite('1', '2')
    expectServiceSuite('1', '3')
  })

  test.it('should have executed and log exit of all services in suite-2', () => {
    expectServiceSuite('2', '1')
    expectServiceSuite('2', '2')
    expectServiceSuite('2', '3')
  })
})
