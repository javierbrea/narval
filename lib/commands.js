'use strict'

const childProcess = require('child_process')
const os = require('os')
const path = require('path')

const Promise = require('bluebird')
const _ = require('lodash')

const options = require('./options')
const istanbulMocha = require('./istanbul-mocha')

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

const customCommand = function (commandStr) {
  const commandArgs = istanbulMocha.getCommandAndParams(commandStr)
  return {
    cmd: commandArgs.command,
    args: commandArgs.params.split(' ')
  }
}

const getBaseCommand = function () {
  return options.get()
    .then((opts) => {
      let result
      if (opts.shell) {
        result = customCommand(opts.shell)
      } else if (os.platform() === 'win32') {
        result = windowsBaseCommand()
      } else {
        result = unixBaseCommand()
      }
      return Promise.resolve(result)
    })
}

const run = function (command, opts) {
  opts = opts || {}
  return getBaseCommand()
    .then((baseCommand) => {
      return new Promise((resolve, reject) => {
        let proc = childProcess.spawn(baseCommand.cmd, baseCommand.args.concat(path.join(process.cwd(), command)), {
          cwd: process.cwd(),
          env: _.extend({}, process.env, {
            FORCE_COLOR: true
          }, opts.env || {}),
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

        if (opts.sync) {
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
    })
}

module.exports = {
  run: run
}
