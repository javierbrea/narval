#!/usr/bin/env bash

#const childProcess = require('child_process')
#const fs = require('fs')

#setInterval(() => {
#  console.log('started!')
#}, 1000)

#setTimeout(() => {
#  console.log('starting mongodb!')
#  fs.mkdirSync('db')
#  childProcess.spawnSync('mongod', ['--dbpath=db'], {
#    shell: true,
#    stdio: [0,1,2]
#  })
#}, 10000)

if ! [ -d db ]; then
  mkdir db
fi
mongod --version
mongod --dbpath=db --bind_ip_all
