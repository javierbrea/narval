
const fs = require('fs')
const path = require('path')

const requestPromise = require('request-promise')
const Promise = require('bluebird')

const test = require('narval')

const readServiceLogs = function (serviceName, fileName) {
  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(__dirname, '..', '..', '..', '.narval', 'logs', process.env.narval_suite_type, process.env.narval_suite, serviceName, `${fileName}.log`), 'utf8', (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

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
      // Delay for let server write logs
      return Promise.delay(2000).then(() => {
        return readServiceLogs('api-server', 'out')
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
      // Delay for let server write logs
      return Promise.delay(2000).then(() => {
        return readServiceLogs('api-server', 'out')
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
