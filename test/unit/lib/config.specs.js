
const Promise = require('bluebird')
const yaml = require('js-yaml')

const test = require('../../../index')
const mocks = require('../mocks')
const fixtures = require('./config.fixtures')

const config = require('../../../lib/config')

test.describe('config', () => {
  test.describe('get method', () => {
    const fooDefaultConfigPath = '/fooDefaultConfig'
    const fooCustomConfigPath = '/fooCustomConfig'
    const sandbox = test.sinon.sandbox.create()
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

    const getConfigClean = function () {
      return config.get({
        cleanCache: true
      })
    }

    test.it('should calculate configuration only once, no matter how many times is called', () => {
      return getConfigClean()
        .then(config.get)
        .then(config.get)
        .then(() => {
          return test.expect(fsMocks.stubs.readFile).to.have.been.calledTwice()
        })
    })

    test.it('should calculate configuration again if cleanCache option is specified', () => {
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
            test.expect(configuration).to.deep.equal(fixtures.emptyResult),
            test.expect(tracerMock.stubs.warn.getCall(0).args[0]).to.include('not found')
          ])
        })
    })

    test.it('should return suites from custom config if it is provided', () => {
      yaml.safeLoad.onCall(0).returns(fixtures.customConfig)
      yaml.safeLoad.onCall(1).returns(fixtures.defaultSuites)
      return getConfigClean()
        .then((configuration) => {
          return Promise.all([
            test.expect(configuration).to.deep.equal(fixtures.customResult)
          ])
        })
    })

    test.it('should return suites from default config if no custom config is found', () => {
      yaml.safeLoad.onCall(1).returns(fixtures.defaultSuites)
      return getConfigClean()
        .then((configuration) => {
          return Promise.all([
            test.expect(configuration).to.deep.equal(fixtures.defaultResult)
          ])
        })
    })
  })
})
