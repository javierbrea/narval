'use strict'

const fs = require('fs')
const path = require('path')

const FIND_LIMIT = 5
const NODE_MODULES_BIN_PATH = ['node_modules', '.bin']

const findBin = function (fileName) {
  let i
  let binPath = null

  for (i = 0; i < FIND_LIMIT; i++) {
    if (!binPath) {
      let tryPath = path.resolve.apply(this, [__dirname].concat(Array(2 + i).fill('..')).concat(NODE_MODULES_BIN_PATH).concat(fileName))
      if (fs.existsSync(tryPath)) {
        binPath = tryPath
      }
    }
  }

  if (!binPath) {
    throw new Error(fileName + ' bin not found')
  }
  return binPath
}

const packageRoot = function () {
  return process.cwd()
}

module.exports = {
  findBin: findBin,
  packageRoot: packageRoot
}
