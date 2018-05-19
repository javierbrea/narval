
const Promise = require('bluebird')
const Boom = require('boom')
const yaml = require('js-yaml')

const test = require('../../../index')
const mocks = require('../mocks')
const fixtures = require('../fixtures')

const config = require('../../../lib/config')
const utils = require('../../../lib/utils')
const states = require('../../../lib/states')

test.describe('config', () => {
  let sandbox
  let mocksSandbox

  test.beforeEach(() => {
    sandbox = test.sinon.sandbox.create()
    mocksSandbox = new mocks.Sandbox([
      'paths',
      'logs',
      'waiton',
      'fs'
    ])
    sandbox.stub(utils, 'extendProcessEnvVars').callsFake((vars) => {
      return vars
    })
    sandbox.stub(yaml, 'safeLoad')
  })

  test.afterEach(() => {
    sandbox.restore()
    mocksSandbox.restore()
  })

  const returnsConfig = function (conf) {
    states.clean()
    mocksSandbox.fs.stubs.readFile.returns(null, {})
    yaml.safeLoad.returns(conf)
  }

  const fileReadTests = function (method) {
    const fooDefaultConfigPath = '/fooDefaultConfig'
    const fooCustomConfigPath = '/fooCustomConfig'

    test.describe('when reading data from config file', () => {
      test.beforeEach(() => {
        states.clean()
        mocksSandbox.paths.stubs.defaultConfig.returns(fooDefaultConfigPath)
        mocksSandbox.paths.stubs.customConfig.returns(fooCustomConfigPath)
      })

      test.it('should calculate configuration only once, no matter how many times is called', () => {
        return config[method]()
          .then(config[method])
          .then(() => {
            return test.expect(mocksSandbox.fs.stubs.readFile).to.have.been.calledTwice()
          })
      })

      test.it('should calculate configuration again if states are reset', () => {
        return config[method]()
          .then(config[method])
          .then(states.clean)
          .then(config[method])
          .then(() => {
            return test.expect(mocksSandbox.fs.stubs.readFile.callCount).to.equal(4)
          })
      })

      test.it('should calculate configuration based on custom package configuration and on default Narval configuration', () => {
        const fooFilesContent = 'fooContent'
        mocksSandbox.fs.stubs.readFile.returns(null, fooFilesContent)
        return config[method]()
          .then(() => {
            return Promise.all([
              test.expect(mocksSandbox.fs.stubs.readFile).to.have.been.calledWith(fooDefaultConfigPath),
              test.expect(mocksSandbox.fs.stubs.readFile).to.have.been.calledWith(fooCustomConfigPath),
              test.expect(yaml.safeLoad.callCount).to.equal(2),
              test.expect(yaml.safeLoad).to.have.been.calledWith(fooFilesContent)
            ])
          })
      })

      test.it('should ignore errors reading files, log a warn, and consider their content as empty', () => {
        mocksSandbox.fs.stubs.readFile.returns(new Error())
        return config[method]()
          .then((configuration) => {
            return Promise.all([
              test.expect(mocksSandbox.logs.stubs.configNotFound.getCall(0).args[0].filePath).to.not.be.undefined()
            ])
          })
      })
    })
  }

  test.describe('standard method', () => {
    fileReadTests('standard')

    test.it('should add the "directories" property if it is not defined', () => {
      return config.standard()
        .then((standard) => {
          return test.expect(standard.directories).to.deep.equal([])
        })
    })

    test.it('should convert the "directories" property to an array if it is an string', () => {
      returnsConfig({
        standard: {
          directories: 'foo foo2 foo3'
        }
      })
      return config.standard()
        .then((standard) => {
          return test.expect(standard.directories).to.deep.equal([
            'foo',
            'foo2',
            'foo3'
          ])
        })
    })
  })

  test.describe('suitesByType method', () => {
    fileReadTests('suitesByType')

    test.it('should return default config if there is no custom config', () => {
      returnsConfig(null)
      yaml.safeLoad.onCall(0).returns(fixtures.config.customConfig)
      yaml.safeLoad.onCall(1).returns(null)
      return config.suitesByType()
        .then((suitesByType) => {
          return test.expect(suitesByType).to.deep.equal(fixtures.config.customResult.suitesByType)
        })
    })

    test.it('should return suites from custom config if it is provided', () => {
      returnsConfig(null)
      yaml.safeLoad.onCall(0).returns(fixtures.config.customConfig)
      yaml.safeLoad.onCall(1).returns(fixtures.config.defaultSuites)
      return config.suitesByType()
        .then((suitesByType) => {
          return Promise.all([
            test.expect(suitesByType).to.deep.equal(fixtures.config.customResult.suitesByType)
          ])
        })
    })
  })

  test.describe('dockerImages method', () => {
    fileReadTests('dockerImages')

    test.it('should return an empty array if no custom config is provided', () => {
      returnsConfig(null)
      yaml.safeLoad.onCall(0).returns(fixtures.config.customConfig)
      return config.dockerImages()
        .then((dockerImages) => {
          return Promise.all([
            test.expect(dockerImages).to.deep.equal([])
          ])
        })
    })

    test.it('should return dockerImages config', () => {
      const fooConfig = {
        'docker-images': {
          foo: 'fooImage'
        }
      }
      returnsConfig(fooConfig)
      return config.dockerImages()
        .then((dockerImages) => {
          return Promise.all([
            test.expect(dockerImages).to.deep.equal(fooConfig['docker-images'])
          ])
        })
    })
  })

  test.describe('dockerContainers method', () => {
    fileReadTests('dockerContainers')

    test.it('should return an empty array if no custom config is provided', () => {
      returnsConfig(null)
      yaml.safeLoad.onCall(0).returns(fixtures.config.customConfig)
      return config.dockerContainers()
        .then((dockerContainers) => {
          return Promise.all([
            test.expect(dockerContainers).to.deep.equal([])
          ])
        })
    })

    test.it('should return dockerContainers config', () => {
      const fooConfig = {
        'docker-containers': {
          foo: 'fooContainer'
        }
      }
      returnsConfig(fooConfig)
      return config.dockerContainers()
        .then((dockerContainers) => {
          return Promise.all([
            test.expect(dockerContainers).to.deep.equal(fooConfig['docker-containers'])
          ])
        })
    })
  })

  test.describe('allDockerCustomEnvVars method', () => {
    test.it('should return an array with all custom docker environment vars defined in all suites', () => {
      returnsConfig(fixtures.config.fullConfig)
      return config.allDockerCustomEnvVars()
        .then((allDockerCustomEnvVars) => {
          return test.expect(allDockerCustomEnvVars).to.deep.equal([
            'fooTestVar',
            'fooService2Var',
            'fooBeforeVar',
            'fooService1Var'
          ])
        })
    })
  })

  test.describe('allComposeEnvVars method', () => {
    test.it('should return an object containing all needed environment vars for docker compose, with an empty string as value', () => {
      returnsConfig(fixtures.config.fullConfig)
      return config.allComposeEnvVars()
        .then((allComposeEnvVars) => {
          return Promise.all([
            test.expect(allComposeEnvVars).to.deep.equal({
              'coverage_options': '',
              'fooContainer1_command': '',
              'fooContainer1_command_params': '',
              'fooContainer1_coverage_enabled': '',
              'fooContainer1_wait_on': '',
              'fooContainer1_exit_after': '',
              'fooContainer1_narval_suite_type': '',
              'fooContainer1_narval_suite': '',
              'fooContainer1_narval_service': '',
              'fooContainer1_narval_is_docker': '',
              'fooContainer1_fooTestVar': '',
              'fooContainer1_fooService2Var': '',
              'fooContainer1_fooBeforeVar': '',
              'fooContainer1_fooService1Var': '',
              'fooContainer2_command': '',
              'fooContainer2_command_params': '',
              'fooContainer2_coverage_enabled': '',
              'fooContainer2_wait_on': '',
              'fooContainer2_exit_after': '',
              'fooContainer2_narval_suite_type': '',
              'fooContainer2_narval_suite': '',
              'fooContainer2_narval_service': '',
              'fooContainer2_narval_is_docker': '',
              'fooContainer2_fooTestVar': '',
              'fooContainer2_fooService2Var': '',
              'fooContainer2_fooBeforeVar': '',
              'fooContainer2_fooService1Var': '',
              'fooContainer3_command': '',
              'fooContainer3_command_params': '',
              'fooContainer3_coverage_enabled': '',
              'fooContainer3_wait_on': '',
              'fooContainer3_exit_after': '',
              'fooContainer3_narval_suite_type': '',
              'fooContainer3_narval_suite': '',
              'fooContainer3_narval_service': '',
              'fooContainer3_narval_is_docker': '',
              'fooContainer3_fooTestVar': '',
              'fooContainer3_fooService2Var': '',
              'fooContainer3_fooBeforeVar': '',
              'fooContainer3_fooService1Var': ''
            })
          ])
        })
    })

    test.it('should extend all docker compose needed vars with proccess environment vars', () => {
      returnsConfig(fixtures.config.fullConfig)
      return config.allComposeEnvVars()
        .then(() => {
          return test.expect(utils.extendProcessEnvVars).to.have.been.called()
        })
    })
  })

  test.describe('SuiteResolver constructor', () => {
    let suiteResolver
    let fooOptions = {}
    let initResolver
    let baseData

    test.beforeEach(() => {
      baseData = JSON.parse(JSON.stringify(fixtures.config.dockerSuite))
      initResolver = function (options = fooOptions, suiteTypeName = 'fooType', suitesByType = fixtures.config.dockerConfig.suitesByType) {
        suiteResolver = new config.SuiteResolver(baseData, suiteTypeName, options, suitesByType)
      }
      initResolver()
    })

    test.describe('typeName method', () => {
      test.it('should return the suite type name', () => {
        test.expect(suiteResolver.typeName()).to.equal('fooType')
      })
    })

    test.describe('name method', () => {
      test.it('should return the name of the suite', () => {
        test.expect(suiteResolver.name()).to.equal('fooDockerSuite')
      })
    })

    test.describe('hasToRun method', () => {
      test.it('should return true if no suite option is received', () => {
        test.expect(suiteResolver.hasToRun()).to.equal(true)
      })

      test.it('should return false if suite option is received and does not match with the suite name', () => {
        initResolver({
          suite: 'fake-suite'
        })
        test.expect(suiteResolver.hasToRun()).to.equal(false)
      })
    })

    test.describe('isDocker method', () => {
      test.it('should return false if local option is received', () => {
        initResolver({
          local: true
        })
        test.expect(suiteResolver.isDocker()).to.equal(false)
      })

      test.it('should return true if the test has configured a docker container', () => {
        test.expect(suiteResolver.isDocker()).to.equal(true)
      })

      test.it('should return true if any service has configured a docker container', () => {
        delete baseData.test.docker
        initResolver()
        test.expect(suiteResolver.isDocker()).to.equal(true)
      })

      test.it('should return false if no service, nor test, has configured a docker container', () => {
        baseData = fixtures.config.localSuite
        initResolver()
        test.expect(suiteResolver.isDocker()).to.equal(false)
      })
    })

    test.describe('istanbulArguments method', () => {
      test.it('should return the coverage configuration, parsed to istanbul arguments', () => {
        baseData.coverage = {
          config: {
            dir: '.coverage/custom',
            verbose: true,
            print: 'detail',
            report: 'text'
          }
        }
        initResolver()
        test.expect(suiteResolver.istanbulArguments()).to.equal('--include-all-sources --root=. --colors --print=detail --dir=.coverage/custom --verbose --report=text')
      })
    })

    test.describe('mochaArguments method', () => {
      test.it('should return the test configuration, parsed to mocha arguments', () => {
        baseData = fixtures.config.localSuite
        baseData.test.config = {
          recursive: false,
          reporter: 'list',
          grep: 'grepped'
        }
        initResolver()
        test.expect(suiteResolver.mochaArguments()).to.equal('--colors --reporter list --grep grepped foo/path/specs')
      })
    })

    test.describe('singleServiceToRun method', () => {
      test.it('should return a new serviceResolver of the service to run defined in options', () => {
        baseData = fixtures.config.localSuite
        initResolver({
          local: 'fooService'
        })
        test.expect(suiteResolver.singleServiceToRun().name()).to.equal('fooService')
      })

      test.it('should return false if there is no service to run defined in options', () => {
        test.expect(suiteResolver.singleServiceToRun()).to.equal(false)
      })

      test.it('should return false if the service to run defined in options is the test', () => {
        initResolver({
          local: 'test'
        })
        test.expect(suiteResolver.singleServiceToRun()).to.equal(false)
      })
    })

    test.describe('runSingleTest method', () => {
      test.it('should return true if it is defined in options to run only test locally', () => {
        initResolver({
          local: 'test'
        })
        test.expect(suiteResolver.runSingleTest()).to.equal(true)
      })

      test.it('should return false if it is not defined in options', () => {
        test.expect(suiteResolver.runSingleTest()).to.equal(false)
      })
    })

    test.describe('testWaitOn method', () => {
      const fooWaitConfig = {
        foo: 'foo'
      }

      test.it('should return the test waitOn docker configuration if is docker', () => {
        baseData.test.docker = {
          'wait-on': fooWaitConfig
        }
        initResolver()
        test.expect(suiteResolver.testWaitOn()).to.equal(fooWaitConfig)
      })

      test.it('should return the test waitOn docker configuration if is local', () => {
        baseData.test.local = {
          'wait-on': fooWaitConfig
        }
        initResolver({
          local: true
        })
        test.expect(suiteResolver.testWaitOn()).to.equal(fooWaitConfig)
      })
    })

    test.describe('testIsCoveraged method', () => {
      test.it('should return true by default', () => {
        delete baseData.coverage
        test.expect(suiteResolver.testIsCoveraged()).to.equal(true)
      })

      test.it('should return true if it is explicitly configured', () => {
        baseData.coverage.from = 'test'
        test.expect(suiteResolver.testIsCoveraged()).to.equal(true)
      })

      test.it('should return false if it is configured to get coverage from another service', () => {
        baseData.coverage.from = 'foo-service'
        test.expect(suiteResolver.testIsCoveraged()).to.equal(false)
      })

      test.it('should return false if coverage is disabled', () => {
        baseData.coverage.enabled = false
        test.expect(suiteResolver.testIsCoveraged()).to.equal(false)
      })
    })

    test.describe('testEnvVars method', () => {
      test.it('should return all environment vars configured for the test', () => {
        baseData.test.docker.env = {
          fooVar: 'fooValue'
        }
        test.expect(suiteResolver.testEnvVars()).to.deep.equal({
          narval_is_docker: true,
          narval_service: 'test',
          narval_suite: 'fooDockerSuite',
          narval_suite_type: 'fooType',
          fooVar: 'fooValue'
        })
      })
    })

    test.describe('testDockerContainer method', () => {
      test.it('should return the name of the docker container configured for the test', () => {
        test.expect(suiteResolver.testDockerContainer()).to.equal('fooContainer3')
      })

      test.it('should return undefined if no docker container is configured', () => {
        delete baseData.test.docker
        test.expect(suiteResolver.testDockerContainer()).to.be.undefined()
      })
    })

    test.describe('beforeCommand method', () => {
      const fooBeforeCommand = 'foo before command'

      test.it('should return the docker before command configuration if it is docker', () => {
        baseData.before = {
          docker: {
            command: fooBeforeCommand
          }
        }
        initResolver()
        test.expect(suiteResolver.beforeCommand()).to.equal(fooBeforeCommand)
      })

      test.it('should return the docker before command configuration if it is local', () => {
        baseData.before = {
          local: {
            command: fooBeforeCommand
          }
        }
        initResolver({
          local: true
        })
        test.expect(suiteResolver.beforeCommand()).to.equal(fooBeforeCommand)
      })
    })

    test.describe('beforeEnvVars method', () => {
      test.it('should return all environment vars configured for the before command', () => {
        baseData.before = {
          docker: {
            command: 'foo',
            env: {
              fooVar: 'foo before var'
            }
          }
        }
        initResolver()
        test.expect(suiteResolver.beforeEnvVars()).to.deep.equal({
          'fooVar': 'foo before var',
          'narval_is_docker': true,
          'narval_service': 'before',
          'narval_suite': 'fooDockerSuite',
          'narval_suite_type': 'fooType'
        })
      })
    })

    test.describe('services method', () => {
      test.it('should return an array containing new Services resolvers for each configured service', () => {
        const services = suiteResolver.services()
        test.expect(services[0].name()).to.equal('fooService1')
        test.expect(services[1].name()).to.equal('fooService2')
      })
    })

    test.describe('runDownVolumes method', () => {
      test.it('should return undefined by default', () => {
        test.expect(suiteResolver.runDownVolumes()).to.be.undefined()
      })

      test.it('should return true if it is explicitly configured', () => {
        baseData.before = {
          docker: {
            'down-volumes': true
          }
        }
        initResolver()
        test.expect(suiteResolver.runDownVolumes()).to.equal(true)
      })
    })

    test.describe('buildDocker method', () => {
      test.it('should return true if it is defined in options', () => {
        initResolver({
          build: true
        })
        test.expect(suiteResolver.buildDocker()).to.be.true()
      })

      test.it('should return false if it is not defined in options', () => {
        initResolver()
        test.expect(suiteResolver.buildDocker()).to.be.false()
      })
    })

    test.describe('coverageFromService method', () => {
      test.it('should return undefined by default', () => {
        delete baseData.coverage
        initResolver()
        test.expect(suiteResolver.coverageFromService()).to.be.undefined()
      })

      test.it('should return false if it is explicitly configured to get coverage from test', () => {
        baseData.coverage.from = 'test'
        initResolver()
        test.expect(suiteResolver.coverageFromService()).to.equal(false)
      })

      test.it('should return true if it is configured to get coverage from another service', () => {
        baseData.coverage.from = 'foo-service'
        initResolver()
        test.expect(suiteResolver.coverageFromService()).to.equal(true)
      })
    })

    test.describe('dockerEnvVars method', () => {
      test.beforeEach(() => {
        mocksSandbox.waiton.stubs.configToArguments.returns('foo wait')
      })

      test.it('should throw an error if docker container for test is not found', () => {
        delete baseData.test.docker
        initResolver()
        try {
          suiteResolver.dockerEnvVars()
        } catch (err) {
          test.expect(Boom.isBoom(err)).to.be.true()
        }
      })

      test.it('should return all docker environment variables for the suite', () => {
        baseData.coverage.config = {
          dir: '.coverage/custom',
          verbose: true,
          print: 'detail',
          report: 'text'
        }
        initResolver()
        const envVars = suiteResolver.dockerEnvVars()
        test.expect(utils.extendProcessEnvVars).to.have.been.called()
        test.expect(envVars).to.deep.equal({
          'coverage_options': '--include-all-sources --root=. --colors --print=detail --dir=.coverage/custom --verbose --report=text',
          'fooContainer3_command': 'narval-default-test-command',
          'fooContainer3_command_params': '--recursive --colors --reporter spec foo2/specs',
          'fooContainer3_coverage_enabled': false,
          'fooContainer3_exit_after': '',
          'fooContainer3_narval_suite_type': 'fooType',
          'fooContainer3_wait_on': 'foo wait',
          'fooContainer3_narval_suite': 'fooDockerSuite',
          'fooContainer3_narval_service': 'test',
          'fooContainer3_narval_is_docker': true,
          'fooContainer1_command': 'foo-docker-command2.js',
          'fooContainer1_command_params': '-- --fooParam1 --fooParam2',
          'fooContainer1_coverage_enabled': true,
          'fooContainer1_exit_after': 10000,
          'fooContainer1_narval_suite_type': 'fooType',
          'fooContainer1_wait_on': 'foo wait',
          'fooContainer1_narval_suite': 'fooDockerSuite',
          'fooContainer1_narval_service': 'fooService1',
          'fooContainer1_narval_is_docker': true,
          'fooContainer1_fooVar': 'foo value',
          'fooContainer2_command': 'foo-docker-command',
          'fooContainer2_command_params': '',
          'fooContainer2_coverage_enabled': false,
          'fooContainer2_exit_after': '',
          'fooContainer2_narval_suite_type': 'fooType',
          'fooContainer2_wait_on': 'foo wait',
          'fooContainer2_narval_suite': 'fooDockerSuite',
          'fooContainer2_narval_service': 'fooService2',
          'fooContainer2_narval_is_docker': true
        })
      })

      test.it('should add extra dashes to command parameters for tests docker container if test coverage is enabled', () => {
        delete baseData.coverage
        initResolver()
        const envVars = suiteResolver.dockerEnvVars()
        test.expect(utils.extendProcessEnvVars).to.have.been.called()
        test.expect(envVars).to.deep.equal({
          'coverage_options': '--include-all-sources --root=. --colors --print=summary --dir=.coverage/fooType/fooDockerSuite',
          'fooContainer3_command': 'narval-default-test-command',
          'fooContainer3_command_params': '-- --recursive --colors --reporter spec foo2/specs',
          'fooContainer3_coverage_enabled': true,
          'fooContainer3_wait_on': 'foo wait',
          'fooContainer3_exit_after': '',
          'fooContainer3_narval_suite_type': 'fooType',
          'fooContainer3_narval_suite': 'fooDockerSuite',
          'fooContainer3_narval_service': 'test',
          'fooContainer3_narval_is_docker': true,
          'fooContainer1_command': 'foo-docker-command2.js',
          'fooContainer1_command_params': '--fooParam1 --fooParam2',
          'fooContainer1_coverage_enabled': undefined,
          'fooContainer1_wait_on': 'foo wait',
          'fooContainer1_exit_after': 10000,
          'fooContainer1_narval_suite_type': 'fooType',
          'fooContainer1_narval_suite': 'fooDockerSuite',
          'fooContainer1_narval_service': 'fooService1',
          'fooContainer1_narval_is_docker': true,
          'fooContainer1_fooVar': 'foo value',
          'fooContainer2_command': 'foo-docker-command',
          'fooContainer2_command_params': '',
          'fooContainer2_coverage_enabled': undefined,
          'fooContainer2_wait_on': 'foo wait',
          'fooContainer2_exit_after': '',
          'fooContainer2_narval_suite_type': 'fooType',
          'fooContainer2_narval_suite': 'fooDockerSuite',
          'fooContainer2_narval_service': 'fooService2',
          'fooContainer2_narval_is_docker': true
        })
      })
    })
  })
})
