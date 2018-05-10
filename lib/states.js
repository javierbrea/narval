'use strict'

let states = {}

const get = function (key) {
  return states[key]
}

const set = function (key, value) {
  states[key] = value
}

const clean = function () {
  states = {}
}

module.exports = {
  get: get,
  set: set,
  clean: clean
}
