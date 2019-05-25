var gulp = require('gulp');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var rename = require('gulp-rename');
var cssnano = require('gulp-cssnano');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var notify = require('gulp-notify');
var del = require('del');
var rev = require('gulp-rev');
var revdel = require('gulp-rev-delete-original');

gulp.task('clean', gulp.series(function() {
    return del(['static/css', 'static/js']);
}));

gulp.task('css', gulp.series(gulp.parallel('clean'), function() {
    return gulp.src('css/tutorifull.scss')
    .pipe(sass())
    .pipe(autoprefixer('last 2 version'))
    .pipe(rename({suffix: '.min'}))
    .pipe(cssnano())
    .pipe(gulp.dest('static/css'))
    .pipe(notify({ message: 'CSS task complete' }));
}));

gulp.task('js', gulp.series(gulp.parallel('clean'), function() {
    return gulp.src('js/*.js')
    .pipe(concat('tutorifull.js'))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(gulp.dest('static/js'))
    .pipe(notify({message: 'JS task complete'}));
}));

gulp.task('rev', gulp.series(gulp.parallel('css', 'js'), function() {
    return gulp.src(['static/css/*', 'static/js/*'], {base: 'static'})
    .pipe(rev())
    .pipe(revdel())
    .pipe(gulp.dest('static'))
    .pipe(rev.manifest({merge: true}))
    .pipe(gulp.dest(process.cwd()))
}));

gulp.task('watch', gulp.series(function() {
    gulp.watch('css/*.scss', ['rev']);
    gulp.watch('js/*.js', ['rev']);
}));

gulp.task('default', gulp.parallel('clean', 'css', 'js', 'rev'));