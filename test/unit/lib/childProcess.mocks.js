
const childProcess = require('child_process')

const test = require('../../../index')

const Mock = function () {
  const sandbox = test.sinon.sandbox.create()
  let forkStub
  let forkOnFake

  const ForkOnFake = function () {
    let codeToReturn

    const fake = function (eventName, cb) {
      cb(codeToReturn)
    }

    const returns = function (code) {
      codeToReturn = code
    }

    return {
      fake: fake,
      returns: returns
    }
  }

  forkOnFake = new ForkOnFake()

  forkStub = sandbox.stub(childProcess, 'fork').returns({
    on: forkOnFake.fake
  })

  forkStub.on = {
    returns: forkOnFake.returns
  }

  const restore = function () {
    sandbox.restore()
  }

  return {
    stubs: {
      fork: forkStub
    },
    restore: restore
  }
}

module.exports = Mock
