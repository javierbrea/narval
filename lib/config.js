'use strict'

const Promise = require('bluebird')
const yaml = require('js-yaml')
const fs = require('fs')
const _ = require('lodash')
const Boom = require('boom')

const paths = require('./paths')
const logs = require('./logs')
const utils = require('./utils')
const waitOn = require('./wait-on')
const states = require('./states')

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

const BASE_DOCKER_ENV_VARS = {
  command: '',
  command_params: '',
  coverage_enabled: '',
  wait_on: '',
  exit_after: '',
  narval_suite_type: '',
  narval_suite: '',
  narval_service: '',
  narval_is_docker: ''
}

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
      logs.configNotFound({
        filePath: filePath
      })
      return Promise.resolve('')
    })
    .then(readYaml)
    .then((config = {}) => {
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

const get = function () {
  const getPromise = 'getPromise'
  if (!states.get(getPromise)) {
    states.set(getPromise, Promise.props({
      custom: readCustom(),
      default: readDefault()
    }).then(checkConfig))
  }
  return states.get(getPromise)
}

const standard = function () {
  return get()
    .then(config => {
      let directories = config.standard.directories || []
      if (_.isString(directories)) {
        directories = directories.split(' ')
      }
      return Promise.resolve({
        directories: directories
      })
    })
}

const GetConfigMainObject = function (key) {
  return function () {
    return get()
      .then(config => {
        return Promise.resolve(config[key])
      })
  }
}

const suitesByType = new GetConfigMainObject('suitesByType')

const dockerImages = new GetConfigMainObject('dockerImages')

const dockerContainers = new GetConfigMainObject('dockerContainers')

const mochaArguments = new utils.ObjectToArguments(MOCHA_DEFAULT)
const istanbulArguments = new utils.ObjectToArguments(ISTANBUL_DEFAULT, '=', ['x', 'i'])

const addEnvironmentContainerVars = function (object, containerVarName, values = {}) {
  values = Object.assign({}, BASE_DOCKER_ENV_VARS, values)
  _.each(values, (value, key) => {
    object[`${containerVarName}_${key}`] = value
  })
}

const addCustomDockerEnvVars = function (confObj = {}, vars = []) {
  if (confObj.docker) {
    _.each(confObj.docker.env, (value, key) => {
      vars.push(key)
    })
  }
  return vars
}

const calculateAllDockerCustomEnvVars = function (suites) {
  let customVars = []
  _.each(suites, (suiteType) => {
    _.each(suiteType.suites, (suite) => {
      addCustomDockerEnvVars(suite.test, customVars)
      addCustomDockerEnvVars(suite.before, customVars)
      _.each(suite.services, (service) => {
        addCustomDockerEnvVars(service, customVars)
      })
    })
  })
  return _.uniq(customVars)
}

const SuiteResolver = function (suiteData, suiteTypeName, options, suitesByType) {
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
    const config = Object.assign({}, baseConfig, suiteData.coverage && suiteData.coverage.config)
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
    throw new Error(Boom.notFound(logs.serviceNotFound({
      name: serviceName
    }, false)))
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
      throw new Error(Boom.notFound(logs.noDockerTestConfig(false)))
    }

    if (testCoverageIsEnabled) {
      testCommandParams = '-- ' + testCommandParams
    }

    addEnvironmentContainerVars(vars, testVarName, Object.assign({
      command: testCommand,
      command_params: testCommandParams,
      coverage_enabled: testCoverageIsEnabled,
      wait_on: waitOn.configToArguments(testWaitOn())
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
    return utils.extendProcessEnvVars(vars)
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
    coverageFromService: coverageFromService
  }
}

const allDockerCustomEnvVars = function () {
  return suitesByType()
    .then((suites) => {
      return Promise.resolve(calculateAllDockerCustomEnvVars(suites))
    })
}

const calculateAllComposeEnvVars = function (config, suitesByType) {
  const customEnvVars = calculateAllDockerCustomEnvVars(suitesByType)
  const customEnvVarsObj = {}
  let envVars = {
    coverage_options: ''
  }
  _.each(customEnvVars, (varName) => {
    customEnvVarsObj[varName] = ''
  })
  _.each(config.dockerContainers, dockerContainer => {
    addEnvironmentContainerVars(envVars, utils.serviceNameToVarName(dockerContainer.name), customEnvVarsObj)
  })
  return utils.extendProcessEnvVars(envVars)
}

const allComposeEnvVars = function () {
  return Promise.props({
    config: get(),
    suitesByType: suitesByType()
  }).then((data) => {
    return Promise.resolve(calculateAllComposeEnvVars(data.config, data.suitesByType))
  })
}

module.exports = {
  standard: standard,
  suitesByType: suitesByType,
  dockerImages: dockerImages,
  dockerContainers: dockerContainers,
  allDockerCustomEnvVars: allDockerCustomEnvVars,
  allComposeEnvVars: allComposeEnvVars,
  SuiteResolver: SuiteResolver
}
