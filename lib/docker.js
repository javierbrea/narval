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
const options = require('./options')
const istanbulMocha = require('./istanbul-mocha')
const baseDockerCompose = require('./templates/docker-compose.json')

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

let createFilesPromise
let hasRun = false
let built = false

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

const createComposeFile = function (data) {
  return paths.cwd.ensureDir(DOCKER_PATH)
    .then(() => {
      let compose = _.clone(baseDockerCompose)
      _.each(data.config.dockerServices, dockerService => {
        const serviceVarName = serviceNameToVarName(dockerService.name)
        let serviceProps = {
          build: {
            context: './' + dockerService.build
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
            command_to_run: '${' + serviceVarName +'_command}',
            command_params: '${' + serviceVarName +'_command_params}',
            coverage_options: '${coverage_options}',
            coverage_enabled: '${' +  serviceVarName + '_coverage_enabled}',
            wait_for: '${' +  serviceVarName + '_wait_for}',
            exit_after: '${' +  serviceVarName + '_exit_after}'
          }
        }
        _.each(dockerService.bind, (relativePath) => {
          serviceProps.volumes.push({
            type: 'bind',
            source: '../../' + relativePath,
            target: '/app/' + relativePath
          })
        })
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
    install: getTemplate('install.hbs')
  })
}

const createFiles = function () {
  if (!createFilesPromise) {
    createFilesPromise = Promise.props({
      config: config.get(),
      templates: getTemplates()
    }).then((data) => {
      return Promise.all([
        createComposeFile(data),
        createDockerImagesFiles(data)
      ])
    })
  }
  return createFilesPromise
}

const getWaitFor = function (test) {
  return test['wait-for'] || ''
}

const getExitAfter = function (test) {
  return test['exit_after'] || ''
}

const getCoverageOptions = function (test, suiteName) {
  let baseConfig = {
    dir: '.coverage/' + suiteName + '/' + test.name
  }
  const config = _.extend(baseConfig, test.coverage && test.coverage.config || {})
  return istanbulMocha.istanbul.config(config)
}

const getExitCodeFrom = function (test) {
  if(!test.coverage || !test.coverage.from) {
    return '--exit-code-from ' + test.test['docker-service']
  }
  return ''
}

const coverageIsEnabled = function (test, serviceName, def) {
  if(!test.coverage) {
    return def || false
  }
  if (test.coverage.disabled) {
    return false
  }
  if (test.coverage.from) {
    return test.coverage.from === serviceName
  }
  return def || false
}

const extendProcessEnvVars = function (vars) {
  return _.extend({}, process.env, vars)
}

const composeEmptyEnvVars = function () {
  return config.get()
    .then((configuration) => {
      let envVars = {
        coverage_options: ''
      }
      _.each(configuration.dockerServices, dockerService => {
        const serviceVarName = serviceNameToVarName(dockerService.name)
        envVars[serviceVarName +'_command'] = ''
        envVars[serviceVarName +'_command_params'] = ''
        envVars[serviceVarName + '_coverage_enabled'] = ''
        envVars[serviceVarName + '_wait_for'] = ''
        envVars[serviceVarName + '_exit_after'] = ''
      })
      return Promise.resolve(extendProcessEnvVars(envVars))
    })
}

const getCommandAndParams = function (command) {
  if (!command) {
    return null
  }
  let splitted = command.split(' ')
  return {
    command: splitted.shift(),
    params: splitted.join(' ')
  }
}

const composeEnvVars = function (test, suiteName) {
  let vars = {
    coverage_options: getCoverageOptions(test, suiteName)
  }
  const testCoverageIsEnabled = coverageIsEnabled(test, test.test['docker-service'], true)
  const testCommandAndParams = getCommandAndParams(test.test.commands && test.test.commands.docker)
  
  let coverageFrom = (test.coverage && test.coverage.from) || null
  let testVarName = serviceNameToVarName(test.test['docker-service'])

  let testCommand = testCommandAndParams ? testCommandAndParams.command : 'narval-default-test-command'
  let testCommandParams = testCommandAndParams ? testCommandAndParams.params : istanbulMocha.mocha.config(test.test.config, test.test.specs)

  if(testCoverageIsEnabled) {
    testCommandParams = '-- ' + testCommandParams
  }

  vars[testVarName + '_command'] = testCommand
  vars[testVarName + '_command_params'] = testCommandParams
  vars[testVarName + '_wait_for'] = getWaitFor(test.test)
  vars[testVarName + '_coverage_enabled'] = testCoverageIsEnabled
  vars[testVarName + '_exit_after'] = getExitAfter(test.test)

  _.each(test.services, (service) => {
    const commandAndParams = getCommandAndParams(service.commands.docker)
    const varName = serviceNameToVarName(service['docker-service'])
    const serviceCoverageIsEnabled = coverageIsEnabled(test, service['docker-service'])
    if (serviceCoverageIsEnabled && commandAndParams.params.length) {
      commandAndParams.params = '-- ' + commandAndParams.params
    }
    vars[varName + '_command'] = commandAndParams.command
    vars[varName + '_command_params'] = commandAndParams.params
    vars[varName + '_wait_for'] = getWaitFor(service)
    vars[varName + '_coverage_enabled'] = coverageIsEnabled(test, service['docker-service'])
    vars[varName + '_exit_after'] = getExitAfter(service)
  })

  return Promise.resolve(extendProcessEnvVars(vars))
}

const processOptions = function (extraOptions) {
  return (_.extend({}, baseProcessOptions, extraOptions))
}

const runCompose = function (command, options) {
  return childProcess.execSync('docker-compose -f docker-compose.json ' + command, options)
}

const downVolumes = function (envVars) {
  if(!hasRun) {
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
        if(opts.build && !built) {
          built = true
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
    if(error) {
      reject(Boom.expectationFailed('Docker container exited with error:\n' + result))
    } else {
      resolve()
    }
  })
}

const run = function (test, suiteName, options) {
  hasRun = true
  return composeEnvVars(test, suiteName)
    .then((envVars) => {
      const runDownVolumes = test['docker-compose-down'] ? downVolumes() : Promise.resolve()
      const exitCodeFrom = getExitCodeFrom(test)
      return runDownVolumes
        .then(() => {
          return composeUp(envVars, exitCodeFrom)
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
