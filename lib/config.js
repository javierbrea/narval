'use strict'

const Promise = require('bluebird')
const yaml = require('js-yaml')
const fs = require('fs')
const _ = require('lodash')
const Boom = require('boom')

const paths = require('./paths')
const tracer = require('./tracer')
const utils = require('./utils')
const waitOn = require('./wait-on')

const MOCHA_DEFAULT = {
  recursive: true,
  colors: true,
  reporter: 'spec'
}

const ISTANBUL_DEFAULT = {
  'include-all-sources': true,
  root: '.',
  colors: true,
  print: 'summary'
}

let getPromise

const readFile = function (filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, {
      encoding: 'utf8'
    }, (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(data)
    })
  })
}

const readYaml = function (fileContent) {
  return Promise.resolve(yaml.safeLoad(fileContent))
}

const readConfig = function (filePath) {
  return readFile(filePath)
    .catch((e) => {
      tracer.warn(`Config file ${filePath} not found`)
      return Promise.resolve('')
    })
    .then(readYaml)
    .then(config => {
      config = config || {}
      return Promise.resolve(config)
    })
}

const readCustom = function () {
  return readConfig(paths.customConfig())
}

const readDefault = function () {
  return readConfig(paths.defaultConfig())
}

const getSuitesByType = function (customConfig, defaultConfig) {
  if (!customConfig || !customConfig.suites) {
    customConfig.suites = defaultConfig
  }
  return Promise.resolve(_.compact(_.map(customConfig.suites, (properties, suiteTypeName) => {
    let suiteTypeData = {
      name: suiteTypeName,
      suites: properties
    }
    // TODO, validate suite config, use Joi
    return suiteTypeData
  })))
}

const checkDockerImages = function (customConfig) {
  // TODO, check docker images, use Joi
  return customConfig['docker-images'] || []
}

const checkDockerContainers = function (customConfig) {
  // TODO, check docker containers, use Joi
  return customConfig['docker-containers'] || []
}

const checkStandardConfig = function (customConfig) {
  return customConfig.standard || {}
}

const checkConfig = function (configs) {
  return Promise.props({
    standard: checkStandardConfig(configs.custom),
    dockerImages: checkDockerImages(configs.custom),
    dockerContainers: checkDockerContainers(configs.custom),
    suitesByType: getSuitesByType(configs.custom, configs.default)
  })
}

const get = function (options = {}) {
  if (!getPromise || options.cleanCache) {
    getPromise = Promise.props({
      custom: readCustom(),
      default: readDefault()
    }).then(checkConfig)
  }
  return getPromise
}

const standard = function () {
  return get()
    .then(config => {
      config.standard = config.standard || {}
      let directories = config.standard.directories || []
      if (_.isString(directories)) {
        directories = directories.split(' ')
      }
      return Promise.resolve({
        directories: directories
      })
    })
}

const suitesByType = function () {
  return get()
    .then(config => {
      return Promise.resolve(config.suitesByType)
    })
}

const mochaArguments = new utils.ObjectToArguments(MOCHA_DEFAULT)
const istanbulArguments = new utils.ObjectToArguments(ISTANBUL_DEFAULT, '=', ['x', 'i'])

