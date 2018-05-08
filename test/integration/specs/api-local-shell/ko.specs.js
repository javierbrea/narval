
const test = require('../../../../index')
const utils = require('../utils')

test.describe('api-local tests execution', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have waited for service to start tests', () => {
    return test.expect(outerrLog).to.include('Waiting until "tcp:localhost:3000" is available.')
  })

  test.it('should have timed out waiting for service', () => {
    return test.expect(outerrLog).to.include('Wait timed out. "tcp:localhost:3000" is not available.')
  })

  test.it('should have printed and error because the path to custom shell was not found', () => {
    return test.expect(outerrLog).to.include('Error trying to run command. spawn /foo/path/to/shell ENOENT')
  })

  test.it('should have exited api-server with an error', () => {
    return test.expect(outerrLog).to.match(/Service "api-server" closed with code [^0]/)
  })
})
