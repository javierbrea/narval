
const test = require('narval')

test.describe('foo functional test', () => {
  test.it('should pass', () => {
    test.expect(true).to.be.true()
  })
})
