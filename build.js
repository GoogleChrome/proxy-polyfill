const ClosureCompiler = require('google-closure-compiler').compiler;

const closureCompiler = new ClosureCompiler({
    js: './src/*.js',
    entry_point: './src/index.js',
    js_output_file: './proxy.min.js',
    language_in: 'ECMASCRIPT6',
    language_out: 'ECMASCRIPT5',
    compilation_level: 'ADVANCED_OPTIMIZATIONS',
    dependency_mode: 'STRICT',
    process_common_js_modules: true,
    output_wrapper: '(function(){%output%})()', // this prevents closure compiler from polluting the global scope
    jscomp_off: 'undefinedVars' // `global` and `process` are not defined...
});

const compilerProcess = closureCompiler.run(function (exitCode, stdOut, stdErr) {
    if (stdErr) {
        console.error('err!', stdErr);
        return;
    }

    console.log('done!');
});