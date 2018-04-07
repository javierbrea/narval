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

const mochaConfigToParams = new ConfigToParams(mochaDefaultConfig)
const istanbulConfigToParams = new ConfigToParams(istanbulDefaultConfig, '=', ['x', 'i'])

const istanbulParams = function (test, suiteName) {
  let baseConfig = {
    dir: '.coverage/' + suiteName + '/' + test.name
  }
  const config = _.extend(baseConfig, test.coverage && test.coverage.config || {})
  return istanbulConfigToParams(config)
}

const mochaParams = function (test, suiteName) {
  return mochaConfigToParams(test.test.config, test.test.specs)
}

module.exports = {
  mocha: {
    params: mochaParams
  },
  istanbul: {
    params: istanbulParams
  }
}
