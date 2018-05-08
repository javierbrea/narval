
const test = require('narval')

const index = require('../../index')

test.describe('index', () => {
  test.describe('sum', () => {
    test.it('should return again the sum of provided numbers', () => {
      test.expect(index.sum(5, 2)).to.equal(7)
    })

    test.it('should only execute this one when grepped', () => {
      test.expect(index.sum(3, 5)).to.equal(8)
    })
  })
})
