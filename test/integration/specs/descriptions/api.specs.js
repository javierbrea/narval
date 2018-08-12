
const test = require('../../../../index')
const utils = require('../utils')

test.describe('descriptions', () => {
  const describePrefix = '[Narval] [INFO]'
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have printed the unit tests description', () => {
    return test.expect(outerrLog).to.include(`Running "unit" suite "unit": Unitary tests`)
  })

  test.it('should have printed the books-api suite description', () => {
    return test.expect(outerrLog).to.include(`Running "end-to-end" suite "books-api": Books api should work and save data to database`)
  })
})
