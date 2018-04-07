'use strict'

const Boom = require('boom')

const options = require('./options')

const run = function (test, suiteName) {
  // TODO, start services locally
  return options.get()
    .then((options) => {
      try {
        require('mocha-sinon-chai/runner').run(['--', '--recursive', test.test.specs])
      } catch (error) {
        return Promise.reject(Boom.badImplementation('Local test run failed'))
      }
      return Promise.resolve()
    })
}

module.exports = {
  run: run
}
