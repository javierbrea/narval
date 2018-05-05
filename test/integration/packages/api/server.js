'use strict'

const server = require('./lib/server')

server.start()
  .catch((err) => {
    console.log(err.message)
    process.exitCode = 1
  })
