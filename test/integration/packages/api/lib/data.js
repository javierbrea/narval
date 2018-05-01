'use strict'

const mongoose = require('mongoose')

const Books = function (db) {
  const bookSchema = mongoose.Schema({
    author: String,
    title: String
  })

  const Book = mongoose.model('Book', bookSchema);

  const get = function () {
    console.log('Retrieving all books from database')
    return Book.find()
  }

  const add = function (bookData) {
    console.log('Adding new book to database:')
    console.log(JSON.stringify(bookData))
    const book = new Book(bookData)
    return book.save()
  }

  return {
    get: get,
    add: add
  }
}

module.exports ={
  Books: Books
}
