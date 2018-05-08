
const test = require('../../../../index')
const utils = require('../utils')

test.describe('standard', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have been executed', () => {
    return test.expect(outerrLog).to.include('[Narval] [INFO] Running Standard')
  })
})
