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

  const DataLogger = function (fd, print) {
    let blankLine = ''
    return function (data) {
      data = _.trim(data)
      if (data.length) {
        let withourColors = stripAnsi(data)
        if (print) {
          console.log(data)
          logged.push(withourColors)
        }
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
    const outputFilePath = path.join(fileFolder, 'out.log')
    const errorFilePath = path.join(fileFolder, 'err.log')
    const outerrorFilePath = path.join(fileFolder, 'combined-outerr.log')
    const closeFilePath = path.join(fileFolder, 'exit-code.log')

    paths.cwd.ensureDir(fileFolder)
      .then(() => {
        return Promise.all([
          fsExtra.remove(outputFilePath),
          fsExtra.remove(errorFilePath),
          fsExtra.remove(outerrorFilePath),
          options.close ? fsExtra.remove(closeFilePath) : Promise.resolve()
        ])
          .then(() => {
            return Promise.props({
              out: openFile(outputFilePath),
              err: openFile(errorFilePath),
              outerr: openFile(outerrorFilePath)
            })
              .then((fileDescriptors) => {
                const out = new DataLogger(fileDescriptors.out, false)
                const err = new DataLogger(fileDescriptors.err, false)
                const outerr = new DataLogger(fileDescriptors.outerr, true)

                proc.stdout.on('data', (data) => {
                  out(data)
                  outerr(data)
                })

                proc.stderr.on('data', (data) => {
                  err(data)
                  outerr(data)
                })

                proc.on('close', (code) => {
                  if (options.close) {
                    fs.writeFileSync(closeFilePath, code)
                  }
                  closeFile(fileDescriptors.out)
                  closeFile(fileDescriptors.err)
                  closeFile(fileDescriptors.outerr)
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
