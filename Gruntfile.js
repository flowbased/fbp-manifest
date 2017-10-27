/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = function () {
  this.initConfig({
    pkg: this.file.readJSON('package.json'),

    eslint: {
      target: ['*.js', 'src/*.js', 'src/**/*.js']
    },

    yaml: {
      schemas: {
        files: [{
          expand: true,
          cwd: 'schemata/',
          src: '*.yml',
          dest: 'schema/'
        }
        ]
      }
    },

    // Coding standards
    yamllint: {
      schemas: ['schemata/*.yml']
    },

    mochaTest: {
      nodejs: {
        src: ['spec/*.js'],
        options: {
          reporter: 'spec'
        }
      }
    }
  });

  // Grunt plugins used for building
  this.loadNpmTasks('grunt-yaml');

  // Grunt plugins used for testing
  this.loadNpmTasks('grunt-eslint');
  this.loadNpmTasks('grunt-yamllint');
  this.loadNpmTasks('grunt-mocha-test');

  // Our local tasks
  this.registerTask('build', 'Build', target => {
    if (target == null) { target = 'all'; }
    return this.task.run('yaml');
  });

  this.registerTask('test', 'Build and run tests', target => {
    if (target == null) { target = 'all'; }
    this.task.run('eslint');
    this.task.run('yamllint');
    return this.task.run('mochaTest');
  });

  return this.registerTask('default', ['test']);
};
