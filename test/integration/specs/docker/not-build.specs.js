
const test = require('../../../../index')
const utils = require('../../../../utils')

test.describe('docker build', () => {
  let outerrLog

  test.before(async () => {
    outerrLog = await utils.logs.combined('package-test')
  })

  test.it('should have not built images', () => {
    return Promise.all([
      test.expect(outerrLog).to.not.include('Building '),
      test.expect(outerrLog).to.not.include('Step 2/9 : WORKDIR /narval'),
      test.expect(outerrLog).to.not.include('Step 3/9 : ADD ./install-resources'),
      test.expect(outerrLog).to.not.include('Step 4/9 : ADD ./docker-resources'),
      test.expect(outerrLog).to.not.include('Step 7/9 : RUN ./.narval/scripts/install.sh'),
      test.expect(outerrLog).to.not.include('Step 9/9 : CMD sh -c ./.narval/scripts/run-cmd.sh "${' + 'command_to_run}" "$' + '{command_params}" "$' + '{coverage_options}" "$' + '{coverage_enabled}" "$' + '{wait_on}" "$' + '{exit_after}"')
    ])
  })

  test.it('should have not built mongodb-container', () => {
    return Promise.all([
      test.expect(outerrLog).to.not.include('Building mongodb-container'),
      test.expect(outerrLog).to.not.include('Step 1/9 : FROM mongo:3.6.4')
    ])
  })

  test.it('should have not built test-container', () => {
    return Promise.all([
      test.expect(outerrLog).to.not.include('Building test-container'),
      test.expect(outerrLog).to.not.include('Step 1/9 : FROM node:8.11.1')
    ])
  })

  test.it('should have not built api-container', () => {
    return Promise.all([
      test.expect(outerrLog).to.not.include('Building api-container')
    ])
  })
})
