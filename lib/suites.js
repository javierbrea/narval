'use strict'

const _ = require('lodash')

const tracer = require('./tracer')
const paths = require('./paths')

const runTest = function (test, suiteName, options) {
  const testDescription = suiteName + ' test "' + test.name + '"'
  if (!options.test || (options.test && options.test === test.name)) {
    tracer.info('Running' + testDescription)
  } else {
    tracer.warn('Skipping' + testDescription)
  }
}

const runSuite = function (suite, options) {
  const suiteDescription = ' test suite "' + suite.name + '"'
  if (options.suites || options.test || (options.suite && options.suite === suite.name)) {
    tracer.info('Running' + suiteDescription)
    _.each(suite.tests, (test) => {
      runTest(test, suite.name, options)
    })
  } else {
    tracer.warn('Skipping' + suiteDescription)
  }
}

const run = function (data) {
  const suites = data.config.test.suites
  _.each(suites, (suite) => {
    runSuite(suite, data.options)
  })
}

module.exports = {
  run: run
}