
const test = require('narval')

const asyncAwaitSpread = require('../../lib/async-await-spread')

test.describe('async await spreads', function () {
  test.describe('async await', function () {
    test.it('should work', async () => {
      const result = await asyncAwaitSpread.asyncCall()
      test.expect(result).to.equal('resolved')
    })
  })

  test.describe('spread arrays', function () {
    test.it('should work', () => {
      const array1 = ['foo', 'foo2']
      const array2 = ['foo3', 'foo4']
      test.expect(asyncAwaitSpread.concatArrays(array1, array2)).to.deep.equal([
        'foo',
        'foo2',
        'foo3',
        'foo4'
      ])
    })
  })

  test.describe('spread object', function () {
    test.it('should work', () => {
      const object = {
        foo: 'foo1',
        foo2: 'foo2'
      }
      test.expect(asyncAwaitSpread.cloneObject(object)).to.deep.equal(object)
    })
  })
})
