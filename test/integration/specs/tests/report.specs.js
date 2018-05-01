
const test = require('../../../../index')
const utils = require('../utils')

test.describe('tests execution reports', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have print mocha spec report', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('✓ should return the sum of provided numbers'),
      test.expect(outerrLog).to.match(/\d passing/)
    ])
  })
})
