/*
 * Copyright 2018 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

const ClosureCompiler = require('google-closure-compiler').compiler;

const closureCompiler = new ClosureCompiler({
  js: './src/*.js',
  entry_point: './src/index.js',
  js_output_file: './proxy.min.js',
  language_in: 'ECMASCRIPT6_STRICT',
  language_out: 'ECMASCRIPT5',
  compilation_level: 'ADVANCED_OPTIMIZATIONS',
  dependency_mode: 'STRICT',
  warning_level: 'VERBOSE',
  process_common_js_modules: true,
  output_wrapper: '(function(){%output%})()', // this prevents closure compiler from polluting the global scope
});

const compilerProcess = closureCompiler.run((code, stdout, stderr) => {
  if (stderr) {
    console.error('err!', stderr);
    return;
  }
  console.log('done!', stdout);
});
