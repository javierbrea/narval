'use strict'

const _ = require('lodash')

const CallBackRunnerFake = function (options = {}) {
  let cbs = []
  const fake = function (eventName, cb) {
    if (options.runOnRegister) {
      cb(options.returns)
    }
    cbs.push(cb)
  }

  const returns = function (code) {
    options.returns = code
  }

  const runOnRegister = function (run) {
    options.runOnRegister = run
  }

  const run = function (data) {
    _.each(cbs, (cb) => {
      cb(data)
    })
  }

  return {
    fake: fake,
    returns: returns,
    runOnRegister: runOnRegister,
    run: run
  }
}

module.exports = {
  CallBackRunnerFake: CallBackRunnerFake
}
