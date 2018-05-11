
const test = require('../../../index')

const istanbulMocha = require('../../../lib/istanbul-mocha')

test.describe('istanbul-mocha', () => {
  test.describe('mocha.params method', () => {
    test.it('should return an string containing mocha command line arguments given a test configuration', () => {
      test.expect(istanbulMocha.mocha.params({
        test: {
          specs: 'fooSpec/path',
          config: {
            reporter: 'list',
            grep: 'foo'
          }
        }
      })).to.equal('--recursive --colors --reporter list --grep foo fooSpec/path')
    })

    test.it('should add mocha default configuration to returned command', () => {
      test.expect(istanbulMocha.mocha.params({
        test: {
          specs: 'fooSpec/path'
        }
      })).to.equal('--recursive --colors --reporter spec fooSpec/path')
    })

    test.it('should convert boolean values, and add only the key to the command', () => {
      test.expect(istanbulMocha.mocha.params({
        test: {
          specs: 'foo2',
          config: {
            grep: true
          }
        }
      })).to.equal('--recursive --colors --reporter spec --grep foo2')
    })

    test.it('should ignore false boolean values', () => {
      test.expect(istanbulMocha.mocha.params({
        test: {
          specs: 'foo2',
          config: {
            grep: false
          }
        }
      })).to.equal('--recursive --colors --reporter spec foo2')
    })
  })

  test.describe('istanbul.params method', () => {
    test.it('should return an string containing istanbul command line arguments given a test configuration', () => {
      test.expect(istanbulMocha.istanbul.params({
        name: 'fooTest',
        coverage: {
          config: {
            print: 'both',
            foo: 'fooValue'
          }
        }
      }, 'fooSuiteType')).to.equal('--include-all-sources --root=. --colors --print=both --dir=.coverage/fooSuiteType/fooTest --foo=fooValue')
    })

    test.it('should include default istanbul command line arguments if no coverage config is provided', () => {
      test.expect(istanbulMocha.istanbul.params({
        name: 'fooTest'
      }, 'fooSuiteType')).to.equal('--include-all-sources --root=. --colors --print=summary --dir=.coverage/fooSuiteType/fooTest')
    })

    test.it('should add a single arguments separator to istanbul arguments that need that special format', () => {
      test.expect(istanbulMocha.istanbul.params({
        name: 'fooTest',
        coverage: {
          config: {
            x: true,
            i: true
          }
        }
      }, 'fooSuiteType')).to.equal('--include-all-sources --root=. --colors --print=summary --dir=.coverage/fooSuiteType/fooTest -x -i')
    })
  })
})
