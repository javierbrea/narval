
const test = require('../../../index')

const docker = require('../../../lib/docker')

const Mock = function () {
  const sandbox = test.sinon.sandbox.create()

  let stubs = {
    createFiles: sandbox.stub(docker, 'createFiles').usingPromise().resolves(),
    downVolumes: sandbox.stub(docker, 'downVolumes').usingPromise().resolves()
  }

  const restore = function () {
    sandbox.restore()
  }

  return {
    stubs: stubs,
    restore: restore
  }
}

module.exports = Mock
