
const tracer = require('./tracer')

process.on('message', (m) => {
  if (m && m.exit === true) {
    tracer.info('Exit signal received. Exiting coveraged service process')
    process.exit()
  }
})

require(process.env.servicePath)
