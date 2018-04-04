
const commander = require('commander')
const Promise = require('bluebird')

const getCommandOptions = function () {
  return commander
    .option('-s, --standard', 'Run standard')
    .option('--suite <suite>', 'Run only an specific test suite (integration, end-to-end, etc...)')
    .option('--t, --test <test>', 'Run only an specific test')
    .option('-f, --fix', 'Fix standard')
    .option('-u, --unit', 'Run unit tests')
    .parse(process.argv)
}

const get = function () {
  const options = getCommandOptions()
  options.suites = false
  if (!options.standard && !options.unit && !options.suite && !options.test) {
    options.standard = true
    options.unit = true
    options.suites = true
  }
  return Promise.resolve(options)
}

module.exports = {
  get: get
}
