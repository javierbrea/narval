
const emptyResult = {
  dockerImages: [],
  dockerContainers: [],
  suitesByType: []
}

const customConfig = {
  suites: {
    fooCustomType: [
      {
        name: 'fooCustomSuite'
      }
    ]
  }
}

const customResult = {
  dockerImages: [],
  dockerContainers: [],
  suitesByType: [{
    name: 'fooCustomType',
    suites: [{
      name: 'fooCustomSuite'
    }]
  }]
}

const defaultSuites = {
  fooType: [
    {
      name: 'fooSuite'
    }
  ]
}

const defaultResult = {
  dockerImages: [],
  dockerContainers: [],
  suitesByType: [
    {
      name: 'fooType',
      suites: [{
        name: 'fooSuite'
      }]
    }
  ]
}

module.exports = {
  emptyResult: emptyResult,
  defaultSuites: defaultSuites,
  defaultResult: defaultResult,
  customConfig: customConfig,
  customResult: customResult
}
