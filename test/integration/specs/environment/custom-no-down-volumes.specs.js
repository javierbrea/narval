
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
      test.expect(outerrLog).to.include('Narval is docker in service command: true')
    ])
  })

  test.it('should have addec default environment variables in before commands', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Narval is docker in before command: true'),
      test.expect(outerrLog).to.include('Narval suite in before command: books-api'),
      test.expect(outerrLog).to.include('Narval suite type in before command: end-to-end'),
      test.expect(outerrLog).to.include('Narval service in before command: before')
    ])
  })

  test.it('should have available default environment variables in nodejs services', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Narval is docker in service node: true')
    ])
  })

  test.it('should have added custom environment variables in before commands', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Custom environment var in before command: fooValue')
    ])
  })
})
