
const test = require('../../../../index')
const utils = require('../utils')

test.describe('services logs', () => {
  utils.checkServiceLogs('before', {
    err: -1
  })
})
