'use strict'

const mongoose = require('mongoose')

const schema = {
  author: String,
  title: String
}

const bookSchema = mongoose.Schema({
  ...schema // Added this only to test istanbul support for js spread syntax
})

const Book = mongoose.model('Book', bookSchema)

module.exports = {
  Book: Book
}
