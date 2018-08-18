const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('api-abort-on-error local tests execution', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have exited api with an error', () => {
    return test.expect(outerrLog).to.include('[Narval] [ERROR] Service "api-server" closed with code 1')
  })

  test.it('should have timed out waiting to execute tests', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Wait timed out. "tcp:localhost:3000" is not available.'),
      test.expect(outerrLog).to.include('Error running tests of "integration" suite "logs"')
    ])
  })

  test.it('should have closed all services', () => {
    return test.expect(outerrLog).to.include('Test execution finished. Closing related services')
  })
})
