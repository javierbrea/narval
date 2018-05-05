#!/usr/bin/env bash

# For testing added resources purposes
if [ ${narval_is_docker} == "true" ]; then
  echo "List files in docker container"
  ls -la
  echo "End of list files in docker container"
fi

echo "Narval is docker in service command: ${narval_is_docker}"
echo "Narval suite in service command: ${narval_suite}"
echo "Narval suite type in service command: ${narval_suite_type}"
echo "Narval service in service command: ${narval_service}"

echo "Argument in service command: $1"

node server.js --host="${api_host}" --port="${api_port}" --mongodb="${mongodb}"
