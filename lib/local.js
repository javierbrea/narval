'use strict'

const istabulMocha = require('./istanbul-mocha')

const run = function (test, suiteName) {
  // TODO, start services locally
  return require('mocha-sinon-chai/runner').run('--istanbul ' + istabulMocha.istanbul.params(test, suiteName) + ' --mocha ' + istabulMocha.mocha.params(test))
}

module.exports = {
  run: run
}
