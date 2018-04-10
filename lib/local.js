'use strict'

const Boom = require('boom')

const istabulMocha = require('./istanbul-mocha')

const run = function (test, suiteName) {
  // TODO, start services locally
  return require('mocha-sinon-chai/runner').run('--istanbul ' + istabulMocha.istanbul.params(test, suiteName) + ' --mocha ' + istabulMocha.mocha.params(test))
    .catch(() => {
      return Promise.reject(Boom.expectationFailed('Error running test'))
    })
}

module.exports = {
  run: run
}
