
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

  test.it('should have not been executed', () => {
    return test.expect(outerrLog).to.not.include('[Narval] [INFO] Running Standard')
  })
})
