
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('api-docker-coverage suite execution mongodb failing', function () {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have not waited until "exit_after" time for exiting api', () => {
    return test.expect(outerrLog).to.not.include('Service timeout finished after')
  })

  test.it('should have exited mongodb with error', () => {
    return test.expect(outerrLog).to.match(/Docker container "mongodb-container" of service "mongodb" exited with code "[^0]/)
  })

  test.it('should have forced exit of api service', () => {
    return test.expect(outerrLog).to.include('[Narval] [WARN] Docker container "api-container" of service "api-server" exited with code "137"')
  })

  test.it('should have forced exit of tests service', () => {
    return test.expect(outerrLog).to.include('[Narval] [WARN] Docker container "test-container" of service "test" exited with code "137"')
  })
})
