
const test = require('../../../index')

const paths = require('../../../lib/paths')

const Mock = function () {
  const sandbox = test.sinon.sandbox.create()

  const PathMethods = function (base) {
    return {
      base: sandbox.stub(paths[base], 'base'),
      ensureDir: sandbox.stub(paths[base], 'ensureDir').usingPromise().resolves(),
      existsSync: sandbox.stub(paths[base], 'existsSync'),
      readFile: sandbox.stub(paths[base], 'readFile'),
      resolve: sandbox.stub(paths[base], 'resolve'),
      writeFile: sandbox.stub(paths[base], 'writeFile'),
      remove: sandbox.stub(paths[base], 'remove').usingPromise().resolves()
    }
  }

  const stubs = {
    cwd: new PathMethods('cwd'),
    package: new PathMethods('package'),
    defaultConfig: sandbox.stub(paths, 'defaultConfig'),
    customConfig: sandbox.stub(paths, 'customConfig'),
    logs: sandbox.stub(paths, 'logs'),
    findDependencyFile: sandbox.stub(paths, 'findDependencyFile'),
    docker: sandbox.stub(paths, 'docker')
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
