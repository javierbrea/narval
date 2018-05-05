
const path = require('path')
const fs = require('fs')

const _ = require('lodash')
const test = require('../../../index')

const ReadLogs = function (fileName) {
  return function () {
    return new Promise((resolve, reject) => {
      fs.readFile(path.resolve(__dirname, '..', '..', '..', '.narval', 'logs', 'integration', process.env.narval_suite, 'package-test', `${fileName}.log`), 'utf8', (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  }
}

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

const expectServiceLog = function (serviceName, logFile, minLength) {
  const splittedFolder = process.env.logs_folder.split('/')
  const suiteType = splittedFolder[0]
  const suite = splittedFolder[1]
  
  minLength = _.isUndefined(minLength) ? 0 : minLength
  test.it(`should have written ${serviceName} service ${logFile} logs`, () => {
    return readPackageLogs('api', suiteType, suite, serviceName, logFile)
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

module.exports = {
  readOutErr: new ReadLogs('combined-outerr'),
  readExitCode: new ReadLogs('exit-code'),
  readPackageLogs: readPackageLogs,
  checkServiceLogs: checkServiceLogs
}
