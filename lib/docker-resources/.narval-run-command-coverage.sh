#!/usr/bin/env bash

command_to_run=$1
coverage_options=$2
wait_for=$3

slash_replace=" --"
coverage_options=${coverage_options//|cov-option|/$slash_replace}

echo 'RUN COMMAND COVERAGE'
echo $coverage_options
echo $wait_for

command_to_run="node_modules/istanbul/lib/cli.js $coverage_options cover $command_to_run"

echo "Running custom command \"$command_to_run\" with coverage."

if [ "$wait_for" != "" ]; then
  ./.narval-wait-for-it.sh $wait_for -- ./$command_to_run
else
  ./$command_to_run
fi
