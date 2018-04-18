'use strict'

const Boom = require('boom')
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
        reject(Boom.notFound('File not found: ' + filePath))
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
}

const readCustom = function () {
  return readConfig(paths.customConfig())
    .then(config => {
      config = config || {}
      config.test = config.test || {}
      return Promise.resolve(config)
    })
}

const readDefault = function () {
  return readConfig(paths.defaultConfig())
}

const getSuites = function (customConfig, defaultConfig) {
  if (!customConfig || !customConfig.suites) {
    customConfig.suites = defaultConfig
  }
  return Promise.resolve(_.compact(_.map(customConfig.suites, (properties, suiteTypeName) => {
    let suiteData = {
      name: suiteTypeName,
      suites: properties
    }
    // TODO, validate suite config
    return suiteData
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
    suites: getSuites(configs.custom, configs.default)
  })
}

const get = function () {
  if (!getPromise) {
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
