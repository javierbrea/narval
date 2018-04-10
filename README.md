# Narval

Multi test suites runner for Node.js packages. Docker based.

[![Build status][travisci-image]][travisci-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Quality Gate][quality-gate-image]][quality-gate-url] [![js-standard-style][standard-image]][standard-url]

[![Node version][node-version-image]][node-version-url] [![NPM version][npm-image]][npm-url] [![NPM dependencies][npm-dependencies-image]][npm-dependencies-url] [![Last commit][last-commit-image]][last-commit-url] [![Last release][release-image]][release-url] 

[![NPM downloads][npm-downloads-image]][npm-downloads-url] [![License][license-image]][license-url]

## TODO before first release:
  * Write documentation.
  * Ensure that narval dependency is installed in docker containers.
  * Test it on windows.
  * Add unit and integration tests
  * Add default options for some configurations.
  * Improve configuration validation, and traces.
  * Local execution of desired test or service, to improve tests development flow.
  * Start test suite services using PM2, for environments with no docker available.
  * Add "Check coverage" using istanbul option.

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
