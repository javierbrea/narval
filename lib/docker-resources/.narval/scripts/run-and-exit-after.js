
setTimeout(() => {
  process.exit(0)
}, process.env.exit_after)

require('../../' + process.env.command_to_coverage)
