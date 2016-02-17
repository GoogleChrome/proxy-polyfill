'use strict';

(function(scope) {
  if (scope.Proxy) {
    return;
  }

  scope.Proxy = function(target, handler) {
    if (!(target instanceof Object && handler instanceof Object)) {
      throw new TypeError('Cannot create proxy with a non-object as target or handler');
    }
    var proxy = this;

    // Fail on unsupported traps: Chrome doesn't do this, but ensure that users of the polyfill
    // are a bit more careful.
    var valid = {'get': true, 'set': true};
    for (var k in handler) {
      if (!valid[k]) {
        throw new TypeError('Proxy polyfill does not support trap \'' + k + '\'');
      }
    }

    // Define master get/setter helpers.
    var masterGet;
    if (handler.get) {
      masterGet = function(prop) {
        return handler.get(this, prop, proxy);
      };
    } else {
      masterGet = function(prop) {
        return this[prop];
      };
    }
    var masterSet;
    if (handler.set) {
      masterSet = function(prop, value) {
        handler.set(this, prop, value, proxy);
      };
    } else {
      masterSet = function(prop, value) {
        this[prop] = value;
      };
    }

    Object.getOwnPropertyNames(target).forEach(function(prop) {
      // TODO(samthor): Probably can ignore some of this. Also, check target writable=false...
      var desc = Object.getOwnPropertyDescriptor(target, prop);
      delete desc.value;
      delete desc.writable;
      desc.get = masterGet.bind(target, prop);
      desc.set = masterSet.bind(target, prop);
      Object.defineProperty(proxy, prop, desc);
    });

    // The Proxy polyfill cannot handle adding new properties. Seal the target and proxy.
    // TODO(samthor): Chrome just silently fails when accessing now-invalid properties.
    Object.seal(target);
    Object.seal(proxy);
  };

  scope.Proxy.revocable = function(target, handler) {
    return {proxy: new scope.Proxy(target, handler), revoke: function() {
      // TODO(samthor): Note that calling revoke() cancels all operations on the Proxy object, not
      // just the ones with traps. It may be infeasible to polyfil.
      throw new Error('revoke not implemented');
    }};
  }

})(window);