'use strict'

const childProcess = require('child_process')
const events = require('events')
const fs = require('fs')
const fsExtra = require('fs-extra')
const path = require('path')

const _ = require('lodash')
const Promise = require('bluebird')
const stripAnsi = require('strip-ansi')

const libs = require('./libs')
const paths = require('./paths')
const tracer = require('./tracer')
const logs = require('./logs')

const ChildProcessPromise = function (method) {
  return function (filePath, config = {}) {
    return new Promise((resolve) => {
      const proc = childProcess[method](filePath, config.args || [], Object.assign({
        cwd: paths.cwd.base()
      }, config.options))

      if (config.resolveOnClose) {
        proc.on('close', (code) => {
          resolve(code)
        })
      } else {
        resolve(proc)
      }
    })
  }
}

const fork = new ChildProcessPromise('fork')
const spawn = new ChildProcessPromise('spawn')

const execSync = function (command, options) {
  childProcess.execSync(command, options)
}

const Handler = function (proc, suiteData, options = {}) {
  const dockerTraceToRemove = /\[Narval\] \[TRACE\]/
  const testLogMatcher = /test-container_1[\s]*\|/
  const containerLogMatcher = /[\S]*-container_[\d]*[\s]*\|/
  const eventBus = new events.EventEmitter()
  let filesReady = false
  let isClosed = false
  let logged = []
  let killed
  let closeEmitted

  let pending = {
    out: [],
    err: [],
    outerr: [],
    close: null
  }

  proc.on('close', (code) => {
    isClosed = true
    if (!filesReady && options.close) {
      pending.close = code
    }
  })

  proc.stdout.on('data', (data) => {
    if (!filesReady) {
      pending.out.push(data)
      pending.outerr.push(data)
    }
  })

  proc.stderr.on('data', (data) => {
    if (!filesReady) {
      pending.err.push(data)
      pending.outerr.push(data)
    }
  })

  const emitClose = function (data) {
    if (!closeEmitted) {
      closeEmitted = true
      eventBus.emit('close', data)
    }
  }

  const emitErrorAndKill = function (err) {
    logs.writeLogsError({
      service: suiteData.service,
      suite: suiteData.suite,
      type: suiteData.type
    })
    tracer.error(err)
    if (!isClosed && !killed) {
      killed = true
      libs.treeKill(proc.pid)
    }
    eventBus.emit('error', err)
  }

  const DataLogger = function (filePath, pendingKey, print) {
    let blankLine = ''
    let writePending = 0
    let closePending = false
    let closeResolver
    let closeRejecter
    let fd

    const open = function () {
      return new Promise((resolve, reject) => {
        fs.open(filePath, 'a', (err, descriptor) => {
          if (err) {
            reject(err)
          } else {
            fd = descriptor
            resolve()
          }
        })
      })
    }

    const closeFile = function () {
      if (writePending < 1 && closePending === true) {
        closePending = false
        fs.close(fd, (err) => {
          if (err) {
            closeRejecter(err)
          } else {
            closeResolver()
          }
        })
      }
    }

    const close = function () {
      closePending = true
      return new Promise((resolve, reject) => {
        closeResolver = resolve
        closeRejecter = reject
        closeFile()
      })
    }

    const printTracer = (log) => {
      logs.serviceLog({
        service: suiteData.service,
        log
      })
    }

    const printLog = function (data) {
      _.each(data.split('\n'), logData => {
        const cleanData = _.trim(logData)
        if (cleanData.length) {
          if (dockerTraceToRemove.test(cleanData)) {
            printTracer(cleanData.replace(dockerTraceToRemove, '').replace(containerLogMatcher, ''))
          } else if (testLogMatcher.test(cleanData)) {
            console.log(cleanData.replace(testLogMatcher, ''))
          } else {
            printTracer(cleanData.replace(containerLogMatcher, ''))
          }
        }
      })
    }

    const log = function (data) {
      data = _.trim(data)
      if (data.length) {
        let withoutColors = stripAnsi(data)
        if (print) {
          logged.push(withoutColors)
          printLog(data)
        }
        writePending = writePending + 1
        fs.appendFile(fd, stripAnsi(`${blankLine}${withoutColors}`), 'utf8', (error) => {
          blankLine = '\n'
          if (error) {
            emitErrorAndKill(error)
          }
          writePending = writePending - 1
          if (closePending) {
            closeFile()
          }
        })
      }
    }

    const logPending = function () {
      if (pending[pendingKey].length) {
        _.each(pending[pendingKey], (trace) => {
          log(trace)
        })
      }
    }

    return {
      open: open,
      log: log,
      logPending: logPending,
      close: close
    }
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
            const out = new DataLogger(outputFilePath, 'out', false)
            const err = new DataLogger(errorFilePath, 'err', false)
            const outerr = new DataLogger(outerrorFilePath, 'outerr', true)

            return Promise.props({
              out: out.open(),
              err: err.open(),
              outerr: outerr.open()
            })
              .then(() => {
                filesReady = true
                out.logPending()
                err.logPending()
                outerr.logPending()

                const closeAllFiles = function (code) {
                  return Promise.all([
                    out.close(),
                    err.close(),
                    outerr.close()
                  ]).then(() => {
                    if (options.close) {
                      fs.writeFileSync(closeFilePath, code)
                    }
                    return Promise.resolve()
                  }).catch((err) => {
                    emitErrorAndKill(err)
                  }).finally(() => {
                    emitClose({
                      lastLog: logged[logged.length - 1],
                      processCode: code
                    })
                  })
                }

                proc.stdout.on('data', (data) => {
                  out.log(data)
                  outerr.log(data)
                })

                proc.stderr.on('data', (data) => {
                  err.log(data)
                  outerr.log(data)
                })

                if (!isClosed) {
                  proc.on('close', (code) => {
                    closeAllFiles(code)
                  })
                } else {
                  closeAllFiles(pending.close)
                }
              })
          })
      })
      .catch((err) => {
        emitErrorAndKill(err)
        emitClose({
          error: err
        })
      })
  }

  write()

  return eventBus
}

module.exports = {
  fork,
  spawn,
  execSync,
  Handler
}
