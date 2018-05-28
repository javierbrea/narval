
const Boom = require('boom')
const fsExtra = require('fs-extra')
const fs = require('fs')

const test = require('../../../index')
const mocks = require('../mocks')

const states = require('../../../lib/states')
const suiteDocker = require('../../../lib/suite-docker')

test.describe('suite-docker', () => {
  let sandbox
  let mocksSandbox

  test.beforeEach(() => {
    sandbox = test.sinon.sandbox.create()
    mocksSandbox = new mocks.Sandbox([
      'docker',
      'paths',
      'commands',
      'processes',
      'config',
      'logs'
    ])
    sandbox.stub(states, 'set')
    sandbox.stub(fs, 'writeFileSync')
    sandbox.stub(fsExtra, 'ensureDirSync')
  })

  test.afterEach(() => {
    sandbox.restore()
    mocksSandbox.restore()
  })

  test.describe('Runner constructor', () => {
    const fooContainer = 'foo-docker-container-service'
    const fooCommand = 'foo-command'
    const fooServiceName = 'foo-service'
    const fooSuiteName = 'foo name'
    const fooTypeName = 'foo type name'
    const fooLogsPath = 'foo-logs-path'
    const fooEnvVars = {
      fooEnv1: 'foo-val-1'
    }
    let runner
    let configMock
    let loggerMock

    const run = function () {
      runner = new suiteDocker.Runner(configMock, loggerMock)
      return runner.run(configMock, loggerMock)
    }

    test.beforeEach(() => {
      configMock = new mocksSandbox.config.stubs.SuiteResolver()
      loggerMock = new mocksSandbox.logs.stubs.SuiteLogger()

      mocksSandbox.paths.stubs.logs.returns(fooLogsPath)
      mocksSandbox.processes.stubs.Handler.on.returns({
        lastLog: 'code 0'
      })
      mocksSandbox.processes.stubs.Handler.on.runOnRegister(true)
      configMock.name.returns(fooSuiteName)
      configMock.typeName.returns(fooTypeName)
      configMock.dockerEnvVars.returns(fooEnvVars)
      configMock.testDockerContainer.returns('foo-docker-container')
      mocksSandbox.config.stubs.serviceResolver.command.returns(fooCommand)
      mocksSandbox.config.stubs.serviceResolver.name.returns(fooServiceName)
      mocksSandbox.config.stubs.serviceResolver.dockerContainer.returns(fooContainer)
      process.env.fooProcessEnv = 'foo process env'
    })

    test.afterEach(() => {
      delete process.env.fooProcessEnv
    })

    test.it('should set an state with docker-executed as true', () => {
      return run().then(() => {
        return test.expect(states.set).to.have.been.calledWith('docker-executed', true)
      })
    })

    test.it('should have cleaned all suite logs folder', () => {
      return run().then(() => {
        return test.expect(mocksSandbox.paths.stubs.cwd.cleanLogs).to.have.been.calledWith(fooTypeName, fooSuiteName)
      })
    })

    test.it('should have executed the before command, passing to it the config and the logger', () => {
      return run().then(() => {
        return test.expect(mocksSandbox.commands.stubs.runBefore).to.have.been.calledWith(configMock, loggerMock)
      })
    })

    test.it('should have executed docker down volumes if it is defined in config', () => {
      configMock.runDownVolumes.returns(true)
      return run().then(() => {
        return test.expect(mocksSandbox.docker.stubs.downVolumes).to.have.been.called()
      })
    })

    test.it('should have executed docker compose down', () => {
      return run().then(() => {
        return test.expect(mocksSandbox.commands.stubs.runComposeSync).to.have.been.calledWith('down', {
          env: fooEnvVars
        })
      })
    })

    test.it('should have executed docker compose up', () => {
      return run().then(() => {
        return test.expect(mocksSandbox.commands.stubs.runComposeSync).to.have.been.calledWith('up --no-start', {
          env: fooEnvVars
        })
      })
    })

    test.it('should have passed build option to docker if it is defined in config', () => {
      configMock.buildDocker.returns(true)
      return run().then(() => {
        return Promise.all([
          test.expect(states.set).to.have.been.calledWith('docker-built', true),
          test.expect(mocksSandbox.commands.stubs.runComposeSync).to.have.been.calledWith('up --no-start --build', {
            env: fooEnvVars
          })
        ])
      })
    })

    test.it('should reject the promise if no docker container is configured for test', () => {
      const fooErrorMessage = 'foo no test container error'
      configMock.testDockerContainer.returns(null)
      mocksSandbox.logs.stubs.suiteLogger.noDockerTestConfig.returns(fooErrorMessage)
      return run().then(() => {
        return Promise.reject(new Error())
      }).catch((err) => {
        return Promise.all([
          test.expect(Boom.isBoom(err)).to.be.true(),
          test.expect(err.message).to.equal(fooErrorMessage)
        ])
      })
    })

    test.it('should stop all docker containers when test finish', () => {
      configMock.services.returns([
        mocksSandbox.config.stubs.serviceResolver,
        mocksSandbox.config.stubs.serviceResolver,
        mocksSandbox.config.stubs.serviceResolver,
        mocksSandbox.config.stubs.serviceResolver,
        mocksSandbox.config.stubs.serviceResolver,
        mocksSandbox.config.stubs.serviceResolver,
        mocksSandbox.config.stubs.serviceResolver,
        mocksSandbox.config.stubs.serviceResolver,
        mocksSandbox.config.stubs.serviceResolver,
        mocksSandbox.config.stubs.serviceResolver
      ])
      return run().then(() => {
        return Promise.all([
          test.expect(mocksSandbox.logs.stubs.suiteLogger.dockerServicesStillRunning.callCount).to.equal(9),
          test.expect(mocksSandbox.logs.stubs.suiteLogger.dockerServiceStillRunning.callCount).to.equal(1),
          test.expect(mocksSandbox.logs.stubs.suiteLogger.stopAllDockerServices).to.have.been.called(),
          test.expect(mocksSandbox.logs.stubs.suiteLogger.stopDockerService).to.have.been.called(10),
          test.expect(mocksSandbox.commands.stubs.runComposeSync).to.have.been.calledWith(`stop ${fooContainer}`, {
            env: fooEnvVars
          })
        ])
      })
    })

    test.describe('when running a service or test', () => {
      test.it('should print a log and resolve promise if the service has not configured a container for docker', () => {
        mocksSandbox.config.stubs.serviceResolver.dockerContainer.returns(null)
        return run().then(() => {
          return test.expect(mocksSandbox.logs.stubs.suiteLogger.noDockerServiceConfig).to.have.been.calledWith({
            service: fooServiceName
          })
        })
      })

      test.it('should print a log when starts container', () => {
        return run().then(() => {
          return test.expect(mocksSandbox.logs.stubs.suiteLogger.startDockerService).to.have.been.calledWith({
            service: fooServiceName
          })
        })
      })

      test.it('should have executed docker compose start', () => {
        return run().then(() => {
          return test.expect(mocksSandbox.commands.stubs.runComposeSync).to.have.been.calledWith(`start ${fooContainer}`, {
            env: fooEnvVars
          })
        })
      })

      test.it('should open an spawn child process for listening to the docker process logs', () => {
        return run().then(() => {
          const processArgs = mocksSandbox.processes.stubs.spawn.getCall(0).args
          return Promise.all([
            test.expect(processArgs[0]).to.equal('docker-compose'),
            test.expect(processArgs[1].args[2]).to.equal('logs'),
            test.expect(processArgs[1].args[processArgs[1].args.length - 1]).to.equal(fooContainer),
            test.expect(processArgs[1].options.env).to.equal(fooEnvVars)
          ])
        })
      })

      test.it('should write a log file with the process finish code', () => {
        return run().then(() => {
          const writeArgs = fs.writeFileSync.getCall(0).args
          return Promise.all([
            test.expect(writeArgs[0]).to.contain(fooLogsPath),
            test.expect(writeArgs[0]).to.contain('exit-code.log'),
            test.expect(writeArgs[0]).to.contain(fooTypeName),
            test.expect(writeArgs[0]).to.contain(fooSuiteName),
            test.expect(writeArgs[0]).to.contain(fooServiceName),
            test.expect(writeArgs[1]).to.equal('0')
          ])
        })
      })

      test.it('should print a log with the process finish code', () => {
        return run().then(() => {
          const logArgs = mocksSandbox.logs.stubs.suiteLogger.dockerExitCode.getCall(0).args[0]
          return Promise.all([
            test.expect(logArgs.container).to.equal(fooContainer),
            test.expect(logArgs.service).to.equal(fooServiceName),
            test.expect(logArgs.exitCode).to.equal('0')
          ])
        })
      })

      test.it('should print log with warn level if process finished with code different to 0', () => {
        mocksSandbox.processes.stubs.Handler.on.returns({
          lastLog: 'code 1'
        })
        return run().then(() => {
          return Promise.reject(new Error())
        }).catch(() => {
          return test.expect(mocksSandbox.logs.stubs.suiteLogger.dockerExitCode.getCall(0).args[1]).to.equal('warn')
        })
      })

      test.it('should consider a docker process as failed if last log does not match with "code x"', () => {
        mocksSandbox.processes.stubs.Handler.on.returns({
          lastLog: 'foo'
        })
        return run().then(() => {
          return Promise.reject(new Error())
        }).catch(() => {
          return test.expect(mocksSandbox.logs.stubs.suiteLogger.dockerExitCode.getCall(0).args[1]).to.equal('warn')
        })
      })
    })
  })
})
