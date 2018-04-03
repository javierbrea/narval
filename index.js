'use strict'

const config = require('./lib/config')
const options = require('./lib/options')
const paths = require('./lib/paths')

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
