'use strict'

const mongoose = require('mongoose')

const bookSchema = mongoose.Schema({
  author: String,
  title: String
})

const Book = mongoose.model('Book', bookSchema)

module.exports = {
  Book: Book
}
