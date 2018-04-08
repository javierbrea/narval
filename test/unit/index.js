
const mochaSinonChai = require('mocha-sinon-chai')

const test = require('../../index')

test.describe('index', () => {
  test.it('should return the "mocha-sinon-chai" methods', () => {
    return test.expect(test).to.deep.equal(mochaSinonChai)
  })
})
