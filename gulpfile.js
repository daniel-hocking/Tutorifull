var gulp = require('gulp');
var sass = require('gulp-ruby-sass');
var autoprefixer = require('gulp-autoprefixer');
var rename = require('gulp-rename');
var cssnano = require('gulp-cssnano');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var notify = require('gulp-notify');
var del = require('del');

gulp.task('default', ['clean'], function() {
    gulp.start('css', 'js');
});

gulp.task('clean', function() {
    return del(['static/css', 'static/js']);
});

gulp.task('css', function() {
    return sass('css/tutorifull.scss', { style: 'expanded' })
    .pipe(autoprefixer('last 2 version'))
    .pipe(rename({suffix: '.min'}))
    .pipe(cssnano())
    .pipe(gulp.dest('static/css'))
    .pipe(notify({ message: 'CSS task complete' }));
});

gulp.task('js', function() {
    return gulp.src('js/*.js')
    .pipe(concat('tutorifull.js'))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(gulp.dest('static/js'))
    .pipe(notify({message: 'JS task complete'}));
});

gulp.task('watch', function() {
    gulp.watch('css/*.scss', ['css']);
    gulp.watch('js/*.js', ['js']);
});
