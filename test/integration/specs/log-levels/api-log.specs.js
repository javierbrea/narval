const _ = require('lodash')

const test = require('../../../../index')

const utils = require('../../../../utils')
const definitions = require('./logs-definitions')

test.describe('services logs', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
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

  expects(definitions.log)
  expects(definitions.trace)
  expects(definitions.debug)
  expects(definitions.info)
  expects(definitions.warn)
})
