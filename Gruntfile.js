module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {
            dist: {
                src: [
                    'js/*.js'
                ],
                dest: 'js/build/tutorifull.js',
            }
        },

        uglify: {
            build: {
                src: 'js/build/tutorifull.js',
                dest: 'static/js/tutorifull.min.js'
            }
        },

        sass: {
            dist: {
                options: {
                    style: 'compressed'
                },
                files: {
                    'css/build/tutorifull.min.css': 'css/tutorifull.scss'
                }
            }
        },

        autoprefixer: {
            options: {
                map: true
            },
            dist: {
                files: {
                    'static/css/tutorifull.min.css': 'css/build/tutorifull.min.css'
                }
            }
        },

        watch: {
            options: {
                livereload: true
            },
            js: {
                files: ['js/*.js'],
                tasks: ['concat', 'uglify']
            },
            scss: {
                files: ['css/*.scss'],
                tasks: ['sass']
            },
            css: {
                files: ['css/build/tutorifull.min.css'],
                tasks: ['autoprefixer']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', ['concat', 'uglify', 'sass', 'autoprefixer']);
};
