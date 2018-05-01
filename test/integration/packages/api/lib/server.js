'use strict'

const express = require('express')
const bodyParser = require('body-parser')

const options = require('./options')
const db = require('./db')
const routers = require('./routers')

const start = function () {
  const app = express()
  const opts = options.get()

  db.connect()
    .then((database) => {
      console.log(`Starting server at port ${opts.port}`)

      app.use(bodyParser.json())
      app.use(bodyParser.urlencoded({ extended: true }))
      app.use('/books', routers.books(database))

      app.listen(opts.port)
    })
    .catch((err) => {
      console.error(`ERROR: ${err.message}`)
      process.exit(1)
    })
}

module.exports = {
  start: start
}
