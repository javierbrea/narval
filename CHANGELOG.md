# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) 
and this project adheres to [Semantic Versioning](http://semver.org/).

## [1.0.0-beta.1] - 2018-04-18
### Added
- Documentation to README.md file.

### Changed
- Change Docker WORKDIR to /narval

### Fixed
- Fix default configuration. Was not being read from "default-config.yml" file.

## [0.0.1-beta.4] - 2018-04-16
### Added
- Can start only one local service, and generate coverage when process is finished using CTRL-C.
- Can report coverage from one local service, while run test in other process.
- Can run all test suites locally.
- Add "before" command for local executions.
- Add default configuration for docker containers not defined in a test suite.
- Install Narval in Docker image build if it is not found.

### Changed
- Change configuration properties.

## [0.0.1-beta.3] - 2018-04-11
### Changed
- Run standard as a child process. Wait until it has finished before resolving or rejecting the promise.
- Wait until istanbul-mocha execution has finished before resolving or rejecting the promise.
- Improve logs before and after running each test suite.

## [0.0.1-beta.2] - 2018-04-10
### Changed
- Upgraded mocha-sinon-chai version.

### Fixed
- Fix binaries execution on Windows environments.

## [0.0.1-beta.1] - 2018-04-08
### Added
- First fully functional version.

## [0.0.1-alpha.1] - 2018-04-04
### Added
- First publish. Reserve NPM name.
