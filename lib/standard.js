'use strict'

const childProcess = require('child_process')
const Boom = require('boom')
const _ = require('lodash')

const tracer = require('./tracer')
const paths = require('./paths')

const run = function (options, config) {
  options = options || {}
  if (options.standard) {
    tracer.info('Running Standard')
    return new Promise((resolve, reject) => {
      let standardCmdPath = paths.findDependencyFile(['standard', 'bin', 'cmd.js'])
      let proc
      let standardOptions = []
      let directories = (config.standard && config.standard.directories) || []

      if (_.isString(directories)) {
        directories = directories.split(' ')
      }

      if (options.fix) {
        standardOptions.push('--fix')
      }

      standardOptions = standardOptions.concat(directories)

      proc = childProcess.fork(standardCmdPath, standardOptions, {
        cwd: process.cwd()
      })

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(Boom.expectationFailed('Error running Standard'))
        } else {
          tracer.info('Standard finished OK')
          resolve()
        }
      })
    })
  } else {
    tracer.warn('Skipping Standard')
    return Promise.resolve()
  }
}

module.exports = {
  run: run
}
