'use strict'

const Boom = require('boom')
const Promise = require('bluebird')

const config = require('./config')
const options = require('./options')
const tracer = require('./tracer')
const standard = require('./standard')
const suites = require('./suites')

const run = function () {
  return Promise.props({
    options: options.get(),
    config: config.get()
  }).then(data => {
    return standard.run(data)
      .then(() => {
        return suites.run(data)
      })
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
