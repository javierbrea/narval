'use strict'

const Promise = require('bluebird')
const Boom = require('boom')

const tracer = require('./tracer')
const paths = require('./paths')
const options = require('./options')
const config = require('./config')
const processes = require('./processes')

const run = function () {
  return Promise.props({
    config: config.standard(),
    options: options.get()
  }).then((data) => {
    if(data.options.standard) {
      let standardCmdPath = paths.findDependencyFile(['standard', 'bin', 'cmd.js'])
      let standardArgs = data.options.fix ? ['--fix'] : []

      tracer.info('Running Standard')

      return processes.fork(standardCmdPath, {
        args: data.config.directories.concat(standardArgs),
        resolveOnClose: true
      }).then(closeCode => {
        if (closeCode !== 0) {
          return Promise.reject(Boom.expectationFailed('Error running Standard'))
        }
        tracer.info('Standard finished OK')
        return Promise.resolve()
      })
    } else {
      tracer.warn('Skipping Standard')
      return Promise.resolve()
    }
  })
}

module.exports = {
  run: run
}
