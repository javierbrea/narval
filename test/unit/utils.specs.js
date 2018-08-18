
const test = require('../../index')
const utils = require('../../utils')

const mocks = require('./mocks')

test.describe('utils', () => {
  let mocksSandbox

  test.beforeEach(() => {
    mocksSandbox = new mocks.Sandbox([
      'paths'
    ])
  })

  test.afterEach(() => {
    mocksSandbox.restore()
  })

  test.describe('logs', () => {
    const commonArguments = ['.narval', 'logs', 'unit', 'unit', 'foo']
    test.describe('combined method', () => {
      test.it('should call to read combined-outerr.log file of current suite and provided service', () => {
        return utils.logs.combined('foo')
          .then(() => {
            return test.expect(mocksSandbox.paths.stubs.cwd.readFile).to.have.been.calledWith(...commonArguments, 'combined-outerr.log')
          })
      })
    })

    test.describe('out method', () => {
      test.it('should call to read out.log file of current suite and provided service', () => {
        return utils.logs.out('foo')
          .then(() => {
            return test.expect(mocksSandbox.paths.stubs.cwd.readFile).to.have.been.calledWith(...commonArguments, 'out.log')
          })
      })
    })

    test.describe('err method', () => {
      test.it('should call to read err.log file of current suite and provided service', () => {
        return utils.logs.err('foo')
          .then(() => {
            return test.expect(mocksSandbox.paths.stubs.cwd.readFile).to.have.been.calledWith(...commonArguments, 'err.log')
          })
      })
    })

    test.describe('exitCode method', () => {
      test.it('should call to read exit-code.log file of current suite and provided service', () => {
        return utils.logs.exitCode('foo')
          .then(() => {
            return test.expect(mocksSandbox.paths.stubs.cwd.readFile).to.have.been.calledWith(...commonArguments, 'exit-code.log')
          })
      })
    })
  })
})
