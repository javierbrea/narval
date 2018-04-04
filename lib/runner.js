'use strict'

const Boom = require('boom')
const Promise = require('bluebird')

const config = require('./config')
const options = require('./options')
const paths = require('./paths')
const tracer = require('./tracer')

const run = function () {
  return Promise.props({
    options: options.get(),
    config: config.get()
  }).then(data => {
    if (data.options.standard) {
      tracer.info('Running Standard')
      const standardPath = paths.findBin('standard')
      require(standardPath)
    } else {
      tracer.warn('Skipping Standard')
    }

    if (data.options.unit && data.config.test.unit) {
      tracer.info('Running unit tests')
      require('mocha-sinon-chai/runner').run(['--', '--recursive', data.config.test.unit])
    } else {
      tracer.warn('Skipping unit tests')
    }
  }).catch((err) => {
    if (Boom.isBoom(err)) {
      tracer.error(err.message)
    } else {
      tracer.error(err)
    }
    process.exit(1)
  })
}

run()
