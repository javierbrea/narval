
const test = require('../../../../index')
const utils = require('../utils')

test.describe('api-docker tests execution', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have available the foo file inside Docker container', () => {
    return test.expect(outerrLog).to.match(/List files in docker container(?:\s|\S)*?foo-added-file-to-docker-image.txt(?:\s|\S)*?End of list files in docker container/)
  })

  test.it('should have started mongodb', () => {
    return test.expect(outerrLog).to.include('MongoDB starting')
  })

  test.it('should have wait for services before starting others', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('WAITING FOR: tcp:mongodb-container:27017'),
      test.expect(outerrLog).to.include('WAITING FOR: tcp:api-container:4000')
    ])
  })

  test.it('should have started api', () => {
    return test.expect(outerrLog).to.include('Starting server at port 4000')
  })

  test.it('should have executed tests', () => {
    return test.expect(outerrLog).to.include('RUNNING COMMAND: node_modules/.bin/narval-msc_mocha --recursive --colors --reporter spec test/end-to-end/books')
  })

  test.it('should have stopped services', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Stopping Docker service "mongodb"'),
      test.expect(outerrLog).to.include('Stopping Docker service "api-server"'),
      test.expect(outerrLog).to.include('Stopping Docker service "test"'),
      test.expect(outerrLog).to.include('docker_mongodb-container_1 exited with code 137'),
      test.expect(outerrLog).to.include('docker_api-container_1 exited with code 137'),
      test.expect(outerrLog).to.include('Execution of "end-to-end" suite "books-api" finished OK')
    ])
  })
})
