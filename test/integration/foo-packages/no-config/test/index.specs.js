
const test = require('narval')

const index = require('../index')

test.describe('index', () => {
  test.describe('sum', () => {
    test.it('should return the sum of provided numbers', () => {
      test.expect(index.sum(1, 2)).to.equal(3)
    })
  })
})
