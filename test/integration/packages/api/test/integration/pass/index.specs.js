
const test = require('narval')

test.describe('This tests always pass', function () {
  test.it('should pass', () => {
    test.expect(true).to.be.true()
  })
})
