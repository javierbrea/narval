'use strict'

const mongoose = require('mongoose')

var connect = function (mongodb) {
  if (mongodb === 'avoid') {
    return Promise.resolve(null)
  }
  console.log(`Connecting to database ${mongodb}`)

  const connectionPromise = new Promise((resolve, reject) => {
    let db = mongoose.connection
    db.on('error', (error) => {
      console.error('mongodb error:' + error)
      reject(error)
    })

    db.once('open', () => {
      console.log('mongodb connected')
      resolve(db)
    })
  })

  return mongoose.connect(mongodb)
    .then(() => {
      return connectionPromise
    })
}

module.exports = {
  connect: connect
}
