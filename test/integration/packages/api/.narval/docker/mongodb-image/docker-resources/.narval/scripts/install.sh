#!/usr/bin/env bash


if [ -x "$(command -v npm)" ]; then
  echo "Installing wait-on dependency"
  npm install -g wait-on@2.1.0

  if [ ! -f ./node_modules/.bin/narval-msc-istanbul ]; then
     echo "Narval dependency not found. Installing..."
     npm i narval
  fi
else
  echo "WARNING: Nodejs not found in Docker container. Wait-on feature is not available"
fi
