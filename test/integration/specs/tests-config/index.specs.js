
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('custom tests config execution', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have not executed tests recursivelly', () => {
    return test.expect(outerrLog).to.not.include('should return once more the sum of provided numbers')
  })

  test.it('should have only executed tests with "grepped" string in the definition', () => {
    return Promise.all([
      test.expect(outerrLog).to.not.include('should return again the sum of provided numbers'),
      test.expect(outerrLog).to.include('should only execute this one when grepped')
    ])
  })

  test.it('should have executed istanbul in verbose mode', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Using configuration'),
      test.expect(outerrLog).to.include('print: detail'),
      test.expect(outerrLog).to.include('Module load hook')
    ])
  })
})
