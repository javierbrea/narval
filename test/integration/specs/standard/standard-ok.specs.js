
const test = require('../../../../index')
const utils = require('../utils')

test.describe('standard execution', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have finished ok', () => {
    return test.expect(outerrLog).to.include('[Narval] [INFO] Standard finished OK')
  })
})
