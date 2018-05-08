'use strict'

const express = require('express')
const bodyParser = require('body-parser')

const options = require('./options')
const db = require('./db')
const routers = require('./routers')

const start = function () {
  const app = express()
  const opts = options.get()

  return db.connect(opts.mongodb)
    .then((database) => {
      console.log(`Narval is docker in service node: ${process.env.narval_is_docker}`)
      console.log(`Narval suite in service node: ${process.env.narval_suite}`)
      console.log(`Narval suite type in service node: ${process.env.narval_suite_type}`)
      console.log(`Narval service in service node: ${process.env.narval_service}`)

      console.log(`Starting server at port ${opts.port}`)

      app.use(bodyParser.json())
      app.use(bodyParser.urlencoded({ extended: true }))
      app.use('/books', routers.books(database))

      app.listen(opts.port, opts.host)
    })
    .catch((err) => {
      console.error(`ERROR: ${err.message}`)
      process.exit(1)
    })
}

module.exports = {
  start: start
}
