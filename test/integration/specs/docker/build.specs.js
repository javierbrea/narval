
const test = require('../../../../index')
const utils = require('../utils')

test.describe('docker build', () => {
  let outerrLog

  test.before((done) => {
    utils.readOutErr()
      .then((log) => {
        outerrLog = log
        done()
      })
  })

  test.it('should have built images', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Building '),
      test.expect(outerrLog).to.include('Step 2/9 : WORKDIR /narval'),
      test.expect(outerrLog).to.include('Step 3/9 : ADD ./install-resources'),
      test.expect(outerrLog).to.include('Step 4/9 : ADD ./docker-resources'),
      test.expect(outerrLog).to.include('Step 7/9 : RUN ./.narval/scripts/install.sh')
    ])
  })

  test.it('should have built mongodb-container', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Building mongodb-container'),
      test.expect(outerrLog).to.include('Step 1/9 : FROM mongo:3.6.4')
    ])
  })

  test.it('should have expose port 27017 for mongodb-container', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Step 8/9 : EXPOSE 27017')
    ])
  })

  test.it('should have built test-container', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Building test-container'),
      test.expect(outerrLog).to.include('Step 1/9 : FROM node:8.11.1')
    ])
  })

  test.it('should have built api-container', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Building api-container'),
      
    ])
  })

  test.it('should have expose port 4000 for api-container', () => {
    return Promise.all([
      test.expect(outerrLog).to.include('Step 8/9 : EXPOSE 4000')
    ])
  })
})
