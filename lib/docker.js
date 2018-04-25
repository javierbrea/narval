'use strict'

const childProcess = require('child_process')
const path = require('path')

const Boom = require('boom')
const _ = require('lodash')
const Promise = require('bluebird')
const handlebars = require('handlebars')
const fsExtra = require('fs-extra')

const paths = require('./paths')
const config = require('./config')
const options = require('./options')
const istanbulMocha = require('./istanbul-mocha')
const baseDockerCompose = require('./templates/docker-compose.json')
const dockerState = require('./docker-state')
const commands = require('./commands')
const tracer = require('./tracer')

const DOCKER_PATH = path.join('.narval', 'docker')
const DOCKER_RESOURCES_PATH = 'docker-resources'
const INSTALL_RESOURCES_PATH = 'install-resources'

const baseProcessOptions = {
  cwd: paths.cwd.resolve(DOCKER_PATH),
  encoding: 'utf8',
  stdio: [0, 1, 2],
  shell: true,
  windowsHide: true
}

const copyResources = function (destAbsolutePath) {
  return fsExtra.copy(paths.package.resolve('lib', DOCKER_RESOURCES_PATH), destAbsolutePath)
}

const copyInstallResource = function (pathToCopy, destAbsolutePath) {
  const PATH_SEP = '/'
  const normPath = path.normalize(pathToCopy).replace(/\\/g, PATH_SEP)
  const folderTree = normPath.split('/')
  const fileName = folderTree.pop()
  let relativeDestPath = destAbsolutePath
  if (folderTree.length) {
    relativeDestPath = path.join(destAbsolutePath, folderTree.join(PATH_SEP))
  }
  return paths.cwd.ensureDir(relativeDestPath)
    .then((destPath) => {
      const destFileName = path.join(destPath, fileName)
      return fsExtra.copy(paths.cwd.resolve(normPath), destFileName, {
        dereference: true,
        overwrite: true
      })
    })
}

const copyInstallResources = function (pathsToCopy, destAbsolutePath) {
  pathsToCopy = pathsToCopy || []
  return Promise.mapSeries(pathsToCopy, (pathToCopy) => {
    return copyInstallResource(pathToCopy, destAbsolutePath)
  })
}

const copyInstallScript = function (pathToCopy, destAbsolutePath) {
  if (pathToCopy) {
    return copyInstallResource(pathToCopy, destAbsolutePath)
  }
  return Promise.resolve()
}

const createImageFiles = function (templates, imageData) {
  const imagePath = path.join(DOCKER_PATH, imageData.name)

  return Promise.all([
    paths.cwd.ensureDir(imagePath, 'docker-resources', '.narval', 'scripts'),
    paths.cwd.ensureDir('.coverage')
  ])
    .then((absolutePath) => {
      const installResourcesPath = paths.cwd.resolve(path.join(imagePath, INSTALL_RESOURCES_PATH))
      return Promise.all([
        paths.cwd.writeFile(path.join(imagePath, 'Dockerfile'), templates.dockerFile(imageData)),
        paths.cwd.writeFile(path.join(imagePath, 'docker-resources', '.narval', 'scripts', 'install.sh'), templates.install(imageData)),
        copyResources(paths.cwd.resolve(path.join(imagePath, DOCKER_RESOURCES_PATH))),
        copyInstallResources(imageData.add, installResourcesPath),
        copyInstallScript(imageData.install, installResourcesPath)
      ])
    })
}

const createDockerImagesFiles = function (data) {
  return Promise.map(data.config.dockerImages, (imageData) => {
    return createImageFiles(data.templates, imageData)
  })
}

const serviceNameToVarName = function (name) {
  return name.replace(/-/g, '_')
}

