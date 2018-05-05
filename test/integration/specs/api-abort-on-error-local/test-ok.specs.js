const test = require('../../../../index')
const utils = require('../utils')

test.describe('api-abort-on-error local tests execution', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have exited api with an error', () => {
    return test.expect(outerrLog).to.include('[Narval] [ERROR] Service "api-server" closed with code 1')
  })

  test.it('should have passed tests execution', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('1 passing'),
      test.expect(outerrLog).to.include('✓ should pass')
    ])
  })

  test.it('should have marked the suite as failed', () => {
    return test.expect(outerrLog).to.include('ERR! Test failed')
  })
})
