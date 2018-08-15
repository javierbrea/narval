'use strict'

const _ = require('lodash')
const tracer = require('tracer')
const colors = require('colors')

const utils = require('./utils')

const Filter = (color) => {
  return (str) => {
    const splittedStr = str.split(utils.NO_COLOR_SEP)
    const colorLog = splittedStr[0]
    const noColorLog = splittedStr[1] || ''
    return `${color(colorLog)}${noColorLog}`
  }
}

const logger = tracer.colorConsole({
  filters: {
    trace: Filter(colors.magenta),
    debug: Filter(colors.cyan),
    info: Filter(colors.green),
    warn: Filter(colors.yellow),
    error: Filter(colors.red.bold),
    fatal: Filter(colors.red.bold)
  },
  format: [
    '{{timestamp}} [Narval] [{{title}}] {{message}}',
    {
      error: '{{timestamp}} [Narval] [{{title}}] {{message}} {{stack}}'
    }
  ],
  dateformat: 'HH:MM:ss.L',
  preprocess: function (data) {
    let showErrorStack
    data.title = data.title.toUpperCase()
    _.each(data.args, (arg, index) => {
      if (arg instanceof Error) {
        showErrorStack = true
        data.args[index] = arg.toString()
        data.stack = '(in ' + data.file + ':' + data.line + ')\nCall Stack:\n' + arg.stack
      }
    })
    if (!showErrorStack) {
      data.stack = ''
    }
  }
})

module.exports = logger
