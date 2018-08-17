
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('standard', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have been executed', () => {
    return test.expect(outerrLog).to.include('[Narval] [INFO] Running Standard')
  })
})
