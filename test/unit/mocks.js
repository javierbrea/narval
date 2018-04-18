
const Bluebird = require('bluebird')

Bluebird.config({
  longStackTraces: true
})

const PathsMocks = require('./lib/paths.mocks')
const TracerMocks = require('./lib/tracer.mocks')
const FsMocks = require('./lib/fs.mocks')
const ChildProcess = require('./lib/childProcess.mocks')

module.exports = {
  Paths: PathsMocks,
  Tracer: TracerMocks,
  Fs: FsMocks,
  ChildProcess: ChildProcess
}
