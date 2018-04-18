
const fs = require('fs')

const test = require('../../../index')

const Mock = function () {
  const sandbox = test.sinon.sandbox.create()
  let readFileFake
  let writeFileFake
  let readFileStub
  let writeFileStub

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
  writeFileFake = new WriteFileFake()
  readFileStub = sandbox.stub(fs, 'readFile').callsFake(readFileFake.fake)
  writeFileStub = sandbox.stub(fs, 'writeFile').callsFake(writeFileFake.fake)

  readFileStub.returns = readFileFake.returns
  writeFileStub.returns = writeFileFake.returns

  const stubs = {
    readFile: readFileStub,
    writeFile: writeFileStub
  }

  const restore = function () {
    sandbox.restore()
  }

  return {
    stubs: stubs,
    restore: restore
  }
}

module.exports = Mock
