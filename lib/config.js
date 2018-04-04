'use strict'

const Boom = require('boom')
const Promise = require('bluebird')
const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')

const paths = require('./paths')
const tracer = require('./tracer')

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

const unitTestPath = function (configs) {
  const proposedPath = configs.custom.test.unit || configs.default.test.unit
  if (paths.cwd.existsSync(proposedPath)) {
    return Promise.resolve(proposedPath)
  }
  tracer.warn('Unit test folder not found: /' + proposedPath)
  return Promise.resolve(null)
}

const checkConfig = function (configs) {
  return Promise.props({
    unitTestPath: unitTestPath(configs)
  }).then((checkedConfig) => {
    return Promise.resolve({
      test: {
        unit: checkedConfig.unitTestPath
      }
    })
  })
}

const get = function () {
  return Promise.props({
    custom: readCustom(),
    default: readDefault()
  })
  .then(checkConfig)
  .then((config) => {
    return Promise.resolve(config)
  })
}

module.exports = {
  get: get
}
