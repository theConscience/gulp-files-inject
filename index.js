var through = require( 'through2' );
var gutil = require( 'gulp-util' );
var fs = require( 'fs' );

module.exports = function ( option ) {
    'use strict';

    var CONST_PATTERN = '<\\!--\\s*inject-style\\s*(.*?)\\s*-->';
    var CSS_LINK_PATTERN = '<link\\s*(.*?)\\s*>';//'<link href="([^\\.]\\.css)"[^>]*>';
    var JS_SCRIPT_PATTERN = '<script\\s*(.*?)\\s*></script>';

    var self = null;

    if ( !option ) {
        option = {};
    }

    if ( option.match_pattern ) {
        try {
            new RegExp( option.match_pattern );
        } catch ( e ) {
            this.emit( 'error',
                new gutil.PluginError( 'gulp-style-inject', ' Invalid `match_pattern` parameter. Regular expression string required.' ) );
        }
    } else {
        option.match_pattern = CONST_PATTERN;
    }

    if ( option.css_match_pattern ) {
        try {
            new RegExp( option.css_match_pattern );
        } catch ( e ) {
            this.emit( 'error',
                new gutil.PluginError( 'gulp-style-inject', ' Invalid `css_match_pattern` parameter. Regular expression string required.' ) );
        }
    } else {
        option.css_match_pattern = CSS_LINK_PATTERN;
    }

    if ( option.js_match_pattern ) {
        try {
            new RegExp( option.js_match_pattern );
        } catch ( e ) {
            this.emit( 'error',
                new gutil.PluginError( 'gulp-style-inject', ' Invalid `js_match_pattern` parameter. Regular expression string required.' ) );
        }
    } else {
        option.js_match_pattern = JS_SCRIPT_PATTERN;
    }

    if (!option.path) {
        option.path = '';
    }
    console.log('option.path = ' + option.path);

    if ( option.static_url_path ) {
        try {
            option.static_url_path = '' + option.static_url_path;
        } catch ( e ) {
            this.emit( 'error',
                new gutil.PluginError( 'gulp-style-inject', ' Invalid `static_url_path` parameter. String required.' ) );
        }
    } else {
        option.static_url_path = '';
    }

    if ( option.django_static_variable ) {
        try {
            option.django_static_variable = '{{ ' + option.django_static_variable + ' }}';
        } catch ( e ) {
            this.emit( 'error',
                new gutil.PluginError( 'gulp-style-inject', ' Invalid `django_static_variable` parameter. String required.' ) );
        }
    } else {
        option.django_static_variable = '{{ STATIC_URL }}';
    }

    if ( option.django_ext_variable ) {
        try {
            option.django_ext_variable = '{{ ' + option.django_ext_variable + ' }}';
        } catch ( e ) {
            this.emit( 'error',
                new gutil.PluginError( 'gulp-style-inject', ' Invalid `django_ext_variable` parameter. String required.' ) );
        }
    } else {
        option.django_ext_variable = '{{ STATIC_EXT }}';
    }

    console.log('option.css_match_pattern = ' + option.css_match_pattern);
    console.log('option.js_match_pattern = ' + option.js_match_pattern);
    console.log('option.static_url_path = ' + option.static_url_path);
    console.log('option.django_static_variable = ' + option.django_static_variable);
    console.log('option.django_ext_variable = ' + option.django_ext_variable);

    function throwError( msg ) {
        self.emit( 'error',
            new gutil.PluginError( 'gulp-style-inject', msg ) );
    }

    function transformResponse( contents ) {
        return '<style>\n' + contents + '\n</style>';
    }

    function transformLinkResponse( contents ) {
        return '' + contents + '\n';
    }

    function transformScriptResponse( contents ) {
        return '' + contents + '\n';
    }

    function getAttributes( params ) {
        new gutil.log( 'getAttributes get such parameters:' + params );

        if (params.indexOf(option.django_static_variable) !== -1) {
            params = params.replace(option.django_static_variable, option.static_url_path);
            new gutil.log('django_static_variable replaced, params is: ' + params);
        }
        if (params.indexOf(option.django_ext_variable) !== -1) {
            params = params.replace(option.django_ext_variable, '');
            new gutil.log('django_ext_variable deleted, params is: ' + params);
        }

        var result = {};
        var group = params.replace( /\s+/gi, ' ' )
            .split( ' ' );
        for ( var i = 0; i < group.length; i++ ) {
            if ( group[ i ] ) {
                var combination = group[ i ].split( '=' );
                result[ combination[ 0 ].replace( /\s*['"](.*)['"]\s*/, '$1' ) ] = combination[ 1 ].replace( /\s*['"](.*)['"]\s*/, '$1' );
            }
        }
        return result;
    }

    function getStyleFile( source ) {
        if ( source ) {
            return transformResponse( fs.readFileSync( source ) );
        } else {
            throwError( 'ERROR: No source file specified.' );
        }
    }

    function getCssFile( source ) {
        if ( source ) {
            return transformLinkResponse( fs.readFileSync( source ) );
        } else {
            throwError( 'ERROR: No source file specified.' );
        }
    }

    function getJsFile( source ) {
        if ( source ) {
            return transformScriptResponse( fs.readFileSync( source ) );
        } else {
            throwError( 'ERROR: No source file specified.' );
        }
    }

    function styleInject( file, enc, callback ) {
        /*jshint validthis:true*/

        self = this;

        // Do nothing if no contents
        if ( file.isNull() ) {
            this.push( file );
            return callback();
        }

        // check if file.contents is a `Stream`
        if ( file.isStream() ) {
            // accepting streams is optional
            this.emit( 'error',
                new gutil.PluginError( 'gulp-style-inject', 'Stream content is not supported' ) );
            return callback();
        }

        // check if file.contents is a `Buffer`
        if ( file.isBuffer() ) {
            new gutil.log('file is buffer!');
            var contents = String( file.contents );

            new gutil.log('Files contents before regexp: ' + contents);

            contents = contents.replace( new RegExp( option.match_pattern, 'gi' ), function ( match, parameters ) {
                new gutil.log('Files contents after regexp match_pattern: ' + contents);
                var attrs = getAttributes( parameters );
                new gutil.log('option.path is: ' + option.path);
                return getStyleFile( option.path + attrs.src );
            } );

            contents = contents.replace( new RegExp( option.css_match_pattern, 'gi' ), function ( match, parameters ) {
                new gutil.log('Files contents after regexp css_match_pattern!: ' + contents);
                var attrs = getAttributes( parameters );
                console.log('here!');
                if (attrs.href !== 'undefined') {
                    new gutil.log('Get link, href value is: ' + attrs.href);
                    new gutil.log('option.path is: ' + option.path);
                    return getCssFile( option.path + attrs.href );
                }
            } );

            contents = contents.replace( new RegExp( option.js_match_pattern, 'gi' ), function ( match, parameters ) {
                new gutil.log('Files contents after regexp js_match_pattern: ' + contents);
                var attrs = getAttributes( parameters );
                if (attrs.src !== 'undefined') {
                    new gutil.log('Get script, src value is: ' + attrs.src);
                    new gutil.log('option.path is: ' + option.path);
                    return getJsFile( option.path + attrs.src );
                }
            } );

            file.contents = new Buffer( contents );
            this.push( file );
            return callback();
        } else {
            console.log('file not is buffer!');
        }

        return callback();
    }

    return through.obj( styleInject );
};