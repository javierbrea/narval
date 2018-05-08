'use strict'

const models = require('./models')

const Books = function (db) {
  const get = function () {
    console.log('Retrieving all books from database')
    return models.Book.find()
  }

  const add = function (bookData) {
    console.log('Adding new book to database:')
    console.log(JSON.stringify(bookData))
    const book = new models.Book(bookData)
    return book.save()
  }

  return {
    get: get,
    add: add
  }
}

module.exports = {
  Books: Books
}
