
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('api-local-coverage suite running only tests', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have executed tests', () => {
    return test.expect(outerrLog).to.include('Starting tests of "end-to-end" suite "books-api"')
  })

  test.it('should have not started the api server', () => {
    return test.expect(outerrLog).to.not.include('Starting locally service "api-server" of suite "books-api" with coverage')
  })
})
