'use strict'

const _ = require('lodash')

const NO_COLOR_SEP = '<narval-no-tracer-color>'

const ObjectToArguments = function (defaultConfig, eq, singleDashParams) {
  singleDashParams = singleDashParams || []
  eq = eq || ' '

  return function (config = {}, extraParams = '') {
    let baseParams = []

    config = Object.assign({}, defaultConfig, config)

    _.each(config, (value, key) => {
      let sep = singleDashParams.indexOf(key) > -1 ? '-' : '--'
      if (_.isBoolean(value)) {
        if (value) {
          baseParams.push(sep + key)
        }
      } else if (_.isArray(value)) {
        _.each(value, (val) => {
          baseParams.push(sep + key + eq + val)
        })
      } else {
        baseParams.push(sep + key + eq + value)
      }
    })

    if (_.isArray(extraParams)) {
      extraParams = extraParams.join(' ')
    }

    baseParams.push(extraParams)

    return _.compact(baseParams).join(' ')
  }
}

const commandArguments = function (command) {
  if (!command) {
    return null
  }
  let splitted = command.split(' ')
  return {
    command: splitted.shift(),
    arguments: splitted,
    joinedArguments: splitted.join(' ')
  }
}

const serviceNameToVarName = function (name) {
  return name && name.replace(/-/g, '_')
}

const extendProcessEnvVars = function (vars) {
  return Object.assign({}, process.env, vars)
}

module.exports = {
  ObjectToArguments,
  commandArguments,
  serviceNameToVarName,
  extendProcessEnvVars,
  NO_COLOR_SEP
}
