
const mockery = require('mockery')
const path = require('path')

const test = require('../../../../index')

test.describe('msc_mocha binary', () => {
  const binPath = 'mocha-sinon-chai/bin/msc_mocha'

  test.before(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    })
    test.sinon.spy(console, 'log')
    mockery.registerSubstitute(binPath, path.resolve(__dirname, 'msc_mocha.mock.js'))
  })

  test.after(() => {
    mockery.deregisterAll()
    mockery.disable()
    console.log.restore()
  })

  test.it('should require msc_mocha binary from mocha-sinon-chai library', () => {
    require('../../../../lib/bin/msc_mocha')
    test.expect(console.log).to.have.been.calledWith('msc_mocha mock binary loaded')
  })
})
