'use strict'

const os = require('os')
const path = require('path')

const Promise = require('bluebird')
const Boom = require('boom')

const options = require('./options')
const processes = require('./processes')
const paths = require('./paths')
const tracer = require('./tracer')
const utils = require('./utils')

const baseDockerProcessOptions = {
  cwd: paths.docker(),
  encoding: 'utf8',
  stdio: [0, 1, 2],
  shell: true,
  windowsHide: true
}

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
      return processes.spawn(baseCommand.command, {
        args: baseCommand.arguments.concat(path.join(process.cwd(), command)),
        options: {
          cwd: process.cwd(),
          env: Object.assign({}, process.env, {
            FORCE_COLOR: true
          }, opts.env),
          windowsHide: true,
          windowsVerbatimArguments: true
        }
      }).then((proc) => {
        return new Promise((resolve, reject) => {
          const logs = new processes.Handler(proc, {
            type: opts.type,
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

const processOptions = function (extraOptions) {
  return (Object.assign({}, baseDockerProcessOptions, extraOptions))
}

const runComposeSync = function (command, options) {
  return new Promise((resolve, reject) => {
    tracer.log(`Running Docker command "docker-compose ${command}"`)
    try {
      processes.execSync(`docker-compose -f docker-compose.json ${command}`, processOptions(options))
      resolve()
    } catch (error) {
      reject(Boom.badImplementation(`Docker compose command "${command}" failed`))
    }
  })
}

module.exports = {
  run: run,
  runBefore: runBefore,
  runComposeSync: runComposeSync
}
