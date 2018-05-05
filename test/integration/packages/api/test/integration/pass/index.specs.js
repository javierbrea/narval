
const test = require('narval')

test.describe('This tests always pass', function () {
  this.timeout(10000)
  test.it('should pass', (done) => {
    // let time for services to error by itself before being foreced to exit because tests have finished OK
    setTimeout(() => {
      test.expect(true).to.be.true()
      done()
    }, 3000)
  })
})
