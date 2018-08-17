'use strict'

const _ = require('lodash')

const logs = require('./logs')
const libs = require('./libs')

const configToArguments = function (config = {}) {
  let options = []

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
    timeout: 60000
  }
  if (!config) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    logs.waitingOn({
      resources: config.resources
    })
    logs.waitConfig({
      config: JSON.stringify(config)
    })
    libs.waitOn(Object.assign({}, waitOnDefaultOptions, config), (error) => {
      if (error) {
        logs.waitTimeOut({
          resources: config.resources
        })
        reject(error)
      } else {
        logs.waitFinish({
          resources: config.resources
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
