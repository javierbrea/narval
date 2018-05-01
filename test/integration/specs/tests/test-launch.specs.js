
const test = require('../../../../index')
const utils = require('../utils')

test.describe('tests execution', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have print a log when starts execution', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('[Narval] [DEBUG] Starting tests of suite "unit" with coverage enabled')
    ])
  })
})
