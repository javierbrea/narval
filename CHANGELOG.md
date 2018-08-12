# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) 
and this project adheres to [Semantic Versioning](http://semver.org/).

## [unreleased]
### Added
- Add logLevel option
### Changed
### Fixed
### Removed
### BREAKING CHANGES

## [2.0.0] - 2018-08-12
### Added
- Add support for "include" yaml feature, that allows to split configuration into many partial files.

### Changed
- Upgrade dependencies to latest versions.
- Upgrade Istanbul to 1.1.0-alpha.1 version, which provides compatibility with some features of latest ecmascript versions.

### BREAKING CHANGES
- Istanbul coverage.json file changed to coverage.raw.json.
- Unit tests coverage can decrease because new version of Istanbul is more strict with branches. Now it checks default function parameters.

## [1.2.0] - 2018-06-18
### Changed
- Upgrade mocha-sinon-chai to version 2.6.0, which provides the `assert` chai method.
- Upgrade all other dependencies.

## [1.1.0] - 2018-06-03
### Added
- Add new custom "wait-on" value to wait for a service to be finished: wait-on: exit:service-name

### Changed
- Upgrade mocha-sinon-chai version

## [1.0.1] - 2018-05-28
### Added
- Lighter npm distribution. Ignore not needed resources.

### Changed
- Change logo.
- Documentation fixes.

### Fixed
- Do not clean full logs folder. Clean each suite logs folder just before executing it. Clean only the log folder of the executed service when it is ran locally as a single service.
- Pass command arguments just as were defined. Do not execute path.join on them. closes #18
- Add local services "on.close" handlers just when each service is started. Do not wait until all services are started to add listeners.

## [1.0.0] - 2018-05-20
### Added
- 100% unit tests coverage.

### Changed
- Refactored
- Increased default timeout in wait-on

### Fixed
- Minor fixes found during unit tests development.
- Improved error handling in write logs process.

## [1.0.0-beta.6] - 2018-05-08
### Changed
- Started refactor, and unit tests coverage increase.

### Fixed
- Fix unstable integration test spec.
- Fix sonarcloud quality badge.

## [1.0.0-beta.5] - 2018-05-08
### Added
- Add "wait-on" options to configuration.
- Add "abort-on-error" configuration option for services.
- Add "Standard" directories option to configuration.
- Specs can be defined as an Array of paths to files or folders.
- Services can wait for other services.
- Add narval default environment variables to all commands, services and tests.
- Write services logs to files. These files are available inside Docker containers too.
- Add integration tests.

### Changed
- Use "wait-on" instead of "wait-for" inside Docker.
- Changed method to start Docker services internally. Now use "docker-compose-up start" command independently for each service, for better control.

### Fixed
- Do not force process exit on finish. Let it exit gracefully.
- Install mandatory nodejs dependencies in Docker containers only in containers with nodejs available.

### Removed
- Remove "depends_on" docker-containers property. Not necessary any more because of new feature "wait-on".

## [1.0.0-beta.4] - 2018-04-25
### Added
- Add "shell" option.
- Add "env" property to configuration, used to set environment variables for commands executions.
- Add "command" property to "before.docker" suites configuration. Now can run local command to prepare docker execution.
- Arguments passed to commands directly from configuration.
- Add first "integration" test suite draft

### Changed
- Upgraded mocha-sinon-chai version.

### Fixed
- Changed commands execution method, for Windows compatibility.

## [1.0.0-beta.3] - 2018-04-22
### Changed
- Upgraded standard version.
- Change Sonar branchs configuration. Was not working properly.

### Fixed
- Removed code duplications in tests.

## [1.0.0-beta.2] - 2018-04-21
### Added
- Full unit tests coverage.

### Changed
- Minor changes in documentation.

### Fixed
- Minor fixes, and code optimizations.

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
