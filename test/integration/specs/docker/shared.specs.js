
const test = require('../../../../index')
const utils = require('../utils')

test.describe('docker shared folder', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have been created', () => {
    return test.expect(outerrLog).to.include('Creating volume "docker_shared" with default driver')
  })
})
