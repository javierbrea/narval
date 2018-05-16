'use strict'

const _ = require('lodash')

const logs = require('./logs')
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
  if (!config) {
    return Promise.resolve()
  }
  if (_.isString(config)) {
    waitOnOptions.resources = config.split(' ')
  } else {
    customConfigLog = logs.waitConfig({
      config: JSON.stringify(config)
    }, false)
    waitOnOptions = config
  }
  return new Promise((resolve, reject) => {
    logs.waitingOn({
      resources: waitOnOptions.resources,
      customConfig: customConfigLog
    })
    libs.waitOn(Object.assign({}, waitOnDefaultOptions, waitOnOptions), (error) => {
      if (error) {
        logs.waitTimeOut({
          resources: waitOnOptions.resources
        })
        reject(error)
      } else {
        logs.waitFinish({
          resources: waitOnOptions.resources
        })
        resolve()
      }
    })
  })
}

module.exports = {
  wait: wait,
  configToArguments: configToArguments
}
