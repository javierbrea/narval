
const Boom = require('boom')
// const _ = require('lodash')
const fsExtra = require('fs-extra')
const handlebars = require('handlebars')

const test = require('../../../index')
const mocks = require('../mocks')
const fixtures = require('../fixtures')

const docker = require('../../../lib/docker')

const options = require('../../../lib/options')
const config = require('../../../lib/config')

test.describe('docker', () => {
  let sandbox
  let childProcessMock
  let pathsMock
//  let configuration
  let suiteConfig

  test.beforeEach(() => {
    suiteConfig = JSON.parse(JSON.stringify(fixtures.config.dockerSuite))
//    configuration = JSON.parse(JSON.stringify(fixtures.config.dockerConfig))
    sandbox = test.sinon.sandbox.create()

    sandbox.stub(config, 'get').usingPromise().resolves(fixtures.config.dockerConfig)
    sandbox.stub(options, 'get').usingPromise().resolves({})
    sandbox.stub(fsExtra, 'copy').usingPromise().resolves()
    sandbox.spy(handlebars, 'compile')

    childProcessMock = new mocks.ChildProcess()
    childProcessMock.stubs.fork.on.returns(0)
    childProcessMock.stubs.execSync.returns('fooContainer1 exit status 0\\nfooContainer2 exit status 137\\nfooContainer3 exit status 0')

    pathsMock = new mocks.Paths()
  })

  test.afterEach(() => {
    childProcessMock.restore()
    pathsMock.restore()
    sandbox.restore()
  })

  test.describe('run method', () => {
    test.it('should return a promise, and resolve it when finish OK', () => {
      return docker.run(suiteConfig)
        .then(() => {
          return test.expect(true).to.be.true()
        })
    })

    test.it('should reject the promise if test has not configuration for docker', () => {
      delete suiteConfig.test.docker
      return docker.run(suiteConfig)
        .then(() => {
          return Promise.reject(new Error())
        })
        .catch((error) => {
          return Promise.all([
            test.expect(Boom.isBoom(error)).to.be.true()
          ])
        })
    })
  })
})
