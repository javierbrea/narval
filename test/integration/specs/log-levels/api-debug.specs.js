const _ = require('lodash')

const test = require('../../../../index')

const utils = require('../utils')
const definitions = require('./logs-definitions')

test.describe('services logs', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  const expects = (logDefinitions, log) => {
    _.each(logDefinitions, (definition) => {
      test.it(`should have logged ${definition.it}`, () => {
        _.each(definition.expects, (expect) => {
          test.expect(outerrLog).to.include(expect)
        })
      })
    })
  }

  const expectsNot = (logDefinitions, log) => {
    _.each(logDefinitions, (definition) => {
      test.it(`should have not logged ${definition.it}`, () => {
        _.each(definition.expects, (expect) => {
          test.expect(outerrLog).to.not.include(expect)
        })
      })
    })
  }

  expectsNot(definitions.log)
  expectsNot(definitions.trace)
  expects(definitions.debug)
  expects(definitions.info)
  expects(definitions.warn)
})
