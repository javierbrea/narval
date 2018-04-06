#!/usr/bin/env bash

command_to_run=$1
specs=$2
coverage_options=$3
coverage_enabled=$4
wait_for=$5

echo 'RUN CMD'
echo $command_to_run
echo $specs
echo $coverage_options
echo $coverage_enabled
echo $wait_for

if [ -z "$command_to_run" ]; then
  echo "Please define a command to be run"
else
  if [ "$coverage_enabled" == "true" ] && [ "$command_to_run" != ".narval-run-test.sh" ]; then
    ./.narval-run-command-coverage.sh $command_to_run $coverage_options $wait_for
  else
    ./$command_to_run $specs $coverage_options $coverage_enabled $wait_for
  fi
fi