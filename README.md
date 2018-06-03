# ![Narval Logo][narval-logo-image]

Multi test suites runner for Node.js packages. Powered by [Docker][docker-url].

[![Build status][travisci-image]][travisci-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Quality Gate][quality-gate-image]][quality-gate-url] [![js-standard-style][standard-image]][standard-url]

[![NPM dependencies][npm-dependencies-image]][npm-dependencies-url] [![Last commit][last-commit-image]][last-commit-url] [![Last release][release-image]][release-url] 

[![NPM downloads][npm-downloads-image]][npm-downloads-url] [![License][license-image]][license-url]

## Table of Contents

* [Introduction](#introduction)
* [Requirements](#requirements)
* [Quick Start](#quick-start)
* [Configuration](#configuration)
	* [standard](#standard)
	* [docker-images](#docker-images)
	* [docker-containers](#docker-containers)
	* [suites](#suites)
		* [before](#before)
		* [services](#service)
		* [test](#test)
		* [coverage](#coverage)
* [Usage](#usage)
	* [Command line options](#command-line-options)
	* [Developing commands](#developing-commands)
		* [Commands languages](#commands-languages)
		* [Working directory](#working-directory)
		* [Docker absolute paths](#docker-absolute-paths)
		* [Docker shared volume](#docker-shared-volume)
	* [Services logs](#services-logs)
	* [Environment variables](#environment-variables)
* [Examples](#examples)
* [Contributing](#contributing)

## Introduction

**Narval is a test suites runner that make easy to define, start, and reuse dependant services for each suite.\
It uses Docker to start services and run tests, so, the isolation of each test suite execution is guaranteed.
Define your services and tests in a `yaml` file, and Narval will do the rest for you.**

 Split your tests into "tests", that contains the specs and are executed with [Mocha][mocha-url]/[Istanbul][istanbul-url], and "services", which contains the commands and configurations needed to start the dependendant services of the tests battery. In this way, it is possible to reuse different services configurations and run different tests over different combinations of them, or run the same tests battery 
 upon services started with different configurations, for example.

Each "service" is started using [Docker][docker-url], so it will not have conflicts with the environment in which the tests are executed, and can be executed "locally" as well, if your development platform don´t supports Docker, or in order to make easier the tests development process.

Using the provided command line options, a test suite can be executed independently, using Docker or not, or even leave a "service" alive in the terminal while you develop the tests battery that is integrated with it in other terminal.

You can even get coverage reports from a "service", not from the tests themself. So, for example, if you are developing an API service, you can define it as a "service", develop tests that make requests to your service in an isolated way, and get coverage reports from the service.

It also provides a built-in javascript linter, using [Standard][standard-url].

Narval is configured using a `.narval.yml` file at the root of your project.

[back to top](#table-of-contents)

## Requirements

To run services and tests using Docker, Narval needs Docker and docker-compose to be installed on the system.

Narval has been developed and tested on Linux and Mac with versions:
* Docker: 17.05.0-ce
* docker-compose: 1.19.0

On Windows platforms, the "docker" feature is not available, but you can run suites using the `--local` option.

Read more about [how to install Docker and docker-compose][docker-url].
Here you can read about [how to use Docker and docker-compose in Travis builds][travis-docker-url].

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

### standard

`<Object>`. Configuration for Standard.

* `directories` `<Array> of <String>`. Array of glob expressions that will determine in which folders Standard will be executed.

> *Partial example of Standard configuration*
```yml
standard:
  directories:
    - "lib/**/.js"
    - "test/integration/packages/**/*.js"
```

### docker-images

`<Array>` of [docker-image objects](#docker-image). Configure your base Docker image or images that will be used to instanciate the different Docker containers used to start the services or tests.

#### docker-image

`<Object>`. Configuration for creating a Docker image. It is a subset of DockerFile configuration.

* `name` `<String>`. Reference for the base image.
* `from` `<String>`. Docker image to create this image from.
* `add` `<Array> of <String>`. Array of folders or files to be copied inside the image, at Docker build time. Paths are relative to the project root. When added, the full folder tree will be respected, and will be added just as it is to the Docker image.
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
* `bind` `<Array> of <String>`. Array of paths to be binded into the docker container. This "resources" will be "shared" from the local file system directly to the docker container, so if there are changes in the resources, there is no need to rebuild the Docker images to refresh changes. The full folder tree will be respected, and will be binded just as it is to the Docker image.

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
	* `command` `<String>`. Path to a file containing a script that will be executed before executing Docker.
	* `env` `<Object>`. Object containing custom variables names and values to be set in the environment for running command.
* `local` `<Object>`. Contains instructions to be executed when running locally before executing the suite.
	* `command` `<String>`. Path to a file containing a script that will be executed before running suite.
	* `env` `<Object>`. Object containing custom variables names and values to be set in the environment for running command.

> *Partial example of a test suite "before" property*
```yml
suites:
  integration:
    - name: api
      before: # before configuration
        docker:
          down-volumes: true
          command: test/commands/docker/clean
          env:
            fooVar: foo value for docker clean
        local:
          command: test/commands/local/clean
          env:
            fooVar: foo value for local clean
```

##### service

`<Object>`. Object containing configuration for starting a test suite service.

* `name` `<String>`. Reference name for the service. It can be the same in all suites starting the same service.
* `abort-on-error` `<Boolean>`. Default `false`. If `true`, all other services and tests will be stopped if possible when this service is closed with an error code. Test suite will be considered as failed, even if the tests execution is successful.
* `docker` `<Object>`. If test suite is going to be executed using Docker, this objects contains the needed configuration for the service.
	* `container` `<String>`. Reference name of the [docker-container](#docker-container) in which the service is going to be executed.
	* `command` `<String>`. Path to the command that will start the service.
	* `wait-on` `<String>|<Object>` The service will not be started until the provided `wait-on` condition is ready. Narval uses [wait-on][wait-on-url] to provide this feature. If an `String` is provided, then it specifies the resource to wait. NOTE: If the host you are waiting for is a service hosted in a [docker-container](#docker-container), you must use that docker-container name as `host` in the `host:port` expression.
		* `resources`. `<Array> of <String>`. Resources that will be waited for. Read about the available "resources" to be used as `wait-on` expressions in its [documentation][wait-on-url]. Narval also provides a custom `wait-on` property that allows to wait for a service to be finished. Use the `exit:[service-name]` expression, and it will wait until that service has finished.
		* `timeout` `<Number>`. Maximum time in ms to wait before exiting with failure (1) code,
  default Infinity.
		* `delay` `<Number>`. Initial delay before checking for resources in ms, default 0.
		* `interval` `<Number>`. Interval to poll resources in ms, default 250ms.
		* `reverse` `<Boolean>`. Reverse operation, wait for resources to NOT be available.
	* `env` `<Object>`. Object containing custom variables names and values to be set in the environment for running command.
	* `exit_after` `<Number>` of miliseconds `default: 30000`. When [coverage](#coverage) is executed over a service instead of tests, in Docker is needed to define a time out for stopping the service and get the resultant coverage after running tests. This setting only applies if `coverage.from` property is set to this service name.
* `local` `<Object>`. Contains instructions to execute the service locally.
	* `command` `<String>`. Path to the command that will start the service.
	* `wait-on` `<String>|<Object>` with format `protocol:host:port`, or path to a file. The service will not be started until the provided `protocol:host:port` is ready, or file exists. Narval uses [wait-on][wait-on-url] to provide this feature. If an `String` is provided, then it specifies the resource to wait.
		* `resources`. `<Array> of <String>`. Resources that will be waited for. Read about the available "resources" to be used as `wait-on` expressions in its [documentation][wait-on-url].  Narval also provides a custom `wait-on` property that allows to wait for a service to be finished. Use the `exit:[service-name]` expression, and it will wait until that service has finished.
		* `timeout` `<Number>`. Maximum time in ms to wait before exiting with failure (1) code,
  default Infinity.
		* `delay` `<Number>`. Initial delay before checking for resources in ms, default 0.
		* `interval` `<Number>`. Interval to poll resources in ms, default 250ms.
		* `reverse` `<Boolean>`. Reverse operation, wait for resources to NOT be available.
	* `env` `<Object>`. Object containing custom variables names and values to be set in the environment for running command.

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
            env:
              fooVar: foo value for docker command
          local:
            command: test/commands/local/start-mongo
            env:
              fooVar: foo value for local command
        - name: api-service # service configuration
          docker: 
            container: service-container
            command: test/services/app/start.js --name=service --path=/narval/.shared --host=service
            wait-on:
              resources:
                - tcp:ddbb-container:27017
              timeout: 5000
              delay: 300
              interval: 100
              reverse: false
            env:
              fooVar: false
            exit_after: 10000
          local:
            command: test/services/app/start.js --name=service --path=.test
            env:
              fooVar: true
            wait-on: tcp:localhost:27017
```

> *Partial example of a service waiting until another has finished*
```yml
suites:
  integration:
    - name: api
      services:
        - name: foo-service
          local:
            command: test/commands/local/start-service
        - name: foo-service-2 # This service will not start until the service "foo-service" has exited.
          local:
            command: test/commands/local/start-another-service
            wait-on: exit:foo-service
```

##### test

`<Object>`. Object containing configuration for the test to be runned by a suite.

* `specs` `<String>|<Array>`. Path to the folder or file where the specs to be executed are. Relative to the root of the project. If an `Array` is specified, all provided folders or files in the `Array` will be executed.
* `docker` `<Object>`. If test suite is going to be executed using Docker, this objects contains the needed configuration.
	* `container` `<String>`. Reference name of the [docker-container](#docker-container) in which the tests are going to be executed.
	* `wait-on` `<String>|<Object>` The tests will not be executed until the provided `wait-on` condition is ready. Narval uses [wait-on][wait-on-url] to provide this feature. If an `String` is provided, then it specifies the resource to wait. NOTE: If the host you are waiting for is a service hosted in a [docker-container](#docker-container), you must use that docker-container name as `host` in the `host:port` expression.
		* `resources`. `<Array> of <String>`. Resources that will be waited for. Read about the available "resources" to be used as `wait-on` expressions in its [documentation][wait-on-url].  Narval also provides a custom `wait-on` property that allows to wait for a service to be finished. Use the `exit:[service-name]` expression, and it will wait until that service has finished.
		* `timeout` `<Number>`. Maximum time in ms to wait before exiting with failure (1) code,
  default Infinity.
		* `delay` `<Number>`. Initial delay before checking for resources in ms, default 0.
		* `interval` `<Number>`. Interval to poll resources in ms, default 250ms.
		* `reverse` `<Boolean>`. Reverse operation, wait for resources to NOT be available.
	* `env` `<Object>`. Object containing custom variables names and values to be set in the docker environment for running test.
* `local` `<Object>`. If test suite is going to be executed without Docker, this objects contains the needed configuration.
	* `env` `<Object>`. Object containing custom variables names and values to be set in the local environment for running test.
	* `wait-on` `<String>|<Object>` with format `protocol:host:port`, or path to a file. The tests will not be executed until the provided `protocol:host:port` is ready, or file exists. Narval uses [wait-on][wait-on-url] to provide this feature. If an `String` is provided, then it specifies the resource to wait.
		* `resources`. `<Array> of <String>`. Resources that will be waited for. Read about the available "resources" to be used as `wait-on` expressions in its [documentation][wait-on-url].
		* `timeout` `<Number>`. Maximum time in ms to wait before exiting with failure (1) code,
  default Infinity.
		* `delay` `<Number>`. Initial delay before checking for resources in ms, default 0.
		* `interval` `<Number>`. Interval to poll resources in ms, default 250ms.
		* `reverse` `<Boolean>`. Reverse operation, wait for resources to NOT be available.
* `config` `<Object>` containing Mocha configuration arguments for tests execution. All provided key value pairs will be translated into "--key=value" when Mocha is executed. As examples, some available `config` keys are provided in this documentation. For further reference about all available arguments, [please read Mocha usage documentation][mocha-usage-url].
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
          wait-on:
            resources:
              - tcp:api-service:3000
            timeout: 5000
            delay: 300
            interval: 100
            reverse: false
          env:
            fooVar: foo value for test execution in Docker
        local:
          wait-on: tcp:localhost:3000
          env:
            fooVar: foo value for test execution in local
        config:
          recursive: false
          reporter: list
```

> *Partial example of a test waiting to be launched until the service has finished*
```yml
suites:
  integration:
    - name: api # service configuration
      services:
        - name: foo-service
          local:
            command: test/commands/local/start-service
      test: # test configuration
        specs: test/integration/api
        local:
          wait-on: exit:foo-service # wait until service "foo-service" has exited
```

##### coverage

`<Object>`. Object containing configuration for coverage report of a suite.

* `enabled` `<Boolean>` `default:true`. Enable or disable coverage for this suite.
* `from` `<String>`. By default, coverage will be executed over the [test](#test) defined in a suite, but, it is possible to get coverage from a service. Use this property to define a [service] name from which execution the coverage will be generated.
* `config` `<Object>` containing Istanbul configuration arguments for coverage execution. All provided key value pairs will be translated into "--key=value" when Istanbul is executed. As examples, some available `config` keys are provided in this documentation. For further reference about all available arguments, [please read Istanbul usage documentation][istanbul-usage-url], or execute `./node_modules/.bin/istanbul help config cover`
	* `root` `<String>` `default:.`. Path to folder containing sources to cover.
	* `x` `<String>`. Glob defining folders to exclude from coverage.
	* `include-all-sources` `<Boolean>` `default:true`. Show 0% coverage for files with no tests executed.
	* `dir` `<String>` `default:.coverage/[suite-type]/[suite-name]`. Path to folder in which reports will be created.
	* `report` `<String>` `default:lcov/html`. Type of Istanbul reports to generate.
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

## Usage

* Add the "narval" dependency to your `package.json` file as described in the [quick start chapter](#quick-start).
* Add the "test" script to your `package.json` file as described in the [quick start chapter](#quick-start).
> From this point, all examples asume that the `package.json` file of your project contains a script called "test" that executes "narval". *If your script has another name, simply change `npm test` by `npm run your-script-name` in the examples*
* Create a [configuration](#configuration) file named `.narval.yml` at the root of your repository.

Run the next command to execute all your test suites and Standard linter:

```shell
npm test
```

### Command line options

```shell
npm test -- [options]
```

Available options are:

option | description | alias 
--- | --- | ---
`--standard` | Run only Standard linter | `-s`
`--fix` | Fix Standard errors | `-f`
`--type <type>` | Run only test suites of provided `<type>` | 
`--suite <suite>` | Run only provided `<suite>` | 
`--build` | Rebuild Docker images | `-b`
`--local [service]` | Run locally, do not use Docker. If service name is provided, only it will be run. *Use "test" as service name to run only test. Use CTRL-C to exit service execution (If service is coveraged, it will generate the report, then exit)* | 
`--shell <shellPath>` | Use a custom shell for running commands. More info [here](#using-a-custom-shell)| 

> Examples
```shell
npm test -- --standard
# Run only Standard linter

npm test -- --type=integration
# Run all test suites of type "integration" defined in the configuration

npm test -- --type=integration --local
# Run locally all test suites of type "integration"

npm test -- --suite=api --local=api-service
# Run locally the service called "api-service" from suite "api". Service keep running until CTRL-C.

npm test -- --suite=api --local=test
# Run locally the test from suite "api". You can run it from one terminal while the service is executed in other terminal using the previous example.

npm test -- --build
# Run all tests suites, rebuild Docker images at initialization.
```

### Developing commands

#### Commands languages

Inside Docker, commands are executed using `sh -c`, so you can define the language of your choice in your scripts using the correspondant [shebang][shebang-url] (the availability of the interpreter will depend of your docker base image, of course)

```bash
#!/usr/bin/env bash
echo "My script is written in bash"
```

```shell
#!/usr/bin/env node
console.log('This script is written in nodejs')
```

Outside Docker, in the "local" environment, commands are executed through nodejs spawn child processes. The base "shell" used for running commands depends on the platform:

* In Unix platforms, the commands are executed using "sh -c". So, you can define the language of your choice using the correspondant [shebang][shebang-url]. The availability of the script language that you have to choose will depend of the platform in which you are going to run the suites locally.\

* In Windows platforms, the commands are executed using the default system shell, using the nodejs `process.env.ComSpec` property. Usually, it should be something like: `c:\windows\system32\cmd.exe /d /s /c`.\
Note that Windows shell can only execute `.bat` and `.cmd` commands, so, maybe you want to define your own shell.

> Warning: Ensure that your command files have execution permissions, otherwise, the execution will obviously fail.

##### Using a custom shell

It is possible to define a custom shell for running commands. This can be useful, for example, if you want to run commands locally in Windows using `gitBash` in order to make them compatible with Unix platforms. Use the [option](#command-line-options) "--shell" to define the path to the custom shell:

```shell
npm run test -- --shell="C:\git\bin\bash.exe"
# Commands will be executed using an spawn process like "C:\git\bin\bash.exe [command]"
```

Or define two different scripts in your `package.json`, one to be used in Unix platforms, and the other one for your local development Windows platform:

```json
{
  "scripts": {
    "test": "narval",
    "test-windows": "narval --shell=\"C:\\git\\bin\\bash.exe\""
  }
}
```

```shell
npm run test
# Used in Unix platforms, default behavior

npm run test-windows
# Used in Windows platforms, executes commands using gitBash
```

##### Commands for services with "coverage" enabled

When a service is executed with "coverage" option, all mentioned above does not apply, and the command must be a path to a nodejs file, because it is executed using Istanbul.


#### Working directory

Remember, all paths defined in the [configuration](#configuration) file must be relative to the root of the package.\
The **working directory** of the commands when are executed will be the root of the package as well.

#### Docker absolute paths

When Docker images are created, all files and folders of the package are added or binded into the path `/narval`, that is the Docker `WORKDIR`. So, if you added the `package.json` to the Docker image (as in the [docker-image example](#docker-image)), and you need to access it using an absolute path, you´ll find it in `/narval/package.json`

#### Docker shared volume

All Docker containers share a volume named `.shared`, created at the root of the package. In this way, you can check if a service is writting something or not in your specs, for example. Configure your service to write the output files inside the folder `.shared` (or `/narval/.shared`), and that folder will be available as well when tests are executed.

### Services logs

All services logs are written to files to make them available for other services or tests. Logs are written to `.narval/logs/[suite-type]/[suite-name]/[service-name]` folder. These folders are available inside all Docker containers too.

For each service, all these files are generated:

* `combined-outerr.log`. Contains all service logs, both "out" and "error".
* `err.log`. Contains service "error" logs.
* `out.log`. Contains service "out" logs.
* `exit-code.log`. This file is created when service is closed, and contains the exit code of the service process.

The `exit-code.log` is used internally to wait for a service to be finished before executing another service, or the tests. Using the `wait-on` property, you can wait for the exit of a service, with the `exit:[service-name]` expression:

_In the next example, the tests will not be executed until the service "api" is closed:_

```yml
suites:
  integration: 
    - name: api-closed
      services:
        - name: api
          local:
            command: test/commands/start-api.sh
      test:
        specs: test/integration
        wait-on: exit:api
```

> Note: Log files are not generated for tests processes and for coveraged services processes when runned locally.

### Environment variables

Narval presets a group of environment variables that are available in commands and in tests executions, locally and inside Docker:
* `narval_is_docker`. `true` in Docker executions, `false` in local executions.
* `narval_suite_type`. Type of the suite that is being executed.
* `narval_suite`. Name of the suite that is being executed.
* `narval_service`. Name of the service that is being executed.

Apart from this built-in variables, you can set your own custom environment variables for tests or services executions. Read the [configuration chapter](#configuration) to know how to define them. Once you have them defined, you can use them from services, commands, or tests. As example:

```yaml
suites:
  integration:
    - name: api
      services:
        - name: api-service
          docker:
            container: service-container
            command: test/commands/start-api.sh 3000
          local:
            command: test/commands/start-api.sh 3020
      test:
        specs: test/integration/api
        docker:
          env:
            port: 3000
            hostName: service-container
        local:
          env:
            port: 3020
            hostName: localhost
```

Now, you can write a test that can be runned locally, for development purposes, or in Docker, during continuos integration cycle:

```js
  test.describe('server', () => {
    test.it('should be running', () => {
      return requestPromise({
      	method: 'GET',
        url: `http://${process.env.hostName}:${process.env.port}/api`
      }).then((response) => {
        return test.expect(response.statusCode).to.equal(200)
      })
    })
  })
```

[back to top](#table-of-contents)

## Examples

Here you have an example that runs standard, unit, integration and end-to-end tests over a [very simple api package][integration-tests-foo-package-url] that includes a connection to a mongodb database, and some other fake features developed explictly for the example. The configuration is overloaded intendedly to provide different combinations of configurations examples.

In the example you can see how Narval is used to start a Mongodb service, and the api itself, and then run tests. The "end-to-end" tests are generating coverage, and integration tests are used to check the api logs, and if the service is writing some files as expected. For local executions, the mongodb connection is disabled and the api stores books in memory only, this was made to avoid the need of having mongodb installed in the system for running the example.

You can run this example following the next steps:
1. Create a `.narval.yml` file into the [foo api package][integration-tests-foo-package-url] folder, and copy the example code inside it. _You can also copy directly the example file `test/integration/configs/example.yaml` into the same folder and rename it to `.narval.yml`_
2. Edit the `package.json` file of the api package, and change the `narval` dependency to `latest`.
3. Run `npm i`
4. Run `npm test`, or `npm test -- --local`

```yml
docker-images:
  - name: node-image
    from: node:8.11.1
    expose:
      - 4000
    add:
      - package.json
    install: test/commands/install.sh
  - name: mongodb-image
    from: mongo:3.6.4
    expose:
      - 27017
docker-containers:
  - name: test-container
    build: node-image
    bind:
      - lib
      - test
      - server.js
  - name: api-container
    build: node-image
    bind:
      - lib
      - test
      - server.js
  - name: mongodb-container
    build: mongodb-image
    bind:
      - test/commands
suites:
  unit: 
    - name: unit
      test:
        specs: test/unit
      coverage:
        config:
          dir: .coverage/unit
  end-to-end:
    - name: books-api
      before:
        docker:
          down-volumes: true
      services:
        - name: mongodb
          docker:
            container: mongodb-container
            command: test/commands/mongodb-docker.sh
        - name: api-server
          local:
            command: server.js --host=localhost --port=3000 --mongodb=avoid
          docker:
            container: api-container
            command: server.js --host=api-container --port=4000 --mongodb=mongodb://mongodb-container/narval-api-test
            wait-on: tcp:mongodb-container:27017
            exit_after: 10000
      test:
        specs: test/end-to-end/books
        local:
          wait-on: tcp:localhost:3000
          env:
            api_host: localhost
            api_port: 3000
        docker:
          container: test-container
          wait-on: tcp:api-container:4000
          env:
            api_host: api-container
            api_port: 4000
      coverage:
        from: api-server
  integration:
    - name: logs
      services:
        - name: mongodb
          docker:
            container: mongodb-container
            command: test/commands/mongodb-docker.sh
        - name: api-server
          local:
            command: test/commands/start-server.sh
            env:
              mongodb: avoid
              api_host: localhost
              api_port: 3000
          docker:
            container: api-container
            command: test/commands/start-server.sh
            wait-on:
              resources:
                - tcp:mongodb-container:27017
              timeout: 50000
              interval: 50
              delay: 100
            env:
              mongodb: mongodb://mongodb-container/narval-api-test
              api_host: api-container
              api_port: 4000
      test:
        specs: test/integration/logs
        local:
          wait-on: tcp:localhost:3000
          env:
            api_host: localhost
            api_port: 3000
        docker:
          container: test-container
          wait-on: tcp:api-container:4000
          env:
            api_host: api-container
            api_port: 4000
      coverage:
        enabled: false
    - name: commands
      services:
        - name: mongodb
          docker:
            container: mongodb-container
            command: test/commands/mongodb-docker.sh
        - name: api-server
          local:
            command: test/commands/start-server.sh
            env:
              mongodb: avoid
              api_host: localhost
              api_port: 3000
          docker:
            container: api-container
            command: test/commands/start-server.sh
            wait-on: tcp:mongodb-container:27017
            env:
              mongodb: mongodb://mongodb-container/narval-api-test
              api_host: api-container
              api_port: 4000
      test:
        specs: test/integration/commands
        local:
          wait-on: tcp:localhost:3000
          env:
            api_host: localhost
            api_port: 3000
        docker:
          container: test-container
          wait-on: tcp:api-container:4000
          env:
            api_host: api-container
            api_port: 4000
      coverage:
        enabled: false
```

> NOTE: There are more files with many other configurations that may be useful as examples at the [integration tests folder of this repository][integration-tests-config-url]. All these Narval configuration files are used for testing Narval itself, and most of them are runned over the ["foo api package" in the integration tests folder][integration-tests-foo-package-url].

[back to top](#table-of-contents)

## Contributing

Contributions are welcome! Read the [contributing guide lines][narval-contributing-url] and [code of conduct][narval-code-of-conduct-url], check out the [issues][narval-issues-url] or the [PRs][narval-prs-url], and make your own if you want something that you don't see there. 

[back to top](#table-of-contents)

[narval-logo-image]: https://javierbrea.github.io/narval/assets/logo-name.png
[narval-prs-url]: https://github.com/javierbrea/narval/pulls
[narval-contributing-url]: https://github.com/javierbrea/narval/blob/master/.github/CONTRIBUTING.md
[narval-code-of-conduct-url]: https://github.com/javierbrea/narval/blob/master/.github/CODE_OF_CONDUCT.md
[narval-issues-url]: https://github.com/javierbrea/narval/issues

[coveralls-image]: https://coveralls.io/repos/github/javierbrea/narval/badge.svg
[coveralls-url]: https://coveralls.io/github/javierbrea/narval
[travisci-image]: https://travis-ci.org/javierbrea/narval.svg?branch=master
[travisci-url]: https://travis-ci.org/javierbrea/narval
[last-commit-image]: https://img.shields.io/github/last-commit/javierbrea/narval.svg
[last-commit-url]: https://github.com/javierbrea/narval/commits
[license-image]: https://img.shields.io/npm/l/narval.svg
[license-url]: https://github.com/javierbrea/narval/blob/master/LICENSE

[npm-downloads-image]: https://img.shields.io/npm/dm/narval.svg
[npm-downloads-url]: https://www.npmjs.com/package/narval
[npm-dependencies-image]: https://img.shields.io/david/javierbrea/narval.svg
[npm-dependencies-url]: https://david-dm.org/javierbrea/narval
[quality-gate-image]: https://sonarcloud.io/api/project_badges/measure?project=narval&metric=alert_status
[quality-gate-url]: https://sonarcloud.io/dashboard?id=narval
[release-image]: https://img.shields.io/github/release-date/javierbrea/narval.svg
[release-url]: https://github.com/javierbrea/narval/releases
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg
[standard-url]: http://standardjs.com/

[travis-docker-url]: https://docs.travis-ci.com/user/docker
[docker-url]: https://www.docker.com/
[istanbul-url]: https://istanbul.js.org/
[istanbul-usage-url]: https://istanbul.js.org/
[mocha-url]: https://mochajs.org
[mocha-usage-url]: https://mochajs.org/#usage
[wait-on-url]: https://www.npmjs.com/package/wait-on
[integration-tests-config-url]: https://github.com/javierbrea/narval/tree/master/test/integration/configs
[integration-tests-foo-package-url]: https://github.com/javierbrea/narval/tree/master/test/integration/packages/api
[shebang-url]: https://en.wikipedia.org/wiki/Shebang_(Unix)
[child-process-url]: https://nodejs.org/docs/latest-v8.x/api/child_process.html#child_process_child_process_execfile_file_args_options_callback
