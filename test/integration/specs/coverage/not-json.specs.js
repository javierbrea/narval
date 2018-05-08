
const path = require('path')
const fs = require('fs')

const test = require('../../../../index')

const coveragePath = path.resolve(__dirname, '..', '..', 'packages', process.env.package_to_launch, process.env.coverage_dir)

test.describe('coverage json file reports', () => {
  test.it('coverage.json file should not exist', () => {
    return test.expect(fs.existsSync(path.join(coveragePath, 'coverage.json'))).to.be.false()
  })
})
