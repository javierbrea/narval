
const path = require('path')
const fs = require('fs')

const _ = require('lodash')
const test = require('../../../index')

const readPackageLogs = function (packageName, suiteType, suiteName, serviceName, fileName) {
  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(__dirname, '..', 'packages', packageName, '.narval', 'logs', suiteType, suiteName, serviceName, `${fileName}.log`), 'utf8', (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

const expectServiceLog = function (serviceName, logFile, minLength, baseLogsFolder, packageName = 'api') {
  const logsFolder = baseLogsFolder || process.env.logs_folder
  const splittedFolder = logsFolder.split('/')
  const suiteType = splittedFolder[0]
  const suite = splittedFolder[1]

  minLength = _.isUndefined(minLength) ? 0 : minLength
  test.it(`should have written log file "${logFile}.log" of service "${serviceName}", suite "${suite}", suite type "${suiteType}" of package "${packageName}"`, () => {
    return readPackageLogs(packageName, suiteType, suite, serviceName, logFile)
      .then((log) => {
        return test.expect(log).to.have.lengthOf.above(minLength)
      })
  })
}

const checkServiceLogs = function (serviceName, customMinLengths, packageName, baseLogsFolder) {
  let minLengths = {
    combined: 0,
    out: 0,
    err: 0,
    'exit-code': 0
  }
  minLengths = Object.assign({}, minLengths, customMinLengths)
  expectServiceLog(serviceName, 'combined-outerr', minLengths.combined, baseLogsFolder, packageName)
  expectServiceLog(serviceName, 'out', minLengths.out, baseLogsFolder, packageName)
  expectServiceLog(serviceName, 'err', minLengths.err, baseLogsFolder, packageName)
  expectServiceLog(serviceName, 'exit-code', minLengths['exit-code'], baseLogsFolder, packageName)
}

module.exports = {
  readPackageLogs: readPackageLogs,
  checkServiceLogs: checkServiceLogs
}
