
const fs = require('fs')
const path = require('path')

const requestPromise = require('request-promise')

const test = require('narval')

const readSharedFile = function (serviceName, fileName) {
  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(__dirname, '..', '..', '..', '.shared', 'books.json'), 'utf8', (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

test.describe('Commands', function () {
  const API_URL = `http://${process.env.api_host}:${process.env.api_port}/books`
  let requestOptions = {}
  const newBook = {
    title: 'Brave New World',
    author: 'Aldous Huxley'
  }

  test.beforeEach(() => {
    requestOptions = {
      method: 'GET',
      url: API_URL,
      json: true
    }
  })

  test.describe('write-to-shared-folder command', () => {
    test.it('should write books to a file', () => {
      requestOptions.method = 'POST'
      requestOptions.body = newBook
      return requestPromise(requestOptions).then(() => {
        requestOptions.method = 'POST'
        requestOptions.body = {
          command: 'write-to-shared-folder'
        }
        requestOptions.url = requestOptions.url + '/commands'
        return requestPromise(requestOptions).then(() => {
          return readSharedFile()
            .then((fileContent) => {
              return Promise.all([
                test.expect(fileContent).to.include('Aldous Huxley'),
                test.expect(fileContent).to.include('Brave New World')
              ])
            })
        })
      })
    })
  })
})
