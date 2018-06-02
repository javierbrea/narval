
const test = require('narval')

const serverLib = require('../../lib/server')

test.describe('server', function () {
  let sandbox

  test.before(() => {
    sandbox = test.sinon.createSandbox()
    sandbox.stub(serverLib, 'start').usingPromise().resolves()
  })

  test.after(() => {
    sandbox.restore()
  })

  test.it('should start the server', () => {
    require('../../server')
    test.expect(serverLib.start).to.have.been.called()
  })
})
