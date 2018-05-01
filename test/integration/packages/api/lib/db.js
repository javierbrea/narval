'use strict'

const mongoose = require('mongoose')

const connectionString = 'mongodb://localhost/narval-api-test'

var connect = function (domapic) {
  console.log(`Connecting to database ${connectionString}`)
  let db
  mongoose.connect(connectionString)

  return new Promise((resolve, reject) => {
    db = mongoose.connection
    db.on('error', (error) => {
      console.error('mongodb error:' + error)
      reject(error)
    })

    db.once('open', () => {
      console.log('mongodb connected')
      resolve(db)
    })
  })
}

module.exports = {
  connect: connect
}
