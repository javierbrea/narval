
const fsExtra = require('fs-extra')

const test = require('../../../index')
const mocks = require('../mocks')

const processes = require('../../../lib/processes')

test.describe('processes', () => {
  let sandbox
  let mocksSandbox
  let childProcessMock
  let fsMock

  test.beforeEach(() => {
    sandbox = test.sinon.sandbox.create()
    sandbox.spy(console, 'log')
    mocksSandbox = new mocks.Sandbox([
      'paths',
      'tracer',
      'logs'
    ])
    childProcessMock = new mocks.ChildProcess()
    childProcessMock.stubs.fork.on.returns(0)
    fsMock = new mocks.Fs()
    sandbox.stub(fsExtra, 'remove').usingPromise().resolves()
  })

  test.afterEach(() => {
    sandbox.restore()
    mocksSandbox.restore()
    childProcessMock.restore()
    fsMock.restore()
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
    const fooSuiteData = {
      type: 'fooType',
      suite: 'fooSuite',
      service: 'fooService'
    }
    let fooProcess
    test.beforeEach(() => {
      fooProcess = childProcessMock.stubs.spawn()
      mocksSandbox.paths.stubs.cwd.resolve.returns('fooFolder')
    })

    test.it('should return an event bus', () => {
      test.expect(new processes.Handler(fooProcess, fooSuiteData).on).to.not.be.undefined()
    })
  })
})

/* test.describe('when logging data from the child process', () => {
      const option = {
        sync: true
      }
      test.beforeEach(() => {
        childProcessMock.stubs.spawn.stdout.on.runOnRegister(true)
      })

      test.it('should log the data received from the execution, aplying a trim function', () => {
        const fooData = 'foo process data'
        childProcessMock.stubs.spawn.stdout.on.returns(`   ${fooData}    `)

        return commands.run(fooCommand, option).then(() => {
          return test.expect(console.log).to.have.been.calledWith(fooData)
        })
      })

      test.it('should log the errors received from the execution, aplying a trim function', () => {
        const fooData = 'foo error data'
        childProcessMock.stubs.spawn.stderr.on.runOnRegister(true)
        childProcessMock.stubs.spawn.stderr.on.returns(`   ${fooData}    `)
        return commands.run(fooCommand, option).then(() => {
          return test.expect(console.log).to.have.been.calledWith(fooData)
        })
      })

      test.it('should not log empty data received from the execution', () => {
        const fooData = '   '
        childProcessMock.stubs.spawn.stdout.on.returns(fooData)
        return commands.run(fooCommand, option).then(() => {
          return test.expect(console.log).to.not.have.been.calledWith(fooData)
        })
      })
    }) */
