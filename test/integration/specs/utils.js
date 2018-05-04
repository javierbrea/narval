
const path = require('path')
const fs = require('fs')

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

module.exports = {
  readOutErr: new ReadLogs('combined-outerr'),
  readExitCode: new ReadLogs('exit-code'),
  readPackageLogs: readPackageLogs
}
