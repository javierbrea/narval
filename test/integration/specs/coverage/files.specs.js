
const path = require('path')
const fs = require('fs')

const test = require('../../../../index')

const coveragePath = path.resolve(__dirname, '..', '..', 'packages', process.env.package_to_launch, '.coverage')

test.describe('coverage file reports', () => {
  test.it('.coverage folder should exist', () => {
    return test.expect(fs.existsSync(coveragePath)).to.be.true()
  })

  test.it('lcov.info file should exist', () => {
    return test.expect(fs.existsSync(path.join(coveragePath, 'lcov.info'))).to.be.true()
  })

  test.it('coverage.json file should exist', () => {
    return test.expect(fs.existsSync(path.join(coveragePath, 'coverage.json'))).to.be.true()
  })

  test.it('lcov-report should exist', () => {
    return test.expect(fs.existsSync(path.join(coveragePath, 'lcov-report', 'index.html'))).to.be.true()
  })
})
