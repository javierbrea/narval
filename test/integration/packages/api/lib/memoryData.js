'use strict'

const books = []

const Books = function () {
  const get = function () {
    console.log('Retrieving all books from database')
    return Promise.resolve(books)
  }

  const add = function (bookData) {
    console.log('Adding new book to database:')
    console.log(JSON.stringify(bookData))
    books.push(bookData)
    return Promise.resolve(bookData)
  }

  return {
    get: get,
    add: add
  }
}

module.exports = {
  Books: Books
}
