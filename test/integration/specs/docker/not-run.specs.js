
const test = require('../../../../index')
const utils = require('../utils')

test.describe('docker', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have not been executed to run services and tests', () => {
    return Promise.all([
      test.expect(outerrLog).to.not.include('Running Docker command "docker-compose up --no-start'),
      test.expect(outerrLog).to.not.include('Starting docker service'),
      test.expect(outerrLog).to.not.include('Running Docker command "docker-compose start'),
      test.expect(outerrLog).to.not.include('Starting docker service "test"'),
      test.expect(outerrLog).to.not.match(/Attaching to docker_[\w|-]*/),
      test.expect(outerrLog).to.not.include('Stopping Docker service "'),
      test.expect(outerrLog).to.not.include('Removing volume docker_shared')
    ])
  })
})
