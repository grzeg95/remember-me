module.exports = function (grunt) {
  grunt.initConfig({

    // define source files and their destinations
    uglify: {
      files: {
        src: '../lib/**/*.js',
        dest: '.',
        expand: true,
        flatten: false
      }
    }
  });

  // load plugins
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // register at least this one task
  grunt.registerTask('default', ['uglify']);
};
