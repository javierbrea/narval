
const Boom = require('boom')
const fsExtra = require('fs-extra')
const handlebars = require('handlebars')

const test = require('../../../index')
const mocks = require('../mocks')
const fixtures = require('../fixtures')

const commands = require('../../../lib/commands')
const docker = require('../../../lib/docker')
const states = require('../../../lib/states')

const options = require('../../../lib/options')
const config = require('../../../lib/config')

test.describe.skip('docker', () => {
  let sandbox
  let childProcessMock
  let pathsMock
  let configuration
  let suiteConfig
  let tracerMock

  test.beforeEach(() => {
    suiteConfig = JSON.parse(JSON.stringify(fixtures.config.dockerSuite))
    configuration = JSON.parse(JSON.stringify(fixtures.config.dockerConfig))
    sandbox = test.sinon.sandbox.create()

    tracerMock = new mocks.Tracer()

    sandbox.stub(config, 'get').usingPromise().resolves(configuration)
    sandbox.stub(options, 'get').usingPromise().resolves({})
    sandbox.stub(fsExtra, 'copy').usingPromise().resolves()
    sandbox.stub(handlebars, 'compile').returns(sandbox.stub())

    childProcessMock = new mocks.ChildProcess()
    childProcessMock.stubs.fork.on.returns(0)
    childProcessMock.stubs.execSync.returns('fooContainer1 status 0')

    sandbox.stub(commands, 'run').usingPromise().resolves({
      on: childProcessMock.stubs.spawn.on.fake
    })

    pathsMock = new mocks.Paths()
  })

  test.afterEach(() => {
    tracerMock.restore()
    childProcessMock.restore()
    pathsMock.restore()
    sandbox.restore()
    states.clean()
  })

  test.describe.skip('run method', () => {
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
            test.expect(Boom.isBoom(error)).to.be.true(),
            test.expect(error.message).to.contain('No docker configuration')
          ])
        })
    })

    test.it('should execute docker compose up', () => {
      return docker.run(suiteConfig)
        .then(() => {
          return test.expect(childProcessMock.stubs.execSync.getCall(0).args[0]).to.contain('docker-compose.json up')
        })
    })

    test.describe('when there is "before" configuration for the suite', () => {
      const fooCommandPath = 'fooCommandPath'
      const fooSuiteType = 'fooType'

      test.beforeEach(() => {
        suiteConfig.before = {
          docker: {
            'down-volumes': true,
            command: fooCommandPath
          }
        }
      })

      test.it('should execute docker down-volumes if it is defined', () => {
        return docker.run(suiteConfig)
          .then(() => {
            return test.expect(childProcessMock.stubs.execSync.getCall(0).args[0]).to.contain('down --volumes')
          })
      })

      test.it('should execute the before command if it is defined', () => {
        return docker.run(suiteConfig)
          .then(() => {
            return test.expect(commands.run).to.have.been.calledWith(fooCommandPath)
          })
      })

      test.it('should add suit environment variables to the before command execution', () => {
        return docker.run(suiteConfig, fooSuiteType)
          .then(() => {
            const envVars = commands.run.getCall(0).args[1].env
            return Promise.all([
              test.expect(envVars.narval_suite_type).to.equal(fooSuiteType),
              test.expect(envVars.narval_suite).to.equal('fooDockerSuite'),
              test.expect(envVars.narval_service).to.equal('clean'),
              test.expect(envVars.narval_is_docker).to.be.true()
            ])
          })
      })

      test.it('should pass the custom environment variables defined for the before command', () => {
        const fooVarValue = 'foo clean value'
        suiteConfig.before = {
          docker: {
            'down-volumes': true,
            command: fooCommandPath,
            env: {
              fooClean1: fooVarValue
            }
          }
        }
        return docker.run(suiteConfig)
          .then(() => {
            return test.expect(commands.run.getCall(0).args[1].env.fooClean1).to.equal(fooVarValue)
          })
      })
    })

    test.describe('when executing docker compose up', () => {
      const fooSuiteType = 'fooType'

      test.it('should reject the promise if the execution fails', () => {
        childProcessMock.stubs.execSync.throws(new Error())
        return docker.run(suiteConfig)
          .catch((error) => {
            return Promise.all([
              test.expect(Boom.isBoom(error)).to.be.true(),
              test.expect(error.message).to.equal('Docker run failed')
            ])
          })
      })

      test.it('should indicate to docker that has to rebuild images if it is defined in options', () => {
        options.get.resolves({
          build: true
        })
        return docker.run(suiteConfig)
          .then(() => {
            return test.expect(childProcessMock.stubs.execSync.getCall(0).args[0]).to.contain('--build')
          })
      })

      test.it('should pass to docker the --exit-code-from option with the test container if there is not any coveraged service', () => {
        suiteConfig.coverage = {}
        return docker.run(suiteConfig)
          .then(() => {
            return test.expect(childProcessMock.stubs.execSync.getCall(0).args[0]).to.contain(`--exit-code-from fooContainer3`)
          })
      })

      test.it('should pass to docker the --exit-code-from option with the test container if the configuration specify to coverage the test', () => {
        suiteConfig.coverage = {
          from: 'test'
        }
        return docker.run(suiteConfig)
          .then(() => {
            return test.expect(childProcessMock.stubs.execSync.getCall(0).args[0]).to.contain(`--exit-code-from fooContainer3`)
          })
      })

      test.it('should set an environment variable with the command to run for each service', () => {
        return docker.run(suiteConfig)
          .then(() => {
            const envVars = childProcessMock.stubs.execSync.getCall(0).args[1].env
            return Promise.all([
              test.expect(envVars.fooContainer1_command).to.contain('foo-docker-command2.js'),
              test.expect(envVars.fooContainer2_command).to.contain('foo-docker-command')
            ])
          })
      })

      test.it('should set environment variables with the details about the suite, type, and service for each service', () => {
        return docker.run(suiteConfig, fooSuiteType)
          .then(() => {
            const envVars = childProcessMock.stubs.execSync.getCall(0).args[1].env
            return Promise.all([
              test.expect(envVars.fooContainer1_narval_is_docker).to.be.true(),
              test.expect(envVars.fooContainer1_narval_service).to.equal('fooService1'),
              test.expect(envVars.fooContainer2_narval_service).to.equal('fooService2'),
              test.expect(envVars.fooContainer1_narval_suite).to.equal('fooDockerSuite'),
              test.expect(envVars.fooContainer2_narval_suite).to.equal('fooDockerSuite'),
              test.expect(envVars.fooContainer1_narval_suite_type).to.equal('fooType'),
              test.expect(envVars.fooContainer2_narval_suite_type).to.equal('fooType')
            ])
          })
      })

      test.it('should add custom environment variables', () => {
        return docker.run(suiteConfig, fooSuiteType)
          .then(() => {
            return test.expect(childProcessMock.stubs.execSync.getCall(0).args[1].env.fooContainer1_fooVar).to.equal('foo value')
          })
      })

      test.it('should not add custom environment variables for services that has not defined them', () => {
        delete suiteConfig.test.docker.env
        return docker.run(suiteConfig, fooSuiteType)
          .then(() => {
            return test.expect(childProcessMock.stubs.execSync.getCall(0).args[1].env.fooContainer3_fooVar).to.be.undefined()
          })
      })

      test.it('should set an environment variable with the command as "narval-default-test-command" for tests service', () => {
        return docker.run(suiteConfig)
          .then(() => {
            return test.expect(childProcessMock.stubs.execSync.getCall(0).args[1].env.fooContainer3_command).to.equal('narval-default-test-command')
          })
      })

      test.it('should set an environment variable with the command parameters for each service', () => {
        return docker.run(suiteConfig)
          .then(() => {
            const envVars = childProcessMock.stubs.execSync.getCall(0).args[1].env
            return Promise.all([
              test.expect(envVars.fooContainer1_command_params).to.equal('-- --fooParam1 --fooParam2'),
              test.expect(envVars.fooContainer2_command_params).to.equal(''),
              test.expect(envVars.fooContainer3_command_params).to.equal('--recursive --colors --reporter spec foo2/specs')
            ])
          })
      })

      test.it('should set an environment variable with the command parameters for the test execution, including custom configuration', () => {
        suiteConfig.test.config = {
          reporter: 'fooReporter',
          fooConfig2: true
        }

        return docker.run(suiteConfig)
          .then(() => {
            return test.expect(childProcessMock.stubs.execSync.getCall(0).args[1].env.fooContainer3_command_params).to.equal('--recursive --colors --reporter fooReporter --fooConfig2 foo2/specs')
          })
      })

      test.it('should add an extra "--" to test command arguments if coverage is not enabled for a service', () => {
        suiteConfig.test.config = {
          reporter: 'fooReporter',
          fooConfig2: true
        }
        delete suiteConfig.coverage

        return docker.run(suiteConfig)
          .then(() => {
            return test.expect(childProcessMock.stubs.execSync.getCall(0).args[1].env.fooContainer3_command_params).to.equal('-- --recursive --colors --reporter fooReporter --fooConfig2 foo2/specs')
          })
      })

      test.it('should not add an extra "--" to test command arguments if coverage is disabled for tests', () => {
        suiteConfig.coverage = {
          enabled: false
        }
        return docker.run(suiteConfig)
          .then(() => {
            return test.expect(childProcessMock.stubs.execSync.getCall(0).args[1].env.fooContainer3_command_params).to.equal('--recursive --colors --reporter spec foo2/specs')
          })
      })

      test.it('should set an environment variable with the istanbul coverage configuration', () => {
        suiteConfig.coverage.config = {
          fooConfig1: 'fooValue',
          istanbulConfig2: 'foo'
        }
        return docker.run(suiteConfig, 'fooSuiteName')
          .then(() => {
            return test.expect(childProcessMock.stubs.execSync.getCall(0).args[1].env.coverage_options).to.equal('--include-all-sources --root=. --colors --print=summary --dir=.coverage/fooSuiteName/fooDockerSuite --fooConfig1=fooValue --istanbulConfig2=foo')
          })
      })

      test.it('should set an environment variable with the "wait_for" value for the test', () => {
        return docker.run(suiteConfig)
          .then(() => {
            return test.expect(childProcessMock.stubs.execSync.getCall(0).args[1].env.fooContainer3_wait_for).to.equal('fooService1:3000')
          })
      })

      test.it('should set an environment variable with a default value for "wait_for" if test has not it defined', () => {
        delete suiteConfig.test.docker['wait-for']
        return docker.run(suiteConfig)
          .then(() => {
            const envVars = childProcessMock.stubs.execSync.getCall(0).args[1].env
            return Promise.all([
              test.expect(envVars.fooContainer1_wait_for).to.equal(''),
              test.expect(envVars.fooContainer2_wait_for).to.equal(''),
              test.expect(envVars.fooContainer3_wait_for).to.equal('')
            ])
          })
      })

      test.it('should set an environment variable with "coverage_enabled" as true when a service is covered', () => {
        return docker.run(suiteConfig)
          .then(() => {
            const envVars = childProcessMock.stubs.execSync.getCall(0).args[1].env
            return Promise.all([
              test.expect(envVars.fooContainer1_coverage_enabled).to.be.true(),
              test.expect(envVars.fooContainer2_coverage_enabled).to.be.false(),
              test.expect(envVars.fooContainer3_coverage_enabled).to.be.false()
            ])
          })
      })

      test.it('should set an environment variable with "coverage_enabled" as empty string when service is not covered', () => {
        suiteConfig.coverage.from = 'fooService2'
        return docker.run(suiteConfig)
          .then(() => {
            const envVars = childProcessMock.stubs.execSync.getCall(0).args[1].env
            return Promise.all([
              test.expect(envVars.fooContainer1_coverage_enabled).to.be.false(),
              test.expect(envVars.fooContainer2_coverage_enabled).to.be.true(),
              test.expect(envVars.fooContainer3_coverage_enabled).to.be.false()
            ])
          })
      })

      test.it('should set an environment variable with the "exit_after" value for each service, setting the default if it is not defined', () => {
        const defaultExitAfter = 30000
        return docker.run(suiteConfig)
          .then(() => {
            const envVars = childProcessMock.stubs.execSync.getCall(0).args[1].env
            return Promise.all([
              test.expect(envVars.fooContainer1_exit_after).to.equal(10000),
              test.expect(envVars.fooContainer2_exit_after).to.equal(defaultExitAfter)
            ])
          })
      })

      test.it('should set the environment variable "exit_after" as an empty string for the tests', () => {
        return docker.run(suiteConfig)
          .then(() => {
            return test.expect(childProcessMock.stubs.execSync.getCall(0).args[1].env.fooContainer3_exit_after).to.equal('')
          })
      })

      test.it('should set the environment variable "exit_after" with the value 0 for docker containers that has not a service configured in the suite when one service is covered', () => {
        suiteConfig.services.pop()
        return docker.run(suiteConfig)
          .then(() => {
            const envVars = childProcessMock.stubs.execSync.getCall(0).args[1].env
            return test.expect(envVars.fooContainer2_exit_after).to.equal('0')
          })
      })
    })

    test.describe('when docker execution has finished', () => {
      test.it('should get the docker finish status of each service using command line', () => {
        return docker.run(suiteConfig)
          .then(() => {
            return test.expect(childProcessMock.stubs.execSync.getCall(1).args[0]).to.contain('docker inspect')
          })
      })

      test.it('should resolve the promise if all docker status are ok', () => {
        childProcessMock.stubs.execSync.returns('fooContainer1 status 0\\nfooContainer 2 status 137')
        return docker.run(suiteConfig)
          .then(() => {
            return test.expect(childProcessMock.stubs.execSync.getCall(1).args[0]).to.contain('docker inspect')
          })
      })

      test.it('should reject the promise if any docker status is an error', () => {
        const errorStatus = '153'
        childProcessMock.stubs.execSync.returns(`fooContainer1 status 0\nfooContainer 2 status ${errorStatus}`)
        return docker.run(suiteConfig)
          .then(() => {
            return Promise.reject(new Error())
          })
          .catch((error) => {
            return Promise.all([
              test.expect(Boom.isBoom(error)).to.be.true(),
              test.expect(error.message).to.contain('exited'),
              test.expect(error.message).to.contain(`status ${errorStatus}`)
            ])
          })
      })
    })
  })

  test.describe('downVolumes method', () => {
    test.beforeEach(() => {
      states.set('docker-executed', true)
    })

    test.it('should do nothing and resolve promise if docker has not been executed', () => {
      states.clean()
      return docker.downVolumes()
        .then(() => {
          return test.expect(childProcessMock.stubs.execSync).to.not.have.been.called()
        })
    })

    test.it('should execute docker down-volumes', () => {
      return docker.downVolumes()
        .then(() => {
          return test.expect(childProcessMock.stubs.execSync.getCall(0).args[0]).to.contain('down --volumes')
        })
    })

    test.it('should reject the promise if docker command fails', () => {
      childProcessMock.stubs.execSync.throws(new Error())
      return docker.downVolumes()
        .catch((error) => {
          return Promise.all([
            test.expect(Boom.isBoom(error)).to.be.true(),
            test.expect(error.message).to.contain('"down --volumes" failed')
          ])
        })
    })

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
  })

  test.describe.skip('createFiles method', () => {
    test.beforeEach(() => {
      pathsMock.stubs.package.readFile.usingPromise().resolves()
      pathsMock.stubs.cwd.ensureDir.usingPromise().resolves('')
      pathsMock.stubs.cwd.resolve.returns('')
      pathsMock.stubs.docker.returns('.narval/docker')
    })

    test.it('should return a promise', () => {
      return docker.createFiles()
        .then(() => {
          return test.expect(config.get).to.have.been.called()
        })
    })

    test.it('should create a DockerFile for each configured docker-image', () => {
      return docker.createFiles()
        .then(() => {
          return Promise.all([
            test.expect(pathsMock.stubs.cwd.writeFile).to.have.been.calledWith('.narval/docker/fooImage1/Dockerfile'),
            test.expect(pathsMock.stubs.cwd.writeFile).to.have.been.calledWith('.narval/docker/fooImage2/Dockerfile')
          ])
        })
    })

    test.it('should ensure that all needed docker image folders exists before creating the docker Image files', () => {
      return docker.createFiles()
        .then(() => {
          return Promise.all([
            test.expect(pathsMock.stubs.cwd.ensureDir).to.have.been.calledWith('.coverage'),
            test.expect(pathsMock.stubs.cwd.ensureDir).to.have.been.calledWith('.narval/docker/fooImage1'),
            test.expect(pathsMock.stubs.cwd.ensureDir).to.have.been.calledWith('.narval/docker/fooImage2')
          ])
        })
    })

    test.it('should copy resources from Narval to all docker images folders', () => {
      const fooPathToRead = 'fooPathToRead'
      const fooPathToWrite = 'fooPathToWrite'
      pathsMock.stubs.package.resolve.withArgs('lib', 'docker-resources').returns(fooPathToRead)
      pathsMock.stubs.cwd.resolve.withArgs('.narval/docker/fooImage1/docker-resources').returns(fooPathToWrite)
      return docker.createFiles()
        .then(() => {
          return Promise.all([
            test.expect(fsExtra.copy.getCall(0).args[0]).to.equal(fooPathToRead),
            test.expect(fsExtra.copy.getCall(0).args[1]).to.equal(fooPathToWrite)
          ])
        })
    })

    test.it('should copy all files to be added to an image to the correspondant docker image folder', () => {
      pathsMock.stubs.cwd.resolve.withArgs('foo-package.json').returns('1')
      pathsMock.stubs.cwd.resolve.withArgs('test/foo/package/testing.json').returns('2')
      pathsMock.stubs.cwd.resolve.withArgs('test/foo/folder').returns('3')
      return docker.createFiles()
        .then(() => {
          return Promise.all([
            test.expect(fsExtra.copy).to.have.been.calledWith('1'),
            test.expect(fsExtra.copy).to.have.been.calledWith('2'),
            test.expect(fsExtra.copy).to.have.been.calledWith('3')
          ])
        })
    })

    test.it('should copy the install script of a docker-image to the correspondant docker image folder', () => {
      pathsMock.stubs.cwd.resolve.withArgs('test/docker/install').returns('fooInstallPath')
      return docker.createFiles()
        .then(() => {
          return test.expect(fsExtra.copy).to.have.been.calledWith('fooInstallPath')
        })
    })

    test.it('should do things only first time it is called', () => {
      return docker.createFiles()
        .then(() => {
          return docker.createFiles()
            .then(() => {
              return test.expect(config.get).to.have.been.calledOnce()
            })
        })
    })

    test.describe('when creating docker-compose file', () => {
      test.it('should ensure that the docker folder exists', () => {
        return docker.createFiles()
          .then(() => {
            return Promise.all([
              test.expect(pathsMock.stubs.cwd.ensureDir).to.have.been.calledWith('.narval/docker')
            ])
          })
      })

      test.it('should add all needed configuration for each container', () => {
        return docker.createFiles()
          .then(() => {
            return Promise.all([
              test.expect(pathsMock.stubs.cwd.writeFile.getCall(0).args[1]).to.equal(JSON.stringify(fixtures.config.dockerConfigComposeResult, null, 2))
            ])
          })
      })

      test.it('should add all needed custom environment variables configuration for each container', () => {
        configuration.suitesByType[0].suites[0].before = {
          docker: {
            command: 'fooCommand',
            env: {
              fooVar: 'foo value for clean'
            }
          }
        }
        configuration.suitesByType[0].suites[0].test.docker.env = {
          fooVar: 'foo value for test'
        }

        config.get.resolves(configuration)
        return docker.createFiles()
          .then(() => {
            return Promise.all([
              test.expect(pathsMock.stubs.cwd.writeFile.getCall(0).args[1]).to.equal(JSON.stringify(fixtures.config.dockerConfigComposeResult, null, 2))
            ])
          })
      })

      test.it('should write the docker-compose file', () => {
        return docker.createFiles()
          .then(() => {
            return Promise.all([
              test.expect(pathsMock.stubs.cwd.writeFile).to.have.been.calledWith('.narval/docker/docker-compose.json')
            ])
          })
      })
    })
  })
})
