
const fsExtra = require('fs-extra')
const path = require('path')

const test = require('../../../index')
const mocks = require('../mocks')

const processes = require('../../../lib/processes')

test.describe('processes', () => {
  let sandbox
  let mocksSandbox
  let childProcessMock

  test.beforeEach(() => {
    sandbox = test.sinon.sandbox.create()
    sandbox.spy(console, 'log')
    mocksSandbox = new mocks.Sandbox([
      'paths',
      'tracer',
      'logs',
      'libs',
      'fs'
    ])
    childProcessMock = new mocks.ChildProcess()
    childProcessMock.stubs.fork.on.returns(0)
    sandbox.stub(fsExtra, 'remove').usingPromise().resolves()
  })

  test.afterEach(() => {
    sandbox.restore()
    mocksSandbox.restore()
    childProcessMock.restore()
  })

  const testChildProcessMethod = function (method) {
    test.describe(`${method} method`, () => {
      const fooPath = 'fooPath/fooFile.js'

      test.it('should return a promise', () => {
        return processes[method]()
          .then(() => {
            return test.expect(true).to.be.true()
          })
      })

      test.it(`should ${method} a child process with the received filePath`, () => {
        return processes[method](fooPath)
          .then(() => {
            return test.expect(childProcessMock.stubs[method].getCall(0).args[0]).to.equal(fooPath)
          })
      })

      test.it('should pass the received arguments to the child process', () => {
        const fooArgs = ['fooArg1', 'fooArg2']
        return processes[method](fooPath, {
          args: fooArgs
        }).then(() => {
          return test.expect(childProcessMock.stubs[method].getCall(0).args[1]).to.deep.equal(fooArgs)
        })
      })

      test.it('should pass an empty as arguments to the child process if no args is received in config', () => {
        return processes[method](fooPath)
          .then(() => {
            return test.expect(childProcessMock.stubs[method].getCall(0).args[1]).to.deep.equal([])
          })
      })

      test.it('should pass the received options to the child process, adding the cwd path', () => {
        const fooCwdPath = 'fooCwdPath/testing'
        const fooOptions = {
          env: {
            fooEnv: 'testing'
          }
        }
        mocksSandbox.paths.stubs.cwd.base.returns(fooCwdPath)
        return processes[method](fooPath, {
          options: fooOptions
        }).then(() => {
          return test.expect(childProcessMock.stubs[method].getCall(0).args[2]).to.deep.equal({
            cwd: fooCwdPath,
            env: {
              fooEnv: fooOptions.env.fooEnv
            }
          })
        })
      })

      test.describe('when it is configured to resolve the promise on process close', () => {
        test.it('should resolve the promise with the received exit code', () => {
          const fooExitCode = 345
          childProcessMock.stubs[method].on.returns(fooExitCode)
          return processes[method](fooPath, {
            resolveOnClose: true
          })
            .then((code) => {
              return test.expect(code).to.equal(fooExitCode)
            })
        })
      })

      test.describe('when it is not configured to resolve the promise on process close', () => {
        test.it('should resolve the promise with the opened child process', () => {
          return processes[method](fooPath)
            .then((childProcess) => {
              return Promise.all([
                test.expect(typeof childProcess.on).to.equal('function'),
                method === 'fork' ? test.expect(typeof childProcess.send).to.equal('function') : test.expect(childProcess.send).to.be.undefined()
              ])
            })
        })
      })
    })
  }

  testChildProcessMethod('fork')
  testChildProcessMethod('spawn')

  test.describe('execSync method', () => {
    test.it('should open an execSync child process with the received command and options', () => {
      const fooCommand = 'foo sync command'
      const fooOptions = {
        fooOption1: 'foo val',
        fooOption2: true
      }
      processes.execSync(fooCommand, fooOptions)
      test.expect(childProcessMock.stubs.execSync.getCall(0).args[0]).to.equal(fooCommand)
      test.expect(childProcessMock.stubs.execSync.getCall(0).args[1]).to.equal(fooOptions)
    })
  })

  test.describe('Handler constructor', () => {
    const fooLogsFolder = 'fooFolder'
    const fooOutFile = path.join(fooLogsFolder, 'out.log')
    const fooErrFile = path.join(fooLogsFolder, 'err.log')
    const fooCombinedFile = path.join(fooLogsFolder, 'combined-outerr.log')
    const fooCloseFile = path.join(fooLogsFolder, 'exit-code.log')
    const fooData = 'foo data'
    const fooSuiteData = {
      type: 'fooType',
      suite: 'fooSuite',
      service: 'fooService'
    }
    let fooProcess
    let handler
    test.beforeEach(() => {
      fooProcess = childProcessMock.stubs.spawn()
      mocksSandbox.paths.stubs.cwd.resolve.returns(fooLogsFolder)
    })

    test.it('should return an event bus', () => {
      handler = new processes.Handler(fooProcess, fooSuiteData)
      test.expect(handler.on).to.not.be.undefined()
    })

    test.it('should ensure that logs folder exists', (done) => {
      handler = new processes.Handler(fooProcess, fooSuiteData)
      handler.on('close', () => {
        test.expect(mocksSandbox.paths.stubs.cwd.ensureDir).to.have.been.calledWith(fooLogsFolder)
        done()
      })
    })

    test.it('should delete previous logs files', (done) => {
      handler = new processes.Handler(fooProcess, fooSuiteData)
      handler.on('close', () => {
        test.expect(fsExtra.remove).to.have.been.calledWith(fooOutFile)
        test.expect(fsExtra.remove).to.have.been.calledWith(fooErrFile)
        test.expect(fsExtra.remove).to.have.been.calledWith(fooCombinedFile)
        done()
      })
    })

    test.it('should have opened new logs files', (done) => {
      handler = new processes.Handler(fooProcess, fooSuiteData)
      handler.on('close', () => {
        test.expect(mocksSandbox.fs.stubs.open).to.have.been.calledWith(fooOutFile)
        test.expect(mocksSandbox.fs.stubs.open).to.have.been.calledWith(fooErrFile)
        test.expect(mocksSandbox.fs.stubs.open).to.have.been.calledWith(fooCombinedFile)
        done()
      })
    })

    test.it('should write the process output aplying a trim function', (done) => {
      childProcessMock.stubs.spawn.stdout.on.returns(`  ${fooData}`)
      handler = new processes.Handler(fooProcess, fooSuiteData)
      handler.on('close', () => {
        test.expect(console.log).to.have.been.calledWith(fooData)
        test.expect(mocksSandbox.fs.stubs.appendFile.getCall(0).args[1]).to.contain(fooData)
        done()
      })
    })

    test.it('should write a file with the end code if the option close is received', function (done) {
      this.timeout(5000)
      childProcessMock.stubs.spawn.on.runOnRegister(false)
      handler = new processes.Handler(fooProcess, fooSuiteData, {
        close: true
      })

      setTimeout(() => {
        childProcessMock.stubs.spawn.stderr.on.run(fooData)
        childProcessMock.stubs.spawn.stdout.on.run(fooData)
        childProcessMock.stubs.spawn.on.run(0)
      }, 200)

      handler.on('close', (data) => {
        test.expect(data.lastLog).to.equal(fooData)
        test.expect(data.processCode).to.equal(0)
        test.expect(console.log).to.have.been.calledWith(fooData)
        test.expect(fsExtra.remove).to.have.been.calledWith(fooCloseFile)
        test.expect(mocksSandbox.fs.stubs.writeFileSync.getCall(0).args[1]).to.equal(0)
        done()
      })
    })

    test.it('should work even when process has finished before preparing files', function (done) {
      const fooError = 'foo error'
      childProcessMock.stubs.spawn.stderr.on.runOnRegister(true)
      childProcessMock.stubs.spawn.stderr.on.returns(`  ${fooError}`)
      childProcessMock.stubs.spawn.stdout.on.returns(`  ${fooData}`)
      childProcessMock.stubs.spawn.on.runOnRegister(true)
      handler = new processes.Handler(fooProcess, fooSuiteData, {
        close: true
      })
      handler.on('close', (data) => {
        test.expect(data.lastLog).to.equal(fooError)
        test.expect(data.processCode).to.equal(0)
        test.expect(console.log).to.have.been.calledWith(fooData)
        test.expect(console.log).to.have.been.calledWith(fooError)
        test.expect(fsExtra.remove).to.have.been.calledWith(fooCloseFile)
        test.expect(mocksSandbox.fs.stubs.writeFileSync.getCall(0).args[1]).to.equal(0)
        done()
      })
    })

    test.it('should write the process error aplying a trim function', (done) => {
      const fooErrorData = 'foo error data'
      childProcessMock.stubs.spawn.stderr.on.returns(`  ${fooErrorData}   `)
      childProcessMock.stubs.spawn.stderr.on.runOnRegister(true)
      handler = new processes.Handler(fooProcess, fooSuiteData)
      handler.on('close', () => {
        test.expect(console.log).to.have.been.calledWith(fooErrorData)
        test.expect(mocksSandbox.fs.stubs.appendFile.getCall(0).args[1]).to.contain(fooErrorData)
        done()
      })
    })

    test.it('should not log empty data received from the process execution', (done) => {
      childProcessMock.stubs.spawn.stdout.on.returns('   ')
      handler = new processes.Handler(fooProcess, fooSuiteData)
      handler.on('close', () => {
        test.expect(console.log).to.not.have.been.called()
        test.expect(mocksSandbox.fs.stubs.appendFile).to.not.have.been.called()
        done()
      })
    })

    test.it('should print logs and emit an error event when an error occurs preparing log files', (done) => {
      const error = new Error('Foo open file error')
      mocksSandbox.fs.stubs.open.returns(error)
      handler = new processes.Handler(fooProcess, fooSuiteData)
      handler.on('error', (err) => {
        test.expect(mocksSandbox.logs.stubs.writeLogsError).to.have.been.called.with(fooSuiteData)
        test.expect(mocksSandbox.tracer.stubs.error).to.have.been.called.with(error)
        test.expect(err).to.equal(error)
        done()
      })
    })

    test.it('should kill process if it is still opened when an error occurs preparing log files', (done) => {
      mocksSandbox.fs.stubs.open.returns(new Error())
      childProcessMock.stubs.spawn.on.runOnRegister(false)
      handler = new processes.Handler(fooProcess, fooSuiteData)
      handler.on('error', () => {
        test.expect(mocksSandbox.libs.stubs.treeKill).to.have.been.called()
        done()
      })
    })

    test.it('should emit a close event when an error occurs preparing log files', (done) => {
      const error = new Error('Foo open file error')
      mocksSandbox.fs.stubs.open.returns(error)
      childProcessMock.stubs.spawn.on.runOnRegister(false)
      handler = new processes.Handler(fooProcess, fooSuiteData)
      handler.on('error', () => {
        test.expect(mocksSandbox.logs.stubs.writeLogsError).to.have.been.called.with(fooSuiteData)
        test.expect(mocksSandbox.tracer.stubs.error).to.have.been.called.with(error)
        test.expect(mocksSandbox.libs.stubs.treeKill).to.have.been.called()
        childProcessMock.stubs.spawn.on.run(1)
      })
      handler.on('close', (data) => {
        test.expect(mocksSandbox.libs.stubs.treeKill).to.have.been.calledOnce()
        test.expect(data.error).to.equal(error)
        done()
      })
    })

    test.it('should emit an error event and a close event when an error occurs writing log files', (done) => {
      const error = new Error('Foo write file error')
      const closeCode = 35789
      childProcessMock.stubs.spawn.on.runOnRegister(false)
      childProcessMock.stubs.spawn.stdout.on.runOnRegister(false)
      mocksSandbox.fs.stubs.appendFile.returns(error)
      handler = new processes.Handler(fooProcess, fooSuiteData)

      setTimeout(() => {
        childProcessMock.stubs.spawn.stdout.on.run(fooData)
      }, 200)

      handler.on('error', (err) => {
        test.expect(mocksSandbox.logs.stubs.writeLogsError).to.have.been.called.with(fooSuiteData)
        test.expect(mocksSandbox.tracer.stubs.error).to.have.been.called.with(error)
        test.expect(err).to.equal(error)
        test.expect(mocksSandbox.libs.stubs.treeKill).to.have.been.calledOnce()
        childProcessMock.stubs.spawn.on.run(closeCode)
      })
      handler.on('close', (data) => {
        test.expect(mocksSandbox.libs.stubs.treeKill).to.have.been.calledOnce()
        test.expect(data.processCode).to.equal(closeCode)
        done()
      })
    })

    test.it('should emit an error event when an error occurs closing log files, and should not kill process, because it was already closed', (done) => {
      const error = new Error('Foo close file error')
      let errorExecuted = false
      childProcessMock.stubs.spawn.on.runOnRegister(false)
      mocksSandbox.fs.stubs.close.returns(error)
      handler = new processes.Handler(fooProcess, fooSuiteData)

      setTimeout(() => {
        childProcessMock.stubs.spawn.on.run(0)
      }, 200)

      handler.on('error', (err) => {
        errorExecuted = true
        test.expect(mocksSandbox.logs.stubs.writeLogsError).to.have.been.called.with(fooSuiteData)
        test.expect(mocksSandbox.tracer.stubs.error).to.have.been.called.with(error)
        test.expect(err).to.equal(error)
      })

      handler.on('close', () => {
        test.expect(errorExecuted).to.be.true()
        test.expect(mocksSandbox.libs.stubs.treeKill).to.not.have.been.called()
        done()
      })
    })

    test.it('should emit an error event when an error occurs writing the exit-code file, and should not kill process, because it was already closed', (done) => {
      const error = new Error('Foo close file error')
      let errorExecuted = false
      childProcessMock.stubs.spawn.on.runOnRegister(false)
      mocksSandbox.fs.stubs.writeFileSync.throws(error)
      handler = new processes.Handler(fooProcess, fooSuiteData, {
        close: true
      })

      setTimeout(() => {
        childProcessMock.stubs.spawn.on.run(0)
      }, 200)

      handler.on('error', (err) => {
        errorExecuted = true
        test.expect(mocksSandbox.logs.stubs.writeLogsError).to.have.been.called.with(fooSuiteData)
        test.expect(mocksSandbox.tracer.stubs.error).to.have.been.called.with(error)
        test.expect(err).to.equal(error)
      })

      handler.on('close', () => {
        test.expect(errorExecuted).to.be.true()
        test.expect(mocksSandbox.libs.stubs.treeKill).to.not.have.been.called()
        done()
      })
    })
  })
})
