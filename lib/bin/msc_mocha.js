'use strict'

const paths = require('../paths')
const binPath = paths.findBin('msc_mocha')

if (binPath) {
  require(binPath)
}
