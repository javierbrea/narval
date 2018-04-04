'use strict'

const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')

const paths = require('./paths')

const CONFIG_FILE = '.right-whale.yml'
 
const read = function () {
  return yaml.safeLoad(fs.readFileSync(path.resolve(paths.packageRoot(), CONFIG_FILE), 'utf8'))
}

module.exports = {
  read: read
}
