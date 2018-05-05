#!/usr/bin/env bash

NARVAL_FOO_NODE_MODULES="test/integration/packages/api/_node_modules"
NARVAL_LIB_DEST="${NARVAL_FOO_NODE_MODULES}/narval"
NARVAL_FILE="test/integration/packages/${package_to_launch}/.narval.yml"
COVERAGE_FOLDER="test/integration/packages/${package_to_launch}/.coverage"
LOG_SEP=">>>>>>>>>>>>>>>"

echo "$LOG_SEP CLEANING \"${package_to_launch}\" PACKAGE"
rm -rf $COVERAGE_FOLDER || sudo rm -rf $COVERAGE_FOLDER

if [ -f $NARVAL_FILE ]; then
  rm $NARVAL_FILE
fi

if [ ${package_to_launch} == "api" ]; then
  # Copy Narval itself to the foo package. Link it in the package.json using "file:".
  # The installation folder is added to the Docker image, so they will use it from file system as well.
  rm -rf ${NARVAL_FOO_NODE_MODULES}
  mkdir ${NARVAL_FOO_NODE_MODULES}
  mkdir ${NARVAL_LIB_DEST}
  cp -r bin ${NARVAL_LIB_DEST}/bin
  cp -r lib ${NARVAL_LIB_DEST}/lib
  cp package.json ${NARVAL_LIB_DEST}/package.json
  cp index.js ${NARVAL_LIB_DEST}/index.js
  cp default-config.yml ${NARVAL_LIB_DEST}/default-config.yml
fi

if [ ! -z "$narval_config" ] && [ "$narval_config" != "" ]; then
  echo "$LOG_SEP CREATING CONFIGURATION FILE FROM FILE \"$narval_config\""
  cp test/integration/configs/${narval_config}.yml $NARVAL_FILE
fi
