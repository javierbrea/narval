
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
  coverage: {
    from: 'fooService1'
  },
  test: {
    specs: 'foo2/specs',
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
        command: 'foo-docker-command2.js --fooParam1 --fooParam2',
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

const dockerConfigComposeResult = {
  'version': '3.5',
  'volumes': {
    'shared': {}
  },
  'services': {
    'fooContainer1': {
      'build': {
        'context': './fooImage1'
      },
      'depends_on': [],
      'volumes': [
        {
          'type': 'volume',
          'source': 'shared',
          'target': '/narval/.shared'
        },
        {
          'type': 'bind',
          'source': '../../.coverage',
          'target': '/narval/.coverage'
        },
        {
          'type': 'bind',
          'source': '../../fooPath',
          'target': '/narval/fooPath'
        },
        {
          'type': 'bind',
          'source': '../../fooPath2',
          'target': '/narval/fooPath2'
        }
      ],
      'environment': {
        'command_to_run': '${' + 'fooContainer1_command}',
        'command_params': '${' + 'fooContainer1_command_params}',
        'coverage_options': '${' + 'coverage_options}',
        'coverage_enabled': '${' + 'fooContainer1_coverage_enabled}',
        'wait_for': '${' + 'fooContainer1_wait_for}',
        'exit_after': '${' + 'fooContainer1_exit_after}'
      }
    },
    'fooContainer2': {
      'build': {
        'context': './fooImage2'
      },
      'depends_on': [],
      'volumes': [
        {
          'type': 'volume',
          'source': 'shared',
          'target': '/narval/.shared'
        },
        {
          'type': 'bind',
          'source': '../../.coverage',
          'target': '/narval/.coverage'
        },
        {
          'type': 'bind',
          'source': '../../fooPath3',
          'target': '/narval/fooPath3'
        },
        {
          'type': 'bind',
          'source': '../../fooPath4',
          'target': '/narval/fooPath4'
        }
      ],
      'environment': {
        'command_to_run': '${' + 'fooContainer2_command}',
        'command_params': '${' + 'fooContainer2_command_params}',
        'coverage_options': '${' + 'coverage_options}',
        'coverage_enabled': '${' + 'fooContainer2_coverage_enabled}',
        'wait_for': '${' + 'fooContainer2_wait_for}',
        'exit_after': '${' + 'fooContainer2_exit_after}'
      }
    },
    'fooContainer3': {
      'build': {
        'context': './fooImage2'
      },
      'depends_on': [],
      'volumes': [
        {
          'type': 'volume',
          'source': 'shared',
          'target': '/narval/.shared'
        },
        {
          'type': 'bind',
          'source': '../../.coverage',
          'target': '/narval/.coverage'
        },
        {
          'type': 'bind',
          'source': '../../fooPath5',
          'target': '/narval/fooPath5'
        },
        {
          'type': 'bind',
          'source': '../../fooPath6',
          'target': '/narval/fooPath6'
        }
      ],
      'environment': {
        'command_to_run': '${' + 'fooContainer3_command}',
        'command_params': '${' + 'fooContainer3_command_params}',
        'coverage_options': '${' + 'coverage_options}',
        'coverage_enabled': '${' + 'fooContainer3_coverage_enabled}',
        'wait_for': '${' + 'fooContainer3_wait_for}',
        'exit_after': '${' + 'fooContainer3_exit_after}'
      }
    }
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
  dockerConfigComposeResult: dockerConfigComposeResult
}
