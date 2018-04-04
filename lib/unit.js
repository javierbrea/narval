'use strict'

const tracer = require('./tracer')
const paths = require('./paths')

const run = function (data) {
  if (data.options.unit && data.config.test.unit) {
    tracer.info('Running unit tests')
    require('mocha-sinon-chai/runner').run(['--', '--recursive', data.config.test.unit])
  } else {
    tracer.warn('Skipping unit tests')
  }
}

module.exports = {
  run: run
}