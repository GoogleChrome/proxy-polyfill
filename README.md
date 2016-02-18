Polyfill for the `Proxy` object.
See the [MDN docs](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Proxy).

This proxy supports a limited subset of proxy 'traps', and comes with a caveat: it must [seal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/seal) any proxied object such that no additional properties can be defined.

Currently, the following traps are supported-

* get
* set
* apply

# Usage

Include the proxy-polyfill script at the start of your page, or build steps.