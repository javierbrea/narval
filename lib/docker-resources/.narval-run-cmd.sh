#!/usr/bin/env bash

command_to_run=$1
specs=$2
coverage_options=$3
coverage_enabled=$4
wait_for=$5

if [ -z "$1" ]; then
  echo "Please define a command to be run"
else
  ./$command_to_run $specs $coverage_options $coverage_enabled $wait_for
fi