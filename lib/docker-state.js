'use strict'

const _ = require('lodash')

let isBuilt = false
let isExecuted = false
let hasCreatedFiles = false

const built = function (value) {
  if (!_.isUndefined(value)) {
    isBuilt = value
  }
  return isBuilt
}

const executed = function (value) {
  if (!_.isUndefined(value)) {
    isExecuted = value
  }
  return isExecuted
}

const createdFiles = function (value) {
  if (!_.isUndefined(value)) {
    hasCreatedFiles = value
  }
  return hasCreatedFiles
}

const reset = function (value) {
  isBuilt = false
  isExecuted = false
  hasCreatedFiles = false
}

module.exports = {
  built: built,
  executed: executed,
  createdFiles: createdFiles,
  reset: reset
}
