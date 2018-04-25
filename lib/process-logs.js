'use strict'

const fs = require('fs')
const fsExtra = require('fs-extra')
const path = require('path')
const Promise = require('bluebird')
const stripAnsi = require('strip-ansi')

const _ = require('lodash')

const paths = require('./paths')
const tracer = require('./tracer')

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

const DataLogger = function (fd, print) {
  let blankLine = ''
  return function (data) {
    data = _.trim(data)
    if (data.length) {
      if (print) {
        console.log(data)
      }
      fs.appendFile(fd, stripAnsi(`${blankLine}${data}`), 'utf8', (error) => {
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

const write = function (proc, suiteData) {
  const fileFolder = paths.cwd.resolve('.narval', 'logs', suiteData.suiteType, suiteData.suite, suiteData.service)
  const outputFilePath = path.join(fileFolder, 'output.log')
  const closeFilePath = path.join(fileFolder, 'exit-code.log')

  paths.cwd.ensureDir(fileFolder)
    .then(() => {
      return Promise.all([
        fsExtra.remove(outputFilePath),
        fsExtra.remove(closeFilePath)
      ])
        .then(() => {
          return Promise.props({
            output: openFile(outputFilePath),
            close: openFile(closeFilePath)
          })
            .then((fileDescriptors) => {
              const log = new DataLogger(fileDescriptors.output, true)
              const closeLog = new DataLogger(fileDescriptors.close)
              proc.stdout.on('data', (data) => {
                log(data)
              })

              proc.stderr.on('data', (data) => {
                log(data)
              })

              proc.on('close', (code) => {
                closeLog(code || 0)
                closeFile(fileDescriptors.output)
                closeFile(fileDescriptors.close)
              })
            })
        })
    })
    .catch((error) => {
      tracer.error(`Error writing process logs from service "${suiteData.service}", suite "${suiteData.suite}" of type "${suiteData.suiteType}"`)
      tracer.error(error)
    })
}

module.exports = {
  write: write
}
