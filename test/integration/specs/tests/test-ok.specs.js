
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('tests execution passed', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have not printed an assertion error', () => {
    return Promise.all([
      test.expect(outerrLog).to.not.match(/AssertionError:/),
      test.expect(outerrLog).to.not.match(/[^0] failing/)
    ])
  })
})
