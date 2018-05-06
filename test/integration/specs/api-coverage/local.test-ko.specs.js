
const test = require('../../../../index')
const utils = require('../utils')

test.describe('api-local-coverage suite execution not passing tests', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have not passed tests', () => {
    return Promise.all([
      test.expect(outerrLog).to.not.include('✓ should return all added books'),
      test.expect(outerrLog).to.not.include('5 passing')
    ])
  })

  test.it('should have forced api exit', () => {
    return test.expect(outerrLog).to.include('[Narval] [DEBUG] Service "api-server" closed with code null')
  })

  test.it('should have not sent an exit signal to api when tests have finished', () => {
    return test.expect(outerrLog).to.not.include('[Narval] [INFO] Exit signal received. Exiting coveraged service process')
  })
})
