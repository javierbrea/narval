#!/usr/bin/env bash

command_to_run=$1
command_params=$2
coverage_options=$3
coverage_enabled=$4
wait_for=$5
exit_after=$6

log_title="[Narval] <INFO>"

echo ""
echo "$log_title RUN COMMAND OPTIONS:"
echo "$log_title command_to_run: $command_to_run"
echo "$log_title command_params: $command_params"
echo "$log_title coverage_options: $coverage_options"
echo "$log_title coverage_enabled: $coverage_enabled"
echo "$log_title wait_for: $wait_for"
echo "$log_title exit_after: $exit_after"

if [ -z "$command_to_run" ]; then
  echo "Please define a command to be run"
else
  if [ "$command_to_run" == "narval-default-test-command" ]; then
    command_to_run="node_modules/.bin/_mocha"
  fi

  if [ "$exit_after" != "" ]; then
    export command_to_coverage=$command_to_run
    export exit_after=$exit_after
    command_to_run=".narval/scripts/run-and-exit-after.js"
  fi

  command_to_run="$command_to_run $command_params"

  if [ "$coverage_enabled" == "true" ]; then
    command_to_run="node_modules/istanbul/lib/cli.js $coverage_options cover ./$command_to_run"
  fi

  if [ "$wait_for" != "" ]; then
    command_to_run=".narval/scripts/wait-for-it.sh $wait_for -- ./$command_to_run"
  fi
      
  echo ""
  echo "$log_title RUNNING COMMAND: $command_to_run"
  echo ""

  ./$command_to_run
fi
