'use strict'

const fs = require('fs')
const path = require('path')

const Promise = require('bluebird')
const Boom = require('boom')
const fsExtra = require('fs-extra')

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

const EnsureDir = function (pathResolver) {
  return function () {
    const absolutePath = pathResolver.apply(this, arguments)
    return fsExtra.ensureDir(absolutePath)
      .then(() => {
        return Promise.resolve(absolutePath)
      })
  }
}

const ReadFile = function (pathResolver) {
  return function () {
    const absolutePath = pathResolver.apply(this, arguments)
    return new Promise((resolve, reject) => {
      fs.readFile(absolutePath, 'utf8', (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  }
}

const WriteFile = function (pathResolver) {
  return function (relativePath, content) {
    return new Promise((resolve, reject) => {
      fs.writeFile(pathResolver(relativePath), content, 'utf8', (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  }
}

const PathMethods = function (basePath) {
  const resolver = new PathsResolver(basePath)
  const existsSync = new PathExistsSync(resolver)
  const ensureDir = new EnsureDir(resolver)
  const readFile = new ReadFile(resolver)
  const writeFile = new WriteFile(resolver)
  return {
    ensureDir: ensureDir,
    existsSync: existsSync,
    readFile: readFile,
    resolve: resolver,
    writeFile: writeFile
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