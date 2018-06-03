
const test = require('../../../index')

const libs = require('../../../lib/libs')

const Mock = function () {
  const sandbox = test.sinon.createSandbox()
  let waitFake
  let waitStub
  let treeKillStub

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
  waitStub = sandbox.stub(libs, 'waitOn').callsFake(waitFake.fake)

  waitStub.returns = waitFake.returns

  treeKillStub = sandbox.stub(libs, 'treeKill')

  const restore = function () {
    sandbox.restore()
  }

  return {
    stubs: {
      waitOn: waitStub,
      treeKill: treeKillStub
    },
    restore: restore
  }
}

module.exports = Mock