const getCustomEnvVars = function (suitesByType) {
  let customVars = []
  _.each(suitesByType, (suiteType) => {
    _.each(suiteType.suites, (suite) => {
      if (suite.test && suite.test.docker && suite.test.docker.env) {
        _.each(suite.test.docker.env, (value, key) => {
          customVars.push(key)
        })
      }
      if (suite.before && suite.before.docker && suite.before.docker.env) {
        _.each(suite.before.docker.env, (value, key) => {
          customVars.push(key)
        })
      }
      _.each(suite.services, (service) => {
        if (service.docker && service.docker.env) {
          _.each(service.docker.env, (value, key) => {
            customVars.push(key)
          })
        }
      })
    })
  })
  return _.uniq(customVars)
}

const getCustomDockerEnvVars = function (suites, serviceVarName) {
  const customEnvVars = getCustomEnvVars(suites)
  let customDockerEnvVars = {}
  _.each(customEnvVars, varKey => {
    customDockerEnvVars[varKey] = '${' + serviceVarName + '_' + varKey + '}'
  })
  return customDockerEnvVars
}

const createComposeFile = function (data) {
  return paths.cwd.ensureDir(DOCKER_PATH)
    .then(() => {
      let compose = _.clone(baseDockerCompose)
      _.each(data.config.dockerContainers, dockerContainer => {
        const serviceVarName = serviceNameToVarName(dockerContainer.name)
        let serviceProps = {
          build: {
            context: './' + dockerContainer.build
          },
          depends_on: dockerContainer.depends_on || [],
          volumes: [{
            type: 'volume',
            source: 'shared',
            target: '/narval/.shared'
          },
          {
            type: 'bind',
            source: '../../.coverage',
            target: '/narval/.coverage'
          }],
          environment: _.extend({
            command_to_run: '${' + serviceVarName + '_command}',
            command_params: '${' + serviceVarName + '_command_params}',
            coverage_options: '${' + 'coverage_options}',
            coverage_enabled: '${' + serviceVarName + '_coverage_enabled}',
            wait_for: '${' + serviceVarName + '_wait_for}',
            exit_after: '${' + serviceVarName + '_exit_after}',
            narval_suite_type: '${' + serviceVarName + '_narval_suite_type}',
            narval_suite: '${' + serviceVarName + '_narval_suite}',
            narval_service: '${' + serviceVarName + '_narval_service}',
            narval_is_docker: '${' + serviceVarName + '_narval_is_docker}'
          }, getCustomDockerEnvVars(data.config.suitesByType, serviceVarName))
        }
        _.each(dockerContainer.bind, (relativePath) => {
          serviceProps.volumes.push({
            type: 'bind',
            source: '../../' + relativePath,
            target: '/narval/' + relativePath
          })
        })
        compose.services[dockerContainer.name] = serviceProps
      })
      return paths.cwd.writeFile(path.join(DOCKER_PATH, 'docker-compose.json'), JSON.stringify(compose, null, 2))
    })
}

const getTemplate = function (templateName) {
  return paths.package.readFile('lib', 'templates', templateName)
    .then(fileContent => {
      return Promise.resolve(handlebars.compile(fileContent))
    })
}

const getTemplates = function () {
  return Promise.props({
    dockerFile: getTemplate('Dockerfile.hbs'),
    install: getTemplate('install.hbs')
  })
}

const runCreateFiles = function () {
  return Promise.props({
    config: config.get(),
    templates: getTemplates()
  }).then((data) => {
    return Promise.all([
      createComposeFile(data),
      createDockerImagesFiles(data)
    ])
  })
}

const createFiles = function () {
  let createdFilesPromise = dockerState.createdFiles()
  if (!createdFilesPromise) {
    createdFilesPromise = dockerState.createdFiles(runCreateFiles())
  }
  return createdFilesPromise
}

const getWaitFor = function (test) {
  return test.docker['wait-for'] || ''
}

const getExitAfter = function (test) {
  return test.docker.exit_after || ''
}

const getExitCodeFrom = function (suite) {
  if (!suite.coverage || !suite.coverage.from || (suite.coverage.from && suite.coverage.from === 'test')) {
    return '--exit-code-from ' + suite.test.docker.container
  }
  return ''
}

