
const test = require('narval')

const index = require('../../../index')

test.describe('index', () => {
  test.describe('sum', () => {
    test.it('should return once more the sum of provided numbers', () => {
      test.expect(index.sum(5, 4)).to.equal(9)
    })
  })
})
