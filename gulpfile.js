<<<<<<< 4f130c680eb250e6607917bd7919d92a1105b0c6
var gulp = require('gulp'),
    wiredep = require('wiredep').stream,
    eventStream = require('event-stream'),
    gulpLoadPlugins = require('gulp-load-plugins'),
    fs = require('fs'),
    path = require('path'),
    s = require('underscore.string'),
    argv = require('yargs').argv,
    del = require('del');

var plugins = gulpLoadPlugins({});
var pkg = require('./package.json');

var config = {
  main: '.',
  ts: ['helpers/*.ts'],
  dist: argv.out || './dist/',
  js: pkg.name + '.js',
  tsProject: plugins.typescript.createProject({
    target: 'ES5',
    outFile: 'compiled.js',
    declaration: true,
    noResolve: false
  })
};

gulp.task('clean-defs', function() {
  return del('defs.d.ts');
});

gulp.task('bower', function() {
  return gulp.src('index.html')
    .pipe(wiredep({devDependencies: true}))
    .pipe(gulp.dest('.'));
});

gulp.task('tsc', ['clean-defs'], function() {
  var cwd = process.cwd();
  var tsResult = gulp.src(config.ts)
    .pipe(config.tsProject())
    .on('error', plugins.notify.onError({
      message: '#{ error.message }',
      title: 'Typescript compilation error'
    }));

    return eventStream.merge(
      tsResult.js
        .pipe(plugins.concat(config.js))
        .pipe(gulp.dest(config.dist)),
      tsResult.dts
        .pipe(plugins.rename('defs.d.ts'))
        .pipe(gulp.dest('.')));
=======
var gulp = require('gulp');
var connect = require('gulp-connect');
var argv = require('yargs').argv;
var del = require('del');
var ts = require('gulp-typescript');
var tsProject = ts.createProject('tsconfig.json');
var tsConfig = require('./tsconfig.json');

gulp.task('clean', function () {
  return del(['./dist/**/*']);
});

gulp.task('tsc', ['clean'], function() {
  tsProject.src()
    .pipe(tsProject())
    .pipe(gulp.dest('./dist'));
});

gulp.task('watch', function() {
  gulp.watch(tsConfig.include, ['reload']);
>>>>>>> Switch from bower to npm
});

gulp.task('connect', function() {
  connect.server({
    livereload: true,
    port: 2772
  });
});

gulp.task('reload', function() {
  gulp.src('.')
    .pipe(connect.reload());
});

<<<<<<< 4f130c680eb250e6607917bd7919d92a1105b0c6
gulp.task('build', ['bower', 'tsc']);

gulp.task('default', ['connect']);
=======
gulp.task('build', ['tsc']);

gulp.task('default', ['build', 'connect', 'watch']);
>>>>>>> Switch from bower to npm
