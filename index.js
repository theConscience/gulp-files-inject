var through = require('through2');
var gutil = require('gulp-util');
var fs = require('fs');
var path = require('path');

module.exports = function(option) {
    'use strict';

    var logger = false;

    var CONST_PATTERN = '<\\!--\\s*inject-style\\s*(.*?)\\s*-->';
    var CSS_LINK_PATTERN = '<link\\s*(.*?)\\s*>'; //'<link href="([^\\.]\\.css)"[^>]*>';
    var JS_SCRIPT_PATTERN = '<script\\s*(.*?)\\s*></script>';

    var GENERATE_BUNDLES_PATTERN = '<\\!--\\s*\\*\\*GENERATE_BUNDLES:(\\w+)\\*\\*\\s*-->';
    var GENERATE_BUNDLES_START_PATTERN = '<\\!--\\s*\\*\\*GENERATE_BUNDLES:START\\*\\*\\s*-->';
    var GENERATE_BUNDLES_END_PATTERN = '<\\!--\\s*\\*\\*GENERATE_BUNDLES:END\\*\\*\\s*-->';
    var GENERATE_BUNDLES_CONTENT_PATTERN = '<\\!--\\s\\*\\*GENERATE_BUNDLES:START\\*\\*\\s-->([\\s\\S]*)<\\!--\\s\\*\\*GENERATE_BUNDLES:END\\*\\*\\s-->';

    var GENERATE_BUNDLES_JS_START_PATTERN = '<\\!--\\s*\\*\\*GENERATE_BUNDLES:JS\\*\\*\\s*-->';
    var GENERATE_BUNDLES_JS_END_PATTERN = '<\\!--\\s*\\*\\*GENERATE_BUNDLES:JS\\|END\\*\\*\\s*-->';
    var GENERATE_BUNDLES_CSS_START_PATTERN = '<\\!--\\s*\\*\\*GENERATE_BUNDLES:CSS\\*\\*\\s*-->';
    var GENERATE_BUNDLES_CSS_END_PATTERN = '<\\!--\\s*\\*\\*GENERATE_BUNDLES:CSS\\|END\\*\\*\\s*-->';

 // var GENERATE_BUNDLES_JS_CONTENT_PATTERN = '<\\!--\\s\\*\\*GENERATE_BUNDLES:JS\\*\\*\\s-->([\\s\\S]*)<\\!--\\s\\*\\*GENERATE_BUNDLES:JS|END\\*\\*\\s-->';
    var GENERATE_BUNDLES_JS_CONTENT_PATTERN = '<\\!--\\s\\*\\*GENERATE_BUNDLES:JS\\*\\*\\s-->([\\s\\S]*<\\!--\\s\\*\\*GENERATE_BUNDLES:JS\\|END\\*\\*\\s-->)';
    var GENERATE_BUNDLES_CSS_CONTENT_PATTERN = '<\\!--\\s\\*\\*GENERATE_BUNDLES:CSS\\*\\*\\s-->([\\s\\S]*<\\!--\\s\\*\\*GENERATE_BUNDLES:CSS\\|END\\*\\*\\s-->)';

    var CONCATENATE_ASSETS_JS_CONTENT_PATTERN = '<\\!--\\s\\*\\*CONCATENATE_ASSETS:JS\\*\\*\\s-->([\\s\\S]*<\\!--\\s\\*\\*CONCATENATE_ASSETS:JS\\|END\\*\\*\\s-->)';
    var CONCATENATE_ASSETS_CSS_CONTENT_PATTERN = '<\\!--\\s\\*\\*CONCATENATE_ASSETS:CSS\\*\\*\\s-->([\\s\\S]*<\\!--\\s\\*\\*CONCATENATE_ASSETS:CSS\\|END\\*\\*\\s-->)';

    var GENERATE_BUNDLE_NAME_PATTERN = '<\\!--\\s*GENERATE_BUNDLE:([\\w-]+)\\s*-->';
    var GENERATE_BUNDLE_NAME_EMPTY_PATTERN = '<\\!--\\s*GENERATE_BUNDLE:([\\w-]*)\\s*-->';
    var GENERATE_BUNDLE_END_PATTERN = '<\\!--\\s*GENERATE_BUNDLE:END\\s*-->';

 // var GENERATE_BUNDLE_CONTENT_PATTERN = '<\\!--\\sGENERATE_BUNDLE:([\\w-]*)\\s*-->([\\s\\S]*?)(?=<\\!--\\sGENERATE_BUNDLE:[\\w-]*\\s*-->)';
    var GENERATE_BUNDLE_CONTENT_PATTERN = '<\\!--\\sGENERATE_BUNDLE:([\\w-]*)\\s*-->([\\s\\S]*?)(?=<\\!--\\s\\*?\\*?GENERATE_BUNDLES?:[\\w-\\|]*\\*?\\*?\\s*-->)';

    var CONCATENATE_ASSETS_CONTENT_PATTERN = '<\\!--\\sCONCATENATE_ASSETS:([\\w-]*)\\s*-->([\\s\\S]*?)(?=<\\!--\\s\\*?\\*?CONCATENATE_ASSETS:[\\w-\\|]*\\*?\\*?\\s*-->)';


    var JS_SCRIPT_PATTERN_2 = '<script(\\s*(\\S*)(?==)="([^"]*)(?=")")+\\s*></script>';
    var JS_SCRIPT_SRC_PATTERN = '<script(.*\\s(src)(?==)="([^"]*)(?=")".*)\\s*></script>';
    var JS_SCRIPT_TYPE_PATTERN = '<script(.*\\s(type)(?==)="([^"]*)(?=")".*)\\s*></script>';

    var CSS_STYLE_HREF_PATTERN = '<link(.*\\s(href)(?==)="([^"]*)(?=")".*)\\s*/?>';
    var CSS_STYLE_REL_PATTERN = '<link(.*\\s(rel)(?==)="([^"]*)(?=")".*)\\s*/?>';

    var VERSION_OF_ASSET_PATTERN = '\\?v=(.*?)(?=[\'\"])';

    var self = null;

    if (!option) {
        option = {};
    }

    if (!option.path) {
        option.path = '';
    }

    if (option.match_pattern) {
        try {
            new RegExp(option.match_pattern);
        } catch (e) {
            this.emit('error',
                new gutil.PluginError('gulp-style-inject', ' Invalid `match_pattern` parameter. Regular expression string required.'));
        }
    } else {
        option.match_pattern = CONST_PATTERN;
    }

    if (option.css_match_pattern) {
        try {
            new RegExp(option.css_match_pattern);
        } catch (e) {
            this.emit('error',
                new gutil.PluginError('gulp-style-inject', ' Invalid `css_match_pattern` parameter. Regular expression string required.'));
        }
    } else {
        option.css_match_pattern = CSS_LINK_PATTERN;
    }

    if (option.js_match_pattern) {
        try {
            new RegExp(option.js_match_pattern);
        } catch (e) {
            this.emit('error',
                new gutil.PluginError('gulp-style-inject', ' Invalid `js_match_pattern` parameter. Regular expression string required.'));
        }
    } else {
        option.js_match_pattern = JS_SCRIPT_PATTERN;
    }

    if (option.static_url_path) {
        try {
            option.static_url_path = '' + option.static_url_path;
        } catch (e) {
            this.emit('error',
                new gutil.PluginError('gulp-style-inject', ' Invalid `static_url_path` parameter. String required.'));
        }
    } else {
        option.static_url_path = '';
    }

    if (option.django_static_variable) {
        try {
            option.django_static_variable = '{{ ' + option.django_static_variable + ' }}';
        } catch (e) {
            this.emit('error',
                new gutil.PluginError('gulp-style-inject', ' Invalid `django_static_variable` parameter. String required.'));
        }
    } else {
        option.django_static_variable = '{{ STATIC_URL }}';
    }

    if (option.django_ext_variable) {
        try {
            option.django_ext_variable = '{{ ' + option.django_ext_variable + ' }}';
        } catch (e) {
            this.emit('error',
                new gutil.PluginError('gulp-style-inject', ' Invalid `django_ext_variable` parameter. String required.'));
        }
    } else {
        option.django_ext_variable = '{{ STATIC_EXT }}';
    }

    var watchedFilesArr = [];

    if (!option.watcher) {
        option.watcher = false;
    }

    console.log('option.path = ' + option.path);
    console.log('option.css_match_pattern = ' + option.css_match_pattern);
    console.log('option.js_match_pattern = ' + option.js_match_pattern);
    console.log('option.static_url_path = ' + option.static_url_path);
    console.log('option.django_static_variable = ' + option.django_static_variable);
    console.log('option.django_ext_variable = ' + option.django_ext_variable);
    console.log('option.watcher = ' + option.watcher);

    function throwError(msg) {
        self.emit('error',
            new gutil.PluginError('gulp-style-inject', msg));
    }


    function transformResponse(contents) {
        if (logger) console.log('transformResponse called with contents:\n', contents);
        var tempContent = '<style>\n' + contents + '\n</style>';
        if (logger) console.log('tempContent:', tempContent);
        return tempContent;
    }

    function transformLinkResponse(contents) {
        if (logger) console.log('transformScriptResponse called with contents:\n', contents);
        var tempContent = '' + contents + '\n';
        if (logger) console.log('tempContent:', tempContent);
        return tempContent;
    }

    function transformScriptResponse(contents) {
        if (logger) console.log('transformScriptResponse called with contents:\n', contents);
        var tempContent = '' + contents + '\n';
        if (logger) console.log('tempContent:', tempContent);
        return tempContent;
    }


    function transformLinkBundleResponse(contents) {
        if (logger) console.log('transformLinkBundleResponse called with contents:\n', contents);
        var stringifiedContent = String(contents);
        var transformedContent = '\n/* Appending new css file */' + '\n' + stringifiedContent.trim();
        if (logger) console.log('transformedContent:\n', transformedContent);
        return transformedContent;
    }

    function transformScriptBundleResponse(contents) {
        if (logger) console.log('transformScriptBundleResponse called with contents:\n', contents);
        var stringifiedContent = String(contents);
        var transformedContent = '\n/* Appending new js file */\n' + stringifiedContent.trim();
        if (logger) console.log('transformedContent:\n', transformedContent);
        return transformedContent;
    }


    function getAttributes(params) {
        new gutil.log('getAttributes get such parameters:' + params);

        if (params.indexOf(option.django_static_variable) !== -1) {
            params = params.replace(option.django_static_variable, option.static_url_path);
            new gutil.log('django_static_variable replaced, params is: ' + params);
        }
        if (params.indexOf(option.django_ext_variable) !== -1) {
            params = params.replace(option.django_ext_variable, '');
            new gutil.log('django_ext_variable deleted, params is: ' + params);
        }

        var result = {};

        params = params.replace(new RegExp(VERSION_OF_ASSET_PATTERN, 'gi'), function(str, version) {  // вырезаем версию, если есть
            result['version'] = version;
            if (logger) console.log('version ' + version + ' found, remove from attribute, adding to params');
            return '';
        });

        var group = params.replace(/\s+/gi, ' ')
            .split(' ');
        for (var i = 0; i < group.length; i++) {
            if (group[i]) {
                var combination = group[i].split('=');
                result[combination[0].replace(/\s*['"](.*)['"]\s*/, '$1')] = combination[1].replace(/\s*['"](.*)['"]\s*/, '$1');
            }
        }
        return result;
    }


    function getStyleFile(source) {
        if (source) {
            var file = fs.readFileSync(source);
            if (logger) console.log('Style FILE: \n', file);
            return transformResponse(file);
        } else {
            throwError('ERROR: No source file specified.');
        }
    }

    function getCssFile(source) {
        if (source) {
            var file = fs.readFileSync(source);
            if (logger) console.log('CSS FILE: \n', file);
            return transformLinkResponse(file);
        } else {
            throwError('ERROR: No source file specified.');
        }
    }

    function getJsFile(source) {
        if (source) {
            var file = fs.readFileSync(source);
            if (logger) console.log('JS FILE: \n', file);
            return transformScriptResponse(file);
        } else {
            throwError('ERROR: No source file specified.');
        }
    }


    function getSingleStyleFile(source) {
        if (source) {
            var file = fs.readFileSync(source);
            if (logger) console.log('CSS Style FILE: \n', file);

            if (option.watcher) { watchedFilesArr.push(source); }

            return transformLinkBundleResponse(file);
        } else {
            throwError('ERROR: No source file specified.');
        }
    }

    function getSingleScriptFile(source) {
        if (source) {
            var file = fs.readFileSync(source);
            if (logger) console.log('JS Script FILE: \n', file);

            if (option.watcher) { watchedFilesArr.push(source); }

            return transformScriptBundleResponse(file);
        } else {
            throwError('ERROR: No source file specified.');
        }
    }


    function assetsConcatenator(content, type) {
        // contents = contents.replace(new RegExp(option.match_pattern, 'gi'), function(match, parameters) {
        //     new gutil.log(gutil.colors.yellow('Files contents before regexp match_pattern: ') + '\n' + gutil.colors.green(contents));
        //     var attrs = getAttributes(parameters);
        //     new gutil.log('option.path is: ' + option.path);
        //     return getStyleFile(option.path + attrs.src);
        // });
        // new gutil.log(gutil.colors.yellow('Files contents after regexp match_pattern: ') + '\n' + gutil.colors.green(contents));

        var newContent = '';

        if (logger) new gutil.log(gutil.colors.yellow('Original file content, before regexp css_match_pattern and js_match_pattern: ') + '\n' + gutil.colors.green(content));

        if ((type === 'css') || !type) {
            content.replace(new RegExp(option.css_match_pattern, 'gi'), function(match, parameters) {  // используем .replace не по назначению, по хорошему надо бы заменить на .match
                var attrs = getAttributes(parameters);  // получаем атрибуты каждого style-тэга
                if (logger) console.log('link attrs:', attrs);
                if (attrs.href !== 'undefined') {
                    new gutil.log(gutil.colors.cyan('Get link, href value is: ' + attrs.href));
                    if (logger) new gutil.log('option.path is: ' + option.path);
                    var styleFileContent = getSingleStyleFile(option.path + attrs.href);
                    newContent = newContent + styleFileContent;
                    // return styleFileContent;  // мы ничего не возвращаем потому что нам нет смысла менять строку content - мы создаём новую newContent
                }
            });
            if (logger) new gutil.log(gutil.colors.yellow('New File content after regexp css_match_pattern!: ') + '\n' + gutil.colors.green(newContent));
        }

        if ((type === 'js') || !type) {
            content.replace(new RegExp(option.js_match_pattern, 'gi'), function(match, parameters) {  // используем .replace не по назначению, по хорошему надо бы заменить на .match
                var attrs = getAttributes(parameters);  // получаем атрибуты каждого script-тэга
                if (logger) console.log('script attrs:', attrs);
                if (attrs.src !== 'undefined') {
                    new gutil.log(gutil.colors.cyan('Get script, src value is: ' + attrs.src));
                    if (logger) new gutil.log('option.path is: ' + option.path);
                    var scriptFileContent = getSingleScriptFile(option.path + attrs.src);
                    newContent = newContent + scriptFileContent;
                    // return scriptFileContent;  // мы ничего не возвращаем потому что нам нет смысла менять строку content - мы создаём новую newContent
                }
            });
            if (logger) new gutil.log(gutil.colors.yellow('New file content after regexp js_match_pattern: ') + '\n' + gutil.colors.green(newContent));
        }

        if (logger) console.log('newContent:\n', newContent);

        return newContent;
    }


    // function styleInject( file, enc, callback ) {
    //     /*jshint validthis:true*/
    //
    //     self = this;
    //
    //     // Do nothing if no contents
    //     if ( file.isNull() ) {
    //         this.push( file );
    //         return callback();
    //     }
    //
    //     // check if file.contents is a `Stream`
    //     if ( file.isStream() ) {
    //         // accepting streams is optional
    //         this.emit( 'error',
    //             new gutil.PluginError( 'gulp-style-inject', 'Stream content is not supported' ) );
    //         return callback();
    //     }
    //
    //     // check if file.contents is a `Buffer`
    //     if ( file.isBuffer() ) {
    //         new gutil.log('file is buffer!');
    //         console.log(file);
    //         var contents = String( file.contents );
    //
    //         new gutil.log('Files contents before regexp: ' + contents);
    //
    //         contents = contents.replace( new RegExp( option.match_pattern, 'gi' ), function ( match, parameters ) {
    //             new gutil.log('Files contents after regexp match_pattern: ' + contents);
    //             var attrs = getAttributes( parameters );
    //             new gutil.log('option.path is: ' + option.path);
    //             return getStyleFile( option.path + attrs.src );
    //         } );
    //
    //         contents = contents.replace( new RegExp( option.css_match_pattern, 'gi' ), function ( match, parameters ) {
    //             new gutil.log('Files contents after regexp css_match_pattern!: ' + contents);
    //             var attrs = getAttributes( parameters );
    //             console.log('here!');
    //             if (attrs.href !== 'undefined') {
    //                 new gutil.log('Get link, href value is: ' + attrs.href);
    //                 new gutil.log('option.path is: ' + option.path);
    //                 return getCssFile( option.path + attrs.href );
    //             }
    //         } );
    //
    //         contents = contents.replace( new RegExp( option.js_match_pattern, 'gi' ), function ( match, parameters ) {
    //             new gutil.log('Files contents after regexp js_match_pattern: ' + contents);
    //             var attrs = getAttributes( parameters );
    //             if (attrs.src !== 'undefined') {
    //                 new gutil.log('Get script, src value is: ' + attrs.src);
    //                 new gutil.log('option.path is: ' + option.path);
    //                 return getJsFile( option.path + attrs.src );
    //             }
    //         } );
    //
    //         file.contents = new Buffer( contents );
    //         this.push( file );
    //         return callback();
    //     } else {
    //         console.log('file not is buffer!');
    //     }
    //
    //     return callback();
    // }


    function fileBundleGenerator(file, enc, callback) {
        /*jshint validthis:true*/
        if (logger) {
            console.log('===');
            console.log('file:', file);
            console.log('file.contents', file.contents);
            console.log('file.relative:', file.relative);
            console.log('file.base:', file.base);
            console.log('file.cwd:', file.cwd);
            console.log('file.path:', file.path);
            console.log('file.history:', file.history);
            console.log('===');
        }

        self = this;

        // Do nothing if no contents
        if (file.isNull()) {
            this.push(file);
            return callback();
        }

        // check if file.contents is a `Stream`
        if (file.isStream()) {
            // accepting streams is optional
            this.emit('error',
                new gutil.PluginError('gulp-file-inject', 'Stream content is not supported'));
            return callback();
        }

        // check if file.contents is a `Buffer`
        if (file.isBuffer()) {
            new gutil.log('file is buffer!');
            var contents = String(file.contents);
            if (logger) new gutil.log(gutil.colors.yellow('Files contents before regexp: ') + '\n' + gutil.colors.magenta(contents));

            var vinylFilesBundlesArr = [];

            ////// JS SCRIPTS //////
            // Вырезаем содержимое внутри: <!-- **GENERATE_BUNDLES:JS** -->(содержимое)<!-- **GENERATE_BUNDLES:JS|END** -->
            // сохраняем во временную переменную
            var scriptsBundlesContent = contents.match(new RegExp(CONCATENATE_ASSETS_JS_CONTENT_PATTERN, 'i'));
            if (scriptsBundlesContent) {
                var tempJsBundleFileContents = scriptsBundlesContent[1];
                if (logger) new gutil.log(gutil.colors.yellow('temp js file contents after regexp CONCATENATE_ASSETS_JS_CONTENT_PATTERN!: ') + '\n' + gutil.colors.green(tempJsBundleFileContents));
                // если нашли совпадение
                if (tempJsBundleFileContents) {
                    // создаём новый Vinyl-файл для Js-бандла, клонируя наш исходный (пока он просто висит в памяти)
                    var newJsBundleVinylFile = file.clone();
                    // меняем содержимое на новое
                    newJsBundleVinylFile.contents = new Buffer(tempJsBundleFileContents);
                    if (logger) console.log('newJsBundleVinylFile.contents:\n', newJsBundleVinylFile.contents, '\n');
                    var newJsBundleFileContents = String(newJsBundleVinylFile.contents);
                    if (logger) console.log('newJsBundleFileContents:\n', newJsBundleFileContents, '\n');

                    vinylFilesBundlesArr.push(newJsBundleVinylFile);

                    var tempJsBundlesArr = [];
                    // Ищем внутри содержимого GENERATE_BUNDLES: бандлы, начинающиеся с GENERATE_BUNDLE:<bundleName>, формируем из них объекты, записываем в массив.
                    newJsBundleFileContents = newJsBundleFileContents.replace(new RegExp(CONCATENATE_ASSETS_CONTENT_PATTERN, 'gi'), function(strMatch, bundleName, foundContent) {
                        tempJsBundlesArr.push({ name: bundleName, content: foundContent});
                        return '';
                    });

                    if (logger) {
                        console.log('vinylFilesBundlesArr:\n', vinylFilesBundlesArr, '\n');
                        console.log('newJsBundleFileContents after replace bundle:\n', newJsBundleFileContents, '\n');
                        console.log('tempJsBundlesArr:\n', tempJsBundlesArr);
                    }

                    // если вложенные бандлы в содержимом GENERATE_BUNDLES найдены: создаём для каждого по vinyl-файлу,
                    // преобразуем содержимое каждого, заменяя скрипты на их контент, заполняем содержимым из объекта
                    if (tempJsBundlesArr.length) {
                        new gutil.log(gutil.colors.green('There are named bundles in JS bundler:'));

                        var notNewJsBundleVinylFile = function(item) { return item !== newJsBundleVinylFile; };
                        vinylFilesBundlesArr = vinylFilesBundlesArr.filter(notNewJsBundleVinylFile); // удаляем общий бандл из массива бандлов

                        tempJsBundlesArr.forEach(function(item, i) {
                            new gutil.log(gutil.colors.yellow('Processing scripts bundle:', item.name));
                            var newJsNamedBundleVinylFile = file.clone();  // создаём для каждого по vinyl-файлу
                            var newBundleContent = assetsConcatenator(item.content, 'js');  // преобразуем его содержимое, заменяя скрипты на их контент
                            newJsNamedBundleVinylFile.contents = new Buffer(newBundleContent);  // заполняем новым содержимым
                            var relative = newJsNamedBundleVinylFile.relative;
                            if (logger) console.log('relative:', relative);
                            var relativeName = path.basename(relative);
                            if (logger) console.log('relativeName:', relativeName);
                            var ext = '';
                            while (path.extname(relativeName)) {
                                var tempExt = path.extname(relativeName);
                                ext = tempExt + ext;
                                relativeName = relativeName.slice(0, -tempExt.length)
                            }

                            if (logger) {
                                console.log('relativeName:', relativeName);
                                console.log('ext:', ext);
                            }

                            newJsNamedBundleVinylFile.path = newJsNamedBundleVinylFile.path.replace(path.basename(relative), relativeName + '.' + item.name + '.concatenated.js');
                            new gutil.log(gutil.colors.yellow.bold('Bundle ' + relativeName + '.' + item.name + '.concatenated.js created'));
                            if (logger) console.log('newJsNamedBundleVinylFile.path:', newJsNamedBundleVinylFile.path);

                            vinylFilesBundlesArr.push(newJsNamedBundleVinylFile);
                        });
                    } else { // если нет - преобразуем всё содержимое GENERATE_BUNDLES
                        new gutil.log(gutil.colors.green('There are no named bundles in JS bundler:'));
                        new gutil.log(gutil.colors.yellow('Processing single scripts bundle:'));
                        newJsBundleFileContents = assetsConcatenator(newJsBundleFileContents, 'js');
                        newJsBundleVinylFile.contents = new Buffer(newJsBundleFileContents);
                        var relative = newJsBundleVinylFile.relative;
                        if (logger) console.log('relative:', relative);
                        var relativeName = path.basename(relative);
                        if (logger) console.log('relativeName:', relativeName);
                        var ext = '';
                        while (path.extname(relativeName)) {
                            var tempExt = path.extname(relativeName);
                            ext = tempExt + ext;
                            relativeName = relativeName.slice(0, -tempExt.length)
                        }

                        if (logger)  {
                            console.log('relativeName:', relativeName);
                            console.log('ext:', ext);
                        }

                        newJsBundleVinylFile.path = newJsBundleVinylFile.path.replace(path.basename(relative), relativeName + '.concatenated.js');
                        new gutil.log(gutil.colors.yellow.bold('Bundle ' + relativeName + '.concatenated.js created'));
                        if (logger) console.log('newJsBundleVinylFile.path:', newJsBundleVinylFile.path);
                    }
                    if (logger) console.log('vinylFilesBundlesArr:', vinylFilesBundlesArr);
                }
            } else {
                new gutil.log(gutil.colors.blue('No JS scripts bundles'));
            }

            ////// CSS STYLES //////
            // Вырезаем содержимое внутри: <!-- **GENERATE_BUNDLES:CSS** -->(содержимое)<!-- **GENERATE_BUNDLES:CSS|END** -->
            // сохраняем во временную переменную
            var stylesBundlesContent = contents.match(new RegExp(CONCATENATE_ASSETS_CSS_CONTENT_PATTERN, 'i'));
            if (stylesBundlesContent) {
                var tempCssBundleFileContents = stylesBundlesContent[1];
                if (logger) new gutil.log(gutil.colors.yellow('temp CSS file contents after regexp CONCATENATE_ASSETS_CSS_CONTENT_PATTERN!: ') + '\n' + gutil.colors.green(tempCssBundleFileContents));
                // если нашли совпадение
                if (tempCssBundleFileContents) {
                    // создаём новый Vinyl-файл для Css-бандла, клонируя наш исходный (пока он просто висит в памяти)
                    var newCssBundleVinylFile = file.clone();
                    // меняем содержимое на новое
                    newCssBundleVinylFile.contents = new Buffer(tempCssBundleFileContents);
                    if (logger) console.log('newCssBundleVinylFile.contents:\n', newCssBundleVinylFile.contents);
                    var newCssBundleFileContents = String(newCssBundleVinylFile.contents);
                    if (logger) console.log('newCssBundleFileContents:\n', newCssBundleFileContents);

                    vinylFilesBundlesArr.push(newCssBundleVinylFile);

                    var tempCssBundlesArr = [];
                    // Ищем внутри содержимого GENERATE_BUNDLES: бандлы, начинающиеся с GENERATE_BUNDLE:<bundleName>, формируем из них объекты, записываем в массив.
                    newCssBundleFileContents = newCssBundleFileContents.replace(new RegExp(CONCATENATE_ASSETS_CONTENT_PATTERN, 'gi'), function(strMatch, bundleName, foundContent) {
                        tempCssBundlesArr.push({ name: bundleName, content: foundContent});
                        return '';
                    });

                    if (logger) {
                        console.log('vinylFilesBundlesArr:\n', vinylFilesBundlesArr, '\n');
                        console.log('newCssBundleFileContents after replace bundle:\n', newCssBundleFileContents, '\n');
                        console.log('tempCssBundlesArr:\n', tempCssBundlesArr);
                    }

                    // если вложенные бандлы в содержимом GENERATE_BUNDLES найдены: создаём для каждого по vinyl-файлу,
                    // преобразуем содержимое каждого, заменяя скрипты на их контент, заполняем содержимым из объекта
                    if (tempCssBundlesArr.length) {
                        new gutil.log(gutil.colors.green('There are named bundles in CSS bundler:'));

                        var notNewCssBundleVinylFile = function(item) { return item !== newCssBundleVinylFile; };
                        vinylFilesBundlesArr = vinylFilesBundlesArr.filter(notNewCssBundleVinylFile); // удаляем общий бандл из массива бандлов

                        tempCssBundlesArr.forEach(function(item, i) {
                            new gutil.log(gutil.colors.yellow('Processing styles bundle:', item.name));
                            var newCssNamedBundleVinylFile = file.clone();  // создаём для каждого по vinyl-файлу
                            var newBundleContent = assetsConcatenator(item.content, 'css');  // преобразуем его содержимое, заменяя скрипты на их контент
                            newCssNamedBundleVinylFile.contents = new Buffer(newBundleContent);  // заполняем новым содержимым
                            var relative = newCssNamedBundleVinylFile.relative;
                            if (logger) console.log('relative:', relative);
                            var relativeName = path.basename(relative);
                            if (logger) console.log('relativeName:', relativeName);
                            var ext = '';
                            while (path.extname(relativeName)) {
                                var tempExt = path.extname(relativeName);
                                ext = tempExt + ext;
                                relativeName = relativeName.slice(0, -tempExt.length)
                            }

                            if (logger) {
                                console.log('relativeName:', relativeName);
                                console.log('ext:', ext);
                            }

                            newCssNamedBundleVinylFile.path = newCssNamedBundleVinylFile.path.replace(path.basename(relative), relativeName + '.' + item.name + '.concatenated.css');
                            new gutil.log(gutil.colors.yellow.bold('Bundle ' + relativeName + '.' + item.name + '.concatenated.css created'));
                            if (logger) console.log('newCssNamedBundleVinylFile.path:', newCssNamedBundleVinylFile.path);

                            vinylFilesBundlesArr.push(newCssNamedBundleVinylFile);
                        });
                    } else { // если нет - преобразуем всё содержимое GENERATE_BUNDLES
                        new gutil.log(gutil.colors.green('There are no named bundles in CSS bundler:'));
                        new gutil.log(gutil.colors.yellow('Processing single styles bundle:'));
                        newCssBundleFileContents = assetsConcatenator(newCssBundleFileContents, 'css');
                        newCssBundleVinylFile.contents = new Buffer(newCssBundleFileContents);
                        var relative = newCssBundleVinylFile.relative;
                        if (logger) console.log('relative:', relative);
                        var relativeName = path.basename(relative);
                        if (logger) console.log('relativeName:', relativeName);
                        var ext = '';
                        while (path.extname(relativeName)) {
                            var tempExt = path.extname(relativeName);
                            ext = tempExt + ext;
                            relativeName = relativeName.slice(0, -tempExt.length)
                        }

                        if (logger) {
                            console.log('relativeName:', relativeName);
                            console.log('ext:', ext);
                        }

                        newCssBundleVinylFile.path = newCssBundleVinylFile.path.replace(path.basename(relative), relativeName + '.concatenated.css');
                        new gutil.log(gutil.colors.yellow.bold('Bundle ' + relativeName + '.concatenated.css created'));
                        if (logger) console.log('newCssBundleVinylFile.path:', newCssBundleVinylFile.path);
                    }
                    if (logger) console.log('vinylFilesBundlesArr:', vinylFilesBundlesArr);
                }
            } else {
                new gutil.log(gutil.colors.blue('No CSS styles bundles'));
            }

            // file.contents = new Buffer(contents);
            // this.push(file);

            if (option.watcher) {
                watcher.add(watchedFilesArr);
            }

            vinylFilesBundlesArr.forEach(function(bundleFile) {
                if (logger) console.log('!!!!!!!!!!!!!\n', bundleFile);
                self.push(bundleFile);
            });
            return callback();
        } else {
            console.log('file not is buffer!');
        }

        return callback();
    }

    return through.obj(fileBundleGenerator);
};
