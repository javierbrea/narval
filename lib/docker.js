'use strict'

const Promise = require('bluebird')
const handlebars = require('handlebars')
const fsExtra = require('fs-extra')
const path = require('path')

const paths = require('./paths')
const config = require('./config')

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
      return fsExtra.copy(paths.cwd.resolve(normPath), path.join(destPath, fileName), {
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

const createDockerFile = function (dockerTemplate, imageData) {
  const imagePath = path.join(DOCKER_PATH, imageData.name)

  return paths.cwd.ensureDir(imagePath)
    .then((absolutePath) => {
      return Promise.all([
        paths.cwd.writeFile(path.join(imagePath, 'DockerFile'), dockerTemplate(imageData)),
        copyDockerResources(paths.cwd.resolve(path.join(imagePath, DOCKER_RESOURCES_PATH))),
        copyInstallResources(imageData.add, paths.cwd.resolve(path.join(imagePath, INSTALL_RESOURCES_PATH)))
      ])
    })
}

const getDockerTemplate = function () {
  return paths.package.readFile('lib', 'templates', 'DockerFile.hbs')
    .then(fileContent => {
      return Promise.resolve(handlebars.compile(fileContent))
    })
}

const createFiles = function () {
  if (!createFilesPromise) {
    createFilesPromise = Promise.props({
      config: config.get(),
      dockerTemplate: getDockerTemplate()
    }).then((data) => {
      return Promise.map(data.config.dockerImages, (imageData) => {
        return createDockerFile(data.dockerTemplate, imageData)
      })
    })
  }
  return createFilesPromise
}

module.exports = {
  createFiles: createFiles
}
