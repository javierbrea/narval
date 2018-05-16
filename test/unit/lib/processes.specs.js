
const Promise = require('bluebird')

const test = require('../../../index')
const mocks = require('../mocks')

const processes = require('../../../lib/processes')

test.describe.skip('processes', () => {
  test.describe('fork method', () => {
    const fooPath = 'fooPath/fooFile.js'
    let sandbox
    let childProcessMock
    let pathsMock

    test.beforeEach(() => {
      sandbox = test.sinon.sandbox.create()
      // sandbox.spy(console, 'log')
      childProcessMock = new mocks.ChildProcess()
      childProcessMock.stubs.fork.on.returns(0)
      pathsMock = new mocks.Paths()
    })

    test.afterEach(() => {
      childProcessMock.restore()
      pathsMock.restore()
      sandbox.restore()
    })

    test.it('should return a promise', () => {
      return processes.fork()
        .then(() => {
          return test.expect(true).to.be.true()
        })
    })

    test.it('should fork a child process with the received filePath', () => {
      return processes.fork(fooPath)
        .then(() => {
          return test.expect(childProcessMock.stubs.fork.getCall(0).args[0]).to.equal(fooPath)
        })
    })

    test.it('should pass the received arguments to the child process', () => {
      const fooArgs = ['fooArg1', 'fooArg2']
      return processes.fork(fooPath, {
        args: fooArgs
      }).then(() => {
        return test.expect(childProcessMock.stubs.fork.getCall(0).args[1]).to.deep.equal(fooArgs)
      })
    })

    test.it('should pass an empty as arguments to the child process if no args is received in config', () => {
      return processes.fork(fooPath)
        .then(() => {
          return test.expect(childProcessMock.stubs.fork.getCall(0).args[1]).to.deep.equal([])
        })
    })

    test.it('should pass the received options to the chid process, adding the cwd path', () => {
      const fooCwdPath = 'fooCwdPath/testing'
      const fooOptions = {
        env: {
          fooEnv: 'testing'
        }
      }
      pathsMock.stubs.cwd.base.returns(fooCwdPath)
      return processes.fork(fooPath, {
        options: fooOptions
      }).then(() => {
        return test.expect(childProcessMock.stubs.fork.getCall(0).args[2]).to.deep.equal({
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
        childProcessMock.stubs.fork.on.returns(fooExitCode)
        return processes.fork(fooPath, {
          resolveOnClose: true
        })
          .then((code) => {
            return test.expect(code).to.equal(fooExitCode)
          })
      })
    })

    test.describe('when it is not configured to resolve the promise on process close', () => {
      test.it('should resolve the promise with the opened child process', () => {
        return processes.fork(fooPath)
          .then((childProcess) => {
            return Promise.all([
              test.expect(typeof childProcess.on).to.equal('function'),
              test.expect(typeof childProcess.send).to.equal('function')
            ])
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
  })
})
