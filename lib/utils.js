'use strict'

const _ = require('lodash')

const ObjectToArguments = function (defaultConfig, eq, singleDashParams) {
  singleDashParams = singleDashParams || []
  eq = eq || ' '

  return function (config, extraParams) {
    let baseParams = []

    config = _.extend({}, defaultConfig, config || {})

    _.each(config, (value, key) => {
      let sep = singleDashParams.indexOf(key) > -1 ? '-' : '--'
      if (_.isBoolean(value)) {
        if (value) {
          baseParams.push(sep + key)
        }
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

module.exports = {
  ObjectToArguments: ObjectToArguments,
  commandArguments: commandArguments
}
