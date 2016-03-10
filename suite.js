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


void function() {

  setup(function() {
    // TODO
  });

  /**
   * @return Test object useful for the polyfill, as objects are sealed after creation.
   */
  function buildObject() {
    return {
      name: 'I\'m a test',
      value: 123,
      sub: {name: 'sub'},
    };
  }

  function suiteFor(impl, name) {
    suite(name, function() {
      test('get', function() {
        var testObj = buildObject();
        var gets = [];
        var p = new impl(testObj, {get: function(obj, prop) {
          gets.push(prop);
          return obj[prop];
        }});

        p.name;
        p.sub;
        p.sub.name;
        var s = p.sub;
        s.name; // not a get

        assert.deepEqual(gets, 'name sub sub sub'.split(/\s+/));
      });

      test('set', function() {
        var testObj = buildObject();
        var sets = [];
        var p = new impl(testObj, {set: function(obj, prop) {
          sets.push(prop);
        }});

        p.value += 1;
        p.sub = 45;

        assert.isNotNumber(p.sub, 'setter should not actually set');
        assert.deepEqual(sets, 'value sub'.split(/\s+/));
      });

      test('proxy chain', function() {
        var object = {value: 123};
        var p = new impl(object, {});
        var pp = new impl(p, {get: function(obj, prop) {
          return obj[prop];
        }});
        var ppp = new impl(pp, {});

        assert.equal(ppp.value, 123);
      })

      test('callable', function() {
        var calls = 0;
        var callable = function() {
          return ++calls;
        };

        var p = new impl(callable, {});
        assert.equal(1, p());
        assert.equal(2, callable());
        assert.equal(3, p());
      });

      // test wrapping a constructor without proxying it
      test('wrap constructor', function() {
        var fn = function(y) {
          this.x = 1;
        };
        fn.prototype.sentinel = true;

        var p = new impl(fn, {});
        var obj = new p();
        assert(obj.sentinel, 'prototype not configured correctly');
      });

      test('construct/apply assertions', function() {
        var pc = new impl({}, {construct: function(target, argumentsList) {
          assert(false, 'should not get here');
        }});
        assert.throws(function() {
          pc();
        }, TypeError);
        var pa = new impl({}, {apply: function(target, argumentsList) {
          assert(false, 'should not get here');
        }});
        assert.throws(function() {
          new pa();
        }, TypeError);
      });

      test('construct', function() {
        var fn = function(y) {
          this.x = (y || 0);
          return this;
        };
        fn.prototype.sentinel = true;

        var p = new impl(fn, {construct: function(target, argumentsList) {
          return new target((argumentsList[0] || 0) + 10);
        }});

        var obj = new p(5);
        assert.equal(obj.x, 15);
        assert(obj.sentinel);

        var funcObj = p(5);
        assert.equal(funcObj.x, 5);
        assert(!funcObj.sentinel, 'apply use should not contain sentinel');
      });

      test('apply on non-function', function() {
        var object = {};

        var dummy = new impl(object, {});
        assert.isNotFunction(dummy, 'stock proxy is not function');
        assert.throws(function() {
          dummy();
        }, TypeError);

        var p = new impl(object, {apply: function() {
          // doesn't matter
        }});
        assert.doesNotThrow(function() {
          // TODO(samthor): Firefox errors on this in native!
          // It expects the proxied object to actually be a function, unlike Chrome.
          p();
        });
      });
    });
  }

  suiteFor(window.Proxy, 'polyfill');
  if (window.NativeProxy) {
    suiteFor(window.NativeProxy, 'native');
  }

  suite('general polyfill', function() {
    test('seals object', function() {
      var testObj = buildObject();
      assert.isNotSealed(testObj);
      var p = new Proxy(testObj, {});
      assert.isSealed(testObj);
      assert.isSealed(p, 'proxy should also be sealed');

      new Proxy(testObj, {});
      assert.isSealed(testObj);

      var pp = new Proxy(p, {});
      assert.isSealed(p);
    });
  });

}();
