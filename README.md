Polyfill for the `Proxy` object.
See the [MDN docs](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Proxy).

This proxy supports a limited subset of proxy 'traps', and comes with a caveat: it must [seal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/seal) any proxied object such that no additional properties can be defined.

Currently, the following traps are supported-

* get
* set
* apply

This has no external dependencies.

# Usage

Include the JavaScript at the start of your page, or include it as a dependency to your build steps.
The source is in ES6, but the included, minified version is ES5.

## Installation

Available via NPM or Bower-

```bash
$ npm install proxy-polyfill
$ bower install proxy-polyfill
```

## Supports

The polyfill supports browsers that implement the full [ES5 spec](http://kangax.github.io/compat-table/es5/).
It requires `Object.seal` and `Object.defineProperty`.
