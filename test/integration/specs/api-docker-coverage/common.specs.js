
const test = require('../../../../index')
const utils = require('../utils')

test.describe('api-docker-coverage suite execution', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have waited for api execution finish', () => {
    return test.expect(outerrLog).to.include('[Narval] [DEBUG] Services "mongodb, api-server" are still running. Waiting...')
  })

  test.it('should have forced exit of mongodb service', () => {
    return test.expect(outerrLog).to.include('[Narval] [WARN] Docker container "mongodb-container" of service "mongodb" exited with code "137"')
  })
})
