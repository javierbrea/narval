
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('tests execution', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have not executed unit tests suite', () => {
    return Promise.all([
      test.expect(outerrLog).to.not.match(/\[Narval\] \[DEBUG\] Starting tests of "[\w|-]*" suite "unit"/)
    ])
  })
})
