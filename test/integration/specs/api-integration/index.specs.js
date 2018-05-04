
const test = require('../../../../index')
const utils = require('../utils')

test.describe('api-integration tests execution', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have applied custom wait-on configuration', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('WAITING FOR: --timeout=50000 --delay=100 --interval=50 tcp:mongodb-container:27017'),
      test.expect(outerrLog).to.include('WAITING FOR: --timeout=35000 --delay=150 --interval=60 tcp:api-container:4000')
    ])
  })
  
  test.it('should have executed tests', () => {
    return test.expect(outerrLog).to.include('RUNNING COMMAND: node_modules/.bin/narval-msc_mocha --recursive --colors --reporter spec test/integration/logs')
  })

  test.it('should have stopped services', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Stopping Docker service "mongodb"'),
      test.expect(outerrLog).to.include('Stopping Docker service "api-server"'),
      test.expect(outerrLog).to.include('Stopping Docker service "test"'),
      test.expect(outerrLog).to.include('docker_mongodb-container_1 exited with code 137'),
      test.expect(outerrLog).to.include('docker_api-container_1 exited with code 137'),
      test.expect(outerrLog).to.include('Execution of "integration" suite "logs" finished OK')
    ])
  })
})
