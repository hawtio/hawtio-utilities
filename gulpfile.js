var gulp = require('gulp');
var connect = require('gulp-connect');
var argv = require('yargs').argv;
var del = require('del');
var ts = require('gulp-typescript');
var eventStream = require('event-stream');
var gulpLoadPlugins = require('gulp-load-plugins');
var tsProject = ts.createProject('tsconfig.json');
var tsConfig = require('./tsconfig.json');

var plugins = gulpLoadPlugins({});

gulp.task('clean', function () {
  return del(['./dist/**/*']);
});

gulp.task('tsc', ['clean'], function () {
  var tsResult = tsProject.src()
    .pipe(tsProject());
  return eventStream
    .merge(
      tsResult.js.pipe(plugins.ngAnnotate()),
      tsResult.dts)
    .pipe(gulp.dest('./dist'));
});

gulp.task('watch', function () {
  gulp.watch(tsConfig.include, ['reload']);
});

gulp.task('connect', function () {
  connect.server({
    livereload: true,
    port: 2772
  });
});

gulp.task('reload', function () {
  gulp.src('.')
    .pipe(connect.reload());
});

gulp.task('build', ['tsc']);

gulp.task('default', ['build', 'connect', 'watch']);
