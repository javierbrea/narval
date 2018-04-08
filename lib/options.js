'use strict'

const commander = require('commander')
const Promise = require('bluebird')

const getCommandOptions = function () {
  return commander
    .option('-s, --standard', 'Run standard')
    .option('--type <type>', 'Run only all suites of an specific type')
    .option('--suite <test>', 'Run only an specific suite')
    .option('-f, --fix', 'Fix standard')
    .option('-b, --build', 'Build docker images')
    .parse(process.argv)
}

const get = function () {
  const options = getCommandOptions()
  if (!options.standard && !options.suite && !options.type) {
    options.standard = true
    options.allSuites = true
  }
  return Promise.resolve(options)
}

module.exports = {
  get: get
}
