'use strict'

const Boom = require('boom')
const fs = require('fs')
const path = require('path')

const FIND_LIMIT = 5
const NODE_MODULES_BIN_PATH = ['node_modules', '.bin']

const DEFAULT_CONFIG_FILE = 'default-config.yml'
const CONFIG_FILE = '.narval.yml'

const PathsResolver = function (basePath) {
  return function () {
    const filePaths = Array.prototype.slice.call(arguments)
    filePaths.unshift(basePath)
    return path.resolve.apply(this, filePaths)
  }
}

const PathExistsSync = function (pathResolver) {
  return function () {
    return fs.existsSync(pathResolver.apply(this, arguments))
  }
}

const PathMethods = function (basePath) {
  const resolver = new PathsResolver(basePath)
  const existsSync = new PathExistsSync(resolver)
  return {
    resolve: resolver,
    existsSync: existsSync
  }
}

const cwdMethods = new PathMethods(process.cwd())
const packageMethods = new PathMethods(path.resolve(__dirname, '..'))

const findBin = function (fileName) {
  let i
  let binPath = null

  for (i = 0; i < FIND_LIMIT; i++) {
    if (!binPath) {
      let tryPath = path.resolve.apply(this, [__dirname].concat(Array(1 + i).fill('..')).concat(NODE_MODULES_BIN_PATH).concat(fileName))
      if (fs.existsSync(tryPath)) {
        binPath = tryPath
      }
    }
  }

  if (!binPath) {
    throw Boom.notFound(fileName + ' bin not found')
  }
  return binPath
}

const defaultConfig = function () {
  return packageMethods.resolve(DEFAULT_CONFIG_FILE)
}

const customConfig = function () {
  return cwdMethods.resolve(CONFIG_FILE)
}

module.exports = {
  findBin: findBin,
  cwd: cwdMethods,
  package: packageMethods,
  defaultConfig: defaultConfig,
  customConfig: customConfig
}
