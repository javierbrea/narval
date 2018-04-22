
const mockery = require('mockery')
const path = require('path')

const test = require('../../../../index')

const testBinary = function (options) {
  test.describe(`${options.name} binary `, () => {
    test.before(() => {
      mockery.enable({
        useCleanCache: true,
        warnOnReplace: false,
        warnOnUnregistered: false
      })
      test.sinon.spy(console, 'log')
      mockery.registerSubstitute(options.path, path.resolve(__dirname, `${options.name}.mock.js`))
    })

    test.after(() => {
      mockery.deregisterAll()
      mockery.disable()
      console.log.restore()
    })

    test.it(`should require ${options.name} binary from ${options.from} library`, () => {
      require(`../../../../lib/bin/${options.name}`)
      test.expect(console.log).to.have.been.calledWith(`${options.name} mock binary loaded`)
    })
  })
}

testBinary({
  name: 'msc-istanbul',
  path: 'mocha-sinon-chai/bin/msc-istanbul',
  from: 'mocha-sinon-chai'
})

testBinary({
  name: 'msc_mocha',
  path: 'mocha-sinon-chai/bin/msc_mocha',
  from: 'mocha-sinon-chai'
})

testBinary({
  name: 'narval',
  path: '../runner',
  from: 'narval'
})
