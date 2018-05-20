
const logs = require('./logs')

process.on('message', (m) => {
  if (m && m.exit === true) {
    logs.exitSignalReceived()
    process.exit()
  }
})

require(process.env.servicePath)
