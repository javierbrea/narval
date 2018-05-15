
const Promise = require('bluebird')
const yaml = require('js-yaml')

const test = require('../../../index')
const mocks = require('../mocks')
const fixtures = require('../fixtures')

const config = require('../../../lib/config')
const states = require('../../../lib/states')

test.describe('config', () => {
  test.describe('get method', () => {
    const fooDefaultConfigPath = '/fooDefaultConfig'
    const fooCustomConfigPath = '/fooCustomConfig'
    const sandbox = test.sinon.sandbox.create()

    const getConfigClean = function () {
      states.clean()
      return config.get()
    }

    let tracerMock
    let pathsMock
    let fsMocks

    test.beforeEach(() => {
      tracerMock = new mocks.Tracer()
      pathsMock = new mocks.Paths()
      pathsMock.stubs.defaultConfig.returns(fooDefaultConfigPath)
      pathsMock.stubs.customConfig.returns(fooCustomConfigPath)
      fsMocks = new mocks.Fs()
      sandbox.stub(yaml, 'safeLoad')
    })

    test.afterEach(() => {
      tracerMock.restore()
      pathsMock.restore()
      fsMocks.restore()
      sandbox.restore()
    })

    test.it('should return a promise', () => {
      return test.expect(config.get()).to.be.an.instanceof(Promise)
    })

    test.it('should calculate configuration only once, no matter how many times is called', () => {
      return getConfigClean()
        .then(config.get)
        .then(config.get)
        .then(() => {
          return test.expect(fsMocks.stubs.readFile).to.have.been.calledTwice()
        })
    })

    test.it('should calculate configuration again if states are reset', () => {
      return getConfigClean()
        .then(config.get)
        .then(getConfigClean)
        .then(() => {
          return test.expect(fsMocks.stubs.readFile.callCount).to.equal(4)
        })
    })

    test.it('should calculate configuration based on custom package configuration and on default Narval configuration', () => {
      const fooFilesContent = 'fooContent'
      fsMocks.stubs.readFile.returns(null, fooFilesContent)
      return getConfigClean()
        .then(() => {
          return Promise.all([
            test.expect(fsMocks.stubs.readFile).to.have.been.calledWith(fooDefaultConfigPath),
            test.expect(fsMocks.stubs.readFile).to.have.been.calledWith(fooCustomConfigPath),
            test.expect(yaml.safeLoad.callCount).to.equal(2),
            test.expect(yaml.safeLoad).to.have.been.calledWith(fooFilesContent)
          ])
        })
    })

    test.it('should ignore errors reading files, log a warn, and consider their content as empty', () => {
      fsMocks.stubs.readFile.returns(new Error())
      return getConfigClean()
        .then((configuration) => {
          return Promise.all([
            test.expect(configuration).to.deep.equal(fixtures.config.emptyResult),
            test.expect(tracerMock.stubs.warn.getCall(0).args[0]).to.include('not found')
          ])
        })
    })

    test.it('should return suites from custom config if it is provided', () => {
      yaml.safeLoad.onCall(0).returns(fixtures.config.customConfig)
      yaml.safeLoad.onCall(1).returns(fixtures.config.defaultSuites)
      return getConfigClean()
        .then((configuration) => {
          return Promise.all([
            test.expect(configuration).to.deep.equal(fixtures.config.customResult)
          ])
        })
    })

    test.it('should return suites from default config if no custom config is found', () => {
      yaml.safeLoad.onCall(1).returns(fixtures.config.defaultSuites)
      return getConfigClean()
        .then((configuration) => {
          return Promise.all([
            test.expect(configuration).to.deep.equal(fixtures.config.defaultResult)
          ])
        })
    })
  })
})

/*
test.it.skip('should set empty environment variables for all configured docker containers', () => {
      return docker.downVolumes()
        .then(() => {
          const envVars = childProcessMock.stubs.execSync.getCall(0).args[1].env
          return Promise.all([
            test.expect(envVars.coverage_options).to.equal(''),
            test.expect(envVars.fooContainer1_coverage_enabled).to.equal(''),
            test.expect(envVars.fooContainer2_coverage_enabled).to.equal(''),
            test.expect(envVars.fooContainer3_coverage_enabled).to.equal(''),
            test.expect(envVars.fooContainer1_narval_is_docker).to.equal(''),
            test.expect(envVars.fooContainer2_narval_suite_type).to.equal(''),
            test.expect(envVars.fooContainer3_narval_suite).to.equal(''),
            test.expect(envVars.fooContainer3_narval_service).to.equal(''),
            test.expect(envVars.fooContainer1_command).to.equal(''),
            test.expect(envVars.fooContainer2_command).to.equal(''),
            test.expect(envVars.fooContainer3_command).to.equal(''),
            test.expect(envVars.fooContainer1_command_params).to.equal(''),
            test.expect(envVars.fooContainer2_command_params).to.equal(''),
            test.expect(envVars.fooContainer3_command_params).to.equal(''),
            test.expect(envVars.fooContainer1_wait_for).to.equal(''),
            test.expect(envVars.fooContainer2_wait_for).to.equal(''),
            test.expect(envVars.fooContainer3_wait_for).to.equal(''),
            test.expect(envVars.fooContainer1_exit_after).to.equal(''),
            test.expect(envVars.fooContainer2_exit_after).to.equal(''),
            test.expect(envVars.fooContainer3_exit_after).to.equal('')
          ])
        })
    })
*/
