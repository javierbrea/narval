'use strict'

const _ = require('lodash')

const mochaDefaultConfig = {
  recursive: true,
  colors: true,
  reporter: 'spec'
}

const istanbulDefaultConfig = {
  'include-all-sources': true,
  root: '.',
  colors: true,
  print: 'summary'
}

const ConfigToParams = function (defaultConfig, eq, singleDashParams) {
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

    baseParams.push(extraParams)

    return _.compact(baseParams).join(' ')
  }
}

const mochaConfig = new ConfigToParams(mochaDefaultConfig)
const istanbulConfig = new ConfigToParams(istanbulDefaultConfig, '=', ['x', 'i'])

module.exports = {
  mocha: {
    config: mochaConfig
  },
  istanbul: {
    config: istanbulConfig
  }
}
