
const test = require('../../../index')

const utils = require('../../../lib/utils')

test.describe('utils', () => {
  test.describe('commandArguments method', () => {
    test.it('should return null if no command is provided', () => {
      test.expect(utils.commandArguments()).to.equal(null)
    })

    test.it('should return property command with the command to execute', () => {
      const fooCommand = 'fooCommand'
      test.expect(utils.commandArguments(`${fooCommand} fooParam1 --fooParam2=testing`).command).to.equal(fooCommand)
    })

    test.it('should return property "arguments" as an array with arguments for the command', () => {
      const fooParam1 = 'fooParam1'
      const fooParam2 = '--fooParam2=testing'
      test.expect(utils.commandArguments(`command ${fooParam1} ${fooParam2}`).arguments).to.deep.equal([fooParam1, fooParam2])
    })

    test.it('should return arguments as empty array if received command has no arguments', () => {
      const fooCommand = 'fooCommand'
      const commandAndParams = utils.commandArguments(fooCommand)
      test.expect(commandAndParams.command).to.equal(fooCommand)
      test.expect(commandAndParams.arguments).to.deep.equal([])
    })

    test.it('should return property "joinedArguments" as an string with all arguments for the command', () => {
      const fooParam1 = 'fooParam2'
      const fooParam2 = '--fooParam3=foo'
      test.expect(utils.commandArguments(`command ${fooParam1} ${fooParam2}`).joinedArguments).to.equal(`${fooParam1} ${fooParam2}`)
    })

    test.it('should return joinedArguments as empty string if received command has no arguments', () => {
      const fooCommand = 'fooCommand2'
      const commandAndParams = utils.commandArguments(fooCommand)
      test.expect(commandAndParams.command).to.equal(fooCommand)
      test.expect(commandAndParams.joinedArguments).to.equal('')
    })
  })

  test.describe('ObjectToArguments constructor', () => {
    let objectToArgs
    test.beforeEach(() => {
      objectToArgs = new utils.ObjectToArguments()
    })

    test.it('should return an empty string if no object is provided', () => {
      test.expect(objectToArgs()).to.equal('')
    })

    test.it('given an object, should return an string with the equivalent converted to command line arguments', () => {
      test.expect(objectToArgs({
        fooVar1: 'fooVal1',
        fooVar2: 'fooVal2'
      })).to.equal('--fooVar1 fooVal1 --fooVar2 fooVal2')
    })

    test.it('should convert boolean values, and add only the key to the command', () => {
      test.expect(objectToArgs({
        fooVar1: 'fooVal1',
        fooVar2: true,
        fooVar3: 'testing'
      })).to.equal('--fooVar1 fooVal1 --fooVar2 --fooVar3 testing')
    })

    test.it('should convert array values, and add one argument for each element of the array', () => {
      objectToArgs = new utils.ObjectToArguments({}, '=', ['x'])
      test.expect(objectToArgs({
        fooVar1: 'fooVal1',
        fooVar2: true,
        x: [
          'testing',
          'testing2',
          'testing3'
        ]
      })).to.equal('--fooVar1=fooVal1 --fooVar2 -x=testing -x=testing2 -x=testing3')
    })

    test.it('should use the defined equal to separate vars and values', () => {
      objectToArgs = new utils.ObjectToArguments({}, '=>')
      test.expect(objectToArgs({
        fooVar1: 'fooVal1',
        fooVar2: true,
        fooVar3: 'testing2'
      })).to.equal('--fooVar1=>fooVal1 --fooVar2 --fooVar3=>testing2')
    })

    test.it('should ignore false boolean values', () => {
      test.expect(objectToArgs({
        fooVar1: 'fooVal1',
        fooVar2: false,
        fooVar3: 'foo'
      })).to.equal('--fooVar1 fooVal1 --fooVar3 foo')
    })

    test.it('should use a single arguments separator for defined keys', () => {
      objectToArgs = new utils.ObjectToArguments({}, '=', ['fooVar2', 'foo3'])
      test.expect(objectToArgs({
        foo: 'fooValue',
        fooVar2: true,
        foo3: 'testing'
      })).to.equal('--foo=fooValue -fooVar2 -foo3=testing')
    })

    test.it('should add extra parameters to the end, without adding dashes to them', () => {
      objectToArgs = new utils.ObjectToArguments({}, '=')
      test.expect(objectToArgs({
        foo: 'fooVal'
      }, 'extra-parameter')).to.equal('--foo=fooVal extra-parameter')
    })

    test.it('should accept extra parameters as an array', () => {
      objectToArgs = new utils.ObjectToArguments({}, '=')
      test.expect(objectToArgs({
        foo: 'fooVal'
      }, ['extra-parameter', 'extra-param-2'])).to.equal('--foo=fooVal extra-parameter extra-param-2')
    })

    test.it('should extend the received object with the provided default config', () => {
      objectToArgs = new utils.ObjectToArguments({
        foo: 'fooValue',
        fooVar2: true
      }, '=', ['fooVar2'])
      test.expect(objectToArgs({
        fooVar3: 'fooVal'
      }, 'extra-param')).to.equal('--foo=fooValue -fooVar2 --fooVar3=fooVal extra-param')
    })
  })

  test.describe('serviceNameToVarName method', () => {
    test.it('should return the provided name, replacing dashes', () => {
      test.expect(utils.serviceNameToVarName('foo-var-name')).to.equal('foo_var_name')
    })
  })

  test.describe('extendProcessEnvVars method', () => {
    test.beforeEach(() => {
      process.env.fooVar = 'test'
    })

    test.afterEach(() => {
      delete process.env.fooVar
    })

    test.it('should return the provided object, extendend with process.env values', () => {
      const extended = utils.extendProcessEnvVars({
        fooVar2: 'testing2',
        fooVar3: 'testing3'
      })
      test.expect(extended.fooVar).to.equal('test')
      test.expect(extended.fooVar2).to.equal('testing2')
      test.expect(extended.fooVar3).to.equal('testing3')
    })
  })
})
