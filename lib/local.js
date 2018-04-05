'use strict'

const Boom = require('boom')

const run = function (test, suiteName, options) {
  // TODO, start services locally
  try {
    require('mocha-sinon-chai/runner').run(['--', '--recursive', test.test.specs])
  } catch (error) {
    return Promise.reject(Boom.badImplementation('Local test run failed'))
  }
  
  return Promise.resolve()
}

module.exports = {
  run: run
}
