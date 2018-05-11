
const test = require('../../../../index')
const utils = require('../utils')

test.describe('api-local tests execution', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have not started mongodb', () => {
    return test.expect(outerrLog).to.not.include('MongoDB starting')
  })

  test.it('should have wait for services before starting others', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('[Narval] [DEBUG] Waiting until "tcp:localhost:3000" is available'),
      test.expect(outerrLog).to.include('[Narval] [DEBUG] Wait finished. "tcp:localhost:3000" is available')
    ])
  })

  test.it('should have started api', () => {
    return test.expect(outerrLog).to.include('Starting server at port 3000')
  })

  test.it('should have executed tests', () => {
    return test.expect(outerrLog).to.include('[Narval] [DEBUG] Starting tests of "end-to-end" suite "books-api" without coverage')
  })

  test.it('should have stopped services', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('[Narval] [DEBUG] Test execution finished. Closing related services'),
      test.expect(outerrLog).to.include('[Narval] [DEBUG] Service "api-server" closed with code null')
    ])
  })
})
