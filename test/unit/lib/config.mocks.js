
const test = require('../../../index')

const config = require('../../../lib/config')

const Mock = function () {
  const sandbox = test.sinon.sandbox.create()

  const suiteResolverStubs = {
    typeName: sandbox.stub(),
    name: sandbox.stub(),
    hasToRun: sandbox.stub(),
    isDocker: sandbox.stub(),
    istanbulArguments: sandbox.stub(),
    mochaArguments: sandbox.stub(),
    singleServiceToRun: sandbox.stub(),
    runSingleTest: sandbox.stub(),
    testWaitOn: sandbox.stub(),
    testIsCoveraged: sandbox.stub(),
    testEnvVars: sandbox.stub(),
    testDockerContainer: sandbox.stub(),
    beforeCommand: sandbox.stub(),
    beforeEnvVars: sandbox.stub(),
    services: sandbox.stub(),
    runDownVolumes: sandbox.stub(),
    buildDocker: sandbox.stub(),
    dockerEnvVars: sandbox.stub(),
    coverageFromService: sandbox.stub()
  }

  let stubs = {
    standard: sandbox.stub(config, 'standard').usingPromise().resolves(true),
    suitesByType: sandbox.stub(config, 'suitesByType').usingPromise().resolves([]),
    dockerImages: sandbox.stub(config, 'dockerImages').usingPromise().resolves([]),
    dockerContainers: sandbox.stub(config, 'dockerContainers').usingPromise().resolves([]),
    allDockerCustomEnvVars: sandbox.stub(config, 'allDockerCustomEnvVars').usingPromise().resolves({}),
    allComposeEnvVars: sandbox.stub(config, 'allComposeEnvVars').usingPromise().resolves({}),
    SuiteResolver: sandbox.stub(config, 'SuiteResolver').returns(suiteResolverStubs)
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
