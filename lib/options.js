'use strict'

const commander = require('commander')
const Promise = require('bluebird')

const getCommandOptions = function () {
  return commander
    .option('-s, --standard', 'Run standard')
    .option('--suite <suite>', 'Run only an specific test suite')
    .option('--only <test>', 'Run only an specific test')
    .option('-f, --fix', 'Fix standard')
    .option('-u, --unit', 'Run unit tests')
    .option('-b, --build', 'Build docker images')
    .parse(process.argv)
}

const get = function () {
  const options = getCommandOptions()
  options.suites = false
  if (!options.standard && !options.unit && !options.suite && !options.only) {
    options.standard = true
    options.unit = true
    options.suites = true
  }
  return Promise.resolve(options)
}

module.exports = {
  get: get
}
