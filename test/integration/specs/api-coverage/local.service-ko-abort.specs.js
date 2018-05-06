
const test = require('../../../../index')
const utils = require('../utils')

test.describe('api-local-coverage suite execution service failing with abort-on-error', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have exited api with error', () => {
    return test.expect(outerrLog).to.match(/Service "api-server" closed with code [^0]/)
  })

  test.it('should have not timed out waiting for api service', () => {
    return test.expect(outerrLog).to.not.include('Wait timed out. "tcp:localhost:3000" is not available.')
  })
})
