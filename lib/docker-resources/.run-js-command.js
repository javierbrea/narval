
setTimeout(() => {
  process.exit(0)
}, process.env.kill_after)

require('./' + process.env.command_to_coverage)
