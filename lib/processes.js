'use strict'

const childProcess = require('child_process')

const paths = require('./paths')

const fork = function (filePath, config = {}) {
  return new Promise((resolve) => {
    const proc = childProcess.fork(filePath, config.args || [], Object.assign({
      cwd: paths.cwd.base()
    }, config.options))

    if (config.resolveOnClose) {
      proc.on('close', (code) => {
        resolve(code)
      })
    } else {
      resolve(proc)
    }
  })
}

module.exports = {
  fork: fork
}
