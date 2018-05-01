#!/usr/bin/env bash

NARVAL_FILE="test/integration/packages/${package_to_launch}/.narval.yml"
LOG_SEP=">>>>>>>>>>>>>>>"

echo "$LOG_SEP CLEANING \"${package_to_launch}\" PACKAGE"
rm -rf test/integration/packages/${package_to_launch}/.coverage
if [ -f $NARVAL_FILE ]; then
  rm $NARVAL_FILE
fi

if [ ! -z "$narval_config" ] && [ "$narval_config" != "" ]; then
  echo "$LOG_SEP CREATING CONFIGURATION FILE FROM FILE \"$narval_config\""
  cp test/integration/configs/${narval_config}.yml $NARVAL_FILE
fi