const SuiteResolver = function (suiteData, suiteTypeName, options) {
  const name = suiteData.name
  const baseEnvVars = {
    narval_suite_type: suiteTypeName,
    narval_suite: name
  }
  let _isDocker = null
  let _modeKey = null

  const getName = function () {
    return name
  }

  const typeName = function () {
    return suiteTypeName
  }

  const istanbulArgs = function () {
    let baseConfig = {
      dir: `.coverage/${suiteTypeName}/${name}`
    }
    const config = _.extend({}, baseConfig, (suiteData.coverage && suiteData.coverage.config) || {})
    return istanbulArguments(config)
  }

  const mochaArgs = function () {
    return mochaArguments(suiteData.test.config, suiteData.test.specs)
  }

  const hasToRun = function () {
    return !options.suite || options.suite === name
  }

  const isDocker = function () {
    let hasDockerService = false
    if (options.local) {
      return false
    }
    if (suiteData.test && suiteData.test.docker && suiteData.test.docker.container) {
      return true
    }
    _.each(suiteData.services, (service) => {
      if (service.docker && service.docker.container) {
        hasDockerService = true
      }
    })

    return hasDockerService
  }

  const modeKey = function () {
    return _isDocker ? 'docker' : 'local'
  }

  const runSingleTest = function () {
    return _.isString(options.local) && options.local === 'test'
  }

  const beforeCommand = function () {
    return suiteData.before && suiteData.before[_modeKey] && suiteData.before[_modeKey].command
  }

  const testWaitOn = function () {
    return suiteData.test[_modeKey] && suiteData.test[_modeKey]['wait-on']
  }

  const testIsCoveraged = function () {
    return !suiteData.coverage || ((!suiteData.coverage.from || suiteData.coverage.from === 'test') && suiteData.coverage.enabled !== false)
  }

  const coverageFromService = function () {
    return suiteData.coverage && suiteData.coverage.from && suiteData.coverage.from !== 'test'
  }

  const getEnvVars = function (confObj, serviceName) {
    const envVars = Object.assign({}, baseEnvVars, {
      narval_service: serviceName,
      narval_is_docker: _isDocker
    })
    const customEnvVars = confObj && confObj[_modeKey] && confObj[_modeKey].env
    return Object.assign(envVars, customEnvVars)
  }

  const beforeEnvVars = function () {
    return getEnvVars(suiteData.before, 'before')
  }

  const testEnvVars = function () {
    return getEnvVars(suiteData.test, 'test')
  }

  const getServiceData = function (serviceName) {
    let serviceConfig
    _.each(suiteData.services, (service) => {
      if (service.name === serviceName) {
        serviceConfig = service
      }
    })
    if (serviceConfig) {
      return serviceConfig
    }
    throw new Error(Boom.notFound(`The service ${serviceName} was not found`))
  }

  const Service = function (serviceData) {
    serviceData = _.isString(serviceData) ? getServiceData(serviceData) : serviceData
    const _name = serviceData.name

    const waitOn = function () {
      return serviceData[_modeKey] && serviceData[_modeKey]['wait-on']
    }

    const command = function () {
      return serviceData[_modeKey] && serviceData[_modeKey].command
    }

    const isCoveraged = function () {
      return suiteData.coverage && suiteData.coverage.from === _name && suiteData.coverage.enabled !== false
    }

    const envVars = function () {
      return getEnvVars(serviceData, _name)
    }

    const abortOnError = function () {
      return isCoveraged() ? true : !!serviceData['abort-on-error']
    }

    const name = function () {
      return _name
    }

    const dockerContainer = function () {
      return serviceData.docker && serviceData.docker.container
    }

    const exitAfter = function () {
      return (serviceData.docker && serviceData.docker.exit_after) || ''
    }

    return {
      waitOn: waitOn,
      command: command,
      isCoveraged: isCoveraged,
      envVars: envVars,
      abortOnError: abortOnError,
      name: name,
      dockerContainer: dockerContainer,
      exitAfter: exitAfter
    }
  }

  const singleServiceToRun = function () {
    return _.isString(options.local) && options.local !== 'test' ? new Service(options.local) : false
  }

  const services = function () {
    return _.map(suiteData.services, (serviceData) => {
      return new Service(serviceData)
    })
  }

  const runDownVolumes = function () {
    return suiteData.before && suiteData.before.docker && suiteData.before.docker['down-volumes']
  }

  const buildDocker = function () {
    return options.build
  }

  const addEnvironmentContainerVars = function (object, containerVarName, values) {
    _.each(values, (value, key) => {
      object[`${containerVarName}_${key}`] = value
    })
  }

  const testDockerContainer = function () {
    return suiteData.test && suiteData.test.docker && suiteData.test.docker.container
  }

  const dockerEnvVars = function () {
    let vars = {
      coverage_options: istanbulArgs()
    }
    const _testDockerContainer = testDockerContainer()
    const testCommand = 'narval-default-test-command'
    const testCoverageIsEnabled = testIsCoveraged()
    const testVarName = utils.serviceNameToVarName(_testDockerContainer)
    let testCommandParams = mochaArgs()

    if (!_testDockerContainer) {
      throw new Error(Boom.notFound('No docker configuration found for test'))
    }

    if (testCoverageIsEnabled) {
      testCommandParams = '-- ' + testCommandParams
    }

    addEnvironmentContainerVars(vars, testVarName, Object.assign({
      command: testCommand,
      command_params: testCommandParams,
      coverage_enabled: testCoverageIsEnabled,
      wait_on: waitOn.configToArguments(testWaitOn()),
      exit_after: ''
    }, testEnvVars()))

    _.each(services(), (service) => {
      const commandAndArguments = utils.commandArguments(service.command())
      const varName = utils.serviceNameToVarName(service.dockerContainer())
      const serviceCoverageIsEnabled = service.isCoveraged()

      if (serviceCoverageIsEnabled && commandAndArguments.joinedArguments.length) {
        commandAndArguments.joinedArguments = '-- ' + commandAndArguments.joinedArguments
      }
      addEnvironmentContainerVars(vars, varName, Object.assign({
        command: commandAndArguments.command,
        command_params: commandAndArguments.joinedArguments,
        coverage_enabled: serviceCoverageIsEnabled,
        wait_on: waitOn.configToArguments(service.waitOn()),
        exit_after: service.exitAfter()
      }, service.envVars()))
    })

    return Object.assign({}, process.env, vars)
  }

  _isDocker = isDocker()
  _modeKey = modeKey()

  return {
    typeName: typeName,
    name: getName,
    hasToRun: hasToRun,
    isDocker: isDocker,
    istanbulArguments: istanbulArgs,
    mochaArguments: mochaArgs,
    singleServiceToRun: singleServiceToRun,
    runSingleTest: runSingleTest,
    testWaitOn: testWaitOn,
    testIsCoveraged: testIsCoveraged,
    testEnvVars: testEnvVars,
    testDockerContainer: testDockerContainer,
    beforeCommand: beforeCommand,
    beforeEnvVars: beforeEnvVars,
    services: services,
    runDownVolumes: runDownVolumes,
    buildDocker: buildDocker,
    dockerEnvVars: dockerEnvVars,
    coverageFromService: coverageFromService,
    // TODO, remove when fully refactored
    suite: () => {
      return suiteData
    },
    suiteTypeName: () => {
      return suiteTypeName
    }
  }
}

module.exports = {
  get: get,
  standard: standard,
  suitesByType: suitesByType,
  SuiteResolver: SuiteResolver
}
