
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('descriptions', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have printed the unit tests description', () => {
    return test.expect(outerrLog).to.include(`Running "unit" suite "unit": Unitary tests`)
  })

  test.it('should have printed the books-api suite description', () => {
    return test.expect(outerrLog).to.include(`Running "end-to-end" suite "books-api": Books api should work and save data to database`)
  })
})
