
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

const manySuitesAndTypes = {
  dockerImages: [],
  dockerContainers: [],
  suitesByType: [
    {
      name: 'fooType',
      suites: [{
        name: 'fooSuite'
      },
      {
        name: 'fooSuite2',
        services: [
          {
            name: 'fooService'
          }
        ]
      }]
    },
    {
      name: 'fakeType',
      suites: [{
        name: 'fooDockerSuite',
        test: {
          docker: {
            container: 'test-container'
          }
        }
      }, {
        name: 'fooDockerSuite2',
        services: [
          {
            name: 'fooService',
            docker: {
              container: 'foo-service-container'
            }
          }
        ]
      }]
    }
  ]
}

module.exports = {
  emptyResult: emptyResult,
  defaultSuites: defaultSuites,
  defaultResult: defaultResult,
  customConfig: customConfig,
  customResult: customResult,
  manySuitesAndTypes: manySuitesAndTypes
}
