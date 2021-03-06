
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('api-local-coverage suite running api and test in different services', () => {
  const startTestLog = 'Starting tests of "end-to-end" suite "books-api"'
  const startApiLog = 'Starting locally service "api-server" of suite "books-api" with coverage'
  let outerrLogTest
  let outerrLogApi

  test.before(async () => {
    outerrLogTest = await utils.logs.combined('package-test')
    outerrLogApi = await utils.logs.combined('package-api')
  })

  test.describe('test service', () => {
    test.it('should have executed tests', () => {
      return test.expect(outerrLogTest).to.include(startTestLog)
    })

    test.it('should have not started the api server', () => {
      return test.expect(outerrLogTest).to.not.include(startApiLog)
    })
  })

  test.describe('api service', () => {
    test.it('should have not executed tests', () => {
      return test.expect(outerrLogApi).to.not.include(startTestLog)
    })

    test.it('should have started the api server', () => {
      return test.expect(outerrLogApi).to.include(startApiLog)
    })
  })
})
