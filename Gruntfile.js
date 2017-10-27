module.exports = ->
  @initConfig
    pkg: @file.readJSON 'package.json'

    yaml:
      schemas:
        files: [
          expand: true
          cwd: 'schemata/'
          src: '*.yml'
          dest: 'schema/'
        ]

    # Coding standards
    yamllint:
      schemas: ['schemata/*.yml']

    coffeelint:
      components: [
        'src/*.coffee'
        'spec/*.coffee'
        'Gruntfile.coffee'
      ]
      options:
        'max_line_length':
          'level': 'ignore'

    mochaTest:
      nodejs:
        src: ['spec/*.coffee']
        options:
          reporter: 'spec'
          require: 'coffee-script/register'

  # Grunt plugins used for building
  @loadNpmTasks 'grunt-yaml'

  # Grunt plugins used for testing
  @loadNpmTasks 'grunt-yamllint'
  @loadNpmTasks 'grunt-coffeelint'
  @loadNpmTasks 'grunt-mocha-test'

  # Our local tasks
  @registerTask 'build', 'Build', (target = 'all') =>
    @task.run 'yaml'

  @registerTask 'test', 'Build and run tests', (target = 'all') =>
    @task.run 'coffeelint'
    @task.run 'yamllint'
    @task.run 'mochaTest'

  @registerTask 'default', ['test']

