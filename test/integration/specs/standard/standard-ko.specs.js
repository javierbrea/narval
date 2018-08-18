
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('standard execution', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have finished ko', () => {
    return test.expect(outerrLog).to.include('[Narval] [ERROR] Error running Standard')
  })
})
