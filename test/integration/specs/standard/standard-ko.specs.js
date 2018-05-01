
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

  test.it('should have finished ko', () => {
    return test.expect(outerrLog).to.include('[Narval] [ERROR] Error running Standard')
  })
})
