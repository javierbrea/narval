'use strict'

const CallBackRunnerFake = function (options) {
  options = options || {}

  const fake = function (eventName, cb) {
    if (options.runOnRegister) {
      cb(options.returns)
    }
  }

  const returns = function (code) {
    options.returns = code
  }

  const runOnRegister = function (run) {
    options.runOnRegister = run
  }

  return {
    fake: fake,
    returns: returns,
    runOnRegister: runOnRegister
  }
}

module.exports = {
  CallBackRunnerFake: CallBackRunnerFake
}
