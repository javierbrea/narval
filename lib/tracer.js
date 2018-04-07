'use strict'

const _ = require('lodash')
const tracer = require('tracer')

const logger = tracer.colorConsole({
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
