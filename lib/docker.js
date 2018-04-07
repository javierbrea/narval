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
let hasRun

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
      paths.cwd.ensureDir(imagePath, 'docker-resources'),
      paths.cwd.ensureDir('.coverage')
    ])
    .then((absolutePath) => {
      const installResourcesPath = paths.cwd.resolve(path.join(imagePath, INSTALL_RESOURCES_PATH))
      return Promise.all([
        paths.cwd.writeFile(path.join(imagePath, 'Dockerfile'), templates.dockerFile(imageData)),
        paths.cwd.writeFile(path.join(imagePath, 'docker-resources', '.narval-install.sh'), templates.install(imageData)),
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
            test_specs: '${test_specs}',
            coverage_options: '${coverage_options}',
            coverage_enabled: '${' +  serviceVarName + '_coverage_enabled}',
            wait_for: '${' +  serviceVarName + '_wait_for}'
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

const getCoverageOptions = function (test, suiteName) {
  let options = ['|cov-option|include-all-sources|cov-option|print=detail']
  options.push('|cov-option|dir=.coverage/' + suiteName + '/' + test.name)
  return options.join('')
}

const getExitCodeFrom = function (test) {
  if(!test.coverage || !test.coverage.from) {
    return test.test['docker-service']
  }
  return test.coverage.from
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
        test_specs: '',
        coverage_options: ''
      }
      _.each(configuration.dockerServices, dockerService => {
        const serviceVarName = serviceNameToVarName(dockerService.name)
        envVars[serviceVarName +'_command'] = ''
        envVars[serviceVarName + '_coverage_enabled'] = ''
        envVars[serviceVarName + '_wait_for'] = ''
      })
      return Promise.resolve(extendProcessEnvVars(envVars))
    })
}

const composeEnvVars = function (test, suiteName) {
  let vars = {
    test_specs: test.test.specs,
    coverage_options: getCoverageOptions(test, suiteName)
  }
  let coverageFrom = (test.coverage && test.coverage.from) || null
  let testVarName = serviceNameToVarName(test.test['docker-service'])
  let testCommand = test.test.commands && test.test.commands.docker ? test.test.commands.docker : '.narval-run-test.sh'

  vars[testVarName + '_command'] = testCommand
  vars[testVarName + '_wait_for'] = getWaitFor(test.test)
  vars[testVarName + '_coverage_enabled'] = coverageIsEnabled(test, test.test['docker-service'], true)

  _.each(test.services, (service) => {
    const varName = serviceNameToVarName(service['docker-service'])
    vars[varName + '_command'] = service.commands.docker
    vars[varName + '_wait_for'] = getWaitFor(service)
    vars[varName + '_coverage_enabled'] = coverageIsEnabled(test, service['docker-service'])
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
        const build = opts.build ? '--build' : ''
        try {
          runCompose('up ' + build + ' --exit-code-from ' + exitCodeFrom, processOptions({
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
