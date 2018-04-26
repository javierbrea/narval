'use strict'

const fs = require('fs')
const fsExtra = require('fs-extra')
const path = require('path')
const Promise = require('bluebird')
const stripAnsi = require('strip-ansi')

const _ = require('lodash')

const paths = require('./paths')
const tracer = require('./tracer')

const Handler = function (proc, suiteData, options) {
  let logged = []
  options = options || {}

  const openFile = function (filePath) {
    return new Promise((resolve, reject) => {
      fs.open(filePath, 'a', (err, fd) => {
        if (err) {
          reject(err)
        }
        resolve(fd)
      })
    })
  }

  const DataLogger = function (fd) {
    let blankLine = ''
    return function (data) {
      data = _.trim(data)
      if (data.length) {
        let withourColors = stripAnsi(data)
        console.log(data)
        logged.push(withourColors)
        fs.appendFile(fd, stripAnsi(`${blankLine}${withourColors}`), 'utf8', (error) => {
          blankLine = '\n'
          if (error) {
            throw error
          }
        })
      }
    }
  }

  const closeFile = function (fileDescriptor) {
    fs.close(fileDescriptor, (err) => {
      if (err) {
        throw err
      }
    })
  }

  const write = function () {
    const fileFolder = paths.cwd.resolve('.narval', 'logs', suiteData.type, suiteData.suite, suiteData.service)
    const outputFilePath = path.join(fileFolder, 'output.log')
    const closeFilePath = path.join(fileFolder, 'exit-code.log')

    paths.cwd.ensureDir(fileFolder)
      .then(() => {
        return Promise.all([
          fsExtra.remove(outputFilePath),
          fsExtra.remove(closeFilePath)
        ])
          .then(() => {
            return openFile(outputFilePath)
              .then((fileDescriptor) => {
                const log = new DataLogger(fileDescriptor, true)
                proc.stdout.on('data', (data) => {
                  log(data)
                })

                proc.stderr.on('data', (data) => {
                  log(data)
                })

                proc.on('close', (code) => {
                  if (options.close) {
                    fs.writeFileSync(closeFilePath, code)
                  }
                  closeFile(fileDescriptor)
                })
              })
          })
      })
      .catch((error) => {
        tracer.error(`Error writing process logs from service "${suiteData.service}", suite "${suiteData.suite}" of type "${suiteData.type}"`)
        tracer.error(error)
      })
  }

  const get = function () {
    // TODO, get length at your convenience
    return logged[logged.length - 1]
  }

  write()

  return {
    get: get
  }
}

module.exports = {
  Handler: Handler
}
