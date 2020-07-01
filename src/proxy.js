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

module.exports = function proxyPolyfill() {
  let lastRevokeFn = null;
  let ProxyPolyfill;

  /**
   * @param {*} o
   * @return {boolean} whether this is probably a (non-null) Object
   */
  function isObject(o) {
    return o ? (typeof o === 'object' || typeof o === 'function') : false;
  }

  function validateProto(proto) {
    if (proto !== null && !isObject(proto)) {
      throw new TypeError('Object prototype may only be an Object or null: ' + proto);
    }
  }

  const $Object = Object;

  // Closure assumes that `{__proto__: null} instanceof Object` is always true, hence why we check against a different name.
  const canCreateNullProtoObjects = Boolean($Object.create) || !({ __proto__: null } instanceof $Object);
  const objectCreate =
    $Object.create ||
    (canCreateNullProtoObjects
      ? function create(proto) {
          validateProto(proto);
          return { __proto__: proto };
        }
      : function create(proto) {
          validateProto(proto);
          if (proto === null) {
            throw new SyntaxError('Native Object.create is required to create objects with null prototype');
          }

          // nb. cast to convince Closure compiler that this is a constructor
          var T = /** @type {!Function} */ (function T() {});
          T.prototype = proto;
          return new T();
        });

  const noop = function() { return null; };

  const getProto =
    $Object.getPrototypeOf ||
    ([].__proto__ === Array.prototype
      ? function getPrototypeOf(O) {
          // If O.[[Prototype]] === null, then the __proto__ accessor won't exist,
          // as it's inherited from `Object.prototype`
          const proto = O.__proto__;
          return isObject(proto) ? proto : null;
        }
      : noop);

  /**
   * @constructor
   * @param {!Object} target
   * @param {{apply, construct, get, set}} handler
   */
  ProxyPolyfill = function(target, handler) {
    const newTarget = this && this instanceof ProxyPolyfill ? this.constructor : undefined;
    if (newTarget === undefined) {
      throw new TypeError("Constructor Proxy requires 'new'");
    }

    if (!isObject(target) || !isObject(handler)) {
      throw new TypeError('Cannot create proxy with a non-object as target or handler');
    }

    // Construct revoke function, and set lastRevokeFn so that Proxy.revocable can steal it.
    // The caller might get the wrong revoke function if a user replaces or wraps scope.Proxy
    // to call itself, but that seems unlikely especially when using the polyfill.
    let throwRevoked = function() {};
    lastRevokeFn = function() {
      /** @suppress {checkTypes} */
      target = null;  // clear ref
      throwRevoked = function(trap) {
        throw new TypeError(`Cannot perform '${trap}' on a proxy that has been revoked`);
      };
    };
    setTimeout(function() {
      lastRevokeFn = null;
    }, 0);

    // Fail on unsupported traps: Chrome doesn't do this, but ensure that users of the polyfill
    // are a bit more careful. Copy the internal parts of handler to prevent user changes.
    const unsafeHandler = handler;
    handler = { 'get': null, 'set': null, 'apply': null, 'construct': null };
    for (let k in unsafeHandler) {
      if (!(k in handler)) {
        throw new TypeError(`Proxy polyfill does not support trap '${k}'`);
      }
      handler[k] = unsafeHandler[k];
    }
    if (typeof unsafeHandler === 'function') {
      // Allow handler to be a function (which has an 'apply' method). This matches what is
      // probably a bug in native versions. It treats the apply call as a trap to be configured.
      handler.apply = unsafeHandler.apply.bind(unsafeHandler);
    }

    // Define proxy as an object that extends target.[[Prototype]],
    // or a Function (if either it's callable, or apply is set).
    const proto = getProto(target);  // can return null in old browsers
    let proxy;
    let isMethod = false;
    let isArray = false;
    if (typeof target === 'function') {
      proxy = function ProxyPolyfill() {
        const usingNew = (this && this.constructor === proxy);
        const args = Array.prototype.slice.call(arguments);
        throwRevoked(usingNew ? 'construct' : 'apply');

        // TODO(samthor): Closure compiler doesn't know about 'construct', attempts to rename it.
        if (usingNew && handler['construct']) {
          return handler['construct'].call(this, target, args);
        } else if (!usingNew && handler.apply) {
          return handler['apply'](target, this, args);
        }

        // since the target was a function, fallback to calling it directly.
        if (usingNew) {
          // inspired by answers to https://stackoverflow.com/q/1606797
          args.unshift(target);  // pass class as first arg to constructor, although irrelevant
          // nb. cast to convince Closure compiler that this is a constructor
          const f = /** @type {!Function} */ (target.bind.apply(target, args));
          return new f();
        }
        return target.apply(this, args);
      };
      isMethod = true;
    } else if (target instanceof Array) {
      proxy = [];
      isArray = true;
    } else {
      proxy = (canCreateNullProtoObjects || proto !== null) ? objectCreate(proto) : {};
    }

    // Create default getters/setters. Create different code paths as handler.get/handler.set can't
    // change after creation.
    const getter = handler.get ? function(prop) {
      throwRevoked('get');
      return handler.get(this, prop, proxy);
    } : function(prop) {
      throwRevoked('get');
      return this[prop];
    };
    const setter = handler.set ? function(prop, value) {
      throwRevoked('set');
      const status = handler.set(this, prop, value, proxy);
      // TODO(samthor): If the calling code is in strict mode, throw TypeError.
      // if (!status) {
        // It's (sometimes) possible to work this out, if this code isn't strict- try to load the
        // callee, and if it's available, that code is non-strict. However, this isn't exhaustive.
      // }
    } : function(prop, value) {
      throwRevoked('set');
      this[prop] = value;
    };

    // Clone direct properties (i.e., not part of a prototype).
    const propertyNames = $Object.getOwnPropertyNames(target);
    const propertyMap = {};
    propertyNames.forEach(function(prop) {
      if ((isMethod || isArray) && prop in proxy) {
        return;  // ignore properties already here, e.g. 'bind', 'prototype' etc
      }
      const real = $Object.getOwnPropertyDescriptor(target, prop);
      const desc = {
        enumerable: Boolean(real.enumerable),
        get: getter.bind(target, prop),
        set: setter.bind(target, prop),
      };
      $Object.defineProperty(proxy, prop, desc);
      propertyMap[prop] = true;
    });

    // Set the prototype, or clone all prototype methods (always required if a getter is provided).
    // TODO(samthor): We don't allow prototype methods to be set. It's (even more) awkward.
    // An alternative here would be to _just_ clone methods to keep behavior consistent.
    let prototypeOk = true;
    if (isMethod || isArray) {
      // Arrays and methods are special: above, we instantiate boring versions of these then swap
      // our their prototype later. So we only need to use setPrototypeOf in these cases. Some old
      // engines support `Object.getPrototypeOf` but not `Object.setPrototypeOf`.
      const setProto =
        $Object.setPrototypeOf ||
        ([].__proto__ === Array.prototype
          ? function setPrototypeOf(O, proto) {
              validateProto(proto);
              O.__proto__ = proto;
              return O;
            }
          : noop);
      if (!(proto && setProto(proxy, proto))) {
        prototypeOk = false;
      }
    }
    if (handler.get || !prototypeOk) {
      for (let k in target) {
        if (propertyMap[k]) {
          continue;
        }
        $Object.defineProperty(proxy, k, { get: getter.bind(target, k) });
      }
    }

    // The Proxy polyfill cannot handle adding new properties. Seal the target and proxy.
    $Object.seal(target);
    $Object.seal(proxy);

    return proxy;  // nb. if isMethod is true, proxy != this
  };

  ProxyPolyfill.revocable = function(target, handler) {
    const p = new ProxyPolyfill(target, handler);
    return { 'proxy': p, 'revoke': lastRevokeFn };
  };

  return ProxyPolyfill;
}
