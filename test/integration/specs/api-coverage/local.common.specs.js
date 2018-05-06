
const test = require('../../../../index')
const utils = require('../utils')

test.describe('api-local-coverage suite execution', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have waited for api execution finish', () => {
    return test.expect(outerrLog).to.include('[Narval] [DEBUG] Wait finished. "tcp:localhost:3000" is available')
  })
})
