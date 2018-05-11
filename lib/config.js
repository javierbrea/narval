'use strict'

const Promise = require('bluebird')
const yaml = require('js-yaml')
const fs = require('fs')
const _ = require('lodash')

const paths = require('./paths')
const tracer = require('./tracer')
const utils = require('./utils')

const MOCHA_DEFAULT = {
  recursive: true,
  colors: true,
  reporter: 'spec'
}

const ISTANBUL_DEFAULT = {
  'include-all-sources': true,
  root: '.',
  colors: true,
  print: 'summary'
}

let getPromise

const readFile = function (filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, {
      encoding: 'utf8'
    }, (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(data)
    })
  })
}

const readYaml = function (fileContent) {
  return Promise.resolve(yaml.safeLoad(fileContent))
}

const readConfig = function (filePath) {
  return readFile(filePath)
    .catch((e) => {
      tracer.warn(`Config file ${filePath} not found`)
      return Promise.resolve('')
    })
    .then(readYaml)
    .then(config => {
      config = config || {}
      return Promise.resolve(config)
    })
}

const readCustom = function () {
  return readConfig(paths.customConfig())
}

const readDefault = function () {
  return readConfig(paths.defaultConfig())
}

const getSuitesByType = function (customConfig, defaultConfig) {
  if (!customConfig || !customConfig.suites) {
    customConfig.suites = defaultConfig
  }
  return Promise.resolve(_.compact(_.map(customConfig.suites, (properties, suiteTypeName) => {
    let suiteTypeData = {
      name: suiteTypeName,
      suites: properties
    }
    // TODO, validate suite config, use Joi
    return suiteTypeData
  })))
}

const checkDockerImages = function (customConfig) {
  // TODO, check docker images, use Joi
  return customConfig['docker-images'] || []
}

const checkDockerContainers = function (customConfig) {
  // TODO, check docker containers, use Joi
  return customConfig['docker-containers'] || []
}

const checkStandardConfig = function (customConfig) {
  return customConfig.standard || {}
}

const checkConfig = function (configs) {
  return Promise.props({
    standard: checkStandardConfig(configs.custom),
    dockerImages: checkDockerImages(configs.custom),
    dockerContainers: checkDockerContainers(configs.custom),
    suitesByType: getSuitesByType(configs.custom, configs.default)
  })
}

const get = function (options = {}) {
  if (!getPromise || options.cleanCache) {
    getPromise = Promise.props({
      custom: readCustom(),
      default: readDefault()
    }).then(checkConfig)
  }
  return getPromise
}

const standard = function () {
  return get()
    .then(config => {
      config.standard = config.standard || {}
      let directories = config.standard.directories || []
      if (_.isString(directories)) {
        directories = directories.split(' ')
      }
      return Promise.resolve({
        directories: directories
      })
    })
}

const suitesByType = function () {
  return get()
    .then(config => {
      return Promise.resolve(config.suitesByType)
    })
}

const mochaArguments = new utils.ObjectToArguments(MOCHA_DEFAULT)
const istanbulArguments = new utils.ObjectToArguments(ISTANBUL_DEFAULT, '=', ['x', 'i'])

const SuiteResolver = function (suiteData, suiteTypeName, options) {
  const name = suiteData.name

  const getName = function () {
    return name
  }

  const typeName = function () {
    return suiteTypeName
  }

  const istanbulArgs = function () {
    let baseConfig = {
      dir: `.coverage/${suiteTypeName}/${name}`
    }
    const config = _.extend({}, baseConfig, (suiteData.coverage && suiteData.coverage.config) || {})
    return istanbulArguments(config)
  }

  const mochaArgs = function () {
    return mochaArguments(suiteData.test.config, suiteData.test.specs)
  }

  const hasToRun = function () {
    return !options.suite || options.suite === name
  }

  const isDocker = function () {
    let hasDockerService = false
    if (options.local) {
      return false
    }
    if (suiteData.test && suiteData.test.docker && suiteData.test.docker.container) {
      return true
    }
    _.each(suiteData.services, (service) => {
      if (service.docker && service.docker.container) {
        hasDockerService = true
      }
    })

    return hasDockerService
  }

  const runSingleService = function () {
    return _.isString(options.local) && options.local !== 'test' ? options.local : false
  }

  const runSingleTest = function () {
    return _.isString(options.local) && options.local === 'test'
  }

  return {
    typeName: typeName,
    name: getName,
    hasToRun: hasToRun,
    isDocker: isDocker,
    istanbulArguments: istanbulArgs,
    mochaArguments: mochaArgs,
    runSingleService: runSingleService,
    runSingleTest: runSingleTest,
    // TODO, remove this methods, published for gradual refactor
    suite: () => {
      return suiteData
    },
    options: () => {
      return options
    }
  }
}

module.exports = {
  get: get,
  standard: standard,
  suitesByType: suitesByType,
  SuiteResolver: SuiteResolver
}
