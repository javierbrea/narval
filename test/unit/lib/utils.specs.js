
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
})
