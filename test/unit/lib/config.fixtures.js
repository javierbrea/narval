
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

const localSuite = {
  name: 'fooLocalSuite',
  test: {
    specs: 'foo/path/specs'
  },
  services: [
    {
      name: 'fooService',
      local: {
        command: 'foo-local-command'
      }
    },
    {
      name: 'fooService2',
      local: {
        command: 'foo-local-command2.js --fooParam1 --fooParam2'
      }
    }
  ]
}

const localSuiteWithNoService = {
  name: 'fooLocalSuite2',
  test: {
    specs: 'foo/path/specs'
  }
}

const dockerSuite = {
  name: 'fooDockerSuite',
  test: {
    specs: 'foo2/specs',
    coverage: {
      from: 'fooService1'
    },
    docker: {
      container: 'fooContainer3',
      'wait-for': 'fooService1:3000'
    }
  },
  services: [
    {
      name: 'fooService1',
      docker: {
        container: 'fooContainer1',
        command: 'foo-docker-command2.js --fooParam1 --fooParam2'
      }
    },
    {
      name: 'fooService2',
      docker: {
        container: 'fooContainer2',
        command: 'foo-docker-command'
      }
    }
  ]
}

const dockerConfig = {
  dockerImages: [{
    name: 'fooImage1',
    from: 'foo-docker-base-image',
    add: [
      'foo-package.json'
    ],
    expose: [
      3000
    ],
    install: 'test/docker/install'
  }, {
    name: 'fooImage2',
    from: 'foo-docker-base-image-2'
  }],
  dockerContainers: [{
    name: 'fooContainer1',
    build: 'fooImage1',
    bind: [
      'fooPath',
      'fooPath2'
    ]
  }, {
    name: 'fooContainer2',
    build: 'fooImage2',
    bind: [
      'fooPath3',
      'fooPath4'
    ]
  },
  {
    name: 'fooContainer3',
    build: 'fooImage2',
    bind: [
      'fooPath5',
      'fooPath6'
    ]
  }],
  suitesByType: [
    {
      name: 'fooType',
      suites: [dockerSuite]
    }
  ]
}

module.exports = {
  emptyResult: emptyResult,
  defaultSuites: defaultSuites,
  defaultResult: defaultResult,
  customConfig: customConfig,
  customResult: customResult,
  manySuitesAndTypes: manySuitesAndTypes,
  localSuite: localSuite,
  localSuiteWithNoService: localSuiteWithNoService,
  dockerSuite: dockerSuite,
  dockerConfig: dockerConfig
}