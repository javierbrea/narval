'use strict'

const paths = require('./lib/paths')

const ReadLogs = (fileName) => {
  return (serviceName) => {
    return paths.cwd.readFile('.narval', 'logs', process.env.narval_suite_type, process.env.narval_suite, serviceName, `${fileName}.log`)
  }
}

const logs = {
  combined: ReadLogs('combined-outerr'),
  out: ReadLogs('out'),
  err: ReadLogs('err'),
  exitCode: ReadLogs('exit-code')
}

module.exports = {
  logs
}
