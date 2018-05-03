#!/usr/bin/env bash

# For testing added resources purposes
echo "List files in docker container"
ls -la
echo "End of list files in docker container"

node server.js --host="${api_host}" --port="${api_port}" --mongodb="${mongodb}"
