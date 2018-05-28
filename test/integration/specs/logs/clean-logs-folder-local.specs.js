
const test = require('../../../../index')

const utils = require('../utils')

const checkLogs = function (suiteNumber, serviceNumber) {
  utils.checkServiceLogs(`service-${serviceNumber}`, { err: -1 }, 'simple-command', `functional/suite-${suiteNumber}`)
}

test.describe('logs folders', () => {
  test.describe('when single services has been executed', () => {
    checkLogs('1', '1')
    checkLogs('1', '2')
    checkLogs('2', '1')
    checkLogs('2', '2')
  })
})
