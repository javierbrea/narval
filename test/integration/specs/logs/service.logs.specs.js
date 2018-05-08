
const test = require('../../../../index')
const utils = require('../utils')

test.describe('services logs', () => {
  utils.checkServiceLogs('mongodb')
  utils.checkServiceLogs('api-server')
  utils.checkServiceLogs('test')
  utils.checkServiceLogs('before', {
    err: -1
  })
})
