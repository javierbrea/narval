
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('package test execution', () => {
  let exitCodeLog

  test.before(async () => {
    exitCodeLog = await utils.logs.exitCode('package-test')
  })

  test.it('should finish with an exit code different to 0', () => {
    return test.expect(exitCodeLog).to.not.equal('0')
  })
})
