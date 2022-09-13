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

const fs = require("fs");
const path = require("path");

const ClosureCompiler = require("google-closure-compiler").compiler;

// Closure Compiler.
const closureCompiler = new ClosureCompiler({
  js: path.resolve(__dirname, "./src/*.js"),
  entry_point: path.resolve(__dirname, "./src/index.js"),
  js_output_file: path.resolve(__dirname, "./proxy.min.js"),
  language_in: "ECMASCRIPT6_STRICT",
  language_out: "ECMASCRIPT5",
  compilation_level: "ADVANCED_OPTIMIZATIONS",
  warning_level: "VERBOSE",
  process_common_js_modules: true,
  output_wrapper: "(function(){%output%})();", // don't pollute global scope
});

// FIXME(samthor): There's probably a better way to do this. Avoid Java on macOS.
const checkNativeMac = path.join(
  __dirname,
  "node_modules/google-closure-compiler-osx/compiler"
);
if (fs.existsSync(checkNativeMac)) {
  closureCompiler.JAR_PATH = undefined;
  ClosureCompiler.prototype.javaPath =
    "./node_modules/google-closure-compiler-osx/compiler";
}

const compilerProcess = closureCompiler.run((code, stdout, stderr) => {
  if (stderr) {
    console.error("err!", stderr);
    return;
  }
  console.log("done!", stdout);
});
