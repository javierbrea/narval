
const mockery = require('mockery')
const path = require('path')

const test = require('../../../../index')

test.describe('narval binary', () => {
  const binPath = '../runner'

  test.before(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    })
    test.sinon.spy(console, 'log')
    mockery.registerSubstitute(binPath, path.resolve(__dirname, 'narval-runner.mock.js'))
  })

  test.after(() => {
    mockery.deregisterAll()
    mockery.disable()
    console.log.restore()
  })

  test.it('should require runner from Narval library', () => {
    require('../../../../lib/bin/narval')
    test.expect(console.log).to.have.been.calledWith('narval runner loaded')
  })
})
