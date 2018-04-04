
const commander = require('commander')
const Promise = require('bluebird')

const getCommandOptions = function () {
  return commander
    .option('-s, --standard', 'Run standard')
    .option('-f, --fix', 'Fix standard')
    .option('-u, --unit', 'Run integration tests')
    .option('-i, --integration', 'Run integration tests')
    .option('-e, --end-to-end, --end', 'Run end-to-end tests')
    .parse(process.argv)
}

const get = function () {
  const options = getCommandOptions()
  if (!options.standard && !options.unit && !options.integration && !options.end) {
    options.standard = true
    options.unit = true
    options.end = true
  }
  return Promise.resolve(options)
}

module.exports = {
  get: get
}
