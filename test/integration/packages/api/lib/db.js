'use strict'

const mongoose = require('mongoose')

var connect = function (mongodb) {
  console.log(`Connecting to database ${mongodb}`)
  let db
  mongoose.connect(mongodb)

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
