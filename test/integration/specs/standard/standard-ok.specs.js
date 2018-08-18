
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('standard execution', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have finished ok', () => {
    return test.expect(outerrLog).to.include('[Narval] [INFO] Standard finished OK')
  })
})
