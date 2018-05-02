'use strict'

const commander = require('commander')

const getCommander = function () {
  return commander
    .option('--port <port>', 'Port in which the server will be listening')
    .option('--host <host>', 'Hostname in which the server will be listening')
    .option('--mongodb <mongodb>', 'Mongodb connection')
    .parse(process.argv)
}

const get = function () {
  const userOptions = getCommander()

  return {
    port: userOptions.port ? parseInt(userOptions.port, 10) : 3000,
    mongodb: userOptions.mongodb || 'mongodb://localhost/narval-api-test',
    host: userOptions.host || 'localhost'
  }
}

module.exports = {
  get: get
}
