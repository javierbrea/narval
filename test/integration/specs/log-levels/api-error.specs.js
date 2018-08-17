const _ = require('lodash')

const test = require('../../../../index')

const utils = require('../../../../utils')
const definitions = require('./logs-definitions')

test.describe('services logs', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

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
  expectsNot(definitions.debug)
  expectsNot(definitions.info)
  expectsNot(definitions.warn)

  test.it('should have logged only errors', () => {
    test.expect(outerrLog).to.not.include('[Narval]')
  })
})
