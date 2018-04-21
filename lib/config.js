'use strict'

const Promise = require('bluebird')
const yaml = require('js-yaml')
const fs = require('fs')
const _ = require('lodash')

const paths = require('./paths')
const tracer = require('./tracer')

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
      tracer.warn('Config file ' + filePath + ' not found')
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
    // TODO, validate suite config
    return suiteTypeData
  })))
}

const checkDockerImages = function (customConfig) {
  // TODO, check docker images
  return customConfig['docker-images'] || []
}

const checkDockerContainers = function (customConfig) {
  // TODO, check docker containers
  return customConfig['docker-containers'] || []
}

const checkConfig = function (configs) {
  return Promise.props({
    dockerImages: checkDockerImages(configs.custom),
    dockerContainers: checkDockerContainers(configs.custom),
    suitesByType: getSuitesByType(configs.custom, configs.default)
  })
}

const get = function (options) {
  options = options || {}
  if (!getPromise || options.cleanCache) {
    getPromise = Promise.props({
      custom: readCustom(),
      default: readDefault()
    })
    .then(checkConfig)
    .then((config) => {
      return Promise.resolve(config)
    })
  }
  return getPromise
}

module.exports = {
  get: get
}
