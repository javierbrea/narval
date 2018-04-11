'use strict'

const childProcess = require('child_process')
const Boom = require('boom')

const tracer = require('./tracer')
const paths = require('./paths')

const run = function (data) {
  if (data.options.standard) {
    tracer.info('Running Standard')
    return new Promise((resolve, reject) => {
      let standardCmdPath = paths.findDependencyFile(['standard', 'bin', 'cmd.js'])
      let proc

      proc = childProcess.fork(standardCmdPath, [], {
        cwd: process.cwd()
      })

      proc.on('close', (code) => {
        let error
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
