'use strict'

const commander = require('commander')
const Boom = require('boom')
const Promise = require('bluebird')
const tracer = require('tracer')

const states = require('./states')

const LOG_LEVELS = ['log', 'trace', 'debug', 'info', 'warn', 'error']

const getCommandOptions = () => {
  return commander
    .option('-s, --standard', 'Run standard')
    .option('--type <type>', 'Run only all suites of an specific type')
    .option('--suite <test>', 'Run only an specific suite')
    .option('--local [service]', 'Run without Docker. If service name is provided, only it will be run')
    .option('-f, --fix', 'Fix standard')
    .option('-b, --build', 'Build docker images')
    .option('--shell <shell>', 'Custom shell used for running commands without Docker')
    .option('--log --logLevel <log>', 'Log level')
    .parse(process.argv)
}

const get = function () {
  let options = states.get('options')
  if (!options) {
    options = getCommandOptions()
    options.allSuites = false
    options.logLevel = options.logLevel || 'info'

    if (options.fix) {
      options.standard = true
    }

    if (!options.standard && !options.suite && !options.type) {
      options.standard = true
      options.allSuites = true
    }
    options.logLevel = LOG_LEVELS.indexOf(options.logLevel)

    if (options.logLevel < 0) {
      return Promise.reject(Boom.badData('Not valid log level'))
    }
    tracer.setLevel(options.logLevel)
    states.set('options', options)
  }
  return Promise.resolve(options)
}

module.exports = {
  get,
  LOG_LEVELS
}
