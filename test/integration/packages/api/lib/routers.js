
'use strict'

const express = require('express')

const data = require('./data')

const books = function (db) {
  const router = express.Router()
  const booksData = new data.Books(db)

  router.route('/').get((req, res, next) => {
    booksData.get()
      .then((booksList) => {
        console.log('Sending response with books')
        res.status(200)
        res.type('json').send(booksList)
      })
  })

  router.route('/').post((req, res, next) => {
    booksData.add(req.body)
      .then((book) => {
        console.log('Sending response with new book')
        res.status(200)
        res.type('json').send(book)
      })
  })

  return router
}

module.exports = {
  books: books
}
