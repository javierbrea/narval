
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('descriptions', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have not printed unit tests description', () => {
    return test.expect(outerrLog).to.include(`Running "unit" suite "unit":\n`)
  })

  test.it('should have printed the books-api suite description', () => {
    return test.expect(outerrLog).to.include(`Running "end-to-end" suite "books-api": Books api should work without database`)
  })
})
