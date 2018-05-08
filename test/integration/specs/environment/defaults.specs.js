
const test = require('../../../../index')
const utils = require('../utils')

test.describe('environment vars', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have added default environment variables to service commands', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Narval suite in service command: books-api'),
      test.expect(outerrLog).to.include('Narval suite type in service command: end-to-end'),
      test.expect(outerrLog).to.include('Narval service in service command: api-server')
    ])
  })

  test.it('should have available default environment variables in nodejs services', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Narval suite in service node: books-api'),
      test.expect(outerrLog).to.include('Narval suite type in service node: end-to-end'),
      test.expect(outerrLog).to.include('Narval service in service node: api-server')
    ])
  })

  test.it('should have available default environment variables in tests', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Narval suite in tests: books-api'),
      test.expect(outerrLog).to.include('Narval suite type in tests: end-to-end'),
      test.expect(outerrLog).to.include('Narval service in tests: test')
    ])
  })
})
