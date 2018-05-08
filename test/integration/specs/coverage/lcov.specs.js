
const path = require('path')
const fs = require('fs')

const test = require('../../../../index')

const coveragePath = path.resolve(__dirname, '..', '..', 'packages', process.env.package_to_launch, process.env.coverage_dir)

test.describe('coverage lcov reports', () => {
  test.it('.coverage folder should exist', () => {
    return test.expect(fs.existsSync(coveragePath)).to.be.true()
  })

  test.it('lcov.info file should exist', () => {
    return test.expect(fs.existsSync(path.join(coveragePath, 'lcov.info'))).to.be.true()
  })

  test.it('lcov-report should exist', () => {
    return test.expect(fs.existsSync(path.join(coveragePath, 'lcov-report', 'index.html'))).to.be.true()
  })
})
