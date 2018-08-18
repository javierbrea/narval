
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('api-local-coverage suite execution', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have waited for api execution finish', () => {
    return test.expect(outerrLog).to.include('[Narval] [DEBUG] Waiting until "tcp:localhost:3000" is available.')
  })
})
