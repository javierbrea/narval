'use strict'

const paths = require('../paths')
const binPath = paths.findBin('msc-istanbul')

if (binPath) {
  require(binPath)
}
