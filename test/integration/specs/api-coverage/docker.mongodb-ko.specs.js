
const test = require('../../../../index')
const utils = require('../utils')

test.describe('api-docker-coverage suite execution mongodb failing', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have not waited until "exit_after" time for exiting api', () => {
    return test.expect(outerrLog).to.not.include('Service timeout finished after')
  })

  test.it('should have exited mongodb with error', () => {
    return test.expect(outerrLog).to.match(/Docker container "mongodb-container" of service "mongodb" exited with code "[^0]/)
  })

  test.it('should have exited started api service and exited with an error, after timeout waiting for mongodb', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Error: Timeout'),
      test.expect(outerrLog).to.include('[Narval] [DEBUG] RUNNING COMMAND: node_modules/.bin/narval-msc-istanbul'),
      test.expect(outerrLog).to.include('[Narval] [ERROR] Docker container "api-container" of service "api-server" exited with code "1"')
    ])
  })

  test.it('should have forced exit of tests service', () => {
    return test.expect(outerrLog).to.include('[Narval] [WARN] Docker container "test-container" of service "test" exited with code "137"')
  })
})
