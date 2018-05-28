
const path = require('path')

const fsExtra = require('fs-extra')
const Bluebird = require('bluebird')

const test = require('../../../index')
const mocks = require('../mocks')

const paths = require('../../../lib/paths')

test.describe('paths', () => {
  let resolveSpy
  let fsMock

  test.beforeEach(() => {
    resolveSpy = test.sinon.spy(path, 'resolve')
    fsMock = new mocks.Fs()
  })

  test.afterEach(() => {
    resolveSpy.restore()
    fsMock.restore()
  })

  const testRelativePathUtils = function (utilName, basePath, baseDescription) {
    test.describe(utilName, () => {
      test.describe('base method', () => {
        test.it(`should return the base ${baseDescription}`, () => {
          const fooPath = path.resolve(basePath)
          return test.expect(paths[utilName].base()).to.equal(fooPath)
        })
      })

      test.describe('ensureDir method', () => {
        let ensureDirStub

        test.beforeEach(() => {
          ensureDirStub = test.sinon.stub(fsExtra, 'ensureDir').usingPromise().resolves()
        })

        test.afterEach(() => {
          fsExtra.ensureDir.restore()
        })

        test.it('should return a Promise', () => {
          return test.expect(paths[utilName].ensureDir('fooPath')).to.be.an.instanceof(Promise)
        })

        test.it(`should ensure that a relative path exists, taking as base ${baseDescription}`, () => {
          const fooPath = path.resolve(basePath, 'fooPath', 'fooSubPath')
          return paths[utilName].ensureDir('fooPath', 'fooSubPath')
            .then(() => {
              return test.expect(ensureDirStub).to.have.been.calledWith(fooPath)
            })
        })

        test.it('should resolve the promise with the absolute path', () => {
          const fooTargetPath = 'fooPath2'
          const fooPath = path.resolve(basePath, fooTargetPath)
          return paths[utilName].ensureDir(fooTargetPath)
            .then(result => {
              return test.expect(result).to.equal(fooPath)
            })
        })
      })

      test.describe('remove method', () => {
        let removeStub

        test.beforeEach(() => {
          removeStub = test.sinon.stub(fsExtra, 'remove').usingPromise().resolves()
        })

        test.afterEach(() => {
          fsExtra.remove.restore()
        })

        test.it('should return a Promise', () => {
          return test.expect(paths[utilName].remove('fooPath')).to.be.an.instanceof(Promise)
        })

        test.it(`should remove the path, taking as base ${baseDescription}`, () => {
          const fooPath = path.resolve(basePath, 'fooPath', 'fooSubPath')
          return paths[utilName].remove('fooPath', 'fooSubPath')
            .then(() => {
              return test.expect(removeStub).to.have.been.calledWith(fooPath)
            })
        })
      })

      test.describe('existsSync method', () => {
        test.it(`should return true if a path exists, taking as base ${baseDescription}`, () => {
          return test.expect(paths[utilName].existsSync('test')).to.equal(true)
        })

        test.it(`should return false if a path does not exists, taking as base ${baseDescription}`, () => {
          return test.expect(paths[utilName].existsSync('fooPath')).to.equal(false)
        })
      })

      test.describe('readFile method', () => {
        test.it('should return a bluebird Promise', () => {
          return test.expect(paths[utilName].readFile('fooPath')).to.be.an.instanceof(Bluebird)
        })

        test.it(`should call to read file, passing to it the resolved path, taking as base ${baseDescription}`, () => {
          const fooTargetPath = 'fooFile'
          const fooResolvedPath = path.resolve(basePath, fooTargetPath)
          return paths[utilName].readFile(fooTargetPath)
            .then(() => {
              return test.expect(fsMock.stubs.readFile.getCall(0).args[0]).to.equal(fooResolvedPath)
            })
        })

        test.it(`should resolve the promise with the data that read file function returns`, () => {
          const fooContent = 'fooFileContent'
          fsMock.stubs.readFile.returns(null, fooContent)
          return paths[utilName].readFile('fooFile')
            .then((result) => {
              return test.expect(result).to.equal(fooContent)
            })
        })

        test.it(`should reject the promise if read file function returns and error`, () => {
          const error = new Error('fooError')
          fsMock.stubs.readFile.returns(error)
          return paths[utilName].readFile('fooFile')
            .catch((err) => {
              return test.expect(err).to.deep.equal(error)
            })
        })
      })

      test.describe('writeFile method', () => {
        test.it('should return a bluebird Promise', () => {
          return test.expect(paths[utilName].writeFile('fooFile')).to.be.an.instanceof(Bluebird)
        })

        test.it(`should call to write file, passing to it the resolved path, taking as base ${baseDescription}`, () => {
          const fooTargetPath = 'fooFile'
          const fooContent = 'fooContent'
          const fooResolvedPath = path.resolve(basePath, fooTargetPath)
          return paths[utilName].writeFile(fooTargetPath, fooContent)
            .then(() => {
              return Promise.all([
                test.expect(fsMock.stubs.writeFile.getCall(0).args[0]).to.equal(fooResolvedPath),
                test.expect(fsMock.stubs.writeFile.getCall(0).args[1]).to.equal(fooContent)
              ])
            })
        })

        test.it(`should resolve the promise with the data that write file function returns`, () => {
          const fooContent = 'fooFileContent'
          fsMock.stubs.writeFile.returns(null, fooContent)
          return paths[utilName].writeFile('fooFile', fooContent)
            .then((result) => {
              return test.expect(result).to.equal(fooContent)
            })
        })

        test.it(`should reject the promise if write file function returns and error`, () => {
          const error = new Error('fooWriteError')
          fsMock.stubs.writeFile.returns(error)
          return paths[utilName].writeFile('fooFile')
            .catch((err) => {
              return test.expect(err).to.deep.equal(error)
            })
        })
      })
    })
  }

  testRelativePathUtils('cwd', process.cwd(), 'the process current working directory')
  testRelativePathUtils('package', path.resolve(__dirname, '..', '..', '..'), 'the process current working directory')

  test.describe('cwd.cleanLogs method', () => {
    let ensureDirStub
    let removeStub

    test.beforeEach(() => {
      ensureDirStub = test.sinon.stub(fsExtra, 'ensureDir').usingPromise().resolves()
      removeStub = test.sinon.stub(fsExtra, 'remove').usingPromise().resolves()
    })

    test.afterEach(() => {
      fsExtra.ensureDir.restore()
      fsExtra.remove.restore()
    })

    test.it('should call to remove and then ensure the provided path, resolving it with under logs path', () => {
      const fooPath = path.resolve(process.cwd(), '.narval', 'logs', 'fooPath', 'fooSubPath')
      return paths.cwd.cleanLogs('fooPath', 'fooSubPath')
        .then(() => {
          return Promise.all([
            test.expect(removeStub).to.have.been.calledWith(fooPath),
            test.expect(ensureDirStub).to.have.been.calledWith(fooPath)
          ])
        })
    })
  })

  test.describe('logs method', () => {
    test.it('should return the absolute path to the the narval logs folder in the current working directory path', () => {
      const logsFolderPath = path.resolve(process.cwd(), '.narval', 'logs')
      return test.expect(paths.logs()).to.equal(logsFolderPath)
    })
  })

  test.describe('defaultConfig method', () => {
    test.it('should return the absolute path to the default configuration file, located in this package', () => {
      const defaultConfigPath = path.resolve(__dirname, '..', '..', '..', 'default-config.yml')
      return test.expect(paths.defaultConfig()).to.equal(defaultConfigPath)
    })
  })

  test.describe('customConfig method', () => {
    test.it('should return the absolute path to the configuration file found in the current working directory path', () => {
      const customConfigPath = path.resolve(process.cwd(), '.narval.yml')
      return test.expect(paths.customConfig()).to.equal(customConfigPath)
    })
  })

  test.describe('docker method', () => {
    test.it('should return the absolute path to the path where all docker files has to be written', () => {
      const dockerPath = path.resolve(process.cwd(), '.narval', 'docker')
      return test.expect(paths.docker()).to.equal(dockerPath)
    })
  })

  test.describe('findDependencyFile method', () => {
    test.it('should find and return the absolute path to the provided file path in "node_modules/" self or parents folders', () => {
      const standardPath = path.resolve(__dirname, '..', '..', '..', 'node_modules', 'standard', 'bin', 'cmd.js')
      return test.expect(paths.findDependencyFile(['standard', 'bin', 'cmd.js'])).to.equal(standardPath)
    })

    test.it('should return the path to "node_modules/" if no subpath to be search is provided', () => {
      const nodeModulesPath = path.resolve(__dirname, '..', '..', '..', 'node_modules')
      return test.expect(paths.findDependencyFile()).to.equal(nodeModulesPath)
    })

    test.it('should throw an error if does not find the file path', () => {
      let error
      try {
        paths.findDependencyFile('fooStandard')
      } catch (err) {
        error = err
      }
      test.expect(error).to.be.an('error')
      test.expect(error.message).to.have.string('not found in dependencies')
    })

    test.it('should search the file in a maximum of five parent node_modules folders', () => {
      try {
        paths.findDependencyFile('fooStandard2')
      } catch (err) {
        test.expect(resolveSpy.callCount).to.equal(5)
      }
    })
  })
})
