
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('tests execution', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have printed a log when starts execution', () => {
    return Promise.all([
      test.expect(outerrLog).to.match(/\[Narval\] \[DEBUG\] Starting tests of "[\w|-]*" suite "[\w|-]*" with(?:out)? coverage/)
    ])
  })
})
