#!/usr/bin/env bash

specs=$1
coverage_options=$2
coverage_enabled=$3
wait_for=$4

slash_replace=" --"
coverage_options=${coverage_options//|cov-option|/$slash_replace}

echo 'RUN TEST'
echo $specs
echo $coverage_options
echo $coverage_enabled
echo $wait_for

if [ "$coverage_enabled" == "true" ]; then
  command_to_run="node_modules/istanbul/lib/cli.js $coverage_options cover ./node_modules/.bin/_mocha -- --recursive $specs"
else
  command_to_run="node_modules/.bin/_mocha -- --recursive $specs"
fi

echo "Running tests in \"$specs\". Coverage enabled: $coverage_enabled"

if [ "$wait_for" != "" ]; then
  ./.narval-wait-for-it.sh $wait_for -- ./$command_to_run
else
  ./$command_to_run
fi
