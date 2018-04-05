'use strict'

const childProcess = require('child_process')
const path = require('path')

const Boom = require('boom')
const _ = require('lodash')
const Promise = require('bluebird')
const handlebars = require('handlebars')
const fsExtra = require('fs-extra')
const fs = require('fs')

const paths = require('./paths')
const config = require('./config')
const baseDockerCompose = require('./templates/docker-compose.json')

const DOCKER_PATH = path.join('.narval', 'docker')
const DOCKER_RESOURCES_PATH = 'docker-resources'
const INSTALL_RESOURCES_PATH = 'install-resources'

let createFilesPromise

const copyDockerResources = function (destAbsolutePath) {
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
      }).then(() => {
        return Promise.resolve()
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
  return copyInstallResource(pathToCopy, destAbsolutePath)
}

const createDockerImageFiles = function (templates, imageData) {
  const imagePath = path.join(DOCKER_PATH, imageData.name)

  return Promise.all([
      paths.cwd.ensureDir(imagePath, 'docker-resources'),
      paths.cwd.ensureDir('.coverage')
    ])
    .then((absolutePath) => {
      const installResourcesPath = paths.cwd.resolve(path.join(imagePath, INSTALL_RESOURCES_PATH))
      return Promise.all([
        paths.cwd.writeFile(path.join(imagePath, 'Dockerfile'), templates.dockerFile(imageData)),
        paths.cwd.writeFile(path.join(imagePath, 'docker-resources', '.narval-install.sh'), templates.install(imageData)),
        copyDockerResources(paths.cwd.resolve(path.join(imagePath, DOCKER_RESOURCES_PATH))),
        copyInstallResources(imageData.add, installResourcesPath),
        copyInstallScript(imageData.install, installResourcesPath)
      ])
    })
}

const createDockerImagesFiles = function (data) {
  return Promise.map(data.config.dockerImages, (imageData) => {
    return createDockerImageFiles(data.templates, imageData)
  })
}

const serviceNameToVarName = function (name) {
  return name.replace(/-/g, '_')
}

const createDockerComposeFile = function (data) {
  return paths.cwd.ensureDir(DOCKER_PATH)
    .then(() => {
      let compose = _.clone(baseDockerCompose)
      _.each(data.config.dockerServices, dockerService => {
        let serviceProps = {
          build: {
            context: './' + dockerService.build.context,
            network: dockerService.build.network
          },
          depends_on: dockerService.depends_on || [],
          volumes: [{
            type: 'volume',
            source: 'shared',
            target: '/app/.shared'
          },
          {
            type: 'bind',
            source: '../../.coverage',
            target: '/app/.coverage'
          }],
          environment: {
            command_to_run: '${' + serviceNameToVarName(dockerService.name) +'_command}',
            test_specs: '${test_specs}',
            coverage_dir: '${coverage_dir}'
          }
        }
        _.each(dockerService.bind, (relativePath) => {
          serviceProps.volumes.push({
            type: 'bind',
            source: '../../' + relativePath,
            target: '/app/' + relativePath
          })
        })
        if(dockerService.network_mode) {
          serviceProps.network_mode = dockerService.network_mode
        }
        compose.services[dockerService.name] = serviceProps
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
    install: getTemplate('.narval-install.hbs')
  })
}

const createFiles = function () {
  if (!createFilesPromise) {
    createFilesPromise = Promise.props({
      config: config.get(),
      templates: getTemplates()
    }).then((data) => {
      return Promise.all([
        createDockerComposeFile(data),
        createDockerImagesFiles(data)
      ])
    })
  }
  return createFilesPromise
}

const getDockerComposeEnvVars = function (test, suiteName) {
  let vars = []
  _.each(test.services, (service) => {
    vars.push(serviceNameToVarName(service['docker-service']) + '_command="' + service.commands.docker+ '"')
  })
  vars.push(serviceNameToVarName(test.test['docker-service']) + '_command=".narval-run-test.sh"')
  vars.push('test_specs="' + test.test.specs + '"')
  vars.push('coverage_dir="' + suiteName + '/' + test.name + '"')
  return vars.join(' ')
}

const run = function (test, suiteName, options) {
  // TODO, --build option
  // TODO  docker-compose down --volumes
  // TODO --exit-code-from serviceName
  // TODO, set environment options (command line, file?)
  const envVars = getDockerComposeEnvVars(test, suiteName)
  try {
    childProcess.execSync( envVars + ' docker-compose -f docker-compose.json up --build', {
      cwd: paths.cwd.resolve(DOCKER_PATH),
      stdio: [0, 1, 2],
      shell: true,
      windowsHide: true
    })
  } catch (error) {
    return Promise.reject(Boom.badImplementation('Docker run failed'))
  }

  return Promise.resolve()
}

module.exports = {
  createFiles: createFiles,
  run: run
}
