/*
 * Copyright 2016 Google Inc. All rights reserved.
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

    // Fail on unsupported traps: Chrome doesn't do this, but ensure that users of the polyfill
    // are a bit more careful. Copy the internal parts of handler to prevent user changes.
    let unsafeHandler = handler;
    handler = {};
    let valid = {'get': true, 'set': true, 'apply': true, 'construct': true};
    for (let k in unsafeHandler) {
      if (!valid[k]) {
        throw new TypeError('Proxy polyfill does not support trap \'' + k + '\'');
      }
      handler[k] = unsafeHandler[k];
    }

    // Define proxy as this, or a Function (if either it's callable, or apply is set).
    let proxy = this;
    let isMethod = false;
    if ('apply' in handler || 'construct' in handler || target instanceof Function) {
      proxy = function Proxy() {
        let usingNew = (this && this.constructor === proxy);

        if (usingNew && 'construct' in handler) {
          return handler.construct.call(this, target, arguments);
        } else if (!usingNew && 'apply' in handler) {
          return handler.apply(target, this, arguments);
        } else if (target instanceof Function) {
          // since the target was a function, fallback to calling it directly.
          if (usingNew) {
            return new target(arguments);
          }
          return target.apply(this, arguments);
        }
        throw new TypeError(usingNew ? 'not a constructor' : 'not a function');
      };
      isMethod = true;
    }

    // Override default get/set behavior if traps were provided.
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

    let propertyNames = Object.getOwnPropertyNames(target);
    propertyNames.forEach(function(prop) {
      let real = Object.getOwnPropertyDescriptor(target, prop);
      let desc = {enumerable: !!real.enumerable};
      desc.get = h.get.bind(target, prop);
      desc.set = h.set.bind(target, prop);

      if (isMethod && prop in proxy) {
        return;  // ignore properties already here, e.g. 'bind', 'prototype' etc
      }
      Object.defineProperty(proxy, prop, desc);
    });

    // The Proxy polyfill cannot handle adding new properties. Seal the target and proxy.
    Object.seal(target);
    Object.seal(proxy);

    return proxy;  // nb. if isMethod is true, proxy != this
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