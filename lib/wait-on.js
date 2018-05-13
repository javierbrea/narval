'use strict'

const _ = require('lodash')

const tracer = require('./tracer')
const libs = require('./libs')

const configToArguments = function (config = {}) {
  let options = []
  if (_.isString(config)) {
    return config
  }

  options.push(config.timeout ? `--timeout=${config.timeout}` : null)
  options.push(config.delay ? `--delay=${config.delay}` : null)
  options.push(config.interval ? `--interval=${config.interval}` : null)
  options.push(config.reverse ? '--reverse' : null)
  options = options.concat(config.resources)

  return _.compact(options).join(' ')
}

const wait = function (config) {
  let waitOnDefaultOptions = {
    interval: 100,
    timeout: 30000
  }
  let customConfigLog = ''
  let waitOnOptions = {}
  let resourcesLog
  if (!config) {
    return Promise.resolve()
  }
  if (_.isString(config)) {
    waitOnOptions.resources = config.split(' ')
  } else {
    customConfigLog = ` Applying custom config: ${JSON.stringify(config)}`
    waitOnOptions = config
  }
  resourcesLog = waitOnOptions.resources.join(',')
  return new Promise((resolve, reject) => {
    tracer.debug(`Waiting until "${resourcesLog}" is available.${customConfigLog}`)
    libs.waitOn(_.extend({}, waitOnDefaultOptions, waitOnOptions), (error) => {
      if (error) {
        tracer.error(`Wait timed out. "${resourcesLog}" is not available.`)
        reject(error)
      } else {
        tracer.debug(`Wait finished. "${resourcesLog}" is available.`)
        resolve()
      }
    })
  })
}

module.exports = {
  wait: wait,
  configToArguments: configToArguments
}
