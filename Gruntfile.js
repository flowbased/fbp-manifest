module.exports = function () {
  this.initConfig({
    pkg: this.file.readJSON('package.json'),

    eslint: {
      target: ['*.js', 'src/*.js', 'src/**/*.js'],
    },

    yaml: {
      schemas: {
        files: [{
          expand: true,
          cwd: 'schemata/',
          src: '*.yml',
          dest: 'schema/',
        },
        ],
      },
    },

    // Coding standards
    yamllint: {
      schemas: ['schemata/*.yml'],
    },

    mochaTest: {
      nodejs: {
        src: ['spec/*.js'],
        options: {
          reporter: 'spec',
        },
      },
    },
  });

  // Grunt plugins used for building
  this.loadNpmTasks('grunt-yaml');

  // Grunt plugins used for testing
  this.loadNpmTasks('grunt-eslint');
  this.loadNpmTasks('grunt-yamllint');
  this.loadNpmTasks('grunt-mocha-test');

  // Our local tasks
  this.registerTask('build', 'Build', () => {
    this.task.run('yaml');
  });

  this.registerTask('test', 'Build and run tests', () => {
    this.task.run('eslint');
    this.task.run('yamllint');
    this.task.run('mochaTest');
  });

  this.registerTask('default', ['test']);
};
