
/* const test = require('../../../index')

const istanbulMocha = require('../../../lib/istanbul-mocha')

const Mock = function () {
  const sandbox = test.sinon.sandbox.create()

  const stubs = {
    mocha: {
      params: sandbox.stub(istanbulMocha.mocha, 'params')
    },
    istanbul: {
      params: sandbox.stub(istanbulMocha.istanbul, 'params')
    },
    getCommandAndParams: sandbox.stub(istanbulMocha, 'getCommandAndParams')
  }

  const restore = function () {
    sandbox.restore()
  }

  return {
    stubs: stubs,
    restore: restore
  }
}

module.exports = Mock
*/
