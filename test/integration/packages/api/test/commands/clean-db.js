#!/usr/bin/env node

'use strict'

const mongoose = require('mongoose')

const models = require('../../lib/models')

console.log(`Connecting to database ${process.env.mongodb}`)
let db
mongoose.connect(process.env.mongodb)

db = mongoose.connection
db.on('error', (error) => {
  console.error('mongodb error:' + error)
  throw error
})

db.once('open', () => {
  console.log('mongodb connected')
  console.log('Removing Books')
  models.Book.remove({})
    .then(() => {
      console.log('Books removed')
      db.close()
    })
})
