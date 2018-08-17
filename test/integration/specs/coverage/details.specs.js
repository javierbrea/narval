
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('coverage detail reports', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have printed istanbul report in detail mode', () => {
    return test.expect(outerrLog).to.include('File             |  % Stmts | % Branch |  % Funcs |  % Lines | Uncovered Line #s |')
  })
})
