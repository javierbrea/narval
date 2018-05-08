
const test = require('../../../../index')
const utils = require('../utils')

test.describe('custom tests config execution', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have not printed tests specs details', () => {
    return Promise.all([
      test.expect(outerrLog).to.not.include('should return the sum of provided numbers'),
      test.expect(outerrLog).to.not.include('should return again the sum of provided numbers'),
      test.expect(outerrLog).to.not.include('should only execute this one when grepped'),
      test.expect(outerrLog).to.not.include('should return once more the sum of provided numbers')
    ])
  })
})
