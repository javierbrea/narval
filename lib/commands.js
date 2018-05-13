'use strict'

const childProcess = require('child_process')
const os = require('os')
const path = require('path')

const Promise = require('bluebird')
const _ = require('lodash')

const options = require('./options')
const processes = require('./processes')
const tracer = require('./tracer')
const utils = require('./utils')

const windowsBaseCommand = function () {
  return {
    command: process.env.ComSpec,
    arguments: ['/d', '/s', '/c']
  }
}

const unixBaseCommand = function () {
  return {
    command: 'sh',
    arguments: ['-c']
  }
}

const getBaseCommand = function () {
  return options.get()
    .then((opts) => {
      let result
      if (opts.shell) {
        result = utils.commandArguments(opts.shell)
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
        const proc = childProcess.spawn(baseCommand.command, baseCommand.arguments.concat(path.join(process.cwd(), command)), {
          cwd: process.cwd(),
          env: _.extend({}, process.env, {
            FORCE_COLOR: true
          }, opts.env),
          windowsHide: true,
          windowsVerbatimArguments: true
        })
        logs = new processes.Handler(proc, {
          type: opts.suiteType || opts.type, // TODO, remove suiteType when fully refactored
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

const runBefore = function (config, logger) {
  const beforeCommand = config.beforeCommand()
  if (beforeCommand) {
    logger.beforeCommand({
      command: beforeCommand
    })
    return run(beforeCommand, {
      sync: true,
      env: config.beforeEnvVars(),
      type: config.typeName(),
      suite: config.name(),
      service: 'before'
    })
  }
  return Promise.resolve()
}

module.exports = {
  run: run,
  runBefore: runBefore
}
