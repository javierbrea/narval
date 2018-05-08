
const test = require('../../../../index')
const utils = require('../utils')

test.describe('api-integration local tests execution', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have started services locally', () => {
    return test.expect(outerrLog).to.include('[Narval] [DEBUG] Starting locally service "api-server"')
  })

  test.it('should have applied custom wait-on configuration', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('[Narval] [DEBUG] Waiting until "tcp:localhost:3000" is available'),
      test.expect(outerrLog).to.include('[Narval] [DEBUG] Wait finished. "tcp:localhost:3000" is available.'),
      test.expect(outerrLog).to.include('"timeout":35000,"interval":60,"delay":150}')
    ])
  })

  test.it('should have executed tests locally', () => {
    return test.expect(outerrLog).to.match(/Starting tests of suite "[\w|-]*" without coverage/)
  })

  test.it('should have stopped services', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('[Narval] [DEBUG] Test execution finished. Closing related services'),
      test.expect(outerrLog).to.include('[Narval] [DEBUG] Service "api-server" closed with code null')
    ])
  })
})
