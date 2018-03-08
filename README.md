<img src="https://api.travis-ci.org/GoogleChrome/proxy-polyfill.svg?branch=master" />

This is a polyfill for the `Proxy` object, part of ES6.
See the [MDN docs](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Proxy) or [Introducing ES2015 Proxies](https://developers.google.com/web/updates/2016/02/es2015-proxies) for more information on `Proxy` itself.
Unlike other polyfills, this does not require `Object.observe`, [which is deprecated](https://www.google.com/search?q=object.observe+deprecated).

The polyfill supports just a limited number of proxy 'traps'.
It also works by calling [seal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/seal) on the object passed to `Proxy`.
This means that the properties you want to proxy **must be known at creation time**.

Additionally, your objects' prototypes will be snapshotted at the time a proxy is created.
The properties of your objects can still change - you're just unable to define new ones.
For example, proxying unrestricted dictionaries is not a good use-case for this polyfill.

Currently, the following traps are supported-

* get
* set
* apply
* construct

The `Proxy.revocable` [method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/revocable) is also supported, but only for calls to the above traps.

This has no external dependencies.
Skip down to [usage](#usage) to get started.

# Example

The most compelling use case for `Proxy` is to provide change notifications.

```js
function observe(o, callback) {
  return new Proxy(o, {
    set(target, property, value) {
      callback(property, value);
      target[property] = value;
    },
  });
}

const x = {'name': 'BB-8'};
const p = observe(x, (property, value) => console.info(property, value));
p.name = 'BB-9';
// name BB-9
```

You can extend this to generate change notifications for anywhere in an object tree-

```js
function observe(o, callback) {
  function buildProxy(prefix, o) {
    return new Proxy(o, {
      set(target, property, value) {
        // same as above, but add prefix
        callback(prefix + property, value);
        target[property] = value;
      },
      get(target, property) {
        // return a new proxy if possible, add to prefix
        const out = target[property];
        if (out instanceof Object) {
          return buildProxy(prefix + property + '.', out);
        }
        return out;  // primitive, ignore
      },
    });
  }

  return buildProxy('', o);
}

const x = {'model': {name: 'Falcon'}};
const p = observe(x, (property, value) => console.info(property, value));
p.model.name = 'Commodore';
// model.name Commodore
```

## Adding new properties

The following line will fail (with a `TypeError` in strict mode) with the polyfill, as it's unable to intercept _new_ properties-

```js
p.model.year = 2016;  // error in polyfill
```

However, you can replace the entire object at once - once you access it again, your code will see the proxied version.

```js
p.model = {name: 'Falcon', year: 2016};
// model Object {name: "Falcon", year: 2016}
```

For a similar reason, this polyfill can't proxy `Array` objects very well - but you can replace them all at once.

# Usage

## To assign Proxy to the global object

Include the JavaScript at the start of your page, as an ES6 module (although browsers that support ES6 modules support `Proxy` natively) or include it as a dependency to your build steps.
The source is in ES6, but the included, minified version is ES5.

## To consume Proxy as a function

Require from your app the file `./src/proxy.js`, which exports a proxy polyfill functionvian commonJS.

```js
// commonJS require
const ProxyPolyfill = require('proxy-polyfill/src/proxy');

// Your environment may also support transparent rewriting of commonJS to ES6:
import ProxyPolyfill from 'proxy-polyfill/src/proxy';

// Then use...
const myProxy = new ProxyPolyfill(...);
```

## Installation

Available via NPM or Bower-

```bash
$ npm install proxy-polyfill
$ bower install proxy-polyfill
```

If this is imported as a Node module, it will polyfill the global namespace rather than returning the `Proxy` object.
If you'd like to just get the polyfill'ed version, use the require statement as above.

## Supports

The polyfill supports browsers that implement the full [ES5 spec](http://kangax.github.io/compat-table/es5/), such as IE9+ and Safari 6+.
It may work in other non-browser environments too.

Note that Firefox, Chrome, Safari 10+ and Edge support `Proxy` natively.

# Release

Run
```bash
$ npm run build
```
