
const Promise = require('bluebird')

const test = require('../../../index')
const mocks = require('../mocks')

const config = require('../../../lib/config')

test.describe('config', () => {
  test.describe('get method', () => {
    let tracerMock
    let pathsMock

    test.before(() => {
      tracerMock = new mocks.Tracer()
      pathsMock = new mocks.Paths()
    })

    test.after(() => {
      tracerMock.restore()
      pathsMock.restore()
    })

    test.it('should return a promise', () => {
      return test.expect(config.get()).to.be.an.instanceof(Promise)
    })
  })
})
