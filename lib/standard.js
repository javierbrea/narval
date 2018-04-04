'use strict'

const tracer = require('./tracer')
const paths = require('./paths')

const run = function (data) {
  if (data.options.standard) {
    tracer.info('Running Standard')
    require(paths.findBin('standard'))
  } else {
    tracer.warn('Skipping Standard')
  }
}

module.exports = {
  run: run
}