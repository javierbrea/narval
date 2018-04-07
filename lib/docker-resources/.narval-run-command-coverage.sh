#!/usr/bin/env bash

command_to_run=$1
coverage_options=$2
wait_for=$3

slash_replace=" --"
coverage_options=${coverage_options//|cov-option|/$slash_replace}

echo 'RUN COMMAND COVERAGE'
echo $coverage_options
echo $wait_for

export command_to_coverage=$command_to_run
export kill_after=20000

command_to_run="node_modules/istanbul/lib/cli.js $coverage_options cover ./.run-js-command.js"

echo "Running custom command \"$command_to_run  --name=service --path=/app/.shared --host=service\" with coverage."

if [ "$wait_for" != "" ]; then
  ./.narval-wait-for-it.sh $wait_for -- ./$command_to_run -- --name=service --path=/app/.shared --host=service
else
  echo "./$command_to_run --name=service --path=/app/.shared --host=service"
  ./$command_to_run -- --name=service --path=/app/.shared --host=service
fi
