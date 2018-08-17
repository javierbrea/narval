
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('coverage summary reports', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have printed coverage summary title', () => {
    return test.expect(outerrLog).to.include('== Coverage summary ==')
  })

  test.it('should have printed Statements, Branches, Functions and Lines summary', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Statements   :'),
      test.expect(outerrLog).to.include('Branches     :'),
      test.expect(outerrLog).to.include('Functions    :'),
      test.expect(outerrLog).to.include('Lines        :')
    ])
  })
})
