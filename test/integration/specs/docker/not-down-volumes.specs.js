
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('docker down volumes', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have not executed docker down volumes before starting services when it is not configured in "before"', () => {
    return test.expect(outerrLog).to.not.match(/Running Docker command "docker-compose down --volumes"(?:\s|\S)*?Running Docker command "docker-compose up --no-start/)
  })
})
