
const test = require('../../../index')

const states = require('../../../lib/states')

test.describe('states', () => {
  const fooKey = 'fooKey'
  const fooValue = 'foo'

  const setAndExpect = function () {
    states.set(fooKey, fooValue)
    test.expect(states.get(fooKey)).to.equal(fooValue)
  }

  test.beforeEach(() => {
    states.clean()
  })

  test.describe('get method', () => {
    test.it('should return the previously setted value for a certain key', () => {
      setAndExpect()
    })
  })

  test.describe('set method', () => {
    test.it('should set the value of a certain key', () => {
      const fooValue2 = 'foo2'
      setAndExpect()
      states.set(fooKey, fooValue2)
      test.expect(states.get(fooKey)).to.equal(fooValue2)
    })
  })

  test.describe('clean method', () => {
    test.it('should delete all stored keys and values', () => {
      setAndExpect()
      states.clean()
      test.expect(states.get(fooKey)).to.be.undefined()
    })
  })
})
