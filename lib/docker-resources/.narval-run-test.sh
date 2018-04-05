#!/usr/bin/env bash

specs=$1
coverage_folder=$2
wait_for=$3

command_to_run="node_modules/istanbul/lib/cli.js  --dir=.coverage/$coverage_folder --include-all-sources --print=detail cover ./node_modules/.bin/_mocha -- --recursive $specs"

echo "Running tests in \"$specs\" with custom command"

if [ "$wait_for" != "" ]; then
  ./.narval-wait-for-it.sh $wait_for -- ./$command_to_run
else
  ./$command_to_run
fi
