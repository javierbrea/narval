
const test = require('../../../../index')
const utils = require('../utils')

test.describe('api-local-coverage suite execution passing tests', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have passed tests', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('✓ should return all added books'),
      test.expect(outerrLog).to.include('5 passing')
    ])
  })

  test.it('should have exited api without error', () => {
    return test.expect(outerrLog).to.include('[Narval] [DEBUG] Service "api-server" closed with code 0')
  })

  test.it('should have sent an exit signal to api when tests have finished', () => {
    return test.expect(outerrLog).to.include('[Narval] [INFO] Exit signal received. Exiting coveraged service process')
  })
})
