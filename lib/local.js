'use strict'

const Boom = require('boom')

const _ = require('lodash')

const istabulMocha = require('./istanbul-mocha')

const run = function (test, suiteName) {
  // TODO, start services locally
  try {
    require('mocha-sinon-chai/runner').run('--istanbul ' + istabulMocha.istanbul.params(test, suiteName) + ' --mocha ' + istabulMocha.mocha.params(test))
  } catch (error) {
    return Promise.reject(Boom.badImplementation('Local test run failed'))
  }
  return Promise.resolve()
}

module.exports = {
  run: run
}
