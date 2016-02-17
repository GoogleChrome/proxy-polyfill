'use strict';

(function(scope) {
  if (scope.Proxy) {
    return;
  }

  /**
   * DefaultHandlers is a holder for default behavior applied on proxy objects (i.e., untrapped).
   */
  class DefaultHelpers {
    /**
     * @this {*}
     */
    get(prop) {
      return this[prop];
    }
   /**
    * @this {*}
    */
    set(prop, value) {
      this[prop] = value;
    }
  }

  /**
   * @constructor
   */
  scope.Proxy = function(target, handler) {
    if (!(target instanceof Object && handler instanceof Object)) {
      throw new TypeError('Cannot create proxy with a non-object as target or handler');
    }
    let proxy = this;

    // Fail on unsupported traps: Chrome doesn't do this, but ensure that users of the polyfill
    // are a bit more careful.
    let valid = {'get': true, 'set': true};
    for (let k in handler) {
      if (!valid[k]) {
        throw new TypeError('Proxy polyfill does not support trap \'' + k + '\'');
      }
    }

    // Override default helper behavior if traps were provided.
    let h = new DefaultHelpers();
    if (handler.get) {
      h.get = function(prop) {
        return handler.get(this, prop, proxy);
      };
    }
    if (handler.set) {
      h.set = function(prop, value) {
        handler.set(this, prop, value, proxy);
      };
    }

    Object.getOwnPropertyNames(target).forEach(function(prop) {
      // TODO(samthor): Probably can ignore some of this. Also, check target writable=false...
      let desc = Object.getOwnPropertyDescriptor(target, prop);
      delete desc.value;
      delete desc.writable;
      desc.get = h.get.bind(target, prop);
      desc.set = h.set.bind(target, prop);
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

  scope.Proxy['revocable'] = scope.Proxy.revocable;
  scope['Proxy'] = scope.Proxy;
})(window);