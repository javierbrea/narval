
const test = require('../../../../index')
const utils = require('../utils')

test.describe('api-docker-coverage suite execution passing tests', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have passed tests', () => {
    return test.expect(outerrLog).to.include('[Narval] [DEBUG] Docker container "test-container" of service "test" exited with code "0"')
  })

  test.it('should have exited api without error', () => {
    return test.expect(outerrLog).to.include('[Narval] [DEBUG] Docker container "api-container" of service "api-server" exited with code "0"')
  })

  test.it('should have exited api after "exit_after" time', () => {
    return test.expect(outerrLog).to.include('Service timeout finished after 10000ms. Exiting...')
  })
})
