
const fsExtra = require('fs-extra')
const handlebars = require('handlebars')

const test = require('../../../index')
const mocks = require('../mocks')
const fixtures = require('../fixtures')

const docker = require('../../../lib/docker')
const states = require('../../../lib/states')

test.describe('docker', () => {
  let sandbox
  let mocksSandbox

  test.beforeEach(() => {
    sandbox = test.sinon.sandbox.create()
    mocksSandbox = new mocks.Sandbox([
      'paths',
      'config',
      'utils',
      'commands'
    ])
    sandbox.stub(fsExtra, 'copy').usingPromise().resolves()
    sandbox.stub(handlebars, 'compile').returns(sandbox.stub())
  })

  test.afterEach(() => {
    sandbox.restore()
    mocksSandbox.restore()
    states.clean()
  })

  test.describe('downVolumes method', () => {
    test.beforeEach(() => {
      states.set('docker-executed', true)
    })

    test.it('should do nothing and resolve promise if docker has not been executed', () => {
      states.clean()
      return docker.downVolumes()
        .then(() => {
          return test.expect(mocksSandbox.commands.stubs.runComposeSync).to.not.have.been.called()
        })
    })

    test.it('should execute docker down-volumes', () => {
      return docker.downVolumes()
        .then(() => {
          return test.expect(mocksSandbox.commands.stubs.runComposeSync).to.have.been.calledWith('down --volumes')
        })
    })

    test.it('should pass to command execution the compose environment variables from config', () => {
      const fooEnvVars = {
        fooVar1: 'foo val',
        fooEnv2: 'val 2'
      }
      mocksSandbox.config.stubs.allComposeEnvVars.resolves(fooEnvVars)
      return docker.downVolumes()
        .then(() => {
          const commandArgs = mocksSandbox.commands.stubs.runComposeSync.getCall(0).args
          return Promise.all([
            test.expect(commandArgs[0]).to.equal('down --volumes'),
            test.expect(commandArgs[1].env).to.deep.equal(fooEnvVars)
          ])
        })
    })
  })

  test.describe('createFiles method', () => {
    test.beforeEach(() => {
      mocksSandbox.config.stubs.dockerContainers.resolves(fixtures.config.dockerConfig.dockerContainers)
      mocksSandbox.config.stubs.dockerImages.resolves(fixtures.config.dockerConfig.dockerImages)
      mocksSandbox.paths.stubs.package.readFile.usingPromise().resolves()
      mocksSandbox.paths.stubs.cwd.ensureDir.usingPromise().resolves('')
      mocksSandbox.paths.stubs.cwd.resolve.returns('')
      mocksSandbox.paths.stubs.docker.returns('.narval/docker')
    })

    test.it('should return a promise', () => {
      return docker.createFiles()
        .then(() => {
          return test.expect(mocksSandbox.config.stubs.dockerContainers).to.have.been.called()
        })
    })

    test.it('should create a DockerFile for each configured docker-image', () => {
      return docker.createFiles()
        .then(() => {
          return Promise.all([
            test.expect(mocksSandbox.paths.stubs.cwd.writeFile).to.have.been.calledWith('.narval/docker/fooImage1/Dockerfile'),
            test.expect(mocksSandbox.paths.stubs.cwd.writeFile).to.have.been.calledWith('.narval/docker/fooImage2/Dockerfile')
          ])
        })
    })

    test.it('should ensure that all needed docker image folders exists before creating the docker Image files', () => {
      return docker.createFiles()
        .then(() => {
          return Promise.all([
            test.expect(mocksSandbox.paths.stubs.cwd.ensureDir).to.have.been.calledWith('.coverage'),
            test.expect(mocksSandbox.paths.stubs.cwd.ensureDir).to.have.been.calledWith('.narval/docker/fooImage1/docker-resources/.narval/scripts'),
            test.expect(mocksSandbox.paths.stubs.cwd.ensureDir).to.have.been.calledWith('.narval/docker/fooImage2/docker-resources/.narval/scripts')
          ])
        })
    })

    test.it('should copy resources from Narval to all docker images folders', () => {
      const fooPathToRead = 'fooPathToRead'
      const fooPathToWrite = 'fooPathToWrite'
      mocksSandbox.paths.stubs.package.resolve.withArgs('lib', 'docker-resources').returns(fooPathToRead)
      mocksSandbox.paths.stubs.cwd.resolve.withArgs('.narval/docker/fooImage1/docker-resources').returns(fooPathToWrite)
      return docker.createFiles()
        .then(() => {
          return Promise.all([
            test.expect(fsExtra.copy.getCall(0).args[0]).to.equal(fooPathToRead),
            test.expect(fsExtra.copy.getCall(0).args[1]).to.equal(fooPathToWrite)
          ])
        })
    })

    test.it('should copy all files to be added to an image to the correspondant docker image folder', () => {
      mocksSandbox.paths.stubs.cwd.resolve.withArgs('foo-package.json').returns('1')
      mocksSandbox.paths.stubs.cwd.resolve.withArgs('test/foo/package/testing.json').returns('2')
      mocksSandbox.paths.stubs.cwd.resolve.withArgs('test/foo/folder').returns('3')
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
      mocksSandbox.paths.stubs.cwd.resolve.withArgs('test/docker/install').returns('fooInstallPath')
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
              return test.expect(mocksSandbox.config.stubs.dockerContainers).to.have.been.calledOnce()
            })
        })
    })

    test.describe('when creating docker-compose file', () => {
      test.it('should ensure that the docker folder exists', () => {
        return docker.createFiles()
          .then(() => {
            return Promise.all([
              test.expect(mocksSandbox.paths.stubs.cwd.ensureDir).to.have.been.calledWith('.narval/docker')
            ])
          })
      })

      test.it('should add all needed configuration for each container, including custom environment variables', () => {
        mocksSandbox.utils.stubs.serviceNameToVarName.withArgs('fooContainer1').returns('fooContainer1')
        mocksSandbox.utils.stubs.serviceNameToVarName.withArgs('fooContainer2').returns('fooContainer2')
        mocksSandbox.utils.stubs.serviceNameToVarName.withArgs('fooContainer3').returns('fooContainer3')

        mocksSandbox.config.stubs.allDockerCustomEnvVars.resolves(['fooVar'])

        return docker.createFiles()
          .then(() => {
            return Promise.all([
              test.expect(mocksSandbox.paths.stubs.cwd.writeFile.getCall(0).args[1]).to.equal(JSON.stringify(fixtures.config.dockerConfigComposeResult, null, 2))
            ])
          })
      })

      test.it('should write the docker-compose file', () => {
        return docker.createFiles()
          .then(() => {
            return Promise.all([
              test.expect(mocksSandbox.paths.stubs.cwd.writeFile).to.have.been.calledWith('.narval/docker/docker-compose.json')
            ])
          })
      })
    })
  })
})
