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
const baseDockerCompose = require('./templates/docker-compose.json')
const states = require('./states')
const tracer = require('./tracer')
const utils = require('./utils')

const DOCKER_RESOURCES_PATH = 'docker-resources'
const INSTALL_RESOURCES_PATH = 'install-resources'

const baseProcessOptions = {
  cwd: paths.docker(),
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
  const imagePath = path.join(paths.docker(), imageData.name)
  const installResourcesPath = paths.cwd.resolve(path.join(imagePath, INSTALL_RESOURCES_PATH))
  const scriptsPath = path.join(imagePath, 'docker-resources', '.narval', 'scripts')

  return Promise.all([
    paths.cwd.ensureDir(scriptsPath),
    paths.cwd.ensureDir(installResourcesPath),
    paths.cwd.ensureDir(imagePath, 'docker-resources', '.narval', 'scripts'),
    paths.cwd.ensureDir('.coverage')
  ])
    .then((absolutePath) => {
      return Promise.all([
        paths.cwd.writeFile(path.join(imagePath, 'Dockerfile'), templates.dockerFile(imageData)),
        paths.cwd.writeFile(path.join(scriptsPath, 'install.sh'), templates.install(imageData)),
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
  return paths.cwd.ensureDir(paths.docker())
    .then(() => {
      let compose = _.clone(baseDockerCompose)
      _.each(data.config.dockerContainers, dockerContainer => {
        const serviceVarName = utils.serviceNameToVarName(dockerContainer.name)
        let serviceProps = {
          build: {
            context: './' + dockerContainer.build
          },
          volumes: [{
            type: 'volume',
            source: 'shared',
            target: '/narval/.shared'
          },
          {
            type: 'bind',
            source: '../../.coverage',
            target: '/narval/.coverage'
          },
          {
            type: 'bind',
            source: '../../.narval/logs',
            target: '/narval/.narval/logs'
          }],
          environment: _.extend({
            command_to_run: '${' + serviceVarName + '_command}',
            command_params: '${' + serviceVarName + '_command_params}',
            coverage_options: '${' + 'coverage_options}',
            coverage_enabled: '${' + serviceVarName + '_coverage_enabled}',
            wait_on: '${' + serviceVarName + '_wait_on}',
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
            source: `../../${relativePath}`,
            target: `/narval/${relativePath}`
          })
        })
        compose.services[dockerContainer.name] = serviceProps
      })
      return paths.cwd.writeFile(path.join(paths.docker(), 'docker-compose.json'), JSON.stringify(compose, null, 2))
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
  const stateKey = 'docker-create-files'
  if (!states.get(stateKey)) {
    states.set(stateKey, runCreateFiles())
  }
  return states.get(stateKey)
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
        const serviceVarName = utils.serviceNameToVarName(dockerContainer.name)
        addEnvironmentContainerVars(envVars, serviceVarName, _.extend({
          command: '',
          command_params: '',
          coverage_enabled: '',
          wait_on: '',
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

const processOptions = function (extraOptions) {
  return (_.extend({}, baseProcessOptions, extraOptions))
}

const runComposeSync = function (command, options) {
  return new Promise((resolve, reject) => {
    tracer.log(`Running Docker command "docker-compose ${command}"`)
    try {
      childProcess.execSync(`docker-compose -f docker-compose.json ${command}`, processOptions(options))
      resolve()
    } catch (error) {
      reject(Boom.badImplementation(`Docker compose command "${command}" failed`))
    }
  })
}

const downVolumes = function () {
  if (!states.get('docker-executed')) {
    return Promise.resolve()
  }
  return composeEmptyEnvVars()
    .then((vars) => {
      return runComposeSync('down --volumes', {
        env: vars
      })
    })
}

module.exports = {
  createFiles: createFiles,
  downVolumes: downVolumes,
  runComposeSync: runComposeSync
}