const coverageIsEnabled = function (suite, serviceName, def) {
  if (!suite.coverage) {
    return def || false
  }
  if (suite.coverage.enabled === false) {
    return false
  }
  if (suite.coverage.from) {
    return suite.coverage.from === serviceName
  }
  return def || false
}

const extendProcessEnvVars = function (vars) {
  return _.extend({}, process.env, vars)
}

const addEnvironmentContainerVars = function (object, containerVarName, values) {
  _.each(values, (value, key) => {
    object[`${containerVarName}_${key}`] = value
  })
}

const composeEmptyEnvVars = function () {
  return config.get()
    .then((configuration) => {
      const customEnvVars = getCustomEnvVars(configuration.suitesByType)
      const customEnvVarsObj = {}
      let envVars = {
        coverage_options: ''
      }
      _.each(customEnvVars, (varName) => {
        customEnvVarsObj[varName] = ''
      })

      _.each(configuration.dockerContainers, dockerContainer => {
        const serviceVarName = serviceNameToVarName(dockerContainer.name)
        // TODO, add all possible custom Vars as empty values
        addEnvironmentContainerVars(envVars, serviceVarName, _.extend({
          command: '',
          command_params: '',
          coverage_enabled: '',
          wait_for: '',
          exit_after: '',
          narval_suite_type: '',
          narval_suite: '',
          narval_service: '',
          narval_is_docker: ''
        }, customEnvVarsObj))
      })
      return Promise.resolve(extendProcessEnvVars(envVars))
    })
}

const composeEnvVars = function (suite, suiteTypeName) {
  return config.get()
    .then((configuration) => {
      let configuredContainers = []
      let vars = {
        coverage_options: istanbulMocha.istanbul.params(suite, suiteTypeName)
      }
      const testDockerContainer = suite.test.docker && suite.test.docker.container
      const testCoverageIsEnabled = coverageIsEnabled(suite, 'test', true)
      const testCommand = 'narval-default-test-command'
      let testCommandParams = istanbulMocha.mocha.params(suite)

      if (!testDockerContainer) {
        return Promise.reject(Boom.notFound('No docker configuration found for test'))
      }

      let testVarName = serviceNameToVarName(testDockerContainer)
      configuredContainers.push(testDockerContainer)

      if (testCoverageIsEnabled) {
        testCommandParams = '-- ' + testCommandParams
      }

      addEnvironmentContainerVars(vars, testVarName, _.extend({
        command: testCommand,
        command_params: testCommandParams,
        coverage_enabled: testCoverageIsEnabled,
        wait_for: getWaitFor(suite.test),
        exit_after: getExitAfter(suite.test)
      }, suite.test.docker.env || {}, {
        narval_suite_type: suiteTypeName,
        narval_suite: suite.name,
        narval_service: 'test',
        narval_is_docker: true
      }))

      _.each(suite.services, (service) => {
        const serviceDockerContainer = service.docker && service.docker.container
        const commandAndParams = istanbulMocha.getCommandAndParams(service.docker.command)
        const varName = serviceNameToVarName(service.docker.container)
        const serviceCoverageIsEnabled = coverageIsEnabled(suite, service.name)
        let exitAfter = getExitAfter(service)

        if (getExitCodeFrom(suite) === '' && exitAfter === '') {
          // A service is coveraged. Set a default "exitAfter" for the service if it is not specified in the configuration.
          exitAfter = 30000
        }

        configuredContainers.push(serviceDockerContainer)

        if (serviceCoverageIsEnabled && commandAndParams.params.length) {
          commandAndParams.params = '-- ' + commandAndParams.params
        }
        addEnvironmentContainerVars(vars, varName, _.extend({
          command: commandAndParams.command,
          command_params: commandAndParams.params,
          coverage_enabled: coverageIsEnabled(suite, service.name),
          wait_for: getWaitFor(service),
          exit_after: exitAfter
        }, service.docker.env || {}, {
          narval_suite_type: suiteTypeName,
          narval_suite: suite.name,
          narval_service: service.name,
          narval_is_docker: true
        }))
      })

      _.each(configuration.dockerContainers, dockerContainer => {
        let varName
        if (configuredContainers.indexOf(dockerContainer.name) < 0 && getExitCodeFrom(suite) === '') {
          // There is no service configured for this container. If one service is coveraged and docker is started with no "exitCodeFrom" option, it must exit once it is started.
          varName = serviceNameToVarName(dockerContainer.name)
          addEnvironmentContainerVars(vars, varName, {
            exit_after: '0'
          })
        }
      })

      return Promise.resolve(extendProcessEnvVars(vars))
    })
}

