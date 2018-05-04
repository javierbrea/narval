
const _ = require('lodash')

const test = require('../../../../index')
const utils = require('../utils')

const expectServiceLog = function (serviceName, logFile, minLength) {
  minLength = _.isUndefined(minLength) ? 0 : minLength
  test.it(`should have written ${serviceName} service ${logFile} logs`, () => {
    return utils.readPackageLogs('api', 'end-to-end', 'books-api', serviceName, logFile)
      .then((log) => {
        return test.expect(log).to.have.lengthOf.above(minLength)
      })
  })
}

const checkServiceLogs = function (serviceName, customMinLengths) {
  let minLengths = {
    combined: 0,
    out: 0,
    err: 0,
    'exit-code':0
  }
  minLengths = Object.assign({}, minLengths, customMinLengths)
  expectServiceLog(serviceName, 'combined-outerr', minLengths.combined)
  expectServiceLog(serviceName, 'out', minLengths.out)
  expectServiceLog(serviceName, 'err', minLengths.err)
  expectServiceLog(serviceName, 'exit-code', minLengths['exit-code'])
}

test.describe('services logs', () => {
  checkServiceLogs('mongodb')
  checkServiceLogs('api-server')
  checkServiceLogs('test')
  checkServiceLogs('before', {
    err: -1
  })
})