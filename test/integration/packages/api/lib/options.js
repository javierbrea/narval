'use strict'

const commander = require('commander')

const getCommander = function () {
  return commander
    .option('--port <port>', 'Port in which the server will be listening')
    .parse(process.argv)
}

const get = function () {
  const userOptions = getCommander()

  return {
    port: userOptions.port ? parseInt(userOptions.port, 10) : 3000
  }
}

module.exports = {
  get: get
}
