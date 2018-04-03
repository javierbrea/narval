
const options = require('commander')
 
options
  .option('-s, --standard', 'Run standard')
  .option('-u, --unit', 'Run integration tests')
  .option('-i, --integration', 'Run integration tests')
  .option('-e, --end-to-end, --end', 'Run end-to-end tests')
  .parse(process.argv)

  module.exports = options
