
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

  test.it('should have not executed unit tests suite', () => {
    return Promise.all([
      test.expect(outerrLog).to.not.match(/\[Narval\] \[DEBUG\] Starting tests of "[\w|-]*" suite "unit"/)
    ])
  })
})
