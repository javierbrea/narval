'use strict'

const Boom = require('boom')
const Promise = require('bluebird')

const config = require('./config')
const options = require('./options')
const paths = require('./paths')
const tracer = require('./tracer')
const standard = require('./standard')
const unit = require('./unit')
const suites = require('./suites')

const run = function () {
  return Promise.props({
    options: options.get(),
    config: config.get()
  }).then(data => {
    standard.run(data)
    unit.run(data)
    suites.run(data)
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
