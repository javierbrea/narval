'use strict'

const childProcess = require('child_process')
const os = require('os')
const path = require('path')

const Promise = require('bluebird')
const _ = require('lodash')

const options = require('./options')
const istanbulMocha = require('./istanbul-mocha')
const processLogs = require('./process-logs')
const tracer = require('./tracer')

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
        let logs
        const proc = childProcess.spawn(baseCommand.cmd, baseCommand.args.concat(path.join(process.cwd(), command)), {
          cwd: process.cwd(),
          env: _.extend({}, process.env, {
            FORCE_COLOR: true
          }, opts.env),
          windowsHide: true,
          windowsVerbatimArguments: true
        })
        logs = new processLogs.Handler(proc, {
          type: opts.suiteType,
          suite: opts.suite,
          service: opts.service
        }, {
          close: true
        })

        proc.on('error', (err) => {
          tracer.error(`Error trying to run command. ${err.message}`)
          reject(err)
        })

        proc.stdout.setEncoding('utf8')

        if (opts.sync) {
          logs.on('close', (logData) => {
            if (logData.processCode !== null && logData.processCode !== 0) {
              reject(new Error(`Error running command. Exit code ${logData.processCode}`))
            } else {
              resolve(0)
            }
          })
        } else {
          resolve({
            process: proc,
            logs: logs
          })
        }
      })
    })
}

module.exports = {
  run: run
}
