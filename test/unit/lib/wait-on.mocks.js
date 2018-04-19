
const test = require('../../../index')

const waitOn = require('../../../lib/wait-on')

const Mock = function () {
  const sandbox = test.sinon.sandbox.create()
  let waitFake
  let waitStub

  const WaitFake = function () {
    let errorToReturn

    const fake = function (options, cb) {
      cb(errorToReturn)
    }

    const returns = function (error) {
      errorToReturn = error
    }

    return {
      fake: fake,
      returns: returns
    }
  }

  waitFake = new WaitFake()
  waitStub = sandbox.stub(waitOn, 'wait').callsFake(waitFake.fake)

  waitStub.returns = waitFake.returns

  const restore = function () {
    sandbox.restore()
  }

  return {
    stubs: {
      wait: waitStub
    },
    restore: restore
  }
}

module.exports = Mock
