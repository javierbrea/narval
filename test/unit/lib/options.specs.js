
const commander = require('commander')
const Promise = require('bluebird')

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
      sandbox = test.sinon.sandbox.create()
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

    test.it('should get the seven available options from command line arguments', () => {
      return options.get()
        .then(() => {
          return Promise.all([
            test.expect(commanderMock.option.callCount).to.equal(7),
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
