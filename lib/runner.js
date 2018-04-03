'use strict'

const config = require('./config')
const options = require('./options')
const paths = require('./paths')

const configuration = config.read()

if (options.standard) {
  const standardPath = paths.findBin('standard')
  console.log('Running standard')
  require(standardPath)
}

if (options.unit && configuration.test && configuration.test.unit) {
  console.log('Running unit tests')
  require('mocha-sinon-chai/runner').run(['--', '--recursive', configuration.test.unit])
}
