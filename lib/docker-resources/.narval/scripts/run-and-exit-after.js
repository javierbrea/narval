
setTimeout(() => {
  console.log(`Service timeout finished after ${process.env.exit_after}ms. Exiting...`)
  process.exit(0)
}, process.env.exit_after)

require('../../' + process.env.command_to_coverage)
