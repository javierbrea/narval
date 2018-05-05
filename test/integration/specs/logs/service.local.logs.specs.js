
const test = require('../../../../index')
const utils = require('../utils')

test.describe('services logs', () => {
  utils.checkServiceLogs('api-server', {
    err: -1
  })
  utils.checkServiceLogs('before', {
    err: -1
  })
})
