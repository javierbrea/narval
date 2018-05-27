
const test = require('../../../../index')
const utils = require('../utils')

test.describe('commands arguments', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have received arguments in before commands just as they were defined', () => {
    return test.expect(outerrLog).to.include('Argument in before command: fooPathArg//foo\\foo2///fo=^o3\\test/foo')
  })

  test.it('should have received arguments in service commands just as they were defined', () => {
    return test.expect(outerrLog).to.include('Argument in service command: fooPathñArg//foo\\foo2///fo=^o3\\te*st/foo')
  })
})