const processOptions = function (extraOptions) {
  return (_.extend({}, baseProcessOptions, extraOptions))
}

const runCompose = function (command, options) {
  return childProcess.execSync('docker-compose -f docker-compose.json ' + command, options)
}

const downVolumes = function (suitesByType) {
  if (!dockerState.executed()) {
    return Promise.resolve()
  }
  return composeEmptyEnvVars()
    .then((vars) => {
      return new Promise((resolve, reject) => {
        try {
          runCompose('down --volumes', processOptions({
            env: vars
          }))
          resolve()
        } catch (error) {
          reject(Boom.badImplementation('Docker compose down-volumes failed'))
        }
      })
    })
}

const composeUp = function (envVars, exitCodeFrom) {
  return options.get()
    .then(opts => {
      return new Promise((resolve, reject) => {
        let build = ''
        if (opts.build && !dockerState.built()) {
          dockerState.built(true)
          build = '--build'
        }
        try {
          runCompose('up ' + build + ' ' + exitCodeFrom, processOptions({
            env: envVars
          }))
          resolve()
        } catch (error) {
          reject(Boom.badImplementation('Docker run failed'))
        }
      })
    })
}

const checkComposeOut = function (envVars) {
  return new Promise((resolve, reject) => {
    let error = false
    const result = runCompose('ps -q | xargs docker inspect -f \'{{ .Name }} exited with status {{ .State.ExitCode }}\'', processOptions({
      stdio: 'pipe'
    }))
    const results = _.compact(result.split('\n'))
    _.each(results, (result) => {
      if (!result.includes('status 0') && !result.includes('status 137')) {
        error = true
      }
    })
    if (error) {
      reject(Boom.expectationFailed('Docker container exited with error:\n' + result))
    } else {
      resolve()
    }
  })
}

const runDownVolumes = function (suite) {
  return suite.before && suite.before.docker && suite.before.docker['down-volumes'] ? downVolumes() : Promise.resolve()
}

const runBefore = function (suite, suiteTypeName) {
  if (suite.before && suite.before.docker && suite.before.docker.command) {
    tracer.debug(`Executing before command "${suite.before.docker.command}"`)
    return commands.run(suite.before.docker.command, {
      sync: true,
      env: _.extend({
        narval_suite_type: suiteTypeName,
        narval_suite: suite.name,
        narval_service: 'clean',
        narval_is_docker: false
      },
      (suite.before && suite.before.docker && suite.before.docker.env) || {}
      )
    })
  }
  return Promise.resolve()
}

const clean = function (suite, suiteTypeName) {
  return runBefore(suite, suiteTypeName)
    .then(() => {
      return runDownVolumes(suite)
    })
}

const run = function (suite, suiteTypeName) {
  dockerState.executed(true)
  return composeEnvVars(suite, suiteTypeName)
    .then((envVars) => {
      return clean(suite, suiteTypeName)
        .then(() => {
          return composeUp(envVars, getExitCodeFrom(suite))
            .then(() => {
              return checkComposeOut(envVars)
            })
        })
    })
}

module.exports = {
  createFiles: createFiles,
  downVolumes: downVolumes,
  run: run
}
