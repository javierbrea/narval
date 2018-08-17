
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('tests execution reports', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have printed mocha spec report', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('✓ should'),
      test.expect(outerrLog).to.match(/\d passing/)
    ])
  })
})
