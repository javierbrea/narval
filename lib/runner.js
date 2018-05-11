'use strict'

const Boom = require('boom')

const tracer = require('./tracer')
const standard = require('./standard')
const suites = require('./suites')
const states = require('./states')

const run = function () {
  return standard.run()
    .then(suites.run)
    .catch((err) => {
      if (Boom.isBoom(err)) {
        tracer.error(err.message)
      } else {
        tracer.error(err)
      }
      if (states.get('exit-with-error')) {
        process.exit(1)
      } else {
        process.exitCode = 1
      }
    })
}

run()
