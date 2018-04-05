#!/usr/bin/env bash
if [ -z "$1" ]; then
  echo "Please define a command to be run"
else
  if [ "$1" != ".narval-run-test.sh" ]; then
    echo "Running command \"$1\""
  fi
  ./$1 $2 $3
fi