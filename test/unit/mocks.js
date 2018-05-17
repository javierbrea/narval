
const Bluebird = require('bluebird')
const _ = require('lodash')

Bluebird.config({
  longStackTraces: true
})

const mocks = {
  ChildProcess: require('./lib/childProcess.mocks'),
  Commands: require('./lib/commands.mocks'),
  Config: require('./lib/config.mocks'),
  Docker: require('./lib/docker.mocks'),
  Fs: require('./lib/fs.mocks'),
  Logs: require('./lib/logs.mocks'),
  Options: require('./lib/options.mocks'),
  Paths: require('./lib/paths.mocks'),
  Processes: require('./lib/processes.mocks'),
  Suitedocker: require('./lib/suite-type.mocks'),
  Suitelocal: require('./lib/suite-type.mocks'),
  Tracer: require('./lib/tracer.mocks'),
  Utils: require('./lib/utils.mocks'),
  Libs: require('./lib/libs.mocks'),
  Waiton: require('./lib/wait-on.mocks')
}

const Sandbox = function (mocksList) {
  let mocksToReturn = {}
  _.each(mocksList, (mockToCreate) => {
    mocksToReturn[mockToCreate] = new mocks[_.capitalize(mockToCreate)](mockToCreate)
  })

  const restore = function () {
    _.each(mocksToReturn, (mock) => {
      mock.restore()
    })
  }

  return Object.assign({}, mocksToReturn, {
    restore: restore
  })
}

module.exports = Object.assign({}, mocks, {
  Sandbox: Sandbox
})
