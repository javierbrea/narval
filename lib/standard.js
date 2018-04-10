'use strict'

const tracer = require('./tracer')

const run = function (data) {
  if (data.options.standard) {
    tracer.info('Running Standard')
    require('standard/bin/cmd')
  } else {
    tracer.warn('Skipping Standard')
  }
  return Promise.resolve()
}

module.exports = {
  run: run
}
