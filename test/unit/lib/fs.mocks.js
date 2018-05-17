
const fs = require('fs')

const test = require('../../../index')

const Mock = function () {
  const sandbox = test.sinon.sandbox.create()
  let readFileFake
  let writeFileFake
  let readFileStub
  let writeFileStub
  let writeFileSyncStub
  let openFileFake
  let openFileStub
  let appendFileFake
  let appendFileStub
  let closeFileFake
  let closeFileStub

  const ReadFileFake = function () {
    let errorToReturn
    let dataToReturn

    const fake = function (filePath, encoding, cb) {
      cb(errorToReturn, dataToReturn)
    }

    const returns = function (error, data) {
      errorToReturn = error
      dataToReturn = data
    }

    return {
      fake: fake,
      returns: returns
    }
  }

  const CloseFileFake = function () {
    let errorToReturn
    let dataToReturn

    const fake = function (filePath, cb) {
      cb(errorToReturn, dataToReturn)
    }

    const returns = function (error, data) {
      errorToReturn = error
      dataToReturn = data
    }

    return {
      fake: fake,
      returns: returns
    }
  }

  const WriteFileFake = function () {
    let errorToReturn
    let dataToReturn

    const fake = function (filePath, content, encoding, cb) {
      cb(errorToReturn, dataToReturn)
    }

    const returns = function (error, data) {
      errorToReturn = error
      dataToReturn = data
    }

    return {
      fake: fake,
      returns: returns
    }
  }

  readFileFake = new ReadFileFake()
  openFileFake = new ReadFileFake()
  appendFileFake = new WriteFileFake()
  closeFileFake = new CloseFileFake()
  writeFileFake = new WriteFileFake()

  openFileStub = sandbox.stub(fs, 'open').callsFake(openFileFake.fake)
  closeFileStub = sandbox.stub(fs, 'close').callsFake(closeFileFake.fake)
  readFileStub = sandbox.stub(fs, 'readFile').callsFake(readFileFake.fake)
  appendFileStub = sandbox.stub(fs, 'appendFile').callsFake(appendFileFake.fake)
  writeFileStub = sandbox.stub(fs, 'writeFile').callsFake(writeFileFake.fake)
  writeFileSyncStub = sandbox.stub(fs, 'writeFileSync')

  readFileStub.returns = readFileFake.returns
  openFileStub.returns = openFileFake.returns
  closeFileStub.returns = closeFileFake.returns
  appendFileStub.returns = appendFileFake.returns
  writeFileStub.returns = writeFileFake.returns

  const restore = function () {
    sandbox.restore()
  }

  return {
    stubs: {
      open: openFileStub,
      close: closeFileStub,
      readFile: readFileStub,
      appendFile: appendFileStub,
      writeFile: writeFileStub,
      writeFileSync: writeFileSyncStub
    },
    restore: restore
  }
}

module.exports = Mock
