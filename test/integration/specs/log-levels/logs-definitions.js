module.exports = {
  log: [
    {
      it: 'docker logs',
      expects: [
        '[Narval] [LOG] Docker logs =>',
        'Removing network docker_default'
      ]
    },
    {
      it: 'docker logs',
      expects: [
        'Creating network "docker_default" with the default driver'
      ]
    }
  ],
  trace: [
    {
      it: 'docker compose unmounting volumes command',
      expects: [
        '[TRACE] Running Docker command "docker-compose down --volumes'
      ]
    },
    {
      it: 'docker compose start command',
      expects: [
        '[TRACE] Running Docker command "docker-compose up --no-start'
      ]
    },
    {
      it: 'services start docker commands',
      expects: [
        '[Narval] [TRACE] Running Docker command "docker-compose start mongodb-container"',
        '[Narval] [TRACE] Running Docker command "docker-compose start api-container"'
      ]
    },
    {
      it: 'mongodb services logs',
      expects: [
        'I CONTROL  [initandlisten] MongoDB starting',
        'WAITING FOR: tcp:mongodb-container:27017',
        '[Narval] [DEBUG] RUNNING COMMAND: test/commands/start-server.sh',
        'Connecting to database mongodb://mongodb-container/narval-api-test',
        'WAITING FOR: tcp:api-container:4000',
        '{"title":"The Sun Also Rises","author":"Ernest Hemingway"}',
        'Retrieving all books from database'
      ]
    }
  ],
  debug: [
    {
      it: 'unit tests execution start',
      expects: [
        '[Narval] [DEBUG] Starting tests of "unit" suite "unit" with coverage enabled'
      ]
    },
    {
      it: 'docker compose unmounting volumes',
      expects: [
        '[Narval] [DEBUG] Unmounting docker-compose volumes'
      ]
    },
    {
      it: 'docker compose start',
      expects: [
        '[Narval] [DEBUG] Starting docker-compose'
      ]
    },
    {
      it: 'services start',
      expects: [
        '[DEBUG] Starting docker service "mongodb" of suite "books-api"',
        '[DEBUG] Starting docker service "api-server" of suite "books-api"'
      ]
    },
    {
      it: 'the wait for logs',
      expects: [
        '[Narval] [DEBUG] Services "mongodb, api-server" are still running. Waiting...'
      ]
    }
  ],
  info: [
    {
      it: 'standard execution start',
      expects: [
        '[Narval] [INFO] Running Standard'
      ]
    },
    {
      it: 'unit tests execution',
      expects: [
        'should start the server'
      ]
    },
    {
      it: 'coverage summary',
      expects: [
        '== Coverage summary =='
      ]
    },
    {
      it: 'the end of tests suites executions',
      expects: [
        '[Narval] [INFO] Execution of "end-to-end" suite "books-api" finished OK'
      ]
    }
  ],
  warn: [
    {
      it: 'services exit warnings',
      expects: [
        '[WARN] Docker container "api-container" of service "api-server" exited with code "137"',
        '[WARN] Docker container "mongodb-container" of service "mongodb" exited with code "137"'
      ]
    }
  ]
}
