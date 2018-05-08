
const requestPromise = require('request-promise')

const test = require('narval')

console.log(`Narval is docker in tests: ${process.env.narval_is_docker}`)
console.log(`Narval suite in tests: ${process.env.narval_suite}`)
console.log(`Narval suite type in tests: ${process.env.narval_suite_type}`)
console.log(`Narval service in tests: ${process.env.narval_service}`)

test.describe('Books API', function () {
  const API_URL = `http://${process.env.api_host}:${process.env.api_port}/books/`
  const newBook = {
    title: 'The Sun Also Rises',
    author: 'Ernest Hemingway'
  }
  let requestOptions = {}

  test.beforeEach(() => {
    requestOptions = {
      method: 'GET',
      url: API_URL,
      json: true
    }
  })

  test.it('should be running', () => {
    requestOptions.resolveWithFullResponse = true
    return requestPromise(requestOptions).then((response) => {
      return test.expect(response.statusCode).to.equal(200)
    })
  })

  test.it('should return an empty array when GET method is called for first time', () => {
    return requestPromise(requestOptions).then((response) => {
      return test.expect(response).to.deep.equal([])
    })
  })

  test.it('should return the new book when a book is added', () => {
    requestOptions.method = 'POST'
    requestOptions.body = newBook

    return requestPromise(requestOptions).then((response) => {
      return Promise.all([
        test.expect(response.title).to.equal(newBook.title),
        test.expect(response.author).to.equal(newBook.author)
      ])
    })
  })

  test.it('should include the recently added book when GET is called', () => {
    return requestPromise(requestOptions).then((response) => {
      return Promise.all([
        test.expect(response[0].title).to.equal(newBook.title),
        test.expect(response[0].author).to.equal(newBook.author)
      ])
    })
  })

  test.it('should return all added books', () => {
    requestOptions.method = 'POST'
    requestOptions.body = newBook

    return requestPromise(requestOptions).then(() => {
      return requestPromise(requestOptions).then(() => {
        requestOptions.method = 'GET'
        delete requestOptions.body
        return requestPromise(requestOptions).then((response) => {
          return test.expect(response.length).to.equal(3)
        })
      })
    })
  })
})
