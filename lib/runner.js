'use strict'

const Boom = require('boom')
const Promise = require('bluebird')
const fsExtra = require('fs-extra')

const config = require('./config')
const options = require('./options')
const tracer = require('./tracer')
const standard = require('./standard')
const suites = require('./suites')
const paths = require('./paths')

const run = function () {
  return Promise.props({
    options: options.get(),
    config: config.get()
  }).then(data => {
    return standard.run(data.options, data.config)
      .then(() => {
        return fsExtra.remove(paths.cwd.resolve('.narval', 'logs'))
          .then(() => {
            return paths.cwd.ensureDir('.narval', 'logs')
              .then(() => {
                return suites.run(data.options, data.config)
              })
          })
      })
  }).catch((err) => {
    if (Boom.isBoom(err)) {
      tracer.error(err.message)
    } else {
      tracer.error(err)
    }
    if(process.env.forceExit === "true") {
      process.exit(1)
    } else {
      process.exitCode = 1
    }
  })
}

run()
