
'use strict'

const path = require('path')
const fs = require('fs')

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

  router.route('/commands').post((req, res, next) => {
    booksData.get()
      .then((booksList) => {
        if (req.body.command === 'write-to-shared-folder') {
          console.log('Writing books to shared folder')
          fs.writeFileSync(path.resolve(__dirname, '..', '.shared', 'books.json'), JSON.stringify(booksList, null, 2), 'utf8')
        }

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
