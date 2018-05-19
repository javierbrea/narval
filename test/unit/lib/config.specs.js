
const Promise = require('bluebird')
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
/* const test = require('../../../index')

const istanbulMocha = require('../../../lib/istanbul-mocha')

test.describe.skip('istanbul-mocha', () => {
  test.describe('mocha.params method', () => {
    test.it('should return an string containing mocha command line arguments given a test configuration', () => {
      test.expect(istanbulMocha.mocha.params({
        test: {
          specs: 'fooSpec/path',
          config: {
            reporter: 'list',
            grep: 'foo'
          }
        }
      })).to.equal('--recursive --colors --reporter list --grep foo fooSpec/path')
    })

    test.it('should add mocha default configuration to returned command', () => {
      test.expect(istanbulMocha.mocha.params({
        test: {
          specs: 'fooSpec/path'
        }
      })).to.equal('--recursive --colors --reporter spec fooSpec/path')
    })

    test.it('should convert boolean values, and add only the key to the command', () => {
      test.expect(istanbulMocha.mocha.params({
        test: {
          specs: 'foo2',
          config: {
            grep: true
          }
        }
      })).to.equal('--recursive --colors --reporter spec --grep foo2')
    })

    test.it('should ignore false boolean values', () => {
      test.expect(istanbulMocha.mocha.params({
        test: {
          specs: 'foo2',
          config: {
            grep: false
          }
        }
      })).to.equal('--recursive --colors --reporter spec foo2')
    })
  })

  test.describe('istanbul.params method', () => {
    test.it('should return an string containing istanbul command line arguments given a test configuration', () => {
      test.expect(istanbulMocha.istanbul.params({
        name: 'fooTest',
        coverage: {
          config: {
            print: 'both',
            foo: 'fooValue'
          }
        }
      }, 'fooSuiteType')).to.equal('--include-all-sources --root=. --colors --print=both --dir=.coverage/fooSuiteType/fooTest --foo=fooValue')
    })

    test.it('should include default istanbul command line arguments if no coverage config is provided', () => {
      test.expect(istanbulMocha.istanbul.params({
        name: 'fooTest'
      }, 'fooSuiteType')).to.equal('--include-all-sources --root=. --colors --print=summary --dir=.coverage/fooSuiteType/fooTest')
    })

    test.it('should add a single arguments separator to istanbul arguments that need that special format', () => {
      test.expect(istanbulMocha.istanbul.params({
        name: 'fooTest',
        coverage: {
          config: {
            x: true,
            i: true
          }
        }
      }, 'fooSuiteType')).to.equal('--include-all-sources --root=. --colors --print=summary --dir=.coverage/fooSuiteType/fooTest -x -i')
    })
  })
}) */

/* test.it('should run suite using docker if suite has any docker property in test', () => {
      options.get.resolves(fixtures.options.dockerSuite)

      return suites.run()
        .then(specDockerUsed)
    })

    test.it('should run suite using docker if suite has any service configured for docker', () => {
      options.get.resolves({
        suite: 'fooDockerSuite2'
      })

      return suites.run()
        .then(specDockerUsed)
    })

    test.it('should run suite locally if suite test is not configured for docker and has not any service configured for docker', () => {
      options.get.resolves({
        suite: 'fooSuite2'
      })

      return suites.run()
        .then(() => {
          return Promise.all([
            test.expect(docker.createFiles).to.not.have.been.called(),
            test.expect(dockerSuite.Runner).to.not.have.been.called(),
            test.expect(local.Runner).to.have.been.called()
          ])
        })
    })

    test.describe('when an specific suite to be executed is defined in options', () => {
      test.it('should skip all other suites executions, and execute that one', () => {
        options.get.resolves(fixtures.options.suite)
        return suites.run()
          .then(() => {
            return Promise.all([
              test.expect(tracerMock.stubs.warn.getCall(0).args[0]).to.contain('Skipping'),
              test.expect(tracerMock.stubs.warn.callCount).to.equal(3),
              test.expect(local.Runner.callCount).to.equal(1)
            ])
          })
      })

      test.it('should not execute any suite if provided one does not exists in config', () => {
        options.get.resolves({
          suite: 'unrealSuite'
        })
        return suites.run()
          .then(() => {
            return Promise.all([
              test.expect(tracerMock.stubs.warn.callCount).to.equal(4),
              test.expect(local.Runner).to.not.have.been.called()
            ])
          })
      })
    })

    */
