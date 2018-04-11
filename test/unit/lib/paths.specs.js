
const path = require('path')

const test = require('../../../index')

const paths = require('../../../lib/paths')

test.describe('paths', () => {
  let resolveSpy
  test.beforeEach(() => {
    resolveSpy = test.sinon.spy(path, 'resolve')
  })

  test.afterEach(() => {
    resolveSpy.restore()
  })

  test.describe('findDependencyFile method', () => {
    test.it('should find and return the absolute path to the provided file path in "node_modules/" self or parents folders', () => {
      const standardPath = path.resolve(__dirname, '..', '..', '..', 'node_modules', 'standard', 'bin', 'cmd.js')
      return test.expect(paths.findDependencyFile(['standard', 'bin', 'cmd.js'])).to.equal(standardPath)
    })

    test.it('should return the path to "node_modules/" if no subpath to be search is provided', () => {
      const nodeModulesPath = path.resolve(__dirname, '..', '..', '..', 'node_modules')
      return test.expect(paths.findDependencyFile()).to.equal(nodeModulesPath)
    })

    test.it('should throw an error if does not find the file path', () => {
      let error
      try {
        paths.findDependencyFile('fooStandard')
      } catch (err) {
        error = err
      }
      test.expect(error).to.be.an('error')
      test.expect(error.message).to.have.string('not found in dependencies')
    })

    test.it('should search the file in a maximum of five parent node_modules folders', () => {
      try {
        paths.findDependencyFile('fooStandard2')
      } catch (err) {
        test.expect(resolveSpy.callCount).to.equal(5)
      }
    })
  })
})
