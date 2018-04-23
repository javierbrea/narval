'use strict'

const childProcess = require('child_process')
const os = require('os')

const Promise = require('bluebird')
const _ = require('lodash')

const logProcessData = function (data) {
  data = _.trim(data)
  if (data.length) {
    console.log(data)
  }
}

const windowsBaseCommand = function () {
  return {
    cmd: process.env.ComSpec,
    args: ['/d', '/s', '/c']
  }
}

const unixBaseCommand = function () {
  return {
    cmd: 'sh',
    args: ['-c']
  }
}

const getBaseCommand = function () {
  if (os.platform() === 'win32') {
    return windowsBaseCommand()
  }
  return unixBaseCommand()
}

const run = function (command, options) {
  options = options || {}
  return new Promise((resolve, reject) => {
    const baseCommand = getBaseCommand()
    let proc = childProcess.spawn(baseCommand.cmd, baseCommand.args.concat(command), {
      cwd: process.cwd(),
      env: _.extend({}, process.env, {
        FORCE_COLOR: true
      }),
      windowsHide: true,
      windowsVerbatimArguments: true
    })

    proc.stdout.setEncoding('utf8')
    proc.stdout.on('data', (data) => {
      logProcessData(data)
    })

    proc.stderr.on('data', (data) => {
      logProcessData(data)
    })

    if (options.sync) {
      proc.on('close', (code) => {
        if (code !== null && code !== 0) {
          reject(new Error(`Error running command. Exit code ${code}`))
        } else {
          resolve(0)
        }
      })
    } else {
      resolve(proc)
    }
  })
}

module.exports = {
  run: run
}
