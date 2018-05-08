const test = require('../../../../index')
const utils = require('../utils')

test.describe('api-abort-on-error tests execution', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have not executed tests', () => {
    return test.expect(outerrLog).to.not.include('RUNNING COMMAND: node_modules/.bin/narval-msc_mocha')
  })

  test.it('should have stopped services on api-server error', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('./test/commands/force-error.sh: No such file or directory'),
      test.expect(outerrLog).to.include('docker_mongodb-container_1 exited with code 127'),
      test.expect(outerrLog).to.include('docker_api-container_1 exited with code 1'),
      test.expect(outerrLog).to.include('docker_test-container_1 exited with code 137'),
      test.expect(outerrLog).to.include('Docker container "test-container" of service "test" exited with code "137"'),
      test.expect(outerrLog).to.include('[Narval] [ERROR] Error running "integration" suite "logs"')
    ])
  })
})
