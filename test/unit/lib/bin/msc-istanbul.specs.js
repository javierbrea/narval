
const mockery = require('mockery')
const path = require('path')

const test = require('../../../../index')

test.describe('msc-istanbul binary', () => {
  const binPath = 'mocha-sinon-chai/bin/msc-istanbul'

  test.before(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    })
    test.sinon.spy(console, 'log')
    mockery.registerSubstitute(binPath, path.resolve(__dirname, 'msc-istanbul.mock.js'))
  })

  test.after(() => {
    mockery.deregisterAll()
    mockery.disable()
    console.log.restore()
  })

  test.it('should require msc-istanbul binary from mocha-sinon-chai library', () => {
    require('../../../../lib/bin/msc-istanbul')
    test.expect(console.log).to.have.been.calledWith('msc-istanbul mock binary loaded')
  })
})
