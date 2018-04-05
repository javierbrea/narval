#!/usr/bin/env bash

echo "Running tests in \"$1\""

./node_modules/istanbul/lib/cli.js  --dir=.coverage/$2 --include-all-sources --print=detail cover ./node_modules/.bin/_mocha -- --recursive $1