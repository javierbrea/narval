'use strict'

const path = require('path')

const _ = require('lodash')
const Promise = require('bluebird')
const handlebars = require('handlebars')
const fsExtra = require('fs-extra')

const paths = require('./paths')
const config = require('./config')
const baseDockerCompose = require('./templates/docker-compose.json')
const states = require('./states')
const utils = require('./utils')
const commands = require('./commands')

const DOCKER_RESOURCES_PATH = 'docker-resources'
const INSTALL_RESOURCES_PATH = 'install-resources'

const copyResources = function (destAbsolutePath) {
  return fsExtra.copy(paths.package.resolve('lib', DOCKER_RESOURCES_PATH), destAbsolutePath)
}

const copyInstallResource = function (pathToCopy, destAbsolutePath) {
  const PATH_SEP = '/'
  const normPath = path.normalize(pathToCopy).replace(/\\/g, PATH_SEP)
  const folderTree = normPath.split(PATH_SEP)
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

const createImageFiles = function (imageData) {
  return getTemplates().then((templates) => {
    const imagePath = path.join(paths.docker(), imageData.name)
    const installResourcesPath = paths.cwd.resolve(path.join(imagePath, INSTALL_RESOURCES_PATH))
    const scriptsPath = path.join(imagePath, 'docker-resources', '.narval', 'scripts')

    return Promise.all([
      paths.cwd.ensureDir(installResourcesPath),
      paths.cwd.ensureDir(scriptsPath),
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
  })
}

const createDockerImagesFiles = function () {
  return config.dockerImages()
    .then((dockerImages) => {
      return Promise.map(dockerImages, createImageFiles)
    })
}

const getCustomDockerComposeEnvVars = function (customEnvVars, serviceVarName) {
  let customDockerEnvVars = {}
  _.each(customEnvVars, varKey => {
    customDockerEnvVars[varKey] = '${' + serviceVarName + '_' + varKey + '}'
  })
  return customDockerEnvVars
}

const createComposeFile = function () {
  return Promise.props({
    dockerContainers: config.dockerContainers(),
    customEnvVars: config.allDockerCustomEnvVars(),
    dockerPath: paths.cwd.ensureDir(paths.docker())
  }).then((data) => {
    let compose = _.clone(baseDockerCompose)
    _.each(data.dockerContainers, dockerContainer => {
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
        environment: Object.assign({
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
        }, getCustomDockerComposeEnvVars(data.customEnvVars, serviceVarName))
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

const runCreateFiles = function () {
  return Promise.all([
    createComposeFile(),
    createDockerImagesFiles()
  ])
}

const createFiles = function () {
  const stateKey = 'docker-create-files'
  if (!states.get(stateKey)) {
    states.set(stateKey, runCreateFiles())
  }
  return states.get(stateKey)
}

const downVolumes = function () {
  if (!states.get('docker-executed')) {
    return Promise.resolve()
  }
  return config.allComposeEnvVars()
    .then((vars) => {
      return commands.runComposeSync('down --volumes', {
        env: vars
      })
    })
}

module.exports = {
  createFiles: createFiles,
  downVolumes: downVolumes
}
