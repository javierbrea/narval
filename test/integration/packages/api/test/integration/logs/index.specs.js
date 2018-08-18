
const requestPromise = require('request-promise')
const Promise = require('bluebird')

const test = require('narval')
const utils = require('narval/utils')

test.describe('Server logs', function () {
  this.timeout(10000)
  const API_URL = `http://${process.env.api_host}:${process.env.api_port}/books/`
  let requestOptions = {}
  const newBook = {
    title: '1984',
    author: 'George Orwell'
  }

  test.beforeEach(() => {
    requestOptions = {
      method: 'GET',
      url: API_URL,
      json: true
    }
  })

  test.it('should print a log when books are retrieved from database', () => {
    return requestPromise(requestOptions).then(() => {
      // Delay in order to allow server writing logs
      return Promise.delay(2000).then(() => {
        return utils.logs.out('api-server')
          .then((log) => {
            return test.expect(log).to.include('Retrieving all books from database')
          })
      })
    })
  })

  test.it('should print a log when a new book is added to database', () => {
    requestOptions.method = 'POST'
    requestOptions.body = newBook

    return requestPromise(requestOptions).then(() => {
      // Delay in order to allow server writing logs
      return Promise.delay(2000).then(() => {
        return utils.logs.out('api-server')
          .then((log) => {
            return Promise.all([
              test.expect(log).to.include('Adding new book to database:'),
              test.expect(log).to.include('{"title":"1984","author":"George Orwell"}')
            ])
          })
      })
    })
  })
})
