# Narval

Multi test suites runner for Node.js packages. Docker based.

[![Build status][travisci-image]][travisci-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Quality Gate][quality-gate-image]][quality-gate-url] [![js-standard-style][standard-image]][standard-url]

[![Node version][node-version-image]][node-version-url] [![NPM version][npm-image]][npm-url] [![NPM dependencies][npm-dependencies-image]][npm-dependencies-url] [![Last commit][last-commit-image]][last-commit-url] [![Last release][release-image]][release-url] 

[![NPM downloads][npm-downloads-image]][npm-downloads-url] [![License][license-image]][license-url]

## Table of Contents

* [Introduction](#introduction)
* [Quick Start](#quick-start)
* [Configuration](#configuration)

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

If no configuration file `.narval.yml` is provided, by default Narval will search for test files inside of a folder `/test` in your project root, and run the Standard javascript linter. A coverage report will be generated at `/.coverage` folder.

```shell
npm run test
# Run Standard linter over all project sources, and unit tests found inside "/test" folder

npm run test -- --standard
# Run only Standard

npm run test -- --suite=unit
# Run only unit tests.
```

[back to top](#table-of-contents)

## Configuration

Create a `.narval.yml` file at the root of your project.

### docker-images

`<Array>` of [docker-image objects](#docker-image). Configure your base Docker image or images that will be used to instanciate the different Docker containers used to start the services.

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

#### docker-image

`<Object>`. Configuration for creating the Docker image. It is a subset of DockerFile configuration.

* `name` `<String>`. Reference for the base image.
* `from` `<String>`. Docker image to create this image from.
* `add` `<Array> of <String>`. Array of folders or files to be copied inside the image, at Docker build time. Paths are relative to the project root.
* `expose` `<Array> of <Number>`. Array of ports to be exposed. This ports will be available for other Docker containers (for other Narval "services", consequently).
* `install` `<String>`. Path to a script that will be executed in Docker build time. Use it to install your needed dependencies. It will executed only once, when Docker image is built. Narval will check for its own installation after this command runs, so, if you don´t install Narval dependency inside Docker, it will do it for you.

*Following the previous example, the "test/docker/install" script in your project could contain:*

```bash
#!/usr/bin/env bash

npm install
```

*So, in Docker build time, the "package.json" file will be copied into the docker image, and "npm install" will be executed. Now you have all your needed dependencies ready to be used by your services (Docker containers).*

### docker-containers

`<Array>` of [docker-container objects](#docker-container). Configure your Docker container or containers in which your services and tests will run.

```yml
docker-containers:
  - name: service-container
    build: basic-image
    bind:
      - lib
      - index.js
  - name: test-container
    build: basic-image
    bind:
      - lib
      - test
      - index.js
    depends_on:
      - service
```

#### docker-container

`<Object>`. Configuration for creating the Docker container. It is a subset of docker-compose configuration.

* `name` `<String>`. Reference for the container.
* `build` `<String>`. Reference name of the [docker-image](#docker-image) from which this container will be started.
* `bind` `<Array> of <String>`. Array of paths to be binded into the docker container. This "resources" will be "shared" from the local file system directly to the docker container, so if there are changes in the resources, there is no need to rebuild the Docker images to refresh changes.
* `depends_on` `<String>`. Reference name of another docker-container. This container will be started only after the other one is started. (Caution, because this does not implies that services inside the other container are ready as well)

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
[mocha-url]: https://mochajs.org
