# Narval

Multi test suites runner for Node.js packages. Docker based.

[![Build status][travisci-image]][travisci-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Quality Gate][quality-gate-image]][quality-gate-url] [![js-standard-style][standard-image]][standard-url]

[![Node version][node-version-image]][node-version-url] [![NPM version][npm-image]][npm-url] [![NPM dependencies][npm-dependencies-image]][npm-dependencies-url] [![Last commit][last-commit-image]][last-commit-url] [![Last release][release-image]][release-url] 

[![NPM downloads][npm-downloads-image]][npm-downloads-url] [![License][license-image]][license-url]

## Table of Contents

* [Introduction](#introduction)
* [Quick Start](#quick-start)
* [Configuration](#configuration)
	* [docker-images](#docker-images)
	* [docker-containers](#docker-containers)
	* [suites](#suites)
		* [before](#before)
		* [services](#service)
		* [test](#test)
		* [coverage](#coverage)
* [Examples](#examples)
* [Usage](#usage)
* [Tutorial](#tutorial)

## Introduction

Narval is a test suites runner that make easy to define, start, and reuse dependant services for each suite. Split your tests into "tests", that contains the specs and are executed with [Mocha][mocha-url]/[Istanbul][istanbul-url], and "services", which contains the commands and configurations needed to start the dependendant services of the tests battery. In this way, it is possible to reuse different services configurations and run different tests over different combinations of them, or run the same tests battery upon services started with different configurations, for example.

Each "service" is started using [Docker][docker-url], so it will not have conflicts with the environment in which the tests are executed, and can be executed "locally" as well, if your development platform don´t supports Docker, or in order to make easier the tests development process.

Using the provided command line options, a test suite can be executed independently, using Docker or not, or even leave a "service" alive in the terminal while you develop the tests battery that is integrated with it in other terminal.

You can even get coverage reports from a "service", not from the tests themself. So, for example, if you are developing an API service, you can define it as a "service", develop tests that make requests to your service in an isolated way, and get coverage reports from the service.

It also provides a built-in javascript linter, using [Standard][standard-url].

Narval is configured using a `.narval.yml` file at the root of your project.

[back to top](#table-of-contents)

## Quick Start

### Run tests with default configuration

Add narval to your package.json dependencies, and an npm script to run the tests:

```json
{
  "scripts": {
    "test": "narval" 
  },
  "devDependencies": {
    "narval": "1.x"
  }
}
```

If no configuration file `.narval.yml` is provided, by default Narval will search for test files inside of a folder `/test` in your project root, and Execute Istanbul/Mocha over them. A coverage report will be generated at `/.coverage` folder. Aditionally, the Standard javascript linter will be executed over all project sources.

```shell
npm run test
# Run Standard linter over all project sources, and launch unit tests found inside "/test" folder

npm run test -- --standard
# Run only Standard

npm run test -- --suite=unit
# Run only unit tests.
```

[back to top](#table-of-contents)

## Configuration

Create a `.narval.yml` file at the root of your project.

### docker-images

`<Array>` of [docker-image objects](#docker-image). Configure your base Docker image or images that will be used to instanciate the different Docker containers used to start the services or tests.

#### docker-image

`<Object>`. Configuration for creating a Docker image. It is a subset of DockerFile configuration.

* `name` `<String>`. Reference for the base image.
* `from` `<String>`. Docker image to create this image from.
* `add` `<Array> of <String>`. Array of folders or files to be copied inside the image, at Docker build time. Paths are relative to the project root.
* `expose` `<Array> of <Number>`. Array of ports to be exposed. This ports will be available for other Docker containers (for other Narval "services", consequently).
* `install` `<String>`. Path to a script that will be executed in Docker build time. Use it to install your needed dependencies. It will executed only once, when Docker image is built. Narval will check for its own installation after this command runs, so, if you don´t install Narval dependency inside Docker, it will do it for you.

> *Partial example of docker-images configuration*
```yml
docker-images:
  - name: basic-image
    from: javierbrea/node-headless-chrome:1.0.0
    add:
      - package.json
    expose:
      - 3000
    install: test/docker/install
```

### docker-containers

`<Array>` of [docker-container objects](#docker-container). Configure your Docker container or containers in which your services and tests will run.

#### docker-container

`<Object>`. Configuration for creating the Docker container. It is a subset of docker-compose configuration.

* `name` `<String>`. Reference for the container.
* `build` `<String>`. Reference name of the [docker-image](#docker-image) from which this container will be started.
* `bind` `<Array> of <String>`. Array of paths to be binded into the docker container. This "resources" will be "shared" from the local file system directly to the docker container, so if there are changes in the resources, there is no need to rebuild the Docker images to refresh changes.
* `depends_on` `<String>`. Reference name of another docker-container. This container will be started only after the other one is started. (Caution, because this does not implies that services inside the other container are ready as well)

> *Partial example of docker-containers configuration*
```yml
docker-containers:
  - name: service-container # Docker container 1
    build: basic-image
    bind:
      - lib
      - index.js
  - name: test-container # Docker container 2
    build: basic-image
    bind:
      - lib
      - test
      - index.js
    depends_on:
      - service
```

### suites

`<Object>`. Object containing [suites types](#suites-type) as keys. Define a key for each test suite "type", or "family". In this way, you can categorize your suites and run them separately using the option `--type` from the command line.

#### suites type

`<Array>` of [suite objects](#suite). The key of the suite type will be the reference for running it independently using the `--type` option from command line.

#### suite

`<Object>`. Object containing the test suite configuration.

* `name` `<String>`. Reference for the test suite.
* `before` `<Object>`. [before object](#before) containing configuration for commands that will be executed before running the test suite. Useful to clean or prepare your environment.
* `services` `<Array>` of [service objects](#service). Defines services to be started before running the tests.
* `test` `<Object>`. [test object](#test) containing configuration of the test to be runned by this suite.
* `coverage` `<Object>`. [coverage object](#coverage) containing configuration of coverage report of this suite.

> *Partial example of test suites configuration*
```yml
suites:
  unit: # Suite type
    - name: unitary # suite called "unitary", of type "unit"
      test:
        specs: test/unit
  integration: # Suite type
    - name: api # suite called "api", of type "integration"
      before:
        local:
          command: test/commands/local/clean
      services:
        - name: api-service
          local:
            command: test/commands/local/start-api
      test:
        specs: test/integration/api
      coverage:
        config:
          verbose: true
```

##### before

`<Object>`. Object containing configuration for commands that will be executed before running the test suite. Useful to clean or prepare your environment.

* `docker` `<Object>`. Contains instructions to be executed by Docker before running the suite.
	* `down-volumes`. <`Boolean`>. If true, cleans Docker container volumes, to prevent share data from previous container executions dispatched by other suites.
* `local` `<Object>`. Contains instructions to be executed when running locally before executing the suite.
	* `command` `<String>`. Path to a file containing a script that will be executed before running suite.

> *Partial example of a test suite "before" property*
```yml
suites:
  integration:
    - name: api
      before: # before configuration
        docker:
          down-volumes: true
        local:
          command: test/commands/local/clean
```

##### service

`<Object>`. Object containing configuration for starting a test suite service.

* `name` `<String>`. Reference name for the service. It can be the same in all suites starting the same service.
* `docker` `<Object>`. If test suite is going to be executed using Docker, this objects contains the needed configuration for the service.
	* `container` `<String>`. Reference name of the [docker-container](#docker-container) in which the service is going to be executed.
	* `command` `<String>`. Path to the command that will start the service.
	* `exit_after` `<Number>` of miliseconds `default: 30000`. When [coverage](#coverage) is executed over a service instead of tests, in Docker is needed to define a time out for stopping the service and get the resultant coverage after running tests. This setting only applies if `coverage.from` property is set to this service name.
* `local` `<Object>`. Contains instructions to execute the service locally.
	* `command` `<String>`. Path to the command that will start the service.

> *Partial example of a test suite "services" property*
```yml
suites:
  integration:
    - name: api
      services:
        - name: ddbb-service # service configuration
          docker: 
            container: ddbb-container
            command: test/commands/docker/start-mongo
          local:
            command: test/commands/local/start-mongo
        - name: api-service # service configuration
          docker: 
            container: service-container
            command: test/services/app/start.js --name=service --path=/app/.shared --host=service
            exit_after: 10000
          local:
            command: test/services/app/start.js --name=service --path=.test
```

##### test

`<Object>`. Object containing configuration for the test to be runned by a suite.

* `specs` `<String>`. Path to the folder where the specs to be executed are. Relative to the root of the project.
* `docker` `<Object>`. If test suite is going to be executed using Docker, this objects contains the needed configuration.
	* `container` `<String>`. Reference name of the [docker-container](#docker-container) in which the tests are going to be executed.
	* `wait-for` `<String>` with format `host:port`. The tests will not be executed until the provided `host:port` is ready. Narval uses [wait-for-it][wait-for-it-url] to provide this feature. NOTE: If the host you are waiting for is a service hosted in a [docker-container](#docker-container), you must use that docker container name as `host` in the `host:port` expression.
* `local` `<Object>`. If test suite is going to be executed without Docker, this objects contains the needed configuration.
	* `wait-for` `<String>` with format `protocol:host:port`, or path to a file. The tests will not be executed until the provided `protocol:host:port` is ready, or file exists. Narval uses [wait-on][wait-on-url] to provide this feature in "local" executions. Read about the available "resources" to be used as `wait-for` expression in its [documentation][wait-on-url]. 
* `config` `<Object>` containing Mocha configuration parameters for tests execution. All provided key value pairs will be translated into "--key=value" when Mocha is executed. As examples, some available `config` keys are provided in this documentation. For further reference about all available parameters, [please read Mocha usage documentation][mocha-usage-url].
	* `recursive` `<Boolean>` `default: true`. Execute specs found in all subfolders of provided `specs` path.
	* `reporter` `<String>` `default: spec` Mocha reporter to be used. Can be one of "spec", "dot", "nyan", "landing", "list", "progress", ...
	* `grep` `<String>`. Will trigger Mocha to only run tests matching the given pattern which is internally compiled to a RegExp.

> *Partial example of a test suite "test" property*
```yml
suites:
  integration:
    - name: api
      test: # test configuration
        specs: test/integration/api
        docker:
          container: test-container
          wait-for: api-service:3000
        local:
          wait-for: tcp:localhost:3000
        config:
        	recursive: false
        	report: list
```

##### coverage

`<Object>`. Object containing configuration for coverage report of a suite.

* `enabled` `<Boolean>` `default:true`. Enable or disable coverage for this suite.
* `from` `<String>`. By default, coverage will be executed over the [test](#test) defined in a suite, but, it is possible to get coverage from a service. Use this property to define a [service] name from which execution the coverage will be generated.
* `config` `<Object>` containing Istanbul configuration parameters for coverage execution. All provided key value pairs will be translated into "--key=value" when Istanbul is executed. As examples, some available `config` keys are provided in this documentation. For further reference about all available parameters, [please read Istanbul usage documentation][istanbul-usage-url], or execute `./node_modules/.bin/istanbul help config cover`
	* `root` `<String>` `default:.`. Path to folder containing sources to cover.
	* `include-all-sources` `<Boolean>` `default:true`. Show 0% coverage for files with no tests executed.
	* `dir` `<String>` `default:.coverage/[suite-type]/[suite-name]`. Path to folder in which reports will be created.
	* `reports` `<String>` `default:lcov/html`. Type of Istanbul reports to generate.
	* `print` `<String>` `default:summary`. Type of Istanbul reports to print. You can use types as "detail", "both", etc..
	* `verbose` `<Boolean>` `default:false`. Run Istanbul in "verbose" mode.  
	* `default-excludes` `<Boolean>` `default:true`. Use Istanbul default excludes (node_modules, etc...)
	* `preserve-comments` `<Boolean>` `default:false`. Preserve comments in coverage reports.

> *Partial example of a test suite "coverage" property*
```yml
suites:
  integration:
    - name: api
      coverage: # coverage configuration
        enabled: true
        from: api-service
        config:
        	print: both
```



[back to top](#table-of-contents)

## Examples

[back to top](#table-of-contents)

## Usage

[back to top](#table-of-contents)

## Tutorial

*Following the previous example, the "test/docker/install" script in your project could contain:*

```bash
#!/usr/bin/env bash

npm install
```

*So, in Docker build time, the "package.json" file will be copied into the docker image, and "npm install" will be executed. Now you have all your needed dependencies ready to be used by your services or tests (Docker containers).*

[back to top](#table-of-contents)


[coveralls-image]: https://coveralls.io/repos/github/javierbrea/narval/badge.svg
[coveralls-url]: https://coveralls.io/github/javierbrea/narval
[travisci-image]: https://travis-ci.org/javierbrea/narval.svg?branch=master
[travisci-url]: https://travis-ci.org/javierbrea/narval
[last-commit-image]: https://img.shields.io/github/last-commit/javierbrea/narval.svg
[last-commit-url]: https://github.com/javierbrea/narval/commits
[license-image]: https://img.shields.io/npm/l/narval.svg
[license-url]: https://github.com/javierbrea/narval/blob/master/LICENSE
[node-version-image]: https://img.shields.io/node/v/narval.svg
[node-version-url]: https://github.com/javierbrea/narval/blob/master/package.json
[npm-image]: https://img.shields.io/npm/v/narval.svg
[npm-url]: https://www.npmjs.com/package/narval
[npm-downloads-image]: https://img.shields.io/npm/dm/narval.svg
[npm-downloads-url]: https://www.npmjs.com/package/narval
[npm-dependencies-image]: https://img.shields.io/david/javierbrea/narval.svg
[npm-dependencies-url]: https://david-dm.org/javierbrea/narval
[quality-gate-image]: https://sonarcloud.io/api/badges/gate?key=narval
[quality-gate-url]: https://sonarcloud.io/dashboard/index/narval
[release-image]: https://img.shields.io/github/release-date/javierbrea/narval.svg
[release-url]: https://github.com/javierbrea/narval/releases
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg
[standard-url]: http://standardjs.com/

[docker-url]: https://www.docker.com/
[istanbul-url]: https://istanbul.js.org/
[istanbul-usage-url]: https://istanbul.js.org/
[mocha-url]: https://mochajs.org
[mocha-usage-url]: https://mochajs.org/#usage
[wait-for-it-url]: https://github.com/vishnubob/wait-for-it
[wait-on-url]: https://www.npmjs.com/package/wait-on
