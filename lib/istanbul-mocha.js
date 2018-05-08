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

    if (_.isArray(extraParams)) {
      extraParams = extraParams.join(' ')
    }

    baseParams.push(extraParams)

    return _.compact(baseParams).join(' ')
  }
}

const mochaConfigToParams = new ConfigToParams(mochaDefaultConfig)
const istanbulConfigToParams = new ConfigToParams(istanbulDefaultConfig, '=', ['x', 'i'])

const istanbulParams = function (test, suiteTypeName) {
  let baseConfig = {
    dir: `.coverage/${suiteTypeName}/${test.name}`
  }
  const config = _.extend({}, baseConfig, (test.coverage && test.coverage.config) || {})
  return istanbulConfigToParams(config)
}

const mochaParams = function (test) {
  return mochaConfigToParams(test.test.config, test.test.specs)
}

const getCommandAndParams = function (command) {
  if (!command) {
    return null
  }
  let splitted = command.split(' ')
  return {
    command: splitted.shift(),
    params: splitted.join(' ')
  }
}

module.exports = {
  mocha: {
    params: mochaParams
  },
  istanbul: {
    params: istanbulParams
  },
  getCommandAndParams: getCommandAndParams
}
