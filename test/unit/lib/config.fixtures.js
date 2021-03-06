
const emptyResult = {
  dockerImages: [],
  dockerContainers: [],
  standard: {},
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
  standard: {},
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
  standard: {},
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
  standard: {},
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
        command: 'foo-local-command',
        env: {
          fooEnvVar1: 'fooEnvironment var 1',
          fooEnvVar2: 'fooEnv2'
        }
      }
    },
    {
      name: 'fooService2',
      local: {
        command: 'foo-local-command2.js --fooParam1 --fooParam2',
        env: {
          fooEnv: 'fooEnv value'
        }
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
  describe: 'Foo description',
  coverage: {
    from: 'fooService1'
  },
  test: {
    specs: 'foo2/specs',
    docker: {
      container: 'fooContainer3',
      'wait-on': 'fooService1:3000'
    }
  },
  services: [
    {
      name: 'fooService1',
      docker: {
        container: 'fooContainer1',
        command: 'foo-docker-command2.js --fooParam1 --fooParam2',
        env: {
          fooVar: 'foo value'
        },
        exit_after: 10000
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
      'foo-package.json',
      'test/foo/package/testing.json',
      'test/foo/folder'
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

const fullConfig = {
  standard: {},
  'docker-images': dockerConfig.dockerImages,
  'docker-containers': dockerConfig.dockerContainers,
  suites: {
    fooType: [{
      name: 'fooDockerSuite',
      before: {
        docker: {
          env: {
            fooBeforeVar: 'foo'
          }
        }
      },
      services: [
        {
          name: 'fooService1',
          docker: {
            container: 'fooContainer1',
            command: 'foo-docker-command2.js --fooParam1 --fooParam2',
            env: {
              fooService1Var: 'foo value'
            },
            exit_after: 10000
          }
        },
        {
          name: 'fooService2',
          docker: {
            container: 'fooContainer2',
            env: {
              fooService2Var: false
            },
            command: 'foo-docker-command'
          }
        }
      ],
      coverage: {
        from: 'fooService1'
      },
      test: {
        specs: 'foo2/specs',
        docker: {
          container: 'fooContainer3',
          'wait-for': 'fooService1:3000',
          env: {
            fooTestVar: true,
            fooService2Var: true
          }
        }
      }
    }],
    fooType2: [{
      name: 'fooDockerSuite2',
      before: {
      },
      services: [
        {
          name: 'fooService1',
          docker: {
            container: 'fooContainer1',
            command: 'foo-docker-command2.js --fooParam1 --fooParam2',
            env: {
              fooService1Var: 'foo value'
            },
            exit_after: 10000
          }
        },
        {
          name: 'fooService2',
          docker: {
            container: 'fooContainer2',
            env: {
              fooService2Var: false
            },
            command: 'foo-docker-command'
          }
        }
      ],
      coverage: {
        from: 'fooService1'
      },
      test: {
        specs: 'foo2/specs',
        docker: {
          container: 'fooContainer3',
          'wait-for': 'fooService1:3000',
          env: {
            fooTestVar: true,
            fooService2Var: true
          }
        }
      }
    }]
  }
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
  dockerConfig: dockerConfig,
  dockerConfigComposeResult: require('./docker-compose.fixture.json'),
  standard: {
    empty: {
      directories: []
    },
    customDirs: {
      directories: [
        'fooPath/*.*',
        'fooPath2/**/*.*'
      ]
    }
  },
  fullConfig: fullConfig
}
