module.exports = (grunt) => grunt.registerTask('build', [
    'clean',
    'less',
    'webpack'
]);
