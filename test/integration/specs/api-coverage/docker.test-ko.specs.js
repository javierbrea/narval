
const test = require('../../../../index')
const utils = require('../utils')

test.describe('api-docker-coverage suite execution not passing tests', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have not passed tests', () => {
    return test.expect(outerrLog).to.match(/Docker container "test-container" of service "test" exited with code "[^0]/)
  })

  test.it('should have not waited until "exit_after" time for exiting api', () => {
    return test.expect(outerrLog).to.not.include('Service timeout finished after')
  })

  test.it('should have forced exit of api', () => {
    return test.expect(outerrLog).to.include('[Narval] [WARN] Docker container "api-container" of service "api-server" exited with code "137"')
  })
})
