
const path = require('path')
const fs = require('fs')

const test = require('../../../../index')

const coveragePath = path.resolve(__dirname, '..', '..', 'foo-packages', 'no-config', '.coverage')

test.describe('coverage reports', () => {
  test.it('should exist', () => {
    return test.expect(fs.existsSync(coveragePath)).to.be.true()
  })
})
