
const commander = require('commander')
const Promise = require('bluebird')
const tracer = require('tracer')
const Boom = require('boom')

const test = require('../../../index')

const options = require('../../../lib/options')
const states = require('../../../lib/states')

const CommanderMock = function () {
  let dataToReturn

  const parse = test.sinon.spy(() => {
    return dataToReturn || {}
  })

  const option = test.sinon.spy((opt, description) => {
    return {
      option: option,
      parse: parse
    }
  })

  const returns = function (data) {
    dataToReturn = data
  }

  return {
    parse: parse,
    option: option,
    returns: returns
  }
}

test.describe('options', () => {
  test.describe('get method', () => {
    let commanderMock
    let sandbox

    test.beforeEach(() => {
      commanderMock = new CommanderMock()
      sandbox = test.sinon.createSandbox()
      sandbox.stub(tracer, 'setLevel')
      sandbox.stub(commander, 'option').callsFake(commanderMock.option)
      sandbox.stub(states, 'get').returns(undefined)
      sandbox.stub(states, 'set')
    })

    test.afterEach(() => {
      sandbox.restore()
    })

    test.it('should return a promise', () => {
      return test.expect(options.get()).to.be.an.instanceof(Promise)
    })

    test.it('should get the eight available options from command line arguments', () => {
      return options.get()
        .then(() => {
          return Promise.all([
            test.expect(commanderMock.option.callCount).to.equal(8),
            test.expect(commanderMock.parse.callCount).to.equal(1),
            test.expect(commanderMock.parse).to.have.been.calledWith(process.argv)
          ])
        })
    })

    test.it('should save options as a state in order to return them next time is called', () => {
      return options.get()
        .then(() => {
          return test.expect(states.set).to.have.been.called()
        })
    })

    test.it('should call to tracer setLevel method to set the current log level', () => {
      return options.get()
        .then(() => {
          return test.expect(tracer.setLevel).to.have.been.called()
        })
    })

    test.it('should set default log level as "info" if it is not specified', () => {
      return options.get()
        .then((opts) => {
          return test.expect(opts.logLevel).to.equal(3)
        })
    })

    test.it('should reject the promise if log level option is not valid', () => {
      commanderMock.returns({
        logLevel: 'foo'
      })
      return options.get()
        .then((opts) => {
          return test.assert.fail()
        }, (err) => {
          return test.expect(Boom.isBoom(err)).to.be.true()
        })
    })

    test.it('should return options from state if it is defined', () => {
      states.get.returns({})
      return options.get()
        .then(() => {
          return Promise.all([
            test.expect(commanderMock.option.callCount).to.equal(0),
            test.expect(commanderMock.parse.callCount).to.equal(0)
          ])
        })
    })

    test.it('should set "standard" option as true if "fix" option is received', () => {
      commanderMock.returns({
        fix: true
      })
      return options.get()
        .then((opts) => {
          return test.expect(opts.standard).to.equal(true)
        })
    })

    test.it('should set "standard" and "allSuites" options as true if no "standard", "suite" nor "type" options are received', () => {
      return options.get()
        .then((opts) => {
          return Promise.all([
            test.expect(opts.standard).to.equal(true),
            test.expect(opts.allSuites).to.equal(true)
          ])
        })
    })

    test.it('should set "allSuites" options as false if any of "standard", "suite" or "type" options are received', () => {
      commanderMock.returns({
        standard: true
      })
      return options.get()
        .then((opts) => {
          return Promise.all([
            test.expect(opts.standard).to.equal(true),
            test.expect(opts.allSuites).to.equal(false)
          ])
        })
    })

    test.it('should leave "standard" option with its value if any of "standard", "suite" or "type" options are received', () => {
      commanderMock.returns({
        type: 'fooType'
      })
      return options.get()
        .then((opts) => {
          return Promise.all([
            test.expect(opts.allSuites).to.equal(false),
            test.expect(opts.standard).to.be.undefined()
          ])
        })
    })
  })
})
