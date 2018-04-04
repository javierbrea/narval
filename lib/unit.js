'use strict'

const tracer = require('./tracer')

const run = function (data) {
  if (data.options.unit && data.config.test.unit) {
    tracer.info('Running unit tests')
    require('mocha-sinon-chai/runner').run(['--', '--recursive', data.config.test.unit])
  } else {
    tracer.warn('Skipping unit tests')
  }
  return Promise.resolve()
}

module.exports = {
  run: run
}
