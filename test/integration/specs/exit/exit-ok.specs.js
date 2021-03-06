
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('package test execution', () => {
  let exitCodeLog

  test.before(async () => {
    exitCodeLog = await utils.logs.exitCode('package-test')
  })

  test.it('should finish with an exit code 0', () => {
    return test.expect(exitCodeLog).to.equal('0')
  })
})
