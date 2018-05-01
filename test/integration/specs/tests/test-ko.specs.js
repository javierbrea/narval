
const test = require('../../../../index')
const utils = require('../utils')

test.describe('tests execution failed', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have print an assertion error', () => {
    return Promise.all([
      test.expect(outerrLog).to.match(/AssertionError: expected \d to equal \d/),
      test.expect(outerrLog).to.match(/\d passing/),
      test.expect(outerrLog).to.match(/[^0] failing/)
    ])
  })
})
