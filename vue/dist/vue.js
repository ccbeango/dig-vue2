/*!
 * Vue.js v2.6.14
 * (c) 2014-2021 Evan You
 * Released under the MIT License.
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.Vue = factory());
}(this, function () { 'use strict';

  /*  */

  /**
   * 一个不可修改的空对象
   */
  var emptyObject = Object.freeze({});

  // These helpers produce better VM code in JS engines due to their
  // explicitness and function inlining.
  function isUndef (v) {
    return v === undefined || v === null
  }

  function isDef (v) {
    return v !== undefined && v !== null
  }

  function isTrue (v) {
    return v === true
  }

  function isFalse (v) {
    return v === false
  }

  /**
   * Check if value is primitive.
   */
  function isPrimitive (value) {
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      // $flow-disable-line
      typeof value === 'symbol' ||
      typeof value === 'boolean'
    )
  }

  /**
   * Quick object check - this is primarily used to tell
   * Objects from primitive values when we know the value
   * is a JSON-compliant type.
   * 
   * 是否是对象
   *  - 数组 []
   *  - 对象 {}
   */
  function isObject (obj) {
    return obj !== null && typeof obj === 'object'
  }

  /**
   * Get the raw type string of a value, e.g., [object Object].
   */
  var _toString = Object.prototype.toString;

  function toRawType (value) {
    return _toString.call(value).slice(8, -1)
  }

  /**
   * Strict object type check. Only returns true
   * for plain JavaScript objects.
   */
  function isPlainObject (obj) {
    return _toString.call(obj) === '[object Object]'
  }

  function isRegExp (v) {
    return _toString.call(v) === '[object RegExp]'
  }

  /**
   * Check if val is a valid array index.
   */
  function isValidArrayIndex (val) {
    var n = parseFloat(String(val));
    return n >= 0 && Math.floor(n) === n && isFinite(val)
  }

  function isPromise (val) {
    return (
      isDef(val) &&
      typeof val.then === 'function' &&
      typeof val.catch === 'function'
    )
  }

  /**
   * Convert a value to a string that is actually rendered.
   * 将一个值转成字符串
   *  - null => ''
   *  - [] => JSON.stringify
   *  - {} => JSON.stringify
   *  - 其他值 String(val)
   */
  function toString (val) {
    return val == null
      ? ''
      : Array.isArray(val) || (isPlainObject(val) && val.toString === _toString)
        ? JSON.stringify(val, null, 2)
        : String(val)
  }

  /**
   * Convert an input value to a number for persistence.
   * If the conversion fails, return original string.
   * 将一个string值转成number，转换失败则返回原始值
   */
  function toNumber (val) {
    var n = parseFloat(val);
    return isNaN(n) ? val : n
  }

  /**
   * Make a map and return a function for checking if a key
   * is in that map.
   * 形成一个自定义的Map映射，如：
   * 'stop,ctrl,prevent' =>
   * {
   *  stop: true,
   *  ctrl: true,
   *  prevent: true
   * }
   * 调用它的返回函数可以用来检测值是否在这个映射中
   */
  function makeMap (
    str,
    expectsLowerCase
  ) {
    var map = Object.create(null);
    var list = str.split(',');
    for (var i = 0; i < list.length; i++) {
      map[list[i]] = true;
    }
    return expectsLowerCase
      ? function (val) { return map[val.toLowerCase()]; }
      : function (val) { return map[val]; }
  }

  /**
   * Check if a tag is a built-in tag.
   * Vue内置标签Map
   */
  var isBuiltInTag = makeMap('slot,component', true);

  /**
   * Check if an attribute is a reserved attribute.
   */
  var isReservedAttribute = makeMap('key,ref,slot,slot-scope,is');

  /**
   * Remove an item from an array.
   * 删除数组中指定的元素
   */
  function remove (arr, item) {
    if (arr.length) {
      var index = arr.indexOf(item);
      if (index > -1) {
        return arr.splice(index, 1)
      }
    }
  }

  /**
   * Check whether an object has the property.
   */
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  function hasOwn (obj, key) {
    return hasOwnProperty.call(obj, key)
  }

  /**
   * Create a cached version of a pure function.
   * 缓存一个对象，返回一个访问该对象key的函数
   *  1. 值存在直接返回
   *  2. 值不存在，求值后缓存起来并返回
   * @param {*} fn 
   * @returns 
   */
  function cached (fn) {
    var cache = Object.create(null);
    return (function cachedFn (str) {
      var hit = cache[str];
      return hit || (cache[str] = fn(str))
    })
  }

  /**
   * Camelize a hyphen-delimited string.
   * 烤串格式转驼峰 hello-world => helloWorld
   */
  var camelizeRE = /-(\w)/g;
  var camelize = cached(function (str) {
    return str.replace(camelizeRE, function (_, c) { return c ? c.toUpperCase() : ''; })
  });

  /**
   * Capitalize a string.
   */
  var capitalize = cached(function (str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  });

  /**
   * Hyphenate a camelCase string.
   *  将驼峰字符串转成连字符字符串
   *  helloWorld => hello-world
   */
  var hyphenateRE = /\B([A-Z])/g;
  var hyphenate = cached(function (str) {
    return str.replace(hyphenateRE, '-$1').toLowerCase()
  });

  /**
   * Simple bind polyfill for environments that do not support it,
   * e.g., PhantomJS 1.x. Technically, we don't need this anymore
   * since native bind is now performant enough in most browsers.
   * But removing it would mean breaking code that was able to run in
   * PhantomJS 1.x, so this must be kept for backward compatibility.
   * 向后兼容方法
   */

  /* istanbul ignore next */
  function polyfillBind (fn, ctx) {
    function boundFn (a) {
      var l = arguments.length;
      return l
        ? l > 1
          ? fn.apply(ctx, arguments)
          : fn.call(ctx, a)
        : fn.call(ctx)
    }

    boundFn._length = fn.length;
    return boundFn
  }

  function nativeBind (fn, ctx) {
    return fn.bind(ctx)
  }

  /**
   * bind()方法
   */
  var bind = Function.prototype.bind
    ? nativeBind
    : polyfillBind;

  /**
   * Convert an Array-like object to a real Array.
   */
  function toArray (list, start) {
    start = start || 0;
    var i = list.length - start;
    var ret = new Array(i);
    while (i--) {
      ret[i] = list[i + start];
    }
    return ret
  }

  /**
   * Mix properties into target object.
   */
  function extend (to, _from) {
    for (var key in _from) {
      to[key] = _from[key];
    }
    return to
  }

  /**
   * Merge an Array of Objects into a single Object.
   */
  function toObject (arr) {
    var res = {};
    for (var i = 0; i < arr.length; i++) {
      if (arr[i]) {
        extend(res, arr[i]);
      }
    }
    return res
  }

  /* eslint-disable no-unused-vars */

  /**
   * Perform no operation.
   * Stubbing args to make Flow happy without leaving useless transpiled code
   * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/).
   */
  function noop (a, b, c) {}

  /**
   * Always return false.
   */
  var no = function (a, b, c) { return false; };

  /* eslint-enable no-unused-vars */

  /**
   * Return the same value.
   */
  var identity = function (_) { return _; };

  /**
   * Generate a string containing static keys from compiler modules.
   */
  function genStaticKeys (modules) {
    return modules.reduce(function (keys, m) {
      return keys.concat(m.staticKeys || [])
    }, []).join(',')
  }

  /**
   * Check if two values are loosely equal - that is,
   * if they are plain objects, do they have the same shape?
   * 浅比较两个值是否相等
   */
  function looseEqual (a, b) {
    if (a === b) { return true }
    var isObjectA = isObject(a);
    var isObjectB = isObject(b);
    if (isObjectA && isObjectB) {
      // a b 都是对象
      try {
        var isArrayA = Array.isArray(a);
        var isArrayB = Array.isArray(b);
        if (isArrayA && isArrayB) {
          // a b 都是数组
          return a.length === b.length && a.every(function (e, i) {
            // 递归比较数组中每个元素是否相同
            return looseEqual(e, b[i])
          })
        } else if (a instanceof Date && b instanceof Date) {
          // a b 都是 Date类型
          // 时间戳是否相同
          return a.getTime() === b.getTime()
        } else if (!isArrayA && !isArrayB) {
          // a b 都不是数组 即 都是{}格式的对象
          var keysA = Object.keys(a);
          var keysB = Object.keys(b);
          return keysA.length === keysB.length && keysA.every(function (key) {
            // 递归比较对象中每个key的值是否相同
            return looseEqual(a[key], b[key])
          })
        } else {
          // a b 不同时是 数组 对象 Date
          /* istanbul ignore next */
          return false
        }
      } catch (e) {
        /* istanbul ignore next */
        return false
      }
    } else if (!isObjectA && !isObjectB) {
      // a b 都不是对象，转字符串判断是否相等
      return String(a) === String(b)
    } else {
      // a b 有一个是对象
      return false
    }
  }

  /**
   * Return the first index at which a loosely equal value can be
   * found in the array (if value is a plain object, the array must
   * contain an object of the same shape), or -1 if it is not present.
   * 返回数组arr中元素浅比较与val相等的元素索引
   * 未找到则返回 -1
   */
  function looseIndexOf (arr, val) {
    for (var i = 0; i < arr.length; i++) {
      if (looseEqual(arr[i], val)) { return i }
    }
    return -1
  }

  /**
   * Ensure a function is called only once.
   * 使用闭包确保fn函数只执行一次
   */
  function once (fn) {
    var called = false;
    return function () {
      if (!called) {
        called = true;
        fn.apply(this, arguments);
      }
    }
  }

  var SSR_ATTR = 'data-server-rendered';

  var ASSET_TYPES = [
    'component',
    'directive',
    'filter'
  ];

  var LIFECYCLE_HOOKS = [
    'beforeCreate',
    'created',
    'beforeMount',
    'mounted',
    'beforeUpdate',
    'updated',
    'beforeDestroy',
    'destroyed',
    'activated',
    'deactivated',
    'errorCaptured',
    'serverPrefetch'
  ];

  /*  */

  // Vue.config默认配置


  var config = ({
    /**
     * Option merge strategies (used in core/util/options)
     */
    // $flow-disable-line
    optionMergeStrategies: Object.create(null),

    /**
     * Whether to suppress warnings.
     */
    silent: false,

    /**
     * Show production mode tip message on boot?
     */
    productionTip: "development" !== 'production',

    /**
     * Whether to enable devtools
     */
    devtools: "development" !== 'production',

    /**
     * Whether to record perf
     */
    performance: false,

    /**
     * Error handler for watcher errors
     */
    errorHandler: null,

    /**
     * Warn handler for watcher warns
     */
    warnHandler: null,

    /**
     * Ignore certain custom elements
     */
    ignoredElements: [],

    /**
     * Custom user key aliases for v-on
     */
    // $flow-disable-line
    keyCodes: Object.create(null),

    /**
     * Check if a tag is reserved so that it cannot be registered as a
     * component. This is platform-dependent and may be overwritten.
     */
    isReservedTag: no,

    /**
     * Check if an attribute is reserved so that it cannot be used as a component
     * prop. This is platform-dependent and may be overwritten.
     */
    isReservedAttr: no,

    /**
     * Check if a tag is an unknown element.
     * Platform-dependent.
     */
    isUnknownElement: no,

    /**
     * Get the namespace of an element
     */
    getTagNamespace: noop,

    /**
     * Parse the real tag name for the specific platform.
     */
    parsePlatformTagName: identity,

    /**
     * Check if an attribute must be bound using property, e.g. value
     * Platform-dependent.
     */
    mustUseProp: no,

    /**
     * Perform updates asynchronously. Intended to be used by Vue Test Utils
     * This will significantly reduce performance if set to false.
     */
    async: true,

    /**
     * Exposed for legacy reasons
     */
    _lifecycleHooks: LIFECYCLE_HOOKS
  });

  /*  */

  /**
   * unicode letters used for parsing html tags, component names and property paths.
   * using https://www.w3.org/TR/html53/semantics-scripting.html#potentialcustomelementname
   * skipping \u10000-\uEFFFF due to it freezing up PhantomJS
   */
  var unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;

  /**
   * Check if a string starts with $ or _
   */
  function isReserved (str) {
    var c = (str + '').charCodeAt(0);
    return c === 0x24 || c === 0x5F
  }

  /**
   * Define a property.
   * 在对象上定义一个数据属性
   *  设置是否enumerable，默认false
   */
  function def (obj, key, val, enumerable) {
    Object.defineProperty(obj, key, {
      value: val,
      enumerable: !!enumerable,
      writable: true,
      configurable: true
    });
  }

  /**
   * Parse simple path.
   */
  var bailRE = new RegExp(("[^" + (unicodeRegExp.source) + ".$_\\d]"));
  function parsePath (path) {
    if (bailRE.test(path)) {
      return
    }
    // 将字符串分隔 a.b.c => [a, b, c]
    var segments = path.split('.');

    /**
     * 闭包函数
     *   调用时，将segments中的元素作为key，循环遍历访问到最后要获取的值c并返回
     *   1. userWatcher调用此方法，获取getter，执行getter时，obj = vm，最后访问到vm.a.b.c的值
     */
    return function (obj) {
      for (var i = 0; i < segments.length; i++) {
        if (!obj) { return }
        // obj = a.b.c -> obj = b.c -> obj = c
        // obj[segments[i]]访问值时，会触发该值的Dep进行依赖收集，完成userWatcher对这个值的订阅
        // 当这个值发生变化，就会触发userWatcer重新计算
        obj = obj[segments[i]];
      }
      // 返回要访问的a.b.c的值
      return obj
    }
  }

  /*  */

  // can we use __proto__?
  var hasProto = '__proto__' in {};

  // Browser environment sniffing
  var inBrowser = typeof window !== 'undefined';
  var inWeex = typeof WXEnvironment !== 'undefined' && !!WXEnvironment.platform;
  var weexPlatform = inWeex && WXEnvironment.platform.toLowerCase();
  var UA = inBrowser && window.navigator.userAgent.toLowerCase();
  var isIE = UA && /msie|trident/.test(UA);
  var isIE9 = UA && UA.indexOf('msie 9.0') > 0;
  var isEdge = UA && UA.indexOf('edge/') > 0;
  var isAndroid = (UA && UA.indexOf('android') > 0) || (weexPlatform === 'android');
  var isIOS = (UA && /iphone|ipad|ipod|ios/.test(UA)) || (weexPlatform === 'ios');
  var isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge;
  var isPhantomJS = UA && /phantomjs/.test(UA);
  var isFF = UA && UA.match(/firefox\/(\d+)/);

  // Firefox has a "watch" function on Object.prototype...
  var nativeWatch = ({}).watch;

  var supportsPassive = false;
  if (inBrowser) {
    try {
      var opts = {};
      Object.defineProperty(opts, 'passive', ({
        get: function get () {
          /* istanbul ignore next */
          supportsPassive = true;
        }
      })); // https://github.com/facebook/flow/issues/285
      window.addEventListener('test-passive', null, opts);
    } catch (e) {}
  }

  // this needs to be lazy-evaled because vue may be required before
  // vue-server-renderer can set VUE_ENV
  var _isServer;
  var isServerRendering = function () {
    if (_isServer === undefined) {
      /* istanbul ignore if */
      if (!inBrowser && !inWeex && typeof global !== 'undefined') {
        // detect presence of vue-server-renderer and avoid
        // Webpack shimming the process
        _isServer = global['process'] && global['process'].env.VUE_ENV === 'server';
      } else {
        _isServer = false;
      }
    }
    return _isServer
  };

  // detect devtools
  var devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__;

  /* istanbul ignore next */
  function isNative (Ctor) {
    return typeof Ctor === 'function' && /native code/.test(Ctor.toString())
  }

  var hasSymbol =
    typeof Symbol !== 'undefined' && isNative(Symbol) &&
    typeof Reflect !== 'undefined' && isNative(Reflect.ownKeys);

  var _Set;
  /* istanbul ignore if */ // $flow-disable-line
  if (typeof Set !== 'undefined' && isNative(Set)) {
    // use native Set when available.
    _Set = Set;
  } else {
    // a non-standard Set polyfill that only works with primitive keys.
    _Set = /*@__PURE__*/(function () {
      function Set () {
        this.set = Object.create(null);
      }
      Set.prototype.has = function has (key) {
        return this.set[key] === true
      };
      Set.prototype.add = function add (key) {
        this.set[key] = true;
      };
      Set.prototype.clear = function clear () {
        this.set = Object.create(null);
      };

      return Set;
    }());
  }

  /*  */

  var warn = noop;
  var tip = noop;
  var generateComponentTrace = (noop); // work around flow check
  var formatComponentName = (noop);

  {
    var hasConsole = typeof console !== 'undefined';
    var classifyRE = /(?:^|[-_])(\w)/g;
    var classify = function (str) { return str
      .replace(classifyRE, function (c) { return c.toUpperCase(); })
      .replace(/[-_]/g, ''); };

    warn = function (msg, vm) {
      var trace = vm ? generateComponentTrace(vm) : '';

      if (config.warnHandler) {
        config.warnHandler.call(null, msg, vm, trace);
      } else if (hasConsole && (!config.silent)) {
        console.error(("[Vue warn]: " + msg + trace));
      }
    };

    tip = function (msg, vm) {
      if (hasConsole && (!config.silent)) {
        console.warn("[Vue tip]: " + msg + (
          vm ? generateComponentTrace(vm) : ''
        ));
      }
    };

    formatComponentName = function (vm, includeFile) {
      if (vm.$root === vm) {
        return '<Root>'
      }
      var options = typeof vm === 'function' && vm.cid != null
        ? vm.options
        : vm._isVue
          ? vm.$options || vm.constructor.options
          : vm;
      var name = options.name || options._componentTag;
      var file = options.__file;
      if (!name && file) {
        var match = file.match(/([^/\\]+)\.vue$/);
        name = match && match[1];
      }

      return (
        (name ? ("<" + (classify(name)) + ">") : "<Anonymous>") +
        (file && includeFile !== false ? (" at " + file) : '')
      )
    };

    var repeat = function (str, n) {
      var res = '';
      while (n) {
        if (n % 2 === 1) { res += str; }
        if (n > 1) { str += str; }
        n >>= 1;
      }
      return res
    };

    generateComponentTrace = function (vm) {
      if (vm._isVue && vm.$parent) {
        var tree = [];
        var currentRecursiveSequence = 0;
        while (vm) {
          if (tree.length > 0) {
            var last = tree[tree.length - 1];
            if (last.constructor === vm.constructor) {
              currentRecursiveSequence++;
              vm = vm.$parent;
              continue
            } else if (currentRecursiveSequence > 0) {
              tree[tree.length - 1] = [last, currentRecursiveSequence];
              currentRecursiveSequence = 0;
            }
          }
          tree.push(vm);
          vm = vm.$parent;
        }
        return '\n\nfound in\n\n' + tree
          .map(function (vm, i) { return ("" + (i === 0 ? '---> ' : repeat(' ', 5 + i * 2)) + (Array.isArray(vm)
              ? ((formatComponentName(vm[0])) + "... (" + (vm[1]) + " recursive calls)")
              : formatComponentName(vm))); })
          .join('\n')
      } else {
        return ("\n\n(found in " + (formatComponentName(vm)) + ")")
      }
    };
  }

  /*  */

  var uid = 0;

  /**
   * A dep is an observable that can have multiple
   * directives subscribing to it.
   * 作用：建立数据和Watcher之间的桥梁
   *  收集对数据Dep有依赖的Watcher
   */
  var Dep = function Dep () {
    this.id = uid++;
    this.subs = [];
  };

  // 将Watcher添加为数据的订阅者
  Dep.prototype.addSub = function addSub (sub) {
    this.subs.push(sub);
  };

  // 移除指定的Watcher
  Dep.prototype.removeSub = function removeSub (sub) {
    remove(this.subs, sub);
  };

  // 记录数据和Watcher之间的依赖关系
  Dep.prototype.depend = function depend () {
    if (Dep.target) {
      // 调用当前正在计算的Watcher.addDep(this) 再添加一遍当前Watcher的数据依赖Dep
      Dep.target.addDep(this);
    }
  };

  Dep.prototype.notify = function notify () {
    // stabilize the subscriber list first
    var subs = this.subs.slice();
    if (!config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      // 非生产环境且非异步更新的Watcher队列sub是未排序的，
      // 在这里进行排序以便能以正确的顺序处理 
      subs.sort(function (a, b) { return a.id - b.id; });
    }

    // 遍历订阅者队列subs，触发所有Watcher.update()
    for (var i = 0, l = subs.length; i < l; i++) {
      subs[i].update();
    }
  };

  // The current target watcher being evaluated.
  // This is globally unique because only one watcher
  // can be evaluated at a time.
  // 在同一时间的全局唯一Watcher，因为在同一时间只能有一个全局的Watcher被计算
  // 利用栈的数据结构，保证Dep.target就是当前正在计算的Watcher
  Dep.target = null;
  var targetStack = [];

  /**
   * 将当前的Watcher push到targetStack中，记录所有的Watcher
   * 并将Dep.target赋值为当前正在计算的Watcher
   * @param {*} target 
   */
  function pushTarget (target) {
    targetStack.push(target);
    Dep.target = target;
  }

  /**
   * pop掉当前的Watcher
   * 将Dep.target恢复为上次正在计算的Watcher 
   */
  function popTarget () {
    targetStack.pop();
    Dep.target = targetStack[targetStack.length - 1];
  }

  /*  */

  // VNode 是VirtualDOM中的每个节点
  // 虚拟DOM就是一个个VNode组合成的树结构
  // VNode 是对真实 DOM 的一种抽象描述
  // VirtualDOM除了它的数据结构的定义，
  // 映射到真实的DOM实际上要经历VNode的create、diff、patch等过程
  // VNode只是用来映射到真实DOM的渲染，不需要包含操作DOM的方法，因此它是非常轻量和简单的
  var VNode = function VNode (
    tag,
    data,
    children,
    text,
    elm,
    context,
    componentOptions,
    asyncFactory
  ) {
    this.tag = tag;
    this.data = data;
    this.children = children;
    this.text = text;
    this.elm = elm;
    this.ns = undefined;
    this.context = context;
    this.fnContext = undefined;
    this.fnOptions = undefined;
    this.fnScopeId = undefined;
    this.key = data && data.key;
    this.componentOptions = componentOptions;
    this.componentInstance = undefined;
    this.parent = undefined;
    this.raw = false;
    this.isStatic = false;
    this.isRootInsert = true;
    this.isComment = false;
    this.isCloned = false;
    this.isOnce = false;
    this.asyncFactory = asyncFactory;
    this.asyncMeta = undefined;
    this.isAsyncPlaceholder = false;
  };

  var prototypeAccessors = { child: { configurable: true } };

  // DEPRECATED: alias for componentInstance for backwards compat.
  /* istanbul ignore next */
  prototypeAccessors.child.get = function () {
    return this.componentInstance
  };

  Object.defineProperties( VNode.prototype, prototypeAccessors );

  /**
   * 创建一个注释占位VNode节点
   * @param {*} text 
   * @returns 
   */
  var createEmptyVNode = function (text) {
    if ( text === void 0 ) text = '';

    var node = new VNode();
    node.text = text;
    node.isComment = true;
    return node
  };

  /**
   * 创建一个文本节点VNode
   * @param {*} val 
   * @returns 
   */
  function createTextVNode (val) {
    return new VNode(undefined, undefined, undefined, String(val))
  }

  // optimized shallow clone
  // used for static nodes and slot nodes because they may be reused across
  // multiple renders, cloning them avoids errors when DOM manipulations rely
  // on their elm reference.
  function cloneVNode (vnode) {
    var cloned = new VNode(
      vnode.tag,
      vnode.data,
      // #7975
      // clone children array to avoid mutating original in case of cloning
      // a child.
      vnode.children && vnode.children.slice(),
      vnode.text,
      vnode.elm,
      vnode.context,
      vnode.componentOptions,
      vnode.asyncFactory
    );
    cloned.ns = vnode.ns;
    cloned.isStatic = vnode.isStatic;
    cloned.key = vnode.key;
    cloned.isComment = vnode.isComment;
    cloned.fnContext = vnode.fnContext;
    cloned.fnOptions = vnode.fnOptions;
    cloned.fnScopeId = vnode.fnScopeId;
    cloned.asyncMeta = vnode.asyncMeta;
    cloned.isCloned = true;
    return cloned
  }

  /*
   * not type checking this file because flow doesn't play well with
   * dynamically accessing methods on Array prototype
   * 对Array原型上的几个API进行增强
   */

  var arrayProto = Array.prototype;
  var arrayMethods = Object.create(arrayProto);

  var methodsToPatch = [
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'sort',
    'reverse'
  ];

  /**
   * Intercept mutating methods and emit events
   * 使用继承，对Array原型上的一些方法(methodsToPatch)重写
   * 执行时可将元素变成响应式的，并派发更新
   */
  methodsToPatch.forEach(function (method) {
    // cache original method
    var original = arrayProto[method];
    def(arrayMethods, method, function mutator () {
      var args = [], len = arguments.length;
      while ( len-- ) args[ len ] = arguments[ len ];

      // 执行原数组API方法
      var result = original.apply(this, args);
      // 增强处理
      var ob = this.__ob__;
      var inserted;
      switch (method) {
        case 'push':
        case 'unshift':
          // 获取新增的元素
          inserted = args;
          break
        case 'splice':
          // 获取新增的元素
          inserted = args.slice(2);
          break
      }
      // 将新增元素设置成响应式元素
      if (inserted) { ob.observeArray(inserted); }
      // notify change
      // 手动派发更新
      ob.dep.notify();
      return result
    });
  });

  /*  */

  var arrayKeys = Object.getOwnPropertyNames(arrayMethods);

  /**
   * In some cases we may want to disable observation inside a component's
   * update computation.
   */
  var shouldObserve = true; // 是否需要observe标识

  /**
   * 切换是否需要observe
   * 控制在observe()的过程中是否需要把当前值变成一个Observer对象
   * @param {*} value 
   */
  function toggleObserving (value) {
    shouldObserve = value;
  }

  /**
   * Observer class that is attached to each observed
   * object. Once attached, the observer converts the target
   * object's property keys into getter/setters that
   * collect dependencies and dispatch updates.
   * 通过调用defineReactive()方法 将一个对象设置成响应式对象
   * 给对象的属性添加访问器属性getter和setter，用于依赖收集和派发更新
   * 
   * 通过new Observer()调用，Observer内部会对obj的子对象递归调用observe()方法
   * 这样保证无论obj的结构多复杂，它的所有子属性也能变成响应式的，
   * 这样访问或修改obj中一个嵌套较深的属性，也能触发getter和setter
   * 
   * 实际上就是给obj的引用类型属性都加上Observer实例属性，
   * 保存在__ob__中，__ob__是不可枚举的，生成如下结构：
      {
        __ob__: Observer,
        hello: 'world',
        message: {
          __ob__: Observer,
          hi: 'hi',
          bye: {
            __ob__: Observer,
            see: 'you',
            peace: 'out'
          }
        },
        list: [ 1, 2, 3 ] // 数组上__ob__: Observer
      }
   * 最终保证：
   *  每个非基本数据类型都添加__ob__属性
   *  每个基本数据类型都通过defineReactive设置访问器属性，变成响应式的，那么最终obj对象是响应式对象
   */
  var Observer = function Observer (value) {
    this.value = value; // observe的值
    this.dep = new Dep(); // 用于对自己的value进行依赖收集
    this.vmCount = 0;
    // 在value上定义不可枚举的数据属性__ob__ 存储自己的Observer
    def(value, '__ob__', this);

    if (Array.isArray(value)) {
      // 数组value添加数组增强方法
      if (hasProto) {
        // 实例上能使用 __proto__ 访问原型
        // 将增强array对象作为value原型
        protoAugment(value, arrayMethods);
      } else {
        // 实例上不能使用 __proto__ 访问原型
        // 将增强后的Array的所有方法复制到value上
        copyAugment(value, arrayMethods, arrayKeys);
      }
      // 遍历数组再调用observe()方法
      // 目的是将data中设置成深层响应式的对象
      this.observeArray(value);
    } else {
      // value是Object 每项都设置访问器属性
      this.walk(value);
    }
  };

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   * 将obj的每一项都设置成响应式的
   */
  Observer.prototype.walk = function walk (obj) {
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      defineReactive$$1(obj, keys[i]);
    }
  };

  /**
   * Observe a list of Array items.
   */
  Observer.prototype.observeArray = function observeArray (items) {
    for (var i = 0, l = items.length; i < l; i++) {
      observe(items[i]);
    }
  };

  // helpers

  /**
   * Augment a target Object or Array by intercepting
   * the prototype chain using __proto__
   */
  function protoAugment (target, src) {
    /* eslint-disable no-proto */
    target.__proto__ = src;
    /* eslint-enable no-proto */
  }

  /**
   * Augment a target Object or Array by defining
   * hidden properties.
   */
  /* istanbul ignore next */
  function copyAugment (target, src, keys) {
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      def(target, key, src[key]);
    }
  }

  /**
   * Attempt to create an observer instance for a value,
   * returns the new observer if successfully observed,
   * or the existing observer if the value already has one.
   * 
   * 将一个对象设置成可Observer的
   * 在一个对象中添加一个Observer对象实例，并返回Observer实例
   * 如果这个对象已经添加了Observer对象，就直接返回Observer对象
   * 
   * 本质就是给非VNode的对象类型数据添加一个Observer实例，value.__ob__ = Observer
   *    如果已经添加过则直接返回
   *    否则在满足一定条件下去实例化一个Observer对象实例，并添加到value上
   * @param {*} value       要添加Observer实例属性的对象
   * @param {*} asRootData  对象是否是根层级的 组件初始化时initState调用为 true
   * @returns 
   */
  function observe (value, asRootData) {
    if (!isObject(value) || value instanceof VNode) {
      // reject:  value不是对象 或 value是VNode实例
      return
    }

    var ob;
    if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
      // value已经有Observer实例
      ob = value.__ob__;
    } else if (
      shouldObserve &&
      !isServerRendering() &&
      (Array.isArray(value) || isPlainObject(value)) &&
      Object.isExtensible(value) &&
      !value._isVue
    ) {
      /**
       * 给将value设置Observer实例
       * 命中条件：
       *  1. value需要observe
       *  2. 非服务端渲染
       *  3. value是数组或普通对象
       *  4. value是可扩展的(extensible)
       *  5. value不是Vue实例
       */
      ob = new Observer(value);
    }

    if (asRootData && ob) {
      // value是根层级的 组件调用iniState()时asRootData为true
      // 统计observer作为vm.$data的数量
      ob.vmCount++;
    }
    // 返回给value对象添加的Observer实例对象
    return ob
  }

  /**
   * Define a reactive property on an Object.
   * 通过将对象上的属性设置成访问器属性，
   * 将对象上的属性定义成响应式的
   * 
   * 将属性设置成响应式的实现：
   *  1. val是基本数据类型，设置为响应式的
   *  2. val是对象或数组，递归调用observe()，
   *     最终会再调用defineReactive，将val每个属性都设置成响应式的
   * @param {*} obj           要定义的对象
   * @param {*} key           对象的key
   * @param {*} val 
   * @param {*} customSetter  自定义setter
   * @param {*} shallow 
   * @returns 
   */
  function defineReactive$$1 (
    obj,
    key,
    val,
    customSetter,
    shallow
  ) {
    // 实例化dep 创建数据key的依赖收集实例Dep
    // 关注该数据key的Watcher会订阅此Dep
    // Dep.subs中是订阅了此数据的Watcher
    var dep = new Dep();

    var property = Object.getOwnPropertyDescriptor(obj, key);
    if (property && property.configurable === false) {
      // 特性configurable为false的属性不设置
      return
    }

    // cater for pre-defined getter/setters
    var getter = property && property.get;
    var setter = property && property.set;
    if ((!getter || setter) && arguments.length === 2) {
      // 没getter或有setter，调用时只传了两个参数
      // 没传第三个参数val，获取val
      val = obj[key];
    }

    /**
     * childObserver 递归调用observe()
     * 对于值val会执行observe函数，然后遇到val是对象或者数组的情况会递归执行
     * defineReactive把它们的子属性都变成响应式的
     * 但是shouldObserve的值是false时，这个递归过程就会被省略
     * 
     * 对于对象的prop值，子组件的prop值始终指向父组件的prop值，只要父组件的prop值变化，
     * 就会触发子组件的重新渲染，所以这个observe过程是可以省略的
     */
    var childOb = !shallow && observe(val);

    // 定义key为访问器属性
    Object.defineProperty(obj, key, { // 依赖收集
      enumerable: true,
      configurable: true,
      get: function reactiveGetter () {
        // 执行原key的getter
        var value = getter ? getter.call(obj) : val;

        /**
         * 依赖收集
         *    key是当前正在计算的Watcher即Dep.target关注的，
         *    当前Watcher会订阅此数据的变化，即触发这个key的Dep依赖收集
         * 订阅此key的Dep的Watcher会是不同类型的
         *  1. renderWatcher，key变化触发渲染，订阅此key的Dep
         *  2. computedWatcher，key的变化触发计算属性的重新计算，订阅此key的Dep
         *  3. userWatcher，key的变化触发侦听属性，订阅此key的Dep
         */
        // 依赖收集处理
        if (Dep.target) {
          /**
           * 调用dep的append()，收集关注此key的Watcher到依赖收集实例Dep中，即Dep.subs中
           *  会调用Watcher.addDep()
           */
          dep.depend();

          if (childOb) { // childOb是响应式对象 保存在val.__ob__属性中
            /**
             * 这是为Vue.set、delete 以及数组增强方法 定制的逻辑
             *
             * 使用childObserver实例上的dep对childObserver进行依赖收集
             * 
             * 上面的方法在添加新值时，无法直接触发setter，
             * 因为新值val在添加时并不是响应式的，那么在把新值val设置成响应式属性后，
             * 需要手动派发更新，触发页面渲染，在新值val.__ob__属性对应的Observer中，
             * 也有一个属性dep，可以对该值val进行依赖收集Observer.dep.depend()
             */
            childOb.dep.depend();
            // val是个数组，那么就通过dependArray把数组每个元素也去做依赖收集
            if (Array.isArray(value)) {
              dependArray(value);
            }
          }
        }

        // 返回访问值
        return value
      },
      // 当我们修改数据的时候，触发setter，可以对相关的依赖派发更新
      set: function reactiveSetter (newVal) { // 派发更新
        // 执行原key的getter得到旧value
        var value = getter ? getter.call(obj) : val;

        /* eslint-disable no-self-compare */
        if (newVal === value || (newVal !== newVal && value !== value)) {
          /**
           * Reject
           *  1. 新值与旧值相等
           *  2. 或者 新值、旧值都是NaN 
           */
          return
        }

        /* eslint-enable no-self-compare */
        if (customSetter) {
          // 非生产环境执行 执行自定义Setter
          customSetter();
        }

        // #7981: for accessor properties without setter
        // reject：没有setter
        if (getter && !setter) { return }

        if (setter) {
          // 执行原key的setter
          setter.call(obj, newVal);
        } else {
          // 原key是数据属性 直接赋值
          val = newVal;
        }

        // childObserver 新值也变成响应式的
        childOb = !shallow && observe(newVal);
        // 派发更新 通知所有的订阅者Watcher数据发生了变化
        dep.notify();
      }
    });
  }

  /**
   * Set a property on an object. Adds the new property and
   * triggers change notification if the property doesn't
   * already exist.
   * 
   * 在数组或对象上设置一个属性，设置的如果是新属性，就派发更新
   * targt是普通对象：
   *  1. 只做赋值处理
   * target是响应式对象：
   *  1. 如果该属性本身已存在于对象上，只设置属性即可触发更新，因为该属性已经是响应式的
   *  2. 如果该属性本身不存在于对象上，将该属性设置成响应式属性，并主动派发更新
   * @param {*} target 要设置的数组或对象
   * @param {*} key    可以是对象的key或数组的索引
   * @param {*} val    要设置的值
   * @returns 
   */
  function set (target, key, val) {
    if (isUndef(target) || isPrimitive(target)
    ) {
      // 非生产环境 要设置的target未定义或是基本数据类型警告
      warn(("Cannot set reactive property on undefined, null, or primitive value: " + ((target))));
    }
    // 数组set过程 target是数组 且 索引有效
    if (Array.isArray(target) && isValidArrayIndex(key)) {
      target.length = Math.max(target.length, key);
      // 调用增强数组API
      target.splice(key, 1, val);
      return val
    }

    // key本身就存在于对象上 且 不是原型上的
    if (key in target && !(key in Object.prototype)) {
      // 直接设置值，即可触发更新，因为该值已经是响应式的
      target[key] = val;
      return val
    }

    /**
     * key不存在于target上 或 key是原型上的 执行下面逻辑
     */

    var ob = (target).__ob__;
    if (target._isVue || (ob && ob.vmCount)) {
      // target是Vue实例
      // 或 target是响应式对象，且target是一个$data 不做处理 警告提示
      warn(
        'Avoid adding reactive properties to a Vue instance or its root $data ' +
        'at runtime - declare it upfront in the data option.'
      );
      return val
    }

    if (!ob) {
      // target本身不是响应式对象
      // targt是普通对象，做最基本的赋值处理
      target[key] = val;
      return val
    }

    // 将key属性定义为响应式对象target上的响应式属性
    defineReactive$$1(ob.value, key, val);
    // 手动派发更新 刚设置成响应式属性，无法直接触发setter
    ob.dep.notify();
    return val
  }

  /**
   * Delete a property and trigger change if necessary.
   * 在数组或对象上删除一个属性 并 派发更新
   */
  function del (target, key) {
    if (isUndef(target) || isPrimitive(target)
    ) {
      // 非生产环境 要删除的target未定义或是基本数据类型警告
      warn(("Cannot delete reactive property on undefined, null, or primitive value: " + ((target))));
    }
    if (Array.isArray(target) && isValidArrayIndex(key)) {
      // 数组set过程 target是数组 且 索引有效
      target.splice(key, 1);
      return
    }

    var ob = (target).__ob__;
    if (target._isVue || (ob && ob.vmCount)) {
      // target是Vue实例
      // 或 target是响应式对象，且 target是一个$data 不做处理 警告提示
      warn(
        'Avoid deleting properties on a Vue instance or its root $data ' +
        '- just set it to null.'
      );
      return
    }

    if (!hasOwn(target, key)) {
      // key不是target的自有属性，不做处理
      return
    }

    // 删除key属性
    delete target[key];
    if (!ob) {
      // target不是响应式的 直接返回
      return
    }
    // target是响应式的 手动派发更新 
    ob.dep.notify();
  }

  /**
   * Collect dependencies on array elements when the array is touched, since
   * we cannot intercept array element access like property getters.
   */
  function dependArray (value) {
    for (var e = (void 0), i = 0, l = value.length; i < l; i++) {
      e = value[i];
      e && e.__ob__ && e.__ob__.dep.depend();
      if (Array.isArray(e)) {
        dependArray(e);
      }
    }
  }

  /*  */

  /**
   * Option overwriting strategies are functions that handle
   * how to merge a parent option value and a child option
   * value into the final value.
   */
  // options合并策略 optionMergeStrategies用户可配置
  var strats = config.optionMergeStrategies;

  /**
   * Options with restrictions
   */
  {
    /**
     * el propsData 默认合并策略
     */
    strats.el = strats.propsData = function (parent, child, vm, key) {
      if (!vm) {
        warn(
          "option \"" + key + "\" can only be used during instance " +
          'creation with the `new` keyword.'
        );
      }
      return defaultStrat(parent, child)
    };
  }

  /**
   * Helper that recursively merges two data objects together.
   * 合并两个对象 递归合并from到to中
   *   to中的每一项都设置成observed，可观察的
   *   如果to.key是一个对象，就递归调用本身mergeData，保证每个key都是可观察的
   * @param {*} to 子类data
   * @param {*} from 父类data
   * @returns 
   */
  function mergeData (to, from) {
    if (!from) { return to }
    var key, toVal, fromVal;

    // 获取父类data的所有key数组
    var keys = hasSymbol
      ? Reflect.ownKeys(from)
      : Object.keys(from);

    for (var i = 0; i < keys.length; i++) {
      key = keys[i];

      // in case the object is already observed...
      if (key === '__ob__') { continue } // 跳过响应式对象的__ob__键
      
      toVal = to[key];
      fromVal = from[key];

      if (!hasOwn(to, key)) {
        // 父类的data[key]，子类没有，则将新增的数据加入响应式系统中
        set(to, key, fromVal);
      } else if (
        toVal !== fromVal &&
        isPlainObject(toVal) &&
        isPlainObject(fromVal)
      ) {   
        // toVal !== fromVal不相等，且都是对象，递归合并 如果相等，则默认使用子类数据
        // 处理深层对象，当合并的数据为多层嵌套对象时，需要递归调用mergeData进行比较合并
        mergeData(toVal, fromVal);
      }
    }

    // 返回合并结果
    return to
  }

  /**
   * Data
   *  data、provide合并策略
   */
  function mergeDataOrFn (
    parentVal,
    childVal,
    vm
  ) {
    if (!vm) {
      /**
       * 子父类关系 Vue.extend()创建子类
       * vm不为真
       *    childVal不为真，返回parentVal 即 子类不存在data选项，则合并结果为父类data选项
       *    parentVal不为真，返回childVal 即 父类不存在data选项，则合并结果为子类data选项
       *    parentVal和childVal都为真 即 data选项在父类和子类同时存在的情况下返回的是一个函数mergedDataFn
       *      使用mergeData合并，childVal为to，parentVal为from
       */

      // in a Vue.extend merge, both should be functions
      if (!childVal) { // 子类不存在data选项，则合并结果为父类data选项
        return parentVal
      }
      if (!parentVal) { // 父类不存在data选项，则合并结果为子类data选项
        return childVal
      }

      // when parentVal & childVal are both present,
      // we need to return a function that returns the
      // merged result of both functions... no need to
      // check if parentVal is a function here because
      // it has to be a function to pass previous merges.
      return function mergedDataFn () { // data选项在父类和子类同时存在的情况下返回的是一个函数
        // 子类实例和父类实例，分别将子类和父类实例中data函数执行后返回的对象传递给mergeData函数做数据合并
        return mergeData(
          typeof childVal === 'function' ? childVal.call(this, this) : childVal, // to
          typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal // from
        )
      }
    } else {
      // vm为真 Vue构造函数实例对象
      return function mergedInstanceDataFn () {
        // instance merge
        var instanceData = typeof childVal === 'function'
          ? childVal.call(vm, vm)
          : childVal;
        var defaultData = typeof parentVal === 'function'
          ? parentVal.call(vm, vm)
          : parentVal;
        if (instanceData) {
          // 当实例中传递data选项时，将实例的data对象和Vm构造函数上的data属性选项合并
          return mergeData(instanceData, defaultData)
        } else {
          // 当实例中不传递data时，默认返回Vm构造函数上的data属性选项
          return defaultData
        }
      }
    }
  }

  /**
   * data合并策略
   *  childVal必须是函数
   *    使用mergeDataOrFn合并
   */
  strats.data = function (
    parentVal,
    childVal,
    vm
  ) {
    // vm代表是否为Vue创建的实例，否则是子父类的关系
    if (!vm) {
      if (childVal && typeof childVal !== 'function') { // 必须保证子类的data类型是一个函数而不是一个对象
        // 警告 data需要是一个函数 
        warn(
          'The "data" option should be a function ' +
          'that returns a per-instance value in component ' +
          'definitions.',
          vm
        );

        return parentVal
      }
      return mergeDataOrFn(parentVal, childVal)
    }
    // new Vue创建的实例 传递vm作为函数的第三个参数
    return mergeDataOrFn(parentVal, childVal, vm)
  };

  /**
   * Hooks and props are merged as arrays.
   * 生命周期钩子函数合并策略
   *  将各个生命周期的钩子函数合并成数组
   * 1. 如果子类不存在钩子选项，则以父类选项返回。
   * 2. 如果父类不存在钩子选项，子类存在时，则以数组形式返回子类钩子选项。
   * 3. 如果子类和父类都拥有相同钩子选项，则将子类选项和父类选项合并成数组，
   *    子类钩子选项放在数组的末尾，这样在执行钩子时，永远是父类选项优先于子类选项执行。
   */
  function mergeHook (
    parentVal,
    childVal
  ) {
    var res = childVal
      ? parentVal
        // childVal、parentVal都为真，合并数组
        ? parentVal.concat(childVal)
        // childVal为真，parentVal不为真，使用childVal当作数组
        : Array.isArray(childVal)
          ? childVal
          : [childVal]
      // childVal不为真，使用parentVal数组
      : parentVal;
    return res
      ? dedupeHooks(res)
      : res
  }

  /**
   * 同一个钩子出现多次，去除掉重复的
   */
  function dedupeHooks (hooks) {
    var res = [];
    for (var i = 0; i < hooks.length; i++) {
      if (res.indexOf(hooks[i]) === -1) {
        res.push(hooks[i]);
      }
    }
    return res
  }

  LIFECYCLE_HOOKS.forEach(function (hook) {
    strats[hook] = mergeHook;
  });

  /**
   * Assets
   *
   * When a vm is present (instance creation), we need to do
   * a three-way merge between constructor options, instance
   * options and parent options.
   *  资源选项components、directives、filters合并策略
   *    使用parentVal作为原型，将parentVal、childVal合并成一个新对象
   *     childVal会覆盖parentVal上相同的值
   */
  function mergeAssets (
    parentVal,
    childVal,
    vm,
    key
  ) {
    // 将parentVal、childVal合并成一个新对象
    var res = Object.create(parentVal || null);
    if (childVal) {
       // components,filters,directives选项必须为对象
      assertObjectType(key, childVal, vm);
      // childVal会覆盖parentVal上相同的值
      return extend(res, childVal)
    } else {
      return res
    }
  }

  ASSET_TYPES.forEach(function (type) {
    strats[type + 's'] = mergeAssets;
  });

  /**
   * Watchers.
   *
   * Watchers hashes should not overwrite one
   * another, so we merge them as arrays.
   *  watch的合并策略
   *    parentVal、childVal都不为真，返回空对象
   *    parentVal或childVal有一个为真，返回真的项
   *    parentVal和childVal都为真，每一项都合并成数组
   */
  strats.watch = function (
    parentVal,
    childVal,
    vm,
    key
  ) {
    // work around Firefox's Object.prototype.watch...
    if (parentVal === nativeWatch) { parentVal = undefined; }
    if (childVal === nativeWatch) { childVal = undefined; }

    // parentVal和childVal都不为真 或 只有一个为真
    /* istanbul ignore if */
    if (!childVal) { return Object.create(parentVal || null) } // 没有子类watch选项，则默认用父选项
    {
      assertObjectType(key, childVal, vm); // 子类watch必须是对象
    }
    if (!parentVal) { return childVal } // 没有父类watch选项

    // parentVal和childVal都为真 子类和父类watch选项都存在
    // 相同的key合并成[parent, child]数组
    var ret = {};
    extend(ret, parentVal);
    for (var key$1 in childVal) {
      var parent = ret[key$1];
      var child = childVal[key$1];
      if (parent && !Array.isArray(parent)) {
        // 父的选项先转换成数组
        parent = [parent];
      }
      ret[key$1] = parent
        // 相同的key合并成[parent, child]数组
        ? parent.concat(child)
        // parent没有，将child作为数组合并上
        : Array.isArray(child) ? child : [child];
    }
    return ret
  };

  /**
   * Other object hashes.
   *  props、methods、inject、computed合并策略
   *    parentVal不为真，使用childVal
   *    parentVal和childVal为真，合并后返回；
   *      childVal会覆盖parentVal相同的key
   */
  strats.props =
  strats.methods =
  strats.inject =
  strats.computed = function (
    parentVal,
    childVal,
    vm,
    key
  ) {
    if (childVal && "development" !== 'production') {
      assertObjectType(key, childVal, vm);
    }
    // parentVal不为真，使用childVal
    if (!parentVal) { return childVal }

    // parentVal和childVal为真，合并后返回；
    var ret = Object.create(null);
    extend(ret, parentVal);
    //  childVal会覆盖parentVal相同的key
    if (childVal) { extend(ret, childVal); }
    return ret
  };

  /**
   * provide合并策略
   */
  strats.provide = mergeDataOrFn;

  /**
   * Default strategy.
   * 默认合并策略
   *  childVal不是undefined，使用childVal
   *  否则使用parentVal
   */
  var defaultStrat = function (parentVal, childVal) {
    return childVal === undefined
      ? parentVal
      : childVal
  };

  /**
   * Validate component names
   *  检查所有组件名是否有效
   */
  function checkComponents (options) {
    for (var key in options.components) {
      validateComponentName(key);
    }
  }

  /**
   * 验证组件名是否有效
   * @param {*} name 
   */
  function validateComponentName (name) {
    // 标签名需符合h5规范
    if (!new RegExp(("^[a-zA-Z][\\-\\.0-9_" + (unicodeRegExp.source) + "]*$")).test(name)) {
      warn(
        'Invalid component name: "' + name + '". Component names ' +
        'should conform to valid custom element name in html5 specification.'
      );
    }

    // 1. 不允许使用Vue内置标签 slot,component
    // 2. 不允许使用HTML标签
    if (isBuiltInTag(name) || config.isReservedTag(name)) {
      warn(
        'Do not use built-in or reserved HTML elements as component ' +
        'id: ' + name
      );
    }
  }

  /**
   * Ensure all props option syntax are normalized into the
   * Object-based format.
   * 标准化props
   *   将props转成标准要求的对象格式
   * @param {*} options 对象或数组的props
   * @param {*} vm 
   * @returns 
   */
  function normalizeProps (options, vm) {
    var props = options.props;
    if (!props) { return }
    var res = {};
    var i, val, name;
    if (Array.isArray(props)) {
      // props是数组格式
      // [A, B, C] =>
      // { A: {type: null}, B: {type: null}, C: {type: null} }
      i = props.length;
      while (i--) {
        val = props[i];
        if (typeof val === 'string') {
          name = camelize(val); // 转驼峰
          res[name] = { type: null };
        } else {
          // 警告 数组语法的props，元素必须是字符串
          warn('props must be strings when using array syntax.');
        }
      }
    } else if (isPlainObject(props)) {
      // props是对象
      // { A: Number, B: [ Number, String ], C: { type: String, default: 'hello', ... } } => 
      // { A: {type: Number}, B: {type: [ Number, String ]}, C: { type: String, default: 'hello', ... } }
      for (var key in props) {
        val = props[key];
        name = camelize(key);
        res[name] = isPlainObject(val)
          ? val
          // 非对象val当作props指定类型字段 val可以是字符串或数组 String 或 [String, Number]
          : { type: val };
      }
    } else {
      // 警告 props非数组或对象
      warn(
        "Invalid value for option \"props\": expected an Array or an Object, " +
        "but got " + (toRawType(props)) + ".",
        vm
      );
    }
    options.props = res;
  }

  /**
   * Normalize all injections into Object-based format
   *  将inject转成标准要求的对象格式
   */
  function normalizeInject (options, vm) {
    var inject = options.inject;
    if (!inject) { return }
    var normalized = options.inject = {};
    if (Array.isArray(inject)) {
      for (var i = 0; i < inject.length; i++) {
        normalized[inject[i]] = { from: inject[i] };
      }
    } else if (isPlainObject(inject)) {
      for (var key in inject) {
        var val = inject[key];
        normalized[key] = isPlainObject(val)
          ? extend({ from: key }, val)
          : { from: val };
      }
    } else {
      // 警告 inject非数组或对象
      warn(
        "Invalid value for option \"inject\": expected an Array or an Object, " +
        "but got " + (toRawType(inject)) + ".",
        vm
      );
    }
  }

  /**
   * Normalize raw function directives into object format.
   *  将directive转成标准要求的对象格式
   */
  function normalizeDirectives (options) {
    var dirs = options.directives;
    if (dirs) {
      for (var key in dirs) {
        var def$$1 = dirs[key];
        if (typeof def$$1 === 'function') {
          dirs[key] = { bind: def$$1, update: def$$1 };
        }
      }
    }
  }

  // 断言value是否是普通对象
  function assertObjectType (name, value, vm) {
    if (!isPlainObject(value)) {
      warn(
        "Invalid value for option \"" + name + "\": expected an Object, " +
        "but got " + (toRawType(value)) + ".",
        vm
      );
    }
  }

  /**
   * Merge two option objects into a new one.
   * Core utility used in both instantiation and inheritance.
   * 根据不同的合并策略，合并options
   * 实例化、继承中使用
   * @param {*} parent options
   * @param {*} child  options
   * @param {*} vm     当前vm实例
   * @returns 
   */
  function mergeOptions (
    parent,
    child,
    vm
  ) {
    {
      // 检测组件名是否有效
      checkComponents(child);
    }

    if (typeof child === 'function') {
      child = child.options;
    }

    // 标准化props
    normalizeProps(child, vm);
    // 标准化inject
    normalizeInject(child, vm);
    // 标准化directive
    normalizeDirectives(child);

    // Apply extends and mixins on the child options,
    // but only if it is a raw options object that isn't
    // the result of another mergeOptions call.
    // Only merged options has the _base property.
    if (!child._base) { // 实例化的Vue组件
      // 递归 合并实例化组件的extends
      if (child.extends) {
        parent = mergeOptions(parent, child.extends, vm);
      }
      // 递归 合并实例化组件的mixins
      if (child.mixins) {
        for (var i = 0, l = child.mixins.length; i < l; i++) {
          parent = mergeOptions(parent, child.mixins[i], vm);
        }
      }
    }

    /**
     * 根据不同的合并策略，对options进行合并处理
     */
    var options = {};
    var key;
    // 合并parent上的key
    for (key in parent) {
      mergeField(key);
    }
    // 合并child上有的而parent上没有的key
    for (key in child) {
      if (!hasOwn(parent, key)) {
        mergeField(key);
      }
    }
    function mergeField (key) {
      var strat = strats[key] || defaultStrat;
      // 执行相应的合并策略
      options[key] = strat(parent[key], child[key], vm, key);
    }
    return options
  }

  /**
   * Resolve an asset.
   * This function is used because child instances need access
   * to assets defined in its ancestor chain.
   * resolve资源 component、directive、filter 并返回找到的asset
   * 从vm.options[components|directives|filters]中返回查找的定义handler
   * @param {*} options vm的options
   * @param {*} type 要查找的type  options[type]
   * @param {*} id  要查找的id options[type][id]
   * @param {*} warnMissing 
   * @returns 找到指令定义的handler处理
   */
  function resolveAsset (
    options,
    type,
    id,
    warnMissing
  ) {
    /* istanbul ignore if */
    if (typeof id !== 'string') {
      return
    }
    var assets = options[type];
    // check local registration variations first
    // hello-wrold
    if (hasOwn(assets, id)) { return assets[id] }
    // 转驼峰 hello-wrold => helloWorld
    var camelizedId = camelize(id);
    if (hasOwn(assets, camelizedId)) { return assets[camelizedId] }
    // 首字母转大写 helloWorld => HelloWorld
    var PascalCaseId = capitalize(camelizedId);
    if (hasOwn(assets, PascalCaseId)) { return assets[PascalCaseId] }
    
    // fallback to prototype chain
    // 原型链中获取
    var res = assets[id] || assets[camelizedId] || assets[PascalCaseId];
    if (warnMissing && !res) {
      warn(
        'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
        options
      );
    }
    return res
  }

  /*  */



  /**
   * 校验传递的props数据是否满足prop的定义规范
   * @param {*} key 
   * @param {*} propOptions props规范类型
   * @param {*} propsData   props的数据
   * @param {*} vm 
   * @returns 
   */
  function validateProp (
    key,
    propOptions,
    propsData,
    vm
  ) {
    var prop = propOptions[key];
    var absent = !hasOwn(propsData, key); // 父组件是否传递了该值
    var value = propsData[key];

    // boolean casting
    // Boolean类型数据处理
    var booleanIndex = getTypeIndex(Boolean, prop.type);
    if (booleanIndex > -1) { // 期望类型包含Boolean类型
      if (absent && !hasOwn(prop, 'default')) {
        // 父组件中没传值 且 props中没设置默认值，value即propsData[key]为false
        value = false;
      } else if (value === '' || value === hyphenate(key)) {
        /**
         * 父组件中传值：
         *  1. 只写了key 或 value写了空字符串 满足 value === ''
         *  2. 写的key与value相同 满足 value === hyphenate(key)
         * 
         * 子组件HelloWorld定义：
         *  HelloWorld.props = {
         *    name: String
         *    is-show: [ Boolean, String ]
         *  }
         * 父组件中引用：
         *  1.父组件只写了key
         *    <HelloWorld name="ccbean" is-show></HelloWorld>
         *  2.父组件写的key和value相同
         *    <HelloWorld name="ccbean" is-show="is-show"></HelloWorld>
         */
        // only cast empty string / same name to boolean if
        // boolean has higher priority
        var stringIndex = getTypeIndex(String, prop.type);
        if (stringIndex < 0 || booleanIndex < stringIndex) {
          // prop.type非String类型 或 Boolean类型权重更高 （如is-show中Boolean在String前）
          value = true;
        }
      }
    }

    // 默认数据处理
    // check default value
    if (value === undefined) { // 父组件中没有传值
      // 获取prop设置的默认值
      value = getPropDefaultValue(vm, prop, key);

      // since the default value is a fresh copy,
      // make sure to observe it.
      // 获取props设置的默认值时，将它设置程响应式的
      // 因为这个值是一个拷贝，所以要将它变成变成响应式的
      var prevShouldObserve = shouldObserve;
      toggleObserving(true);
      observe(value);
      toggleObserving(prevShouldObserve);
    }

    {
      // 开发环境 且 非weex的@binding下，断言prop
      assertProp(prop, key, value, vm, absent);
    }

    return value
  }

  /**
   * Get the default value of a prop.
   * 获取prop设置的default值
   */
  function getPropDefaultValue (vm, prop, key) {
    // no default, return undefined
    if (!hasOwn(prop, 'default')) {
      // 没default返回undefined
      return undefined
    }

    var def = prop.default;
    // warn against non-factory defaults for Object & Array
    if (isObject(def)) {
      // 警告 default值如果是对象或数组，必须使用工厂函数
      warn(
        'Invalid default value for prop "' + key + '": ' +
        'Props with type Object/Array must use a factory function ' +
        'to return the default value.',
        vm
      );
    }

    // the raw prop value was also undefined from previous render,
    // return previous default value to avoid unnecessary watcher trigger
    // 如果上一次组件渲染父组件传递的 prop 的值是 undefined，则直接返回
    // 上一次的默认值vm._props[key]，这样可以避免触发不必要的 watcher 的更新
    if (vm && vm.$options.propsData &&
      vm.$options.propsData[key] === undefined &&
      vm._props[key] !== undefined
    ) {
      return vm._props[key]
    }

    // call factory function for non-Function types
    // a value is Function if its prototype is function even across different execution context
    // def如果是工厂函数且prop的类型不是Function的时候，返回工厂函数的返回值，否则直接返回def
    return typeof def === 'function' && getType(prop.type) !== 'Function'
      ? def.call(vm)
      : def
  }

  /**
   * Assert whether a prop is valid.
   * 断言props是否是有效的
   */
  function assertProp (
    prop,
    name,
    value,
    vm,
    absent
  ) {
    if (prop.required && absent) {
      // 必须值警告
      warn(
        'Missing required prop: "' + name + '"',
        vm
      );
      return
    }

    if (value == null && !prop.required) {
      // prop非必须且是null 不处理
      return
    }

    var type = prop.type;
    var valid = !type || type === true; // type不为真或type为true，将valid置为true
    var expectedTypes = [];
    if (type) {
      if (!Array.isArray(type)) {
        // type非数组则转数组
        type = [type];
      }
      for (var i = 0; i < type.length && !valid; i++) {
        // 断言value类型，获取断言结果
        var assertedType = assertType(value, type[i], vm);
        expectedTypes.push(assertedType.expectedType || '');
        valid = assertedType.valid;
      }
    }

    var haveExpectedTypes = expectedTypes.some(function (t) { return t; });
    if (!valid && haveExpectedTypes) {
      // value无效 且 有期望类型 
      // 警告value类型无效
      warn(
        getInvalidTypeMessage(name, value, expectedTypes),
        vm
      );
      return
    }

    // 自定义validator 
    var validator = prop.validator;
    if (validator) {
      if (!validator(value)) {
        warn(
          'Invalid prop: custom validator check failed for prop "' + name + '".',
          vm
        );
      }
    }
  }

  var simpleCheckRE = /^(String|Number|Boolean|Function|Symbol|BigInt)$/;
  /**
   * 断言value类型是否合法
   * @param {*} value 断言值
   * @param {*} type  期望类型
   * @param {*} vm 
   * @returns 断言结果
   */
  function assertType (value, type, vm) {
    var valid;
    var expectedType = getType(type);
    if (simpleCheckRE.test(expectedType)) {
      var t = typeof value;
      valid = t === expectedType.toLowerCase();
      // for primitive wrapper objects
      if (!valid && t === 'object') {
        valid = value instanceof type;
      }
    } else if (expectedType === 'Object') {
      valid = isPlainObject(value);
    } else if (expectedType === 'Array') {
      valid = Array.isArray(value);
    } else {
      try {
        valid = value instanceof type;
      } catch (e) {
        warn('Invalid prop type: "' + String(type) + '" is not a constructor', vm);
        valid = false;
      }
    }
    return {
      valid: valid,
      expectedType: expectedType
    }
  }

  var functionTypeCheckRE = /^\s*function (\w+)/;

  /**
   * Use function string name to check built-in types,
   * because a simple equality check will fail when running
   * across different vms / iframes.
   */
  function getType (fn) {
    var match = fn && fn.toString().match(functionTypeCheckRE);
    return match ? match[1] : ''
  }

  function isSameType (a, b) {
    return getType(a) === getType(b)
  }

  /**
   * 验证类型是否是期望类型，并返回匹配位置索引
   * @param {*} type          验证的原始类型 
   * @param {*} expectedTypes 期望的原始类型 原始类型或原始类型数组  
   * @returns 
   */
  function getTypeIndex (type, expectedTypes) {
    if (!Array.isArray(expectedTypes)) {
      return isSameType(expectedTypes, type) ? 0 : -1
    }
    for (var i = 0, len = expectedTypes.length; i < len; i++) {
      if (isSameType(expectedTypes[i], type)) {
        return i
      }
    }
    return -1
  }

  function getInvalidTypeMessage (name, value, expectedTypes) {
    var message = "Invalid prop: type check failed for prop \"" + name + "\"." +
      " Expected " + (expectedTypes.map(capitalize).join(', '));
    var expectedType = expectedTypes[0];
    var receivedType = toRawType(value);
    // check if we need to specify expected value
    if (
      expectedTypes.length === 1 &&
      isExplicable(expectedType) &&
      isExplicable(typeof value) &&
      !isBoolean(expectedType, receivedType)
    ) {
      message += " with value " + (styleValue(value, expectedType));
    }
    message += ", got " + receivedType + " ";
    // check if we need to specify received value
    if (isExplicable(receivedType)) {
      message += "with value " + (styleValue(value, receivedType)) + ".";
    }
    return message
  }

  function styleValue (value, type) {
    if (type === 'String') {
      return ("\"" + value + "\"")
    } else if (type === 'Number') {
      return ("" + (Number(value)))
    } else {
      return ("" + value)
    }
  }

  var EXPLICABLE_TYPES = ['string', 'number', 'boolean'];
  function isExplicable (value) {
    return EXPLICABLE_TYPES.some(function (elem) { return value.toLowerCase() === elem; })
  }

  function isBoolean () {
    var args = [], len = arguments.length;
    while ( len-- ) args[ len ] = arguments[ len ];

    return args.some(function (elem) { return elem.toLowerCase() === 'boolean'; })
  }

  /*  */

  /**
   * 错误处理
   * 命中组件中errorCaptured函数 命中globalHandleError函数
   * @param {*} err 
   * @param {*} vm 
   * @param {*} info 
   * @returns 
   */
  function handleError (err, vm, info) {
    // Deactivate deps tracking while processing error handler to avoid possible infinite rendering.
    // See: https://github.com/vuejs/vuex/issues/1505
    pushTarget();
    try {
      if (vm) {
        var cur = vm;
        while ((cur = cur.$parent)) {
          var hooks = cur.$options.errorCaptured;
          if (hooks) {
            for (var i = 0; i < hooks.length; i++) {
              try {
                // 遍历执行errorCaptured生命周期函数
                var capture = hooks[i].call(cur, err, vm, info) === false;
                if (capture) { return }
              } catch (e) {
                // 触发全局定义错误处理
                globalHandleError(e, cur, 'errorCaptured hook');
              }
            }
          }
        }
      }
      // 触发全局定义错误处理
      globalHandleError(err, vm, info);
    } finally {
      popTarget();
    }
  }

  /**
   * 执行hanlder
   *  并添加错误处理逻辑 
   *    有错误时，触发errorCaptured生命周期函数
   *      触发config.globalHandleError错误处理函数
   * @param {*} handler 
   * @param {*} context 
   * @param {*} args 
   * @param {*} vm 
   * @param {*} info 
   * @returns 
   */
  function invokeWithErrorHandling (
    handler,
    context,
    args,
    vm,
    info
  ) {
    var res;
    try {
      res = args ? handler.apply(context, args) : handler.call(context);
      if (res && !res._isVue && isPromise(res) && !res._handled) {
        res.catch(function (e) { return handleError(e, vm, info + " (Promise/async)"); });
        // issue #9511
        // avoid catch triggering multiple times when nested calls
        res._handled = true;
      }
    } catch (e) {
      handleError(e, vm, info);
    }
    return res
  }

  /**
   * config.errorHandler
   * 命中全局定义错误处理
   * @param {*} err 
   * @param {*} vm 
   * @param {*} info 
   * @returns 
   */
  function globalHandleError (err, vm, info) {
    if (config.errorHandler) {
      try {
        return config.errorHandler.call(null, err, vm, info)
      } catch (e) {
        // if the user intentionally throws the original error in the handler,
        // do not log it twice
        if (e !== err) {
          logError(e, null, 'config.errorHandler');
        }
      }
    }
    logError(err, vm, info);
  }

  function logError (err, vm, info) {
    {
      warn(("Error in " + info + ": \"" + (err.toString()) + "\""), vm);
    }
    /* istanbul ignore else */
    if ((inBrowser || inWeex) && typeof console !== 'undefined') {
      console.error(err);
    } else {
      throw err
    }
  }

  /*  */

  /**
   * nextTick利用JS的事件循环来完成
   * 
   * ECMAScript规范中规定task分为两大类，分别是macro task和micro task，
   * 并且每个macro task结束后，都要清空所有的micro task
   * 
   * 在浏览器环境中：
   *    常见的macro task有 setTimeout、MessageChannel、postMessage、setImmediate
   *    常见的micro task有 MutationObsever、Promise.then
   */

  // 是否使用微任务标识
  var isUsingMicroTask = false; // 在事件中使用 src/platforms/web/runtime/modules/events.js

  var callbacks = [];
  var pending = false;

  /**
   * 执行一个微任务中的所有异步回调
   */
  function flushCallbacks () {
    pending = false;
    var copies = callbacks.slice(0);
    // 清空当前的callbacks队列
    callbacks.length = 0;
    for (var i = 0; i < copies.length; i++) {
      copies[i]();
    }
  }

  // Here we have async deferring wrappers using microtasks.
  // In 2.5 we used (macro) tasks (in combination with microtasks).
  // However, it has subtle problems when state is changed right before repaint
  // (e.g. #6813, out-in transitions).
  // Also, using (macro) tasks in event handler would cause some weird behaviors
  // that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
  // So we now use microtasks everywhere, again.
  // A major drawback of this tradeoff is that there are some scenarios
  // where microtasks have too high a priority and fire in between supposedly
  // sequential events (e.g. #4521, #6690, which have workarounds)
  // or even between bubbling of the same event (#6566).
  /**
   * 2.5中使用宏任务结合微任务，但导致了一些不易察觉的问题，
   * 如重绘、事件中无法避免的奇怪问题
   * 因此2.6中全都使用微任务。这个折衷的主要缺点是，某些场景下微任务权重太高，
   * 会在两个顺序事件之间触发，或甚至在一个事件的冒泡中触发
   */
  var timerFunc;

  // The nextTick behavior leverages the microtask queue, which can be accessed
  // via either native Promise.then or MutationObserver.
  // MutationObserver has wider support, however it is seriously bugged in
  // UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
  // completely stops working after triggering a few times... so, if native
  // Promise is available, we will use it:
  /* istanbul ignore next, $flow-disable-line */
  if (typeof Promise !== 'undefined' && isNative(Promise)) {
    // 优先使用Promise作为微任务
    var p = Promise.resolve();
    timerFunc = function () {
      p.then(flushCallbacks);
      // In problematic UIWebViews, Promise.then doesn't completely break, but
      // it can get stuck in a weird state where callbacks are pushed into the
      // microtask queue but the queue isn't being flushed, until the browser
      // needs to do some other work, e.g. handle a timer. Therefore we can
      // "force" the microtask queue to be flushed by adding an empty timer.
      // 通过setTimeout(noop)强制flush微任务队列，避免IOS的一些bug问题
      // 原理：ECMAScript规范中规定task分为两大类，分别是macro task和micro task，
      // 并且每个macro task结束后，都要清空所有的micro task
      if (isIOS) { setTimeout(noop); }
    };
    isUsingMicroTask = true;
  } else if (!isIE && typeof MutationObserver !== 'undefined' && (
    isNative(MutationObserver) ||
    // PhantomJS and iOS 7.x
    MutationObserver.toString() === '[object MutationObserverConstructor]'
  )) {
    // Use MutationObserver where native Promise is not available,
    // e.g. PhantomJS, iOS7, Android 4.4
    // (#6466 MutationObserver is unreliable in IE11)
    /**
     * Promise不可用 且 MutationObserver可用 且 非IE11 (IE11的MutationObserver不可靠)
     * 使用MutationObserver作为微任务
     */
    var counter = 1;
    var observer = new MutationObserver(flushCallbacks);
    var textNode = document.createTextNode(String(counter));
    // observe textNode上的characterData，即字符数据变化
    observer.observe(textNode, {
      characterData: true
    });
    /**
     * timerFunc执行，textNode节点的字符数据变化，
     * 会触发MutationObserver的回调flushCallbacks异步执行
     */
    timerFunc = function () {
      counter = (counter + 1) % 2;
      textNode.data = String(counter);
    };
    isUsingMicroTask = true;
  } else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
    // Fallback to setImmediate.
    // Technically it leverages the (macro) task queue,
    // but it is still a better choice than setTimeout.
    // setImmediate利用的是红任务队列，在check阶段执行
    // 比使用setTimeout好的原因是，会在同一事件循环tick中执行
    // setTimeout要等到下一次tick才能执行
    timerFunc = function () {
      setImmediate(flushCallbacks);
    };
  } else {
    // Fallback to setTimeout.
    // 其他都不可用，使用setTimeout做微任务
    timerFunc = function () {
      setTimeout(flushCallbacks, 0);
    };
  }

  /**
   * 利用事件循环，使用微任务实现异步执行
   * nextTick有两种使用方法：
   *  1. 回调函数形式
   *  2. Promise形式
   * @param {*} cb 
   * @param {*} ctx 
   * @returns 
   */
  function nextTick (cb, ctx) {
    var _resolve;
    // 将要执行的回调函数放入回调队列
    callbacks.push(function () {
      if (cb) {
        // 异步回调形式的执行
        try {
          cb.call(ctx);
        } catch (e) {
          handleError(e, ctx, 'nextTick');
        }
      } else if (_resolve) {
        // Promise形式的执行
        _resolve(ctx);
      }
    });

    if (!pending) {
      // 一次事件循环中即一个Tick中，可能会有多个微任务timerFunc()执行，
      // 但同一时间进来的要执行的cb要放入同一个callbacks队列，
      // 保证同一时间进来的cb放入同一个微任务中去执行，提升性能
      pending = true;
      // 异步执行
      timerFunc();
    }

    // $flow-disable-line
    if (!cb && typeof Promise !== 'undefined') {
      // nextTick().then() 形式调用 返回一个Promise
      return new Promise(function (resolve) {
        _resolve = resolve;
      })
    }
  }

  /*  */

  var mark;
  var measure;

  {
    var perf = inBrowser && window.performance;
    /* istanbul ignore if */
    if (
      perf &&
      perf.mark &&
      perf.measure &&
      perf.clearMarks &&
      perf.clearMeasures
    ) {
      mark = function (tag) { return perf.mark(tag); };
      measure = function (name, startTag, endTag) {
        perf.measure(name, startTag, endTag);
        perf.clearMarks(startTag);
        perf.clearMarks(endTag);
        // perf.clearMeasures(name)
      };
    }
  }

  /* not type checking this file because flow doesn't play well with Proxy */

  var initProxy;

  {
    var allowedGlobals = makeMap(
      'Infinity,undefined,NaN,isFinite,isNaN,' +
      'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
      'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,BigInt,' +
      'require' // for Webpack/Browserify
    );

    // 变量不存在错误警告
    // 开发时经常看到的一个错误，未定义某个值而在template中使用时就会出现此报错
    var warnNonPresent = function (target, key) {
      warn(
        "Property or method \"" + key + "\" is not defined on the instance but " +
        'referenced during render. Make sure that this property is reactive, ' +
        'either in the data option, or for class-based components, by ' +
        'initializing the property. ' +
        'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.',
        target
      );
    };

    // 预留前缀$ _ 错误警告
    // $符和下划线开头的自定义变量不被允许 是为了避免和Vue内部冲突
    var warnReservedPrefix = function (target, key) {
      warn(
        "Property \"" + key + "\" must be accessed with \"$data." + key + "\" because " +
        'properties starting with "$" or "_" are not proxied in the Vue instance to ' +
        'prevent conflicts with Vue internals. ' +
        'See: https://vuejs.org/v2/api/#data',
        target
      );
    };

    var hasProxy =
      typeof Proxy !== 'undefined' && isNative(Proxy);

    if (hasProxy) {
      // 自定义键位名keyCodes代理
      var isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta,exact');
      config.keyCodes = new Proxy(config.keyCodes, {
        set: function set (target, key, value) {
          if (isBuiltInModifier(key)) {
            // 内置键位名不可重写
            warn(("Avoid overwriting built-in modifier in config.keyCodes: ." + key));
            return false
          } else {
            target[key] = value;
            return true
          }
        }
      });
    }

    var hasHandler = {
      has: function has (target, key) {
        var has = key in target;

        // isAllowed为true情况：
        //    1.是规定的全局关键字
        //    2.是字符串且下划线开头，并且非用户自定义在$data上的key
        var isAllowed = allowedGlobals(key) ||
          (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data));
        
        // 如果key既不在vm上
        // 并且不被允许，那么会出发警告
        if (!has && !isAllowed) {
          if (key in target.$data)
            // 用户定义的下划线开头变量 提示错误
            { warnReservedPrefix(target, key); }
          else
            // 未定义但使用 提示错误 
            { warnNonPresent(target, key); }
        }
        return has || !isAllowed
      }
    };

    var getHandler = {
      get: function get (target, key) {
        if (typeof key === 'string' && !(key in target)) {
          if (key in target.$data)
            // 自定义变量不允许 _ $ 开头
            { warnReservedPrefix(target, key); }
          else
            // 未定义但使用 提示错误
            { warnNonPresent(target, key); }
        }
        return target[key]
      }
    };

    initProxy = function initProxy (vm) {
      if (hasProxy) {
        // determine which proxy handler to use
        var options = vm.$options;
        // _withStripped 
        var handlers = options.render && options.render._withStripped
          ? getHandler
          : hasHandler;
        // 渲染代理
        vm._renderProxy = new Proxy(vm, handlers);
      } else {
        vm._renderProxy = vm;
      }
    };
  }

  /*  */

  var seenObjects = new _Set();

  /**
   * Recursively traverse an object to evoke all converted
   * getters, so that every nested property inside the object
   * is collected as a "deep" dependency.
   * 对一个响应式对象进行深层遍历访问，访问过程会触发对象中每个属性的getter，进而每个
   * 属性的Dep会进行依赖收集，每个属性的Dep中都会添加此对象的userWatcher到subs中，即
   * userWatcher实现了对此对象的每个属性都进行订阅
   * 
   * traverse后，再修改此对象内部任何一个值，都会触发相应属性值的Dep派发更新，触发Dep.subs中的
   * 所有Watcher，那么就也会调用到userWatcher的回调函数了
   * 
   * 这个函数实现还有一个小的优化，遍历过程中会把子响应式对象通过它们的dep.id记录到
   * seenObjects，避免以后重复访问
   */
  function traverse (val) {
    _traverse(val, seenObjects);
    seenObjects.clear();
  }

  function _traverse (val, seen) {
    var i, keys;
    var isA = Array.isArray(val);
    if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
      /**
       * Reject
       *  1. val不是数组或对象
       *  2. 或 val是被冻结的
       *  3. 或 val是VNode实例
       */
      return
    }

    if (val.__ob__) {
      // val已是响应式对象
      var depId = val.__ob__.dep.id;
      if (seen.has(depId)) {
        // 已经traverse过，结束，避免重复traverse访问，重复依赖收集
        return
      }
      // 记录dep.ip
      seen.add(depId);
    }

    // 递归遍历 保证对val中每个值都访问到，触发每个值的依赖数据Dep进行依赖收集
    if (isA) {
      // val是数组
      i = val.length;
      while (i--) { _traverse(val[i], seen); } // 递归traverse
    } else {
      // val是对象
      keys = Object.keys(val);
      i = keys.length;
      while (i--) { _traverse(val[keys[i]], seen); } // 递归traverse
    }
  }

  /*  */

  /**
   * 解析事件名，并缓存结果
   * 确定是否有passive、once、capture事件修饰符，返回解析结果
   */
  var normalizeEvent = cached(function (name) {
    // 解析passive修饰符
    var passive = name.charAt(0) === '&';
    name = passive ? name.slice(1) : name;
    // 解析once修饰符
    var once$$1 = name.charAt(0) === '~'; // Prefixed last, checked first
    name = once$$1 ? name.slice(1) : name;
    // 解析capture修饰符
    var capture = name.charAt(0) === '!';
    name = capture ? name.slice(1) : name;
    return {
      name: name,
      once: once$$1,
      capture: capture,
      passive: passive
    }
  });

  /**
   * 创建一个函数的执行函数
   *  - 创建事件定义的执行函数
   *  - 创建指令hook的执行函数
   * @param {*} fns 要添加的事件函数定义
   * @param {*} vm 
   * @returns 
   */
  function createFnInvoker (fns, vm) {
    /**
     * 调用时，执行事件定义函数
     * @returns 
     */
    function invoker () {
      var arguments$1 = arguments;

      var fns = invoker.fns; // fns中获取事件回调函数
      if (Array.isArray(fns)) {
        // 一个事件有多个回调定义
        var cloned = fns.slice();
        for (var i = 0; i < cloned.length; i++) {
          // 依次调用多个回调
          invokeWithErrorHandling(cloned[i], null, arguments$1, vm, "v-on handler");
        }
      } else {
        // return handler return value for single handlers
        return invokeWithErrorHandling(fns, null, arguments, vm, "v-on handler")
      }
    }
    // 添加事件定义实际的执行函数 更新执行事件时，只需要更新此属性即可
    invoker.fns = fns;
    return invoker
    // invoker.fns = fns，每一次执行invoker函数都是从invoker.fns里取执行的回调函数，
    // 回到updateListeners，当我们第二次执行该函数的时候，判断如果cur !== old，那么
    // 只需要更改old.fns = cur把之前绑定的involer.fns赋值为新的回调函数即可，并且通过
    // on[name] = old保留引用关系，这样就保证了事件回调只添加一次，之后仅仅去修改它的
    // 回调函数的引用
  }

  /**
   * DOM事件和自定义事件处理
   * 遍历on去添加事件监听，遍历oldOn去移除事件监听
   * 
   * 关于监听和移除事件的方法都是外部传入的：
   *  - 因为它既处理原生DOM事件的添加删除
   *  - 也处理自定义事件的添加删除
   * @param {*} on 新事件对象
   * @param {*} oldOn 旧事件对象
   * @param {*} add 添加DOM事件方法
   * @param {*} remove 移除DOM事件方法
   * @param {*} createOnceHandler 只执行一次的事件定义的创建方法
   * @param {*} vm 
   */
  function updateListeners (
    on,
    oldOn,
    add,
    remove$$1,
    createOnceHandler,
    vm
  ) {
    /**
     * name 正在处理的事件的事件名
     * def 当前新事件的定义函数
     * cur 当前新事件的定义函数
     * old 当前原事件的定义函数
     * event 解析当前新事件的事件名的结果
     */
    var name, def$$1, cur, old, event;
    for (name in on) {
      def$$1 = cur = on[name];
      old = oldOn[name];
      // 解析事件修饰符结果
      event = normalizeEvent(name);

      if (isUndef(cur)) {
        // 当前新添加事件没有定义 警告
        warn(
          "Invalid handler for event \"" + (event.name) + "\": got " + String(cur),
          vm
        );
      } else if (isUndef(old)) {
        // 原事件未定义 即 新添加一个事件
        if (isUndef(cur.fns)) {
          // 替换掉新事件定义函数为新事件执行函数
          cur = on[name] = createFnInvoker(cur, vm);
        }

        if (isTrue(event.once)) {
          // 有once修饰符 替换掉新事件定义对象为新事件once执行函数
          cur = on[name] = createOnceHandler(event.name, cur, event.capture);
        }
        // 添加新事件监听
        add(event.name, cur, event.capture, event.passive, event.params);
      } else if (cur !== old) {
        // 新事件和原事件不相等 即 更新事件 
        old.fns = cur; // 只需更新事件执行函数 巧妙
        on[name] = old; // 更新到新的事件对象属性上
      }
    }
    // 删除不再用到的旧事件
    for (name in oldOn) {
      if (isUndef(on[name])) {
        event = normalizeEvent(name);
        // 移除DOM事件监听
        remove$$1(event.name, oldOn[name], event.capture);
      }
    }
  }

  /*  */

  /**
   * VNode节点上存储钩子函数
   * vnode.data.hook[hookKey] = [hook1, hook2]
   *  - 存储指令定义的钩子函数
   * @param {*} def VNode
   * @param {*} hookKey 
   * @param {*} hook handler
   */
  function mergeVNodeHook (def, hookKey, hook) {
    if (def instanceof VNode) {
      // VNode.data没有定义hook，初始化 此时def是data中的指令的hook对象
      def = def.data.hook || (def.data.hook = {});
    }
    var invoker;
    var oldHook = def[hookKey];

    /**
     * 对指令的hook包裹，确保只执行一次
     */
    function wrappedHook () {
      hook.apply(this, arguments);
      // important: remove merged hook to ensure it's called only once
      // and prevent memory leak
      remove(invoker.fns, wrappedHook);
    }

    if (isUndef(oldHook)) {
      // 指令hook不存在，创建它的执行钩子函数
      // no existing hook
      invoker = createFnInvoker([wrappedHook]);
    } else {
      // 更新已存在的hook
      /* istanbul ignore if */
      if (isDef(oldHook.fns) && isTrue(oldHook.merged)) {
        // 已经执行过mergeVNodeHook合并的hook hook是数组
        // already a merged invoker
        invoker = oldHook;
        invoker.fns.push(wrappedHook); // push新的hook即可
      } else {
        // existing plain hook
        // 第一次执行，并且def.data.hook在第一次执行时候旧已经有定义，那么将已有的和
        // 新的wrappedHook合并起来
        invoker = createFnInvoker([oldHook, wrappedHook]);
      }
    }
    // 添加merged标识
    invoker.merged = true;
    def[hookKey] = invoker;
  }

  /*  */

  function extractPropsFromVNodeData (
    data,
    Ctor,
    tag
  ) {
    // we are only extracting raw values here.
    // validation and default values are handled in the child
    // component itself.
    var propOptions = Ctor.options.props;
    if (isUndef(propOptions)) {
      return
    }
    var res = {};
    var attrs = data.attrs;
    var props = data.props;
    if (isDef(attrs) || isDef(props)) {
      for (var key in propOptions) {
        var altKey = hyphenate(key);
        {
          var keyInLowerCase = key.toLowerCase();
          if (
            key !== keyInLowerCase &&
            attrs && hasOwn(attrs, keyInLowerCase)
          ) {
            tip(
              "Prop \"" + keyInLowerCase + "\" is passed to component " +
              (formatComponentName(tag || Ctor)) + ", but the declared prop name is" +
              " \"" + key + "\". " +
              "Note that HTML attributes are case-insensitive and camelCased " +
              "props need to use their kebab-case equivalents when using in-DOM " +
              "templates. You should probably use \"" + altKey + "\" instead of \"" + key + "\"."
            );
          }
        }
        checkProp(res, props, key, altKey, true) ||
        checkProp(res, attrs, key, altKey, false);
      }
    }
    return res
  }

  function checkProp (
    res,
    hash,
    key,
    altKey,
    preserve
  ) {
    if (isDef(hash)) {
      if (hasOwn(hash, key)) {
        res[key] = hash[key];
        if (!preserve) {
          delete hash[key];
        }
        return true
      } else if (hasOwn(hash, altKey)) {
        res[key] = hash[altKey];
        if (!preserve) {
          delete hash[altKey];
        }
        return true
      }
    }
    return false
  }

  /*  */

  // 标准化VNode节点成一维数组 保证数据结构为 Array<VNode>

  // The template compiler attempts to minimize the need for normalization by
  // statically analyzing the template at compile time.
  //
  // For plain HTML markup, normalization can be completely skipped because the
  // generated render function is guaranteed to return Array<VNode>. There are
  // two cases where extra normalization is needed:

  // 1. When the children contains components - because a functional component
  // may return an Array instead of a single root. In this case, just a simple
  // normalization is needed - if any child is an Array, we flatten the whole
  // thing with Array.prototype.concat. It is guaranteed to be only 1-level deep
  // because functional components already normalize their own children.
  // simpleNormalizeChildren方法调用场景是：
  //    render函数是编译生成的。理论上编译生成的 children 都已经是 VNode 类型的
  //    但这里有一个例外，就是functional component函数式组件返回的
  //    是一个数组而不是一个根节点，所以会通过Array.prototype.concat方法
  //    把整个 children 数组打平，让它的深度只有一层

  // 简单标准化Children children中可能存在二维数组，全部打平为一维数组
  function simpleNormalizeChildren (children) {
    for (var i = 0; i < children.length; i++) {
      if (Array.isArray(children[i])) {
        return Array.prototype.concat.apply([], children)
      }
    }
    return children
  }

  // 2. When the children contains constructs that always generated nested Arrays,
  // e.g. <template>, <slot>, v-for, or when the children is provided by user
  // with hand-written render functions / JSX. In such cases a full normalization
  // is needed to cater to all possible types of children values.
  // normalizeChildren方法的调用场景有 2 种：
  //    一个场景是 render 函数是用户手写的，当 children 只有一个节点的时候，
  //    Vue.js 从接口层面允许用户把children写成基础类型用来创建单个简单的文本节点，
  //    这种情况会调用 createTextVNode 创建一个文本节点的 VNode；
  //    另一个场景是当编译 slot、v-for 的时候会产生嵌套数组的情况，
  //    会调用 normalizeArrayChildren 方法
  // 标准化Children 包含一些特殊的vue标签语法等 或手写render函数JSX语法
  function normalizeChildren (children) {
    return isPrimitive(children)
      // 原始JS类型，创建文本VNode节点
      ? [createTextVNode(children)]
      // 数组
      : Array.isArray(children)
        // 标准化数组Children
        ? normalizeArrayChildren(children)
        // 非原始JS类型且非数组
        : undefined
  }

  function isTextNode (node) {
    return isDef(node) && isDef(node.text) && isFalse(node.isComment)
  }

  // 标准化数组Children 打平Children成一维数组
  function normalizeArrayChildren (children, nestedIndex) {
    var res = [];
    var i, c, lastIndex, last;
    for (i = 0; i < children.length; i++) {
      c = children[i];
      // 跳过undefined boolean的元素
      if (isUndef(c) || typeof c === 'boolean') { continue }

      lastIndex = res.length - 1;
      last = res[lastIndex];
      //  nested
      if (Array.isArray(c)) { // 节点还是数组 v-for中很常见
        if (c.length > 0) {
          // 递归调用
          c = normalizeArrayChildren(c, ((nestedIndex || '') + "_" + i));
          // merge adjacent text nodes
          // 合并相邻文本节点
          if (isTextNode(c[0]) && isTextNode(last)) {
            res[lastIndex] = createTextVNode(last.text + (c[0]).text);
            c.shift();
          }
          res.push.apply(res, c);
        }
      } else if (isPrimitive(c)) { // 节点是原生类型
        if (isTextNode(last)) {
          // 合并文本节点
          // merge adjacent text nodes
          // this is necessary for SSR hydration because text nodes are
          // essentially merged when rendered to HTML strings
          res[lastIndex] = createTextVNode(last.text + c);
        } else if (c !== '') {
          // convert primitive to vnode
          // 创建文本VNode节点
          res.push(createTextVNode(c));
        }
      } else { // 节点已经是VNode类型
        if (isTextNode(c) && isTextNode(last)) {
          // merge adjacent text nodes
          // 合并文本节点
          res[lastIndex] = createTextVNode(last.text + c.text);
        } else {
          // default key for nested array children (likely generated by v-for)
          // 遍历的children节点如果没有设置:key 但定义了 nestedIndex 就生成key
          if (isTrue(children._isVList) &&
            isDef(c.tag) &&
            isUndef(c.key) &&
            isDef(nestedIndex)) {
            c.key = "__vlist" + nestedIndex + "_" + i + "__";
          }
          res.push(c);
        }
      }
    }
    return res
  }

  /*  */

  function initProvide (vm) {
    var provide = vm.$options.provide;
    if (provide) {
      vm._provided = typeof provide === 'function'
        ? provide.call(vm)
        : provide;
    }
  }

  function initInjections (vm) {
    var result = resolveInject(vm.$options.inject, vm);
    if (result) {
      toggleObserving(false);
      Object.keys(result).forEach(function (key) {
        /* istanbul ignore else */
        {
          defineReactive$$1(vm, key, result[key], function () {
            warn(
              "Avoid mutating an injected value directly since the changes will be " +
              "overwritten whenever the provided component re-renders. " +
              "injection being mutated: \"" + key + "\"",
              vm
            );
          });
        }
      });
      toggleObserving(true);
    }
  }

  function resolveInject (inject, vm) {
    if (inject) {
      // inject is :any because flow is not smart enough to figure out cached
      var result = Object.create(null);
      var keys = hasSymbol
        ? Reflect.ownKeys(inject)
        : Object.keys(inject);

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        // #6574 in case the inject object is observed...
        if (key === '__ob__') { continue }
        var provideKey = inject[key].from;
        var source = vm;
        while (source) {
          if (source._provided && hasOwn(source._provided, provideKey)) {
            result[key] = source._provided[provideKey];
            break
          }
          source = source.$parent;
        }
        if (!source) {
          if ('default' in inject[key]) {
            var provideDefault = inject[key].default;
            result[key] = typeof provideDefault === 'function'
              ? provideDefault.call(vm)
              : provideDefault;
          } else {
            warn(("Injection \"" + key + "\" not found"), vm);
          }
        }
      }
      return result
    }
  }

  /*  */



  /**
   * Runtime helper for resolving raw children VNodes into a slot object.
   */
  /**
   * 生成$slot的值
   * 
   * 
   * 执行时机
   *  1. 首次渲染initRender 
   *  2. 默认插槽和旧语法的具名插槽，在父组件内容变化更新子组插槽时updateChildComponent
   * 
   * 父组件未使用插槽语法，父组件的children都会被认为是默认插槽元素，添加到$slots.default数组中
   * 
   * 将组件VNode的children当作插槽VNode节点，生成$slot对象
   * {
   *  defalut: [vnode, vnode],
   *  [name]: [vnode, vnode]
   * }
   * 数组中每个元素就是父元素节点渲染的子VNode
   * 
   * 首次渲染：
   *  1. 旧语法slot="xxx"中：此函数会保存具名插槽和默认插槽
   *  2. 新语法v-slot语法中：此函数只会存储没有写插槽名的默认插槽，即未写v-slot:default的默认插槽
   *     如 未写任何参数的默认插槽 '<p>{{msg}}</p>' 会保存再这里
   *     这种写法 '<template v-slot:default><p>{{msg}}</p></template>' 则也不会保存在$slot中
   *     具名插槽、默认插槽都会保存在$scopedSlots中
   *     其它的具名插槽会在normalizeScopedSlots()处理插槽节点时，给$slots代理
   * @param {*} children 父VNode的children
   * @param {*} context 父VNode的上下文父 即父组件的vm实例
   * @returns 
   */
  function resolveSlots (
    children,
    context
  ) {
    if (!children || !children.length) {
      return {}
    }
    var slots = {};
    for (var i = 0, l = children.length; i < l; i++) {
      var child = children[i];
      var data = child.data;
      // remove slot attribute if the node is resolved as a Vue slot node
      if (data && data.attrs && data.attrs.slot) {
        // 插槽名称slot存在，移除掉此属性 旧插槽语法slot="xxx"中存在此属性
        delete data.attrs.slot;
      }

      // named slots should only be respected if the vnode was rendered in the
      // same context.
      if ((child.context === context || child.fnContext === context) &&
        data && data.slot != null
      ) {
        // 旧语法 具名插槽 
        var name = data.slot;
        var slot = (slots[name] || (slots[name] = []));
        if (child.tag === 'template') {
          // template上插槽，存储节点的children
          slot.push.apply(slot, child.children || []);
        } else {
          // 非template上插槽 存储节点
          slot.push(child);
        }
      } else {
        // 旧语法 默认插槽 和 新语法不写v-slot的默认插槽 节点存入slots.default数组中 
        (slots.default || (slots.default = [])).push(child);
      }
    }

    // ignore slots that contains only whitespace
    for (var name$1 in slots) {
      // 删除掉插槽空白节点
      if (slots[name$1].every(isWhitespace)) {
        delete slots[name$1];
      }
    }
    return slots
  }

  /**
   * 空白节点
   *  - 注释节点 且 非异步组件
   *  - 空文本节点
   * @param {*} node 
   * @returns 
   */
  function isWhitespace (node) {
    return (node.isComment && !node.asyncFactory) || node.text === ' '
  }

  /*  */

  /**
   * 是否是异步组件占位符VNode节点
   * @param {*} node 
   * @returns 
   */
  function isAsyncPlaceholder (node) {
    return node.isComment && node.asyncFactory
  }

  /*  */

  /**
   * 标准化父节点中的插槽VNode
   * 在执行_render()时，会先执行此函数
   * 赋值$scopedSlots，给$slots添加反向代理
   * 将$slots中原本添加上的插槽也在$scopedSlots中添加代理
   * @param {*} slots vnode.data.scopedSlots 插槽AST数据
   * @param {*} normalSlots $slots中的默认插槽
   * @param {*} prevSlots $scopedSlots中的原有插槽
   * @returns 
   */
  function normalizeScopedSlots (
    slots,
    normalSlots,
    prevSlots
  ) {
    var res;
    var hasNormalSlots = Object.keys(normalSlots).length > 0; // $slots中是否有插槽
    var isStable = slots ? !!slots.$stable : !hasNormalSlots; // 是否是不变的插槽AST数据
    var key = slots && slots.$key; // 唯一标识key
    if (!slots) {
      // 没有要添加的插槽AST 初始化成空对象
      res = {};
    } else if (slots._normalized) {
      // fast path 1: child component re-render only, parent did not change
      // 已被normalizeScopedSlots处理过的插槽AST数据，会将生成的VNode结果保存在_normalized中
      // 直接返回已标准化过的插槽结果
      return slots._normalized
    } else if (
      isStable &&
      prevSlots &&
      prevSlots !== emptyObject &&
      key === prevSlots.$key &&
      !hasNormalSlots &&
      !prevSlots.$hasNormal
    ) {
      // fast path 2: stable scoped slots w/ no normal slots to proxy,
      // only need to normalize once
      // 是不变的插槽，并且已标准化生成过插槽，插槽内容没变过($key相等)，并且没有要代理的$slots插槽
      // 上次生成的插槽中也没有要代理的$slots插槽 只需要标准化处理一次 返回上次标准化插槽的结果
      return prevSlots
    } else {
      res = {};
      for (var key$1 in slots) {
        if (slots[key$1] && key$1[0] !== '$') {
          res[key$1] = normalizeScopedSlot(normalSlots, key$1, slots[key$1]);
        }
      }
    }

    // expose normal slots on scopedSlots
    for (var key$2 in normalSlots) {
      if (!(key$2 in res)) {
        // 将$scopedSlots中没有，$slots中有的插槽，代理到$scopedSlots上
        res[key$2] = proxyNormalSlot(normalSlots, key$2);
      }
    }
    // avoriaz seems to mock a non-extensible $scopedSlots object
    // and when that is passed down this would cause an error
    if (slots && Object.isExtensible(slots)) {
      // 保存已标准化处理过的插槽VNode
      (slots)._normalized = res;
    }
    // 扩展$stable $key $hasNormal字段
    def(res, '$stable', isStable);
    def(res, '$key', key);
    def(res, '$hasNormal', hasNormalSlots);

    /**
     * {
     *  [slotName1]: normalized1 () {...},
     *  [slotName2]: normalized2 () {...},
     *  $stable: Boolean, 是否是不变的插槽 即 非动态插槽
     *  $hasNormal: Boolean,  是否有默认插槽
     *  $key: String | Undefined, 插槽唯一key
     * }
     */
    return res
  }

  /**
   * 标准化插槽 返回标准化后的插槽函数
   * @param {*} normalSlots 
   * @param {*} key 
   * @param {*} fn 
   * @returns 
   */
  function normalizeScopedSlot(normalSlots, key, fn) {
    // 标准化插槽函数 真正执行插槽函数fn，生成VNode 
    var normalized = function () {
      // 执行插槽处理函数，生成VNode 使用arguments对象传入执行此插槽函数的插槽prop
      var res = arguments.length ? fn.apply(null, arguments) : fn({}); // 没有参数，默认传空对象
      res = res && typeof res === 'object' && !Array.isArray(res)
        ? [res] // single vnode
        // 标准化数组插槽VNode
        : normalizeChildren(res);
      var vnode = res && res[0];
      // 返回生成的VNode
      return res && (
        !vnode ||
        (res.length === 1 && vnode.isComment && !isAsyncPlaceholder(vnode)) // #9658, #10391
      ) ? undefined
        : res
    };
    // this is a slot using the new v-slot syntax without scope. although it is
    // compiled as a scoped slot, render fn users would expect it to be present
    // on this.$slots because the usage is semantically a normal slot.
    if (fn.proxy) {
      // 将$scopedSlots中的非作用域插槽，同步添加到$slots中
      Object.defineProperty(normalSlots, key, {
        get: normalized,
        enumerable: true,
        configurable: true
      });
    }
    return normalized
  }

  /**
   * 代理$slots中的插槽
   *  默认插槽以及旧语法添加的具名插槽，都会调用此方法添加$slots的代理
   *  当renderSlot执行时，这些插槽就会在父组件中渲染
   *  而新语法添加的非默认插槽，以及旧语法的作用域插槽，都会在子插槽组件执行阶段渲染
   * @param {*} slots $slots
   * @param {*} key 要代理的插槽名
   * @returns 
   */
  function proxyNormalSlot(slots, key) {
    return function () { return slots[key]; }
  }

  /*  */

  /**
   * Runtime helper for rendering v-for lists.
   */
  function renderList (
    val,
    render
  ) {
    var ret, i, l, keys, key;
    if (Array.isArray(val) || typeof val === 'string') {
      ret = new Array(val.length);
      for (i = 0, l = val.length; i < l; i++) {
        ret[i] = render(val[i], i);
      }
    } else if (typeof val === 'number') {
      ret = new Array(val);
      for (i = 0; i < val; i++) {
        ret[i] = render(i + 1, i);
      }
    } else if (isObject(val)) {
      if (hasSymbol && val[Symbol.iterator]) {
        ret = [];
        var iterator = val[Symbol.iterator]();
        var result = iterator.next();
        while (!result.done) {
          ret.push(render(result.value, ret.length));
          result = iterator.next();
        }
      } else {
        keys = Object.keys(val);
        ret = new Array(keys.length);
        for (i = 0, l = keys.length; i < l; i++) {
          key = keys[i];
          ret[i] = render(val[key], key, i);
        }
      }
    }
    if (!isDef(ret)) {
      ret = [];
    }
    (ret)._isVList = true;
    return ret
  }

  /*  */

  /**
   * Runtime helper for rendering <slot>
   * 将<slot>节点渲染成对应的插槽节点
   * 
   * 执行时机是当前的子组件，在子组件作用域中，调用scopedSlotFn()来创建父组件中的VNode，
   * 这时父组件中就能访问到子组件作用域中的数据，这就是作用域插槽能访问子组件数据的根本原因。
   * 所以插槽元素，它的本质上并不是在父组件编译和render阶段生成，它会把它延迟，作为一个函数
   * 保留下来。真正生成VNode的时机，是延迟到子组件的创建过程中再去执行。因为子组件的创建过程
   * 中它的上下文肯定是子组件的vm实例，所以说它就可以在子组件执行过程中访问到子组件这个对象，
   * 而这个插槽prop，是在编译阶段构造出的对象传入的，这时就可以访问到子组件中的数据。
   * 如果子组件中的数据是字符串，就可以直接访问到此字符串；如果子组件的数据是一个变量，因为当前
   * 的上下文环境是子组件，就可以访问到子组件中定义的这个变量
   * 
   * 对于默认插槽和旧语法的具名插槽，那么scopedSlotFn执行都会代理到$slots上
   * 
   * 所以，对于旧语法的默认插槽和作用域插槽，它们的渲染作用域都是父组件；
   * 而新语法的插槽，除默认插槽的渲染作用域是父级外，其它的渲染时机都是子插槽组件
   * @param {*} name 插槽名
   * @param {*} fallbackRender 默认插槽内容渲染函数
   * @param {*} props slot标签上的属性 如 hello="world" :hello="world" v-bind:hello="world"
   * @param {*} bindObject slot标签上v-bind绑定的对象属性  v-bind="hello" hello: { foo: 'foo', bar: 'bar' }
   * @returns 
   */
  function renderSlot (
    name,
    fallbackRender,
    props,
    bindObject
  ) {
    var scopedSlotFn = this.$scopedSlots[name];
    var nodes;
    if (scopedSlotFn) {
      // scoped slot
      props = props || {};
      if (bindObject) { // v-bind绑定对象属性
        if (!isObject(bindObject)) {
          // 警告 v-bind必须绑定对象值
          warn('slot v-bind without argument expects an Object', this);
        }
        // 合并绑定的对象属性到props上
        props = extend(extend({}, bindObject), props);
      }

      nodes =
        // 调用插槽函数 传入插槽prop
        scopedSlotFn(props) ||
        // 插槽函数返回值false 执行默认插槽函数
        (typeof fallbackRender === 'function' ? fallbackRender() : fallbackRender);
    } else {
      // scopedSlotFn不为真
      nodes =
        this.$slots[name] ||
        // 用户未传插槽内容 调用默认插槽内容函数
        (typeof fallbackRender === 'function' ? fallbackRender() : fallbackRender);
    }

    // 绑定的插槽名
    var target = props && props.slot;
    if (target) {
      return this.$createElement('template', { slot: target }, nodes)
    } else {
      return nodes
    }
  }

  /*  */

  /**
   * Runtime helper for resolving filters
   */
  function resolveFilter (id) {
    return resolveAsset(this.$options, 'filters', id, true) || identity
  }

  /*  */

  function isKeyNotMatch (expect, actual) {
    if (Array.isArray(expect)) {
      return expect.indexOf(actual) === -1
    } else {
      return expect !== actual
    }
  }

  /**
   * Runtime helper for checking keyCodes from config.
   * exposed as Vue.prototype._k
   * passing in eventKeyName as last argument separately for backwards compat
   */
  function checkKeyCodes (
    eventKeyCode,
    key,
    builtInKeyCode,
    eventKeyName,
    builtInKeyName
  ) {
    var mappedKeyCode = config.keyCodes[key] || builtInKeyCode;
    if (builtInKeyName && eventKeyName && !config.keyCodes[key]) {
      return isKeyNotMatch(builtInKeyName, eventKeyName)
    } else if (mappedKeyCode) {
      return isKeyNotMatch(mappedKeyCode, eventKeyCode)
    } else if (eventKeyName) {
      return hyphenate(eventKeyName) !== key
    }
    return eventKeyCode === undefined
  }

  /*  */

  /**
   * Runtime helper for merging v-bind="object" into a VNode's data.
   */
  function bindObjectProps (
    data,
    tag,
    value,
    asProp,
    isSync
  ) {
    if (value) {
      if (!isObject(value)) {
        warn(
          'v-bind without argument expects an Object or Array value',
          this
        );
      } else {
        if (Array.isArray(value)) {
          value = toObject(value);
        }
        var hash;
        var loop = function ( key ) {
          if (
            key === 'class' ||
            key === 'style' ||
            isReservedAttribute(key)
          ) {
            hash = data;
          } else {
            var type = data.attrs && data.attrs.type;
            hash = asProp || config.mustUseProp(tag, type, key)
              ? data.domProps || (data.domProps = {})
              : data.attrs || (data.attrs = {});
          }
          var camelizedKey = camelize(key);
          var hyphenatedKey = hyphenate(key);
          if (!(camelizedKey in hash) && !(hyphenatedKey in hash)) {
            hash[key] = value[key];

            if (isSync) {
              var on = data.on || (data.on = {});
              on[("update:" + key)] = function ($event) {
                value[key] = $event;
              };
            }
          }
        };

        for (var key in value) loop( key );
      }
    }
    return data
  }

  /*  */

  /**
   * Runtime helper for rendering static trees.
   */
  function renderStatic (
    index,
    isInFor
  ) {
    var cached = this._staticTrees || (this._staticTrees = []);
    var tree = cached[index];
    // if has already-rendered static tree and not inside v-for,
    // we can reuse the same tree.
    if (tree && !isInFor) {
      return tree
    }
    // otherwise, render a fresh tree.
    tree = cached[index] = this.$options.staticRenderFns[index].call(
      this._renderProxy,
      null,
      this // for render fns generated for functional component templates
    );
    markStatic(tree, ("__static__" + index), false);
    return tree
  }

  /**
   * Runtime helper for v-once.
   * Effectively it means marking the node as static with a unique key.
   */
  function markOnce (
    tree,
    index,
    key
  ) {
    markStatic(tree, ("__once__" + index + (key ? ("_" + key) : "")), true);
    return tree
  }

  function markStatic (
    tree,
    key,
    isOnce
  ) {
    if (Array.isArray(tree)) {
      for (var i = 0; i < tree.length; i++) {
        if (tree[i] && typeof tree[i] !== 'string') {
          markStaticNode(tree[i], (key + "_" + i), isOnce);
        }
      }
    } else {
      markStaticNode(tree, key, isOnce);
    }
  }

  function markStaticNode (node, key, isOnce) {
    node.isStatic = true;
    node.key = key;
    node.isOnce = isOnce;
  }

  /*  */

  function bindObjectListeners (data, value) {
    if (value) {
      if (!isPlainObject(value)) {
        warn(
          'v-on without argument expects an Object value',
          this
        );
      } else {
        var on = data.on = data.on ? extend({}, data.on) : {};
        for (var key in value) {
          var existing = on[key];
          var ours = value[key];
          on[key] = existing ? [].concat(existing, ours) : ours;
        }
      }
    }
    return data
  }

  /*  */

  /**
   * 处理父组件中的插槽AST元素
   * 编译生成AST树中，_u函数，在父组件render生成VNode阶段执行
   * @param {*} fns 
   * @param {*} res 
   * @param {*} hasDynamicKeys 是否有动态插槽
   * @param {*} contentHashKey 插槽唯一key
   * @returns 
   */
  function resolveScopedSlots (
    fns, // see flow/vnode
    res,
    // the following are added in 2.6
    hasDynamicKeys,
    contentHashKey
  ) {
    res = res || { $stable: !hasDynamicKeys };
    for (var i = 0; i < fns.length; i++) {
      var slot = fns[i];
      if (Array.isArray(slot)) {
        // 数组递归调用本身
        resolveScopedSlots(slot, res, hasDynamicKeys);
      } else if (slot) {
        // marker for reverse proxying v-slot without scope on this.$slots
        // 反向代理标识 没有插槽prop的插槽AST会被反向代理到$slots上
        if (slot.proxy) {
          slot.fn.proxy = true;
        }
        res[slot.key] = slot.fn;
      }
    }
    if (contentHashKey) {
      // 添加唯一标识key
      (res).$key = contentHashKey;
    }
    /**
     * {
     *  [slot.key]: slot.fn, // slot.fn.proxy = true
     *  $key?: contentHashKey,
     *  $stable: !hasDynamicKeys
     * }
     */
    return res
  }

  /*  */

  function bindDynamicKeys (baseObj, values) {
    for (var i = 0; i < values.length; i += 2) {
      var key = values[i];
      if (typeof key === 'string' && key) {
        baseObj[values[i]] = values[i + 1];
      } else if (key !== '' && key !== null) {
        // null is a special value for explicitly removing a binding
        warn(
          ("Invalid value for dynamic directive argument (expected string or null): " + key),
          this
        );
      }
    }
    return baseObj
  }

  // helper to dynamically append modifier runtime markers to event names.
  // ensure only append when value is already string, otherwise it will be cast
  // to string and cause the type check to miss.
  function prependModifier (value, symbol) {
    return typeof value === 'string' ? symbol + value : value
  }

  /*  */

  /**
   * 编译阶段生成render中用到的辅助函数
   *  会添加到Vue.prototype上
   * @param {*} target 
   */
  function installRenderHelpers (target) {
    target._o = markOnce;
    target._n = toNumber;
    target._s = toString;
    target._l = renderList;
    target._t = renderSlot;
    target._q = looseEqual;
    target._i = looseIndexOf;
    target._m = renderStatic;
    target._f = resolveFilter;
    target._k = checkKeyCodes;
    target._b = bindObjectProps;
    target._v = createTextVNode;
    target._e = createEmptyVNode;
    target._u = resolveScopedSlots;
    target._g = bindObjectListeners;
    target._d = bindDynamicKeys;
    target._p = prependModifier;
  }

  /*  */

  function FunctionalRenderContext (
    data,
    props,
    children,
    parent,
    Ctor
  ) {
    var this$1 = this;

    var options = Ctor.options;
    // ensure the createElement function in functional components
    // gets a unique context - this is necessary for correct named slot check
    var contextVm;
    if (hasOwn(parent, '_uid')) {
      contextVm = Object.create(parent);
      // $flow-disable-line
      contextVm._original = parent;
    } else {
      // the context vm passed in is a functional context as well.
      // in this case we want to make sure we are able to get a hold to the
      // real context instance.
      contextVm = parent;
      // $flow-disable-line
      parent = parent._original;
    }
    var isCompiled = isTrue(options._compiled);
    var needNormalization = !isCompiled;

    this.data = data;
    this.props = props;
    this.children = children;
    this.parent = parent;
    this.listeners = data.on || emptyObject;
    this.injections = resolveInject(options.inject, parent);
    this.slots = function () {
      if (!this$1.$slots) {
        normalizeScopedSlots(
          data.scopedSlots,
          this$1.$slots = resolveSlots(children, parent)
        );
      }
      return this$1.$slots
    };

    Object.defineProperty(this, 'scopedSlots', ({
      enumerable: true,
      get: function get () {
        return normalizeScopedSlots(data.scopedSlots, this.slots())
      }
    }));

    // support for compiled functional template
    if (isCompiled) {
      // exposing $options for renderStatic()
      this.$options = options;
      // pre-resolve slots for renderSlot()
      this.$slots = this.slots();
      this.$scopedSlots = normalizeScopedSlots(data.scopedSlots, this.$slots);
    }

    if (options._scopeId) {
      this._c = function (a, b, c, d) {
        var vnode = createElement(contextVm, a, b, c, d, needNormalization);
        if (vnode && !Array.isArray(vnode)) {
          vnode.fnScopeId = options._scopeId;
          vnode.fnContext = parent;
        }
        return vnode
      };
    } else {
      this._c = function (a, b, c, d) { return createElement(contextVm, a, b, c, d, needNormalization); };
    }
  }

  installRenderHelpers(FunctionalRenderContext.prototype);

  function createFunctionalComponent (
    Ctor,
    propsData,
    data,
    contextVm,
    children
  ) {
    var options = Ctor.options;
    var props = {};
    var propOptions = options.props;
    if (isDef(propOptions)) {
      for (var key in propOptions) {
        props[key] = validateProp(key, propOptions, propsData || emptyObject);
      }
    } else {
      if (isDef(data.attrs)) { mergeProps(props, data.attrs); }
      if (isDef(data.props)) { mergeProps(props, data.props); }
    }

    var renderContext = new FunctionalRenderContext(
      data,
      props,
      children,
      contextVm,
      Ctor
    );

    var vnode = options.render.call(null, renderContext._c, renderContext);

    if (vnode instanceof VNode) {
      return cloneAndMarkFunctionalResult(vnode, data, renderContext.parent, options, renderContext)
    } else if (Array.isArray(vnode)) {
      var vnodes = normalizeChildren(vnode) || [];
      var res = new Array(vnodes.length);
      for (var i = 0; i < vnodes.length; i++) {
        res[i] = cloneAndMarkFunctionalResult(vnodes[i], data, renderContext.parent, options, renderContext);
      }
      return res
    }
  }

  function cloneAndMarkFunctionalResult (vnode, data, contextVm, options, renderContext) {
    // #7817 clone node before setting fnContext, otherwise if the node is reused
    // (e.g. it was from a cached normal slot) the fnContext causes named slots
    // that should not be matched to match.
    var clone = cloneVNode(vnode);
    clone.fnContext = contextVm;
    clone.fnOptions = options;
    {
      (clone.devtoolsMeta = clone.devtoolsMeta || {}).renderContext = renderContext;
    }
    if (data.slot) {
      (clone.data || (clone.data = {})).slot = data.slot;
    }
    return clone
  }

  function mergeProps (to, from) {
    for (var key in from) {
      to[camelize(key)] = from[key];
    }
  }

  /*  */

  /*  */

  /*  */

  /*  */

  // Vue.js 使用的 Virtual DOM 参考的是开源库 snabbdom，它的一个特点是
  // 在 VNode 的 patch 流程中对外暴露了各种时机的钩子函数，方便我们做一些额外的事情，
  // Vue.js 也是充分利用这一点，在初始化一个 Component 类型的 VNode的过程中实现了几个钩子函数

  // componentVNodeHooks就是初始化一个 Component 类型的 VNode 中默认的几个钩子函数
  // patch阶段 组件会执行这些默认钩子函数
  // inline hooks to be invoked on component VNodes during patch
  var componentVNodeHooks = {
    init: function init (vnode, hydrating) {
      if (
        vnode.componentInstance &&
        !vnode.componentInstance._isDestroyed &&
        vnode.data.keepAlive
      ) {
        /**
         * keep-alive包裹的子组件处理
         * 当keep-alive的子组件非第一次执行时，命中这里的逻辑
         * 
         * 需要注意，这里处理的VNode节点是keep-alive包裹的子组件，而不是keep-alive组件本身
         * keep-alive组件渲染返回的渲染VNode是它的子节点，并不是keep-alive渲染VNode本身，
         * 它本身是并不会生成渲染VNode的，这也就是为什么它是抽象节点，不是生成实际的DOM
         * 
         * keep-alive组件首次渲染：第一次执行时，keep-alive组件会执行else中的逻辑，
         * 创建keep-alive实例child，然后执行keep-alive组件的$mount，在执行到keep-alive
         * 组件的render时，keep-alive组件渲染返回的渲染VNode是它的子节点，并不是
         * keep-alive渲染VNode本身。
         * 
         * 那么它的子组件VNode第一次patch也会同样命中else中的逻辑，作为一个普通的组件
         * 进行mount、render、patch，之后在挂载完毕之后，keep-alive组件的mounted执行，
         * 在keep-alive中缓存已经插入到DOM的子组件vm实例。
         * keep-alive下的子组件在第一次挂载时，都会执行上述逻辑。
         * 
         * keep-alive组件再次更新执行时，执行patchVNode，会执行prepatch，这时会执行
         * updateChildComponent，命中needsForceUpdate，再次resolveSlots生成keep-alive子组件的默认插槽$slots.default内容，
         * 然后执行keep-alive组件的$forceUpdate，重新执行到keep-alive组件的render，
         * 此时返回了子组件的VNode，子组件VNode再执行patch过程，执行到patch下的createComponent
         * 那么就会命中这里的逻辑
         */
        // kept-alive components, treat as a patch
        var mountedNode = vnode; // work around flow
        componentVNodeHooks.prepatch(mountedNode, mountedNode); // 直接执行prepatch
      } else {
        /**
         * 创建组件占位符节点的组件实例
         *  形成关系如下：
         *    组件占位符VNode.componentInstance._vnode 可以找到组件的渲染VNode
         *    组件的渲染VNode.parent可以找到组件占位符VNode
         *    组件实例componentInstance即vm.$vnode可以找到组件占位符VNode
         *    可表示为：
         *      组件占位符VNode.componentInstance._vnode = 组件渲染VNode
         *      组件占位符VNode.componentInstance.$vnode = 组件占位符VNode 即 vm.$vnode = 组件占位符VNode
         *      组件渲染VNode.parent = 组件占位符VNode
         */
        var child = vnode.componentInstance = createComponentInstanceForVnode(
          vnode,
          activeInstance
        );
        // 挂载组件实例 再走 mount -> mountComponent -> _render -> _update -> patch
        // 组件实例化 非ssr 参数1 el是 undefined  即 child.$mount(undefined, false)
        child.$mount(hydrating ? vnode.elm : undefined, hydrating);
      }
    },

    prepatch: function prepatch (oldVnode, vnode) {
      // 新的组件占位符VNode节点的options
      var options = vnode.componentOptions;
      // 获取旧组件占位符VNode的渲染vm实例componentInstance
      // child就是在父组件(App)页面中的子组件(HelloWorld)占位符VNode的对应的实现实例
      var child = vnode.componentInstance = oldVnode.componentInstance;
      // 更新父组件中子组件占位符对应的组件实例
      updateChildComponent(
        child,
        options.propsData, // updated props
        options.listeners, // updated listeners
        vnode, // new parent vnode
        options.children // new children
      );
    },

    insert: function insert (vnode) {
      var context = vnode.context;
      var componentInstance = vnode.componentInstance;
      if (!componentInstance._isMounted) {
        // 未mounted组件进行mounted
        componentInstance._isMounted = true;
        /**
         * 生命周期函数 mounted
         *  调用时机2
         *  执行时机：所有VNode节点真正被插入到DOM中之后
         *  执行顺序：先子后父 
         *  因为patch过程，先插入子vnode再插入父vnode
         */
        callHook(componentInstance, 'mounted');
      }

      // FIXME: 跳过keepAlive组件处理
      if (vnode.data.keepAlive) {
        if (context._isMounted) {
          // vue-router#1212
          // During updates, a kept-alive component's child components may
          // change, so directly walking the tree here may call activated hooks
          // on incorrect children. Instead we push them into a queue which will
          // be processed after the whole patch process ended.
          // 更新时，先将实例放到队列中，patch结束后再执行
          queueActivatedComponent(componentInstance);
        } else {
          // 挂载时
          // 执行keep-alive组件的生命周期activated
          activateChildComponent(componentInstance, true /* direct */);
        }
      }
    },

    destroy: function destroy (vnode) {
      var componentInstance = vnode.componentInstance;
      if (!componentInstance._isDestroyed) {
        if (!vnode.data.keepAlive) {
          // 非keep-alive的子组件，执行vm.$destroy()
          componentInstance.$destroy();
        } else {
          // 非keep-alive的子组件，执行deactivated生命周期函数
          deactivateChildComponent(componentInstance, true /* direct */);
        }
      }
    }
  };

  var hooksToMerge = Object.keys(componentVNodeHooks);

  /**
   * 创建组件占位符VNode
   * @param {*} Ctor 要创建组件VNode的组件、对象或函数异步组件
   * @param {*} data 组件VNode的VNodeData
   * @param {*} context 创建组件的上下文组件实例
   * @param {*} children Ctor的子节点
   * @param {*} tag 节点标签名
   * @returns 组件占位符VNode
   */
  function createComponent (
    Ctor,
    data,
    context,
    children,
    tag
  ) {
    if (isUndef(Ctor)) {
      return
    }

    //  Vue基类构造函数 _base指向Vue基类构造函数 见global-api/index
    var baseCtor = context.$options._base;

    // plain options object: turn it into a constructor
    // 全局注册组件和局部注册组件会跳过这里 因为在注册组件时，已经执行了Vue.extend()
    if (isObject(Ctor)) {
      // Ctor如果是对象，使用extend将其转换成一个构造函数
      Ctor = baseCtor.extend(Ctor);
    }

    // if at this stage it's not a constructor or an async component factory,
    // reject.
    if (typeof Ctor !== 'function') {
      // 不是 构造函数 或 异步组件
      {
        // 无效组件定义警告
        warn(("Invalid Component definition: " + (String(Ctor))), context);
      }
      return
    }

    // async component
    // 异步组件处理
    var asyncFactory;
    if (isUndef(Ctor.cid)) { // 异步组件是一个工厂函数 没有cid属性
      // 如果是第一次执行 resolveAsyncComponent，
      // 除非使用高级异步组件 0 delay 去创建了一个 loading 组件，
      // 否则返回是 undefiend，接着通过createAsyncPlaceholder创建一个注释节点作为占位符
      asyncFactory = Ctor;
      // 处理工厂函数的异步组件 工厂函数会去加载这个异步组件
      Ctor = resolveAsyncComponent(asyncFactory, baseCtor);
      // 异步组件第一次执行返回的Ctor为undefined
      if (Ctor === undefined) {
        // return a placeholder node for async component, which is rendered
        // as a comment node but preserves all the raw information for the node.
        // the information will be used for async server-rendering and hydration.
        // 异步组件第一次执行，是同步执行的，会执行到这里，返回一个注释占位符VNode节点，最终在DOM中渲染成一个注释节点
        // 创建一个异步组件的注释VNode占位符 但把asyncFactory和asyncMeta赋值给当前VNode
        // resolveAsyncComponent再调用resolve，会forceRender，就会第二次执行
        return createAsyncPlaceholder(
          asyncFactory,
          data,
          context,
          children,
          tag
        )
      }

      // 第二次执行的异步组件走下面的逻辑，和同步组件相同
    }

    data = data || {};

    // resolve constructor options in case global mixins are applied after
    // component constructor creation
    // FIXME: 跳过 options再处理
    // 而mixins在组件构造函数之后被应用 全局的mixins可能会影响options
    resolveConstructorOptions(Ctor);

    // transform component v-model data into props & events
    // 组件v-model 转成 props 和 events
    if (isDef(data.model)) {
      transformModel(Ctor.options, data);
    }

    // extract props
    // FIXME: 跳过 从VNodeData中获取要创建的组件占位符VNode的props
    var propsData = extractPropsFromVNodeData(data, Ctor, tag);

    // functional component
    // FIXME: 跳过 函数式组件处理
    if (isTrue(Ctor.options.functional)) {
      return createFunctionalComponent(Ctor, propsData, data, context, children)
    }

    // 自定义事件处理 将自定义事件的data.on赋值给listeners，
    // 因为这些会被当作子组件事件，而不是原生DOM事件
    // extract listeners, since these needs to be treated as
    // child component listeners instead of DOM listeners
    var listeners = data.on; // 子组件事件
    // replace with listeners with .native modifier
    // so it gets processed during parent component patch.
    /**
     * 组件上的nativeOn赋值给on，当前组件即父组件的patch过程中就会被当作原生事件来处理，
     * 对于自定义事件，则把listeners作为vnode的componentOptions传入，它是在子组件初始
     * 化阶段中处理的，所以它的处理环境是子组件，是被当作子组件事件，而不是原生DOM事件
     * 
     * 这就是为什么组件上使用native修饰符可以使用原生DOM事件，即组件上事件使用native修饰符
     * 对应的是DOM事件的原因，当然这也是为什么只有组件有自定义事件和原生DOM事件
     */
    data.on = data.nativeOn;

    // FIXME: 跳过 抽象组件处理
    if (isTrue(Ctor.options.abstract)) {
      // abstract components do not keep anything
      // other than props & listeners & slot

      // work around flow
      var slot = data.slot;
      data = {};
      if (slot) {
        data.slot = slot;
      }
    }

    // install component management hooks onto the placeholder node
    // 安装组件默认钩子函数到对应VNode上
    // 本质是把 componentVNodeHooks 的钩子函数合并到 data.hook 中
    // 在VNode执行patch的过程中执行相关的钩子函数
    installComponentHooks(data);

    // return a placeholder vnode
    var name = Ctor.options.name || tag;

    /**
     * 组件占位符VNode
     * 注意：
     *    与普通元素VNode节点不同的是，组件VNode的children（参数3）为undefined，
     *    因为组件VNode只是用作占位符，而不会生成真正的DOM节点，所以把组件占位符
     *    的children放在componentOptions（参数7）中
     *    这在patch阶段遍历时，patchVNode中会很有用
     * 该参数中也包含了其它有用数据 Ctor 实例化使用 children 在插槽的时候会用到
     * listeners 组件的自定义事件
     */
    var vnode = new VNode(
      ("vue-component-" + (Ctor.cid) + (name ? ("-" + name) : '')),
      data, undefined, undefined, undefined, context,
      { Ctor: Ctor, propsData: propsData, listeners: listeners, tag: tag, children: children },
      asyncFactory
    );

    return vnode
  }

  /**
   * 创建组件VNode节点的组件实例
   * @param {*} vnode  已挂载的组件占位符VNode
   * @param {*} parent 当前激活的vm实例 即 当前VNode节点的父vm实例
   * @returns 
   */
  function createComponentInstanceForVnode (
    // we know it's MountedComponentVNode but flow doesn't
    vnode,
    // activeInstance in lifecycle state
    parent
  ) {
    // 内部调用组件的options
    var options = {
      _isComponent: true, // 标识为组件
      _parentVnode: vnode, // 组件VNode 可以理解成占位符VNode
      parent: parent
    };

    // check inline-template render functions
    // FIXME: 跳过 内联模板处理
    var inlineTemplate = vnode.data.inlineTemplate;
    if (isDef(inlineTemplate)) {
      options.render = inlineTemplate.render;
      options.staticRenderFns = inlineTemplate.staticRenderFns;
    }

    /**
     * 执行组件VNode节点的组件构造函数 new Sub() 构造函数会执行 _init() 方法
     * 实例化组件占位符VNode成组件实例
     */
    return new vnode.componentOptions.Ctor(options)
  }

  /**
   * 安装组件钩子到VNode节点的VNodeData上
   *  merge默认的钩子函数componentVNodeHooks到VNodeData上
   * @param {*} data 
   */
  function installComponentHooks (data) {
    var hooks = data.hook || (data.hook = {});
    // hooksToMerge = [ 'init', 'prepatch', 'insert', 'destroy' ]
    for (var i = 0; i < hooksToMerge.length; i++) {
      var key = hooksToMerge[i];
      var existing = hooks[key];
      var toMerge = componentVNodeHooks[key];
      // 命中条件：
      //    已存在的hooks中的钩子函数existing() 和 要添加的toMerge() 不相等
      // 且 existing._merged为true
      if (existing !== toMerge && !(existing && existing._merged)) {
        // 如果某个时机的钩子已经存在data.hook中，那么通过执行mergeHook函数做合并
        // 合并时 默认toMerge在前
        hooks[key] = existing ? mergeHook$1(toMerge, existing) : toMerge;
      }
    }
  }

  /**
   * 合并两个钩子
   * @param {*} f1 
   * @param {*} f2 
   * @returns
   */
  function mergeHook$1 (f1, f2) {
    // 合并后的钩子 调用时顺序执行两个合并的钩子函数f1 f2
    var merged = function (a, b) {
      // flow complains about extra args which is why we use any
      f1(a, b);
      f2(a, b);
    };
    merged._merged = true;
    return merged
  }

  // transform component v-model info (value and callback) into
  // prop and event handler respectively.
  /**
   * 将组件v-model转成prop和event
   *  data.attrs[prop] = data.model.value 
   *  data.on[event] = data.model.callback
   * @param {*} options 
   * @param {*} data 
   */
  function transformModel (options, data) {
    // prop默认value 可自定义
    var prop = (options.model && options.model.prop) || 'value';
    // event默认input 可自定义
    var event = (options.model && options.model.event) || 'input'
    // data.attrs[prop] = data.model.value
    ;(data.attrs || (data.attrs = {}))[prop] = data.model.value;

    // 添加事件
    var on = data.on || (data.on = {});
    var existing = on[event];
    var callback = data.model.callback;
    if (isDef(existing)) {
      // 该类型事件已存在
      if (
        Array.isArray(existing)
          ? existing.indexOf(callback) === -1
          : existing !== callback
      ) {
        // 将事件放在事件队列第一个
        on[event] = [callback].concat(existing);
      }
    } else {
      // 事件不存在，直接添加事件
      on[event] = callback;
    }
  }

  /*  */

  var SIMPLE_NORMALIZE = 1;
  var ALWAYS_NORMALIZE = 2;

  // wrapper function for providing a more flexible interface
  // without getting yelled at by flow
  // 创建VNode
  // 每个VNode有children，children的每个元素也是一个VNode，
  // 这样就形成了一个VNode Tree，它很好的描述了DOM Tree
  function createElement (
    context,
    tag,
    data,
    children,
    normalizationType,
    alwaysNormalize
  ) {
    // 一种函数重载的实现方案：
    //  data参数没有传值，此时
    //    data位置的值是children的值 
    //    children位置的值是normalizationType
    //    最后将data位置置为undefined
    if (Array.isArray(data) || isPrimitive(data)) {
      normalizationType = children;
      children = data;
      data = undefined;
    }

    // 标准化策略
    if (isTrue(alwaysNormalize)) {
      normalizationType = ALWAYS_NORMALIZE;
    }
    return _createElement(context, tag, data, children, normalizationType)
  }

  /**
   * 创建VNode
   * @param {*} context VNode的上下文环境
   * @param {*} tag 标签 可以是字符串也可以是Component
   * @param {*} data 表示 VNode 的数据
   * @param {*} children VNode的子节点，它是任意类型的，它接下来需要被规范为标准的VNode数组
   * @param {*} normalizationType 子节点规范的类型，主要是参考render函数是编译生成还是用户手写
   * @returns VNode | Array<VNode>
   */
  function _createElement (
    context,
    tag,
    data,
    children,
    normalizationType
  ) {
    if (isDef(data) && isDef((data).__ob__)) {
      // 响应式数据，Vue会添加__ob__属性
      // 不允许VNodeData是响应式的 警告提示 返回一个空节点
      warn(
        "Avoid using observed data object as vnode data: " + (JSON.stringify(data)) + "\n" +
        'Always create fresh vnode data objects in each render!',
        context
      );
      return createEmptyVNode()
    }
    // object syntax in v-bind
    if (isDef(data) && isDef(data.is)) {
      // 动态组件有is属性
      tag = data.is;
    }
    if (!tag) {
      // in case of component :is set to falsy value
      // 动态组件:is为false 也返回一个空节点
      return createEmptyVNode()
    }
    // warn against non-primitive key
    // 非原生JS类型作为key 提示警告
    if (isDef(data) && isDef(data.key) && !isPrimitive(data.key)
    ) {
      {
        warn(
          'Avoid using non-primitive value as key, ' +
          'use string/number value instead.',
          context
        );
      }
    }
    // support single function children as default scoped slot
    // 设置作用域插槽的default
    if (Array.isArray(children) &&
      typeof children[0] === 'function'
    ) {
      data = data || {};
      data.scopedSlots = { default: children[0] };
      children.length = 0;
    }

    // 打平children成一维数组
    if (normalizationType === ALWAYS_NORMALIZE) {
      children = normalizeChildren(children);
    } else if (normalizationType === SIMPLE_NORMALIZE) {
      children = simpleNormalizeChildren(children);
    }

    var vnode, ns;
    if (typeof tag === 'string') { // 字符串标签
      var Ctor;
      // 获取命名空间
      ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag);
      if (config.isReservedTag(tag)) { // html原生标签
        // platform built-in elements
        if (isDef(data) && isDef(data.nativeOn) && data.tag !== 'component') {
          // .native修饰符不能在非component的标签上使用
          warn(
            ("The .native modifier for v-on is only valid on components but it was used on <" + tag + ">."),
            context
          );
        }
        
        // 平台内置节点 HTML原生的
        vnode = new VNode(
          config.parsePlatformTagName(tag), data, children,
          undefined, undefined, context
        );
      } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) { // 组件标签
        /**
         * 注册的全局组件或局部组件标签 命中这里
         * 组件是同步组件 或 异步组件
         * 创建组件类型的VNode
         * 
         * 同步组件：
         *  vnode是 同步组件的占位符VNode节点
         * 
         * 异步组件：
         * 1. 第一次执行到这里，得到的vnode是一个注释VNode占位符节点 它内部会调用$forceUpdate 然后会再次执行到这里
         * 2. 第二次执行到这里，得到的vnode是一个组件VNode占位符节点
         */
        // component
        vnode = createComponent(Ctor, data, context, children, tag);
      } else {
        // unknown or unlisted namespaced elements
        // check at runtime because it may get assigned a namespace when its
        // parent normalizes children
        // 未知标签或未列命名空间的元素
        // 在runtime阶段，当父节点标准化children时
        // 该元素可能被赋值命名空间 或 无法解析到，就是一个未知标签
        vnode = new VNode(
          tag, data, children,
          undefined, undefined, context
        );
      }
    } else {
      // direct component options / constructor
      // 直接是一个组件 直接创建组件类型的VNode
      vnode = createComponent(tag, data, context, children);
    }

    // 返回vnode给调用方法
    if (Array.isArray(vnode)) {
      return vnode
    } else if (isDef(vnode)) {
      if (isDef(ns)) { applyNS(vnode, ns); }
      if (isDef(data)) { registerDeepBindings(data); }
      return vnode
    } else {
      return createEmptyVNode()
    }
  }

  function applyNS (vnode, ns, force) {
    vnode.ns = ns;
    if (vnode.tag === 'foreignObject') {
      // use default namespace inside foreignObject
      ns = undefined;
      force = true;
    }
    if (isDef(vnode.children)) {
      for (var i = 0, l = vnode.children.length; i < l; i++) {
        var child = vnode.children[i];
        if (isDef(child.tag) && (
          isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
          applyNS(child, ns, force);
        }
      }
    }
  }

  // ref #5318
  // necessary to ensure parent re-render when deep bindings like :style and
  // :class are used on slot nodes
  function registerDeepBindings (data) {
    if (isObject(data.style)) {
      traverse(data.style);
    }
    if (isObject(data.class)) {
      traverse(data.class);
    }
  }

  /*  */

  function initRender (vm) {
    vm._vnode = null; // the root of the child tree
    vm._staticTrees = null; // v-once cached trees
    var options = vm.$options;
    // 占位符VNode
    var parentVnode = vm.$vnode = options._parentVnode; // the placeholder node in parent tree
    var renderContext = parentVnode && parentVnode.context; // 父级vm实例
    // $slots表示 具名插槽、默认插槽
    vm.$slots = resolveSlots(options._renderChildren, renderContext);
    // $scopedSlots 表示 旧语法的作用域插槽 和 新语法的所有插槽
    vm.$scopedSlots = emptyObject;
    // bind the createElement fn to this instance
    // so that we get proper render context inside it.
    // args order: tag, data, children, normalizationType, alwaysNormalize
    // internal version is used by render functions compiled from templates
    // 被template编译成的render()函数使用来创建vnode的方法
    vm._c = function (a, b, c, d) { return createElement(vm, a, b, c, d, false); };
    // normalization is always applied for the public version, used in
    // user-written render functions.
    // 手写render()函数创建vnode方法
    vm.$createElement = function (a, b, c, d) { return createElement(vm, a, b, c, d, true); };

    // $attrs & $listeners are exposed for easier HOC creation.
    // they need to be reactive so that HOCs using them are always updated
    var parentData = parentVnode && parentVnode.data;

    /* istanbul ignore else */
    {
      defineReactive$$1(vm, '$attrs', parentData && parentData.attrs || emptyObject, function () {
        !isUpdatingChildComponent && warn("$attrs is readonly.", vm);
      }, true);
      defineReactive$$1(vm, '$listeners', options._parentListeners || emptyObject, function () {
        !isUpdatingChildComponent && warn("$listeners is readonly.", vm);
      }, true);
    }
  }

  var currentRenderingInstance = null;

  /**
   * 混入render相关属性和方法
   *  属性：
   *    内部属性 (render-helpers)
   *  方法：
   *    内部方法 (render-helpers)
   *    Vue.prototype._render
   *    Vue.prototype.$nextTick
   *    
   */
  function renderMixin (Vue) {
    // install runtime convenience helpers
    // 原型上添加生成render函数所需要的方法
    installRenderHelpers(Vue.prototype);

    // $nextTick
    Vue.prototype.$nextTick = function (fn) {
      return nextTick(fn, this)
    };


    // vm.$vnode（_parentVnode） 意思就是未经过 _render 函数处理的 vnode， vm._vnode 是经过 render处理过的，为什么文章中说的它们是一种父子关系呢？ vue 为什么要在2处进行引用 _parentVnode 呢？
    // 举个例子，在父组件的 template 中有一个组件标签 <child></child>。
    // child 的模板比如说是 <div class=child>xxxx</div>。
    // 那么在父组件中，child 就是一个组件 vnode，它会在 patch 过程中执行 child 组件的初始化，同时把这个 vnode 作为参数传入，子组件初始化的时候这个 vnode 就是_parentVnode，那么子组件经过 _render 渲染生成的 vnode 是 vm._vnode，_vnode 你可以理解为组件的渲染 root vnode，而 $vnode 就是 _parentVnode，是这个组件在父组件中的占位组件 vnode，所以说是父子关系也不为过。

    // vm._render最终是通过执行createElement()方法并返回的是渲染vnode，它是一个虚拟Node
    // render执行，最终会替换掉原来的节点，这也是为什么根节点不能为html或body节点
    Vue.prototype._render = function () {
      var vm = this;
      var ref = vm.$options;
      var render = ref.render;
      var _parentVnode = ref._parentVnode;

      if (_parentVnode) {
        // $scopedSlots 处理父组件占位符VNode节点中的插槽元素
        vm.$scopedSlots = normalizeScopedSlots(
          _parentVnode.data.scopedSlots,
          vm.$slots,
          vm.$scopedSlots
        );
      }

      // set parent vnode. this allows render functions to have access
      // to the data on the placeholder node.
      // $vnode 当前的VNode 即 当前的组件占位符VNode
      vm.$vnode = _parentVnode;

      // render self
      var vnode;
      try {
        // There's no need to maintain a stack because all render fns are called
        // separately from one another. Nested component's render fns are called
        // when parent component is patched.
        currentRenderingInstance = vm; // 当前渲染实例vm
        /**
         * 调用render()
         * vm._renderProxy 生产环境就是vm本身 开发环境是Proxy代理
         * vm.$createElement render内部使用来创建当前的渲染vnode
         * vnode是当前的渲染vnode
         * 
         * 在执行render()函数过程中，就会访会触发在模板中的所有getter数据，
         * 此时就是访问的响应式getter，这样实际上已经完成了一个依赖收集的过程
         */
        vnode = render.call(vm._renderProxy, vm.$createElement);
      } catch (e) {
        // 触发错误钩子函数
        handleError(e, vm, "render");
        // return error render result,
        // or previous vnode to prevent render error causing blank component
        /* istanbul ignore else */
        if (vm.$options.renderError) {
          try {
            // 开发环境触发定义的 renderError() 赋值vnode
            vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e);
          } catch (e) {
            // 触发错误钩子函数
            handleError(e, vm, "renderError");
            // 赋值vnode
            vnode = vm._vnode;
          }
        } else {
          // 生产环境报错，直接赋值vnode
          vnode = vm._vnode;
        }
      } finally {
        currentRenderingInstance = null;
      }

      // if the returned array contains only a single node, allow it
      if (Array.isArray(vnode) && vnode.length === 1) {
        vnode = vnode[0];
      }
      // return empty vnode in case the render function errored out
      // 不允许多个根节点
      if (!(vnode instanceof VNode)) {
        if (Array.isArray(vnode)) {
          warn(
            'Multiple root nodes returned from render function. Render function ' +
            'should return a single root node.',
            vm
          );
        }
        // 多个根节点，将vnode赋值为空vnode
        vnode = createEmptyVNode();
      }
      // set parent
      // 当前组件渲染VNode的parent 指向 组件占位符VNode
      // 只有VNode作为一个组件的根节点，才会有parent指向它再父组件中的占位符VNode
      vnode.parent = _parentVnode;
      // render执行完返回的是渲染VNode
      return vnode
    };
  }

  /*  */

  /**
   * 返回组件构造器
   * @param {*} comp 
   * @param {*} base 
   * @returns 
   */
  function ensureCtor (comp, base) {
    if (
      comp.__esModule ||
      (hasSymbol && comp[Symbol.toStringTag] === 'Module')
    ) {
      comp = comp.default;
    }

    return isObject(comp)
      // 如果comp是普通对象，将对象转成组件构造器 
      ? base.extend(comp)
      // 直接返回组件构造器
      : comp
  }

  /**
   * 创建一个VNode注释节点占位符
   * 但节点保存了异步组件的所有信息
   * @param {*} factory 
   * @param {*} data 
   * @param {*} context 
   * @param {*} children 
   * @param {*} tag 
   * @returns 
   */
  function createAsyncPlaceholder (
    factory,
    data,
    context,
    children,
    tag
  ) {
    var node = createEmptyVNode();
    node.asyncFactory = factory;
    node.asyncMeta = { data: data, context: context, children: children, tag: tag };
    return node
  }

  /**
   * 处理工厂函数的异步组件
   *    1. 普通工厂函数
   *    2. Promise工厂函数
   *    3. 高级异步函数
   *  普通工厂函数：
   *    1. 首先工厂函数会加载异步组件，这个过程从头到尾同步执行的 第一次执行返回undefined
   *    2. 加载完成后，用户调用resolve或reject异步再继续执行
   *  Promise工厂函数：
   *    1. 首先工厂函数会加载异步组件，同步执行 第一次执行返回undefined
   *    2. Promise.then(resolve, reject) 异步执行resolve或reject 再继续执行
   *  高级异步函数：
   *    
   * 
   * 异步组件实现的本质是 2 次渲染，
   * 除了 0 delay 的高级异步组件第一次直接渲染成 loading 组件外，
   * 其它都是第一次渲染生成一个注释节点，当异步获取组件成功后，
   * 再通过 forceRender 强制重新渲染，这样就能正确渲染出我们异步加载的组件了。
   *    
   * @param {*} factory  工厂函数
   * @param {*} baseCtor Vue基类构造函数
   * @returns 
   */
  function resolveAsyncComponent (
    factory,
    baseCtor
  ) {
    if (isTrue(factory.error) && isDef(factory.errorComp)) {
      // 高级异步函数：有error返回factory.errorComp
      // forceRender() 再次执行到 resolveAsyncComponent
      // 返回 factory.errorComp，直接渲染 error 组件
      return factory.errorComp
    }

    if (isDef(factory.resolved)) {
      // 异步组件 第二次执行命中这里 返回保存的组件
      // forceRender() 再次执行到 resolveAsyncComponent
      return factory.resolved
    }

    // 当前渲染的vm实例
    var owner = currentRenderingInstance;

    if (owner && isDef(factory.owners) && factory.owners.indexOf(owner) === -1) {
      // already pending
      factory.owners.push(owner);
    }

    if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
      // 异步组件加载中
      // forceRender() 再次执行到 resolveAsyncComponent 返回 loadingComp
      return factory.loadingComp
    }

    if (owner && !isDef(factory.owners)) {
      var owners = factory.owners = [owner];
      var sync = true;
      var timerLoading = null;
      var timerTimeout = null

      ;(owner).$on('hook:destroyed', function () { return remove(owners, owner); });

      /**
       * 强制执行render
       * @param {*} renderCompleted 
       */
      var forceRender = function (renderCompleted) {
        for (var i = 0, l = owners.length; i < l; i++) {
          // 执行每个vm实例的$forceUpdate
          // $forceUpdate强制执行渲染watcher的update 执行 vm._update(vm._render(), hydrating)
          // render过程中会再次执行 render下的 createComponent
          (owners[i]).$forceUpdate();
        }

        // 渲染完成 清空定时loading
        if (renderCompleted) {
          owners.length = 0;
          if (timerLoading !== null) {
            clearTimeout(timerLoading);
            timerLoading = null;
          }
          if (timerTimeout !== null) {
            clearTimeout(timerTimeout);
            timerTimeout = null;
          }
        }
      };

      /**
       * res 是用户传入的组件定义对象 或 组件构造器
       */
      var resolve = once(function (res) {
        // cache resolved 保存异步组件构造函数
        factory.resolved = ensureCtor(res, baseCtor);

        // invoke callbacks only if this is not a synchronous resolve
        // (async resolves are shimmed as synchronous during SSR)
        if (!sync) {
          // 异步组件 执行forceRender
          // 之所以这么做是因为Vue通常是数据驱动视图重新渲染，
          // 但是在整个异步组件加载过程中是没有数据发生变化的，
          // 所以通过执行 $forceUpdate 可以强制组件重新渲染一次
          forceRender(true);
        } else {
          owners.length = 0;
        }
      });

      var reject = once(function (reason) {
        warn(
          "Failed to resolve async component: " + (String(factory)) +
          (reason ? ("\nReason: " + reason) : '')
        );
        if (isDef(factory.errorComp)) {
          // 定义了errorComp，渲染errorComp组件
          factory.error = true;
          // 执行 forceRender() 再次执行到 resolveAsyncComponent
          forceRender(true);
        }
      });

      /**
       * 异步组件中 resolve reject 在此传入
       * 普通工厂函数：res是undefined
       * Promise工厂函数：res是一个Promsie对象
       * 高级工厂函数：res是用户定义的对象
       */
      var res = factory(resolve, reject);

      if (isObject(res)) {
        if (isPromise(res)) { // Promise工厂函数
          // () => Promise
          if (isUndef(factory.resolved)) {
            // 执行Promise工厂函数then 当异步组件加载成功后，执行resolve，失败执行reject
            res.then(resolve, reject);
          }
        } else if (isPromise(res.component)) { // 高级工厂函数
          // 执行Promise工厂函数then 当异步组件加载成功后，执行resolve，失败执行reject
          res.component.then(resolve, reject);

          // 异步组件加载是一个异步过程，接着又同步执行了下面逻辑
          if (isDef(res.error)) {
            // 转化error时的errorComp构造函数
            factory.errorComp = ensureCtor(res.error, baseCtor);
          }

          if (isDef(res.loading)) {
            // 转化loading时的loadingComp构造函数
            factory.loadingComp = ensureCtor(res.loading, baseCtor);

            // 如果设置了res.delay且为 0，则设置factory.loading = true
            if (res.delay === 0) {
              // 展示加载时组件的延时时间为0 直接将loading置为true 返回loading组件
              factory.loading = true;
            } else {
              // 否则延时 delay 的时间执行
              timerLoading = setTimeout(function () {
                timerLoading = null;
                if (isUndef(factory.resolved) && isUndef(factory.error)) {
                  // 执行异步时，仍没有resolved 且 factory.error未定义
                  factory.loading = true;
                  // 执行forceRender
                  forceRender(false);
                }
              }, res.delay || 200);
            }
          }

          if (isDef(res.timeout)) {
            // 如果配置了timeout，则在res.timout时间后，如果组件没有成功加载，执行reject
            timerTimeout = setTimeout(function () {
              timerTimeout = null;
              // 异步组件加载超时 即如果到了timeout仍未resolved，执行reject
              if (isUndef(factory.resolved)) {
                reject(
                  "timeout (" + (res.timeout) + "ms)"
                );
              }
            }, res.timeout);
          }
        }
      }

      sync = false;
      /**
       * 1.普通工厂异步组件函数  首次执行
       * 2.Promise工厂函数      首次执行
       *   factory.loading是undefined，返回factory.resolved也是undefined，即返回undefined
       * 3.高级异步函数组件： 首次执行
       *   delay为0 直接返回loadingComp组件
       *   delay不为0，factory.loading是undefined，返回factory.resolved也是undefined，即返回undefined
       */
      // return in case resolved synchronously
      return factory.loading
        // 返回loadingComp组件
        ? factory.loadingComp
        : factory.resolved
    }
  }

  /*  */

  /**
   * 获取数组VNode元素中第一个组件VNode或异步组件占位符VNode
   * @param {*} children 
   * @returns 
   */
  function getFirstComponentChild (children) {
    if (Array.isArray(children)) {
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (isDef(c) && (isDef(c.componentOptions) || isAsyncPlaceholder(c))) {
          return c
        }
      }
    }
  }

  /*  */

  /*  */

  /**
   * event在编译阶段生成相关的data。
   * 对于DOM事件在patch过程中的创建阶段和更新阶段执行updateDOMListeners，生成DOM事件；
   * 对于自定义事件，会在组件初始化阶段通过initEvents创建。
   * 
   * 原生DOM事件和自定义事件，它们主要的区别在于添加和删除事件的方式不一样，并且自定义事件
   * 的派发是往当前实例上派发，但是可以利用在父组件环境定义回调函数来实现父子组件的通讯。
   * 另外要注意一点，只有组件节点才可以添加自定义事件，并且添加原生DOM事件需要使用native修饰符；
   * 而普通元素使用.native修饰符是没有作用的，也只能添加原生DOM事件。
   */


  /**
   * 初始化自定义事件
   * @param {*} vm 
   */
  function initEvents (vm) {
    vm._events = Object.create(null);
    vm._hasHookEvent = false;
    // init parent attached events
    var listeners = vm.$options._parentListeners;
    if (listeners) {
      // 更新组件的自定义事件
      updateComponentListeners(vm, listeners);
    }
  }

  var target;

  /**
   * 添加自定义事件监听
   * @param {*} event 
   * @param {*} fn 
   */
  function add (event, fn) {
    target.$on(event, fn);
  }

  /**
   * 移除自定义事件监听
   * @param {*} event 
   * @param {*} fn 
   */
  function remove$1 (event, fn) {
    target.$off(event, fn);
  }

  function createOnceHandler (event, fn) {
    var _target = target;
    return function onceHandler () {
      var res = fn.apply(null, arguments);
      if (res !== null) {
        _target.$off(event, onceHandler);
      }
    }
  }

  /**
   * 更新组件上的自定义事件
   * @param {*} vm 
   * @param {*} listeners 
   * @param {*} oldListeners 
   */
  function updateComponentListeners (
    vm,
    listeners,
    oldListeners
  ) {
    target = vm;
    // 调用vdom中定义的事件处理 传入自定义事件的add和remove方法
    updateListeners(listeners, oldListeners || {}, add, remove$1, createOnceHandler, vm);
    target = undefined;
  }

  /**
   * 混入events相关原型方法
   *  - Vue.prototype.$on() 
   *  - Vue.prototype.$once() 
   *  - Vue.prototype.$off() 
   *  - Vue.prototype.$emit() 
   * 
   * 这是一个典型的事件中心的实现方式，把所有的事件用vm._events存储起来，
   * 当执行vm.$on(event,fn)时，根据事件的名称event把回调函数fn存储起来vm._events[event].push(fn)。
   * 当执行vm.$emit(event)时，根据事件名称event找到所有的回调函数let cbs = vm._events[event]，
   * 然后遍历执行所有的回调函数。当执行vm.$off(event,fn)的时候会移除指定事件名event和指定的fn
   * 当执行vm.$once(event,fn)时，内部就是执行vm.$on，并且当回调函数执行一次后再通过vm.$off
   * 移除事件的回调，这样就确保了回调函数只执行一次。
   * 
   * 所以对于用户自定义的事件添加和删除就是利用了这几个事件中心的API。
   * 需要注意的事一点，vm.$emit是给当前的vm上派发的实例，之所以我们常用它做父子组件通讯，
   * 是因为它的回调函数的定义是在父组件中。
   * 
   * 当子组件的button被点击了，它通过 this.$emit('select')派发事件，那么子组件的实例
   * 就监听到了这个select事件，并执行它的回调函数——定义在父组件中的selectHandler方法，
   * 这样就相当于完成了一次父子组件的通讯。
   */
  function eventsMixin (Vue) {
    var hookRE = /^hook:/;
    Vue.prototype.$on = function (event, fn) {
      var vm = this;
      if (Array.isArray(event)) {
        // event是数组 递归调用本身$on
        for (var i = 0, l = event.length; i < l; i++) {
          vm.$on(event[i], fn);
        }
      } else {
        // 事件中心中添加事件 
        // 每一个事件都会有一个数组对应存储事件回调fn vm._events[click] = [fn1, fn2]
        (vm._events[event] || (vm._events[event] = [])).push(fn);
        // FIXME: 跳过 hook:event 事件处理
        // optimize hook:event cost by using a boolean flag marked at registration
        // instead of a hash lookup
        if (hookRE.test(event)) {
          vm._hasHookEvent = true;
        }
      }
      return vm
    };

    Vue.prototype.$once = function (event, fn) {
      var vm = this;
      function on () {
        vm.$off(event, on);
        fn.apply(vm, arguments);
      }
      on.fn = fn;
      // once内部对event的回调做了一层闭包处理，执行on之后就会删除对应事件回调fn
      vm.$on(event, on);
      return vm
    };

    Vue.prototype.$off = function (event, fn) {
      var vm = this;
      // all
      if (!arguments.length) {
        // 调用时不传参数，清空所有事件
        vm._events = Object.create(null);
        return vm
      }
      // array of events
      if (Array.isArray(event)) {
        // 传入事件是数组，递归调用$off
        for (var i$1 = 0, l = event.length; i$1 < l; i$1++) {
          vm.$off(event[i$1], fn);
        }
        return vm
      }

      // specific event
      var cbs = vm._events[event];
      if (!cbs) {
        // 指定的事件不存在 不处理
        return vm
      }
      if (!fn) {
        // 没有fn，移除事件对应的所有回调
        vm._events[event] = null;
        return vm
      }
      // specific handler
      // 指定事件名和函数，找到对应的事件回调移除
      var cb;
      var i = cbs.length;
      while (i--) {
        cb = cbs[i];
        if (cb === fn || cb.fn === fn) {
          cbs.splice(i, 1);
          break
        }
      }
      return vm
    };

    Vue.prototype.$emit = function (event) {
      var vm = this;
      {
        var lowerCaseEvent = event.toLowerCase();
        if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
          // 警告提示 html属性不支持驼峰
          tip(
            "Event \"" + lowerCaseEvent + "\" is emitted in component " +
            (formatComponentName(vm)) + " but the handler is registered for \"" + event + "\". " +
            "Note that HTML attributes are case-insensitive and you cannot use " +
            "v-on to listen to camelCase events when using in-DOM templates. " +
            "You should probably use \"" + (hyphenate(event)) + "\" instead of \"" + event + "\"."
          );
        }
      }

      // 获取事件名对应的所有事件，循环执行所有的事件
      var cbs = vm._events[event];
      if (cbs) {
        cbs = cbs.length > 1 ? toArray(cbs) : cbs;
        var args = toArray(arguments, 1);
        var info = "event handler for \"" + event + "\"";
        for (var i = 0, l = cbs.length; i < l; i++) {
          invokeWithErrorHandling(cbs[i], vm, args, vm, info);
        }
      }
      return vm
    };
  }

  /*  */

  var activeInstance = null;
  var isUpdatingChildComponent = false;

  // 设置当前的 activeInstance
  function setActiveInstance(vm) {
    var prevActiveInstance = activeInstance;
    activeInstance = vm;

    // 闭包执行 恢复之前的activeInstance
    // 这样prevActiveInstance和activeInstance就是父子关系
    return function () {
      activeInstance = prevActiveInstance;
    }
  }

  function initLifecycle (vm) {
    var options = vm.$options;

    /*********** 下面逻辑会建立组件间的父子关系 *************/

    // parent 是 activeInstance
    // 当前的vm实例要挂载到父级vm实例parent上
    // parent就是当前vm实例的父级vm实例
    // locate first non-abstract parent
    var parent = options.parent;
    if (parent && !options.abstract) { // 抽象组件处理
      // 组件实例建立父子关系时，忽略抽象组件
      while (parent.$options.abstract && parent.$parent) {
        // 当前vm实例的父级如果是抽象组件 且 父级抽象组件的父级存在
        // 忽略父级抽象组件 再循环判断
        parent = parent.$parent;
      }

      // 将当前vm实例添加到非抽象组件的parent.$children中
      // 建立实例间实际的父子级关系 忽略抽象组件
      parent.$children.push(vm);
    }

    // 当前父级vm
    vm.$parent = parent;
    // $root
    vm.$root = parent ? parent.$root : vm;

    // 当前vm实例的$children
    vm.$children = [];
    // 当前vm实例的$refs
    vm.$refs = {};

    // vm实例其它内置属性
    vm._watcher = null; // vm实例的渲染Watcher
    vm._inactive = null; // 布尔值时 标识是否是keep-alive的不活跃组件
    vm._directInactive = false; // 标识是否是keep-alive的不活跃根组件
    vm._isMounted = false; // 是否已挂载
    vm._isDestroyed = false; // 是否已销毁
    vm._isBeingDestroyed = false; // 是否开始销毁
  }

  /**
   * 混入lifecycle相关属性和方法
   *  属性：
   *  方法：
   *    Vue.prototype._update()
   *    Vue.prototype.$forceUpdate()
   *    Vue.prototype.$destroy()
   */
  function lifecycleMixin (Vue) {
    // _update 方法的作用是把渲染VNode渲染成真实DOM
    // 调用时机有两个：1. 首次渲染 2. 数据更新

    // 在 vm._update 的过程中，把当前的 vm 赋值给 activeInstance，
    // 同时通过 const prevActiveInstance = activeInstance 
    // 用prevActiveInstance 保留上一次的 activeInstance。
    // 实际上，prevActiveInstance 和当前的 vm 是一个父子关系，
    // 当一个 vm 实例完成它的所有子树的 patch 或者 update 过程后，
    // activeInstance 会回到它的父实例，
    // 这样就完美地保证了 createComponentInstanceForVnode 整个深度遍历过程中，
    // 我们在实例化子组件的时候能传入当前子组件的父 Vue 实例，
    // 并在 _init 的过程中，执行initLifecycle，通过 vm.$parent 把这个父子关系保留。
    Vue.prototype._update = function (vnode, hydrating) {
      var vm = this;
      // 数据更新时使用的变量
      var prevEl = vm.$el;
      var prevVnode = vm._vnode;
      // 把当前的 vm 赋值给 activeInstance 即保存当前的activeInstance 
      // 为了保证 子组件new Sub()时，能获取到它的父级vm实例，确保在initLifecycle时，建立父子关系
      // 这样子组件再去创建孙子组件时，孙子组件就能获取到它的父vm实例
      var restoreActiveInstance = setActiveInstance(vm);

      // vm._vnode  _vnode 是当前的经过render方法执行的渲染vnode
      vm._vnode = vnode;
      // 实例上 vm.$vnode 是组件在父组件中的占位符VNode
      // vm.$vnode 和 vm._vnode 是父子关系 （vm.$vnode是父） 
      // 代码表达就是 vm._vnode.parent === vm.$vnode  在render.js中赋值

      // Vue.prototype.__patch__ is injected in entry points
      // based on the rendering backend used.
      // _update()方法的核心是调用__patch__()方法
      if (!prevVnode) {
        // initial render
        // 首次渲染 子组件的vm.$el是undefined
        vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */);
      } else {
        // updates
        // 数据更新
        vm.$el = vm.__patch__(prevVnode, vnode);
      }

      // 恢复activeInstance为当前实例
      restoreActiveInstance();

      // update __vue__ reference
      if (prevEl) {
        prevEl.__vue__ = null;
      }
      if (vm.$el) {
        vm.$el.__vue__ = vm;
      }
      // if parent is an HOC, update its $el as well
      if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
        vm.$parent.$el = vm.$el;
      }
      // updated hook is called by the scheduler to ensure that children are
      // updated in a parent's updated hook.
    };

    /**
     * 调用渲染 watcher 的 update 方法，让渲染 watcher 对应的回调函数执行，也就是触发了组件的重新渲染
     * 之所以这么做是因为Vue通常是数据驱动视图重新渲染，但是在整个异步组件加载过程中是没有数据发生变化的，
     * 所以通过执行 $forceUpdate 可以强制组件重新渲染一次
     * 
     * 强制执行渲染watcher的update
     *  最终会执行到updateComponent vm._update(vm._render(), hydrating)
     *  再执行patch
     */
    Vue.prototype.$forceUpdate = function () {
      var vm = this;
      if (vm._watcher) {
        vm._watcher.update();
      }
    };

    Vue.prototype.$destroy = function () {
      var vm = this;
      if (vm._isBeingDestroyed) {
        return
      }
      /**
       * 生命周期函数 beforeDestroy
       *  执行时机：
       *  执行顺序：先父后子
       */
      callHook(vm, 'beforeDestroy');
      vm._isBeingDestroyed = true;
      // remove self from parent
      // 从parent的$children中删掉自身
      var parent = vm.$parent;
      if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
        remove(parent.$children, vm);
      }

      // teardown watchers
      // 删除watcher
      if (vm._watcher) {
        vm._watcher.teardown();
      }
      var i = vm._watchers.length;
      while (i--) {
        vm._watchers[i].teardown();
      }

      // remove reference from data ob
      // frozen object may not have observer.
      if (vm._data.__ob__) {
        vm._data.__ob__.vmCount--;
      }
      // call the last hook...
      vm._isDestroyed = true;
      /**
       * 执行组件销毁 会触发递归执行销毁
       */
      // invoke destroy hooks on current rendered tree
      vm.__patch__(vm._vnode, null);
      /**
       * 生命周期函数 destroyed
       *  执行时机
       *  执行顺序：先子后父
       */
      // fire destroyed hook
      callHook(vm, 'destroyed');

      // turn off all instance listeners.
      vm.$off();
      // remove __vue__ reference
      if (vm.$el) {
        vm.$el.__vue__ = null;
      }
      // release circular reference (#6759)
      if (vm.$vnode) {
        vm.$vnode.parent = null;
      }
    };
  }

  // mountComponent 方法会完成整个DOM渲染工作
  function mountComponent (
    vm,
    el,
    hydrating
  ) {
    // $el Vue实例使用的根DOM元素
    vm.$el = el;
    // render不存在 命中处理
    if (!vm.$options.render) {
      // render不存在，创建空的VNode
      vm.$options.render = createEmptyVNode;
      // 警告提示
      {
        /* istanbul ignore if */
        if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
          vm.$options.el || el) {
          warn(
            'You are using the runtime-only build of Vue where the template ' +
            'compiler is not available. Either pre-compile the templates into ' +
            'render functions, or use the compiler-included build.',
            vm
          );
        } else {
          warn(
            'Failed to mount component: template or render function not defined.',
            vm
          );
        }
      }
    }

    /**
     * 生命周期函数 beforeMount
     *  执行时机 $mount执行时，DOM挂载之前
     *  执行顺序 先父后子
     */
    callHook(vm, 'beforeMount');

    var updateComponent;
    /* istanbul ignore if */
    if (config.performance && mark) {
      updateComponent = function () {
        var name = vm._name;
        var id = vm._uid;
        var startTag = "vue-perf-start:" + id;
        var endTag = "vue-perf-end:" + id;

        mark(startTag);
        var vnode = vm._render();
        mark(endTag);
        measure(("vue " + name + " render"), startTag, endTag);

        mark(startTag);
        vm._update(vnode, hydrating);
        mark(endTag);
        measure(("vue " + name + " patch"), startTag, endTag);
      };
    } else {
      // 渲染Watcher会在实例化时和更新时执行DOM渲染
      updateComponent = function () {
        // 先 vm._render() 生成虚拟Node
        // 虚拟Node其实是vm._render()内部调用createElement()方法的返回值vnode
        // vm._update() 更新DOM
        vm._update(vm._render(), hydrating);
      };
    }

    // we set this to vm._watcher inside the watcher's constructor
    // since the watcher's initial patch may call $forceUpdate (e.g. inside child
    // component's mounted hook), which relies on vm._watcher being already defined
    /**
     * 实例化渲染Watcher
     *  观察者模式
     * Watcher 在这里起到两个作用：
     *  1. 初始化的时候会执行回调函数updateComponent
     *  2. 当vm实例中的监测的数据发生变化的时候执行回调函数updateComponent
     */
    new Watcher(vm, updateComponent, noop, {
      before: function before () {
        if (vm._isMounted && !vm._isDestroyed) {
          /**
           * 生命周期函数 beforeUpdate
           * 执行时机：flushSchedulerQueue执行每个queue中的watcher时
           * 执行顺序：
           */
          callHook(vm, 'beforeUpdate');
        }
      }
    }, true /* isRenderWatcher */);
    hydrating = false;

    // manually mounted instance, call mounted on self
    // mounted is called for render-created child components in its inserted hook
    // vm.$vnode表示Vue实例的占位符VNode，它为Null则表示当前是根Vue的实例
    if (vm.$vnode == null) {
      // vm._isMounted为true，表示这个实例已经挂载了
      vm._isMounted = true;
      // 同时执行 mounted 钩子函数
      // Hook mounted
      /**
       * 生命周期函数 mounted 
       * 调用时机1 用户外部调用new Vue()
       *  执行时机：用户外部new Vue()调用$mount挂载根节点 DOM挂载之后
       *  执行顺序：先子后父 最后执行 在 调用时机2 中全部执行完之后执行
       */
      callHook(vm, 'mounted');
    }
    return vm
  }

  /**
   * 更新父组件中子组件占位符对应的组件实例 
   *  因为更新了父组件中子组件占位符VNode，那么VNode对应的组件实例vm的一系列属性也会发生变化，
   *  如父组件App中引入子组件HelloWorld，App更新了，HelloWorld对应会更新，
   *  包括占位符vm.$vnode的更新、slot的更新，listeners的更新，props的更新等等
   * @param {*} vm              需要更新的子组件实例
   * @param {*} propsData       更新后的props
   * @param {*} listeners       更新后的listeners
   * @param {*} parentVnode     需要更新的子组件占位符VNode节点
   * @param {*} renderChildren  新的子组件的children
   */
  function updateChildComponent (
    vm,
    propsData,
    listeners,
    parentVnode,
    renderChildren
  ) {
    {
      isUpdatingChildComponent = true;
    }

    // determine whether component has slot children
    // we need to do this before overwriting $options._renderChildren.

    // check if there are dynamic scopedSlots (hand-written or compiled but with
    // dynamic slot names). Static scoped slots compiled from template has the
    // "$stable" marker.
    var newScopedSlots = parentVnode.data.scopedSlots;
    var oldScopedSlots = vm.$scopedSlots;
    // 是否有动态插槽
    var hasDynamicScopedSlot = !!(
      (newScopedSlots && !newScopedSlots.$stable) ||
      (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
      (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key) ||
      (!newScopedSlots && vm.$scopedSlots.$key)
    );

    // Any static slot children from the parent may have changed during parent's
    // update. Dynamic scoped slots may also have changed. In such cases, a forced
    // update is necessary to ensure correctness.
    var needsForceUpdate = !!(
      renderChildren ||               // has new static slots
      vm.$options._renderChildren ||  // has old static slots
      hasDynamicScopedSlot
    );
    
    // 更新子组件实例vm的占位符VNode
    vm.$options._parentVnode = parentVnode;
    // 更新子组件实例的组件占位符VNode
    vm.$vnode = parentVnode; // update vm's placeholder node without re-render

    if (vm._vnode) { // update child tree's parent
      // 更新子组件实例vm的渲染VNode的父占位符VNode
      vm._vnode.parent = parentVnode;
    }
    vm.$options._renderChildren = renderChildren;

    // update $attrs and $listeners hash
    // these are also reactive so they may trigger child update if the child
    // used them during render
    // 更新vm.$attrs 和 vm.$listeners
    vm.$attrs = parentVnode.data.attrs || emptyObject;
    vm.$listeners = listeners || emptyObject;

    // 更新子组件实例的props
    // update props
    if (propsData && vm.$options.props) {
      // 对于对象的prop值，子组件的prop值始终指向父组件的prop值，只要父组件的prop值变化，
      // 就会触发子组件的重新渲染，所以这个observe过程是可以省略的
      toggleObserving(false);
      var props = vm._props; // 子组件的props值
      var propKeys = vm.$options._propKeys || []; // 子组件中所有的prop的key
      for (var i = 0; i < propKeys.length; i++) {
        var key = propKeys[i];
        var propOptions = vm.$options.props; // wtf flow?
        // 遍历propKeys，然后执行props[key] = validateProp(key, propOptions, propsData, vm)
        // 重新验证和计算新的prop数据，更新vm._props，也就是子组件的props，这个就是子组件props的更新过程
        // props[key]在赋值过程中，会触发此数据的setter，
        // 那么就会触订阅了此数据依赖数据Dep派发更新，组件的渲染Watcher会执行子组件的更新
        props[key] = validateProp(key, propOptions, propsData, vm);
      }
      toggleObserving(true);
      // keep a copy of raw propsData
      // 对props中的数据做一次拷贝，并在拷贝中阻止依赖收集
      // 因为只是更新子组件vm的props，不需要依赖收集
      vm.$options.propsData = propsData;
    }

    // update listeners
    listeners = listeners || emptyObject;
    var oldListeners = vm.$options._parentListeners;
    vm.$options._parentListeners = listeners;
    updateComponentListeners(vm, listeners, oldListeners);

    // resolve slots + force update if has children
    if (needsForceUpdate) {
      // 旧插槽语法slot="xxx"添加的具名插槽 和 默认插槽  会执行这里 它们的渲染作用域是父级
      // 所以旧语法的依赖收集，会收集父组件的Watcher，那么父组件执行时，有数据发生变化，会执行这里强制更新插槽组件；
      // 而新语法的依赖收集，收集的是子插槽组件，不会执行到这里，派发通知会派发到子插槽组件上
      // 有子VNode 重新去解析插槽内容 父组件更新，子插槽组件需要重新计算$slots
      vm.$slots = resolveSlots(renderChildren, parentVnode.context);
      // 重新强制渲染
      vm.$forceUpdate();
    }

    {
      isUpdatingChildComponent = false;
    }
  }

  /**
   * 判断是否是不活跃的keep-alive组件树
   * 如果返回true，即是不活跃的，说明此keep-alive组件的父级中还有keep-alive组件，
   * 且父级的keep-alive组件标识了它的子组件都是不活跃的
   * @param {*} vm 
   * @returns 
   */
  function isInInactiveTree (vm) {
    while (vm && (vm = vm.$parent)) {
      // 遍历当前vm的父级vm，如果发现父级是不活跃的，标识当前vm是不活跃的
      if (vm._inactive) { return true } // 命中，说明当前keep-alive包裹的子组件上方还有keep-alive组件包裹，且标识了它的子组件都是不活跃的
    }
    return false
  }

  /**
   * 执行keep-alive子组件的activated生命周期函数
   * @param {*} vm 
   * @param {*} direct 是否是keep-alive直接(根)子组件
   * @returns 
   */
  function activateChildComponent (vm, direct) {
    if (direct) { // 是keep-alive直接子组件
      vm._directInactive = false; // 根不活跃标识 置为 false 即 标识当前根是活跃的
      if (isInInactiveTree(vm)) {
        // 当前vm的父级有不活跃标识_inactive为true 不处理
        return
      }
    } else if (vm._directInactive) {
      // 当前vm是不活跃的根vm 不处理
      return
    }
    if (vm._inactive || vm._inactive === null) {
      // 当前vm是不活跃的keep-alive子组件
      vm._inactive = false; // 置为活跃的
      for (var i = 0; i < vm.$children.length; i++) {
        // 子组件也递归调用此方法 执行子组件的activated
        activateChildComponent(vm.$children[i]);
      }
      // 执行当前vm的activated生命周期函数
      callHook(vm, 'activated');
    }
  }

  /**
   * 执行keep-alive子组件的deactivated生命周期函数
   * @param {*} vm 
   * @param {*} direct 是否是keep-alive直接(根)子组件
   * @returns 
   */
  function deactivateChildComponent (vm, direct) {
    if (direct) { // 是keep-alive直接子组件
      vm._directInactive = true;
      if (isInInactiveTree(vm)) {
        // 当前vm的父级有不活跃标识_inactive为true 不处理
        return
      }
    }
    if (!vm._inactive) {
      // 当前vm组件是活跃的keep-alive子组件
      vm._inactive = true; // 置为不活跃的
      for (var i = 0; i < vm.$children.length; i++) {
        deactivateChildComponent(vm.$children[i]);
      }
      // 执行当前vm的deactivated生命周期函数
      callHook(vm, 'deactivated');
    }
  }

  /**
   * 执行组件生命周期函数
   * @param {*} vm    组件实例
   * @param {*} hook  生命周期函数字符串
   */
  function callHook (vm, hook) {
    // #7573 disable dep collection when invoking lifecycle hooks
    pushTarget();
    // 获取对应的生命周期 是一个数组 （mergeOptions中处理的）
    var handlers = vm.$options[hook];
    var info = hook + " hook";
    if (handlers) {
      for (var i = 0, j = handlers.length; i < j; i++) {
        // 执行生命周期函数
        invokeWithErrorHandling(handlers[i], vm, null, vm, info);
      }
    }
    if (vm._hasHookEvent) {
      vm.$emit('hook:' + hook);
    }
    popTarget();
  }

  /*  */

  var MAX_UPDATE_COUNT = 100;

  var queue = []; // 待更新的Watcher数组
  var activatedChildren = []; // keep-alive使用
  var has = {}; // 记录queue中的Watcher.id，避免Watcher重复添加
  var circular = {}; // Watcher的循环更新次数计数
  var waiting = false; // 是否在执行nextTick，保证只执行一次
  var flushing = false; // 是否在flushing阶段
  var index = 0; // 当前正执行的Watcher的queue索引

  /**
   * Reset the scheduler's state.
   * flushSchedulerQueue执行结束，重置上方定义的scheduler状态
   */
  function resetSchedulerState () {
    index = queue.length = activatedChildren.length = 0;
    has = {};
    {
      circular = {};
    }
    waiting = flushing = false;
  }

  // Async edge case #6566 requires saving the timestamp when event listeners are
  // attached. However, calling performance.now() has a perf overhead especially
  // if the page has thousands of event listeners. Instead, we take a timestamp
  // every time the scheduler flushes and use that for all event listeners
  // attached during that flush.
  var currentFlushTimestamp = 0;

  // Async edge case fix requires storing an event listener's attach timestamp.
  var getNow = Date.now;

  // Determine what event timestamp the browser is using. Annoyingly, the
  // timestamp can either be hi-res (relative to page load) or low-res
  // (relative to UNIX epoch), so in order to compare time we have to use the
  // same timestamp type when saving the flush timestamp.
  // All IE versions use low-res event timestamps, and have problematic clock
  // implementations (#9632)
  if (inBrowser && !isIE) {
    var performance = window.performance;
    if (
      performance &&
      typeof performance.now === 'function' &&
      getNow() > document.createEvent('Event').timeStamp
    ) {
      // if the event timestamp, although evaluated AFTER the Date.now(), is
      // smaller than it, it means the event is using a hi-res timestamp,
      // and we need to use the hi-res version for event listener timestamps as
      // well.
      getNow = function () { return performance.now(); };
    }
  }

  /**
   * Flush both queues and run the watchers.
   * 清空要更新的Watcher队列，同时执行队列中的所有Watcher
   */
  function flushSchedulerQueue () {
    currentFlushTimestamp = getNow();
    flushing = true; // flushing阶段开始
    var watcher, id;

    // Sort queue before flush.
    // This ensures that:
    // 1. Components are updated from parent to child. (because parent is always
    //    created before the child)
    // 2. A component's user watchers are run before its render watcher (because
    //    user watchers are created before the render watcher)
    // 3. If a component is destroyed during a parent component's watcher run,
    //    its watchers can be skipped.
    /**
     * Watcher队列从小到达排序
     * 原因：
     *    1.组件的更新由⽗到⼦；因为⽗组件的创建过程是先于⼦的，所以Watcher的创建
     *      也是先⽗后⼦，执⾏顺序也应该保持先⽗后⼦
     *    2.用户的自定义watcher要优先于渲染watcher执⾏；因为用户自定义Watcher是在
     *      渲染Watcher之前创建的
     *    3.如果⼀个组件在⽗组件的Watcher执⾏期间被销毁，那么它对应的Watcher执⾏都可以
     *      被跳过，所以⽗组件的Watcher应该先执⾏。
     */
    queue.sort(function (a, b) { return a.id - b.id; });

    // do not cache length because more watchers might be pushed
    // as we run existing watchers
    // 在遍历的时候每次都会对queue.length求值，因为在watcher.run()时，即flushing阶段，
    // 很可能用户会再次添加新的Watcher，这样会再次执行到queueWatcher()方法
    for (index = 0; index < queue.length; index++) {
      watcher = queue[index];
      if (watcher.before) {
        // 渲染Watcher中有before就执行 beforeUpdate钩子在这里调用执行
        watcher.before();
      }

      id = watcher.id;
      // 将执行的Watcher的id记录置为null
      has[id] = null;
      
      // 重新执行Watcher Watcher是渲染Watcher或userWatcher
      watcher.run();

      // in dev build, check and stop circular updates.
      // 无线循环Watcher检测和终止
      if (has[id] != null) {
        // Watcher的循环更新次数+1
        circular[id] = (circular[id] || 0) + 1;
        if (circular[id] > MAX_UPDATE_COUNT) {
          // Watcher的循环更新次数大于最大更新数，警告并结束循环
          warn(
            'You may have an infinite update loop ' + (
              watcher.user
                ? ("in watcher with expression \"" + (watcher.expression) + "\"")
                : "in a component render function."
            ),
            watcher.vm
          );
          break
        }
      }
    }

    // keep copies of post queues before resetting state
    var activatedQueue = activatedChildren.slice(); // 复制要执行activated生命周期的组件
    // 已经执行过更新的Watcher队列
    var updatedQueue = queue.slice();
    // 重置scheduler状态 
    resetSchedulerState(); // flushing阶段结束

    // call component updated and activated hooks
    callActivatedHooks(activatedQueue); // 执行生命周期activated
    /**
     * 生命周期函数 updated
     *  执行时机：queue中的每个watcher都执行后
     *  执行顺序：先父后子
     */
    callUpdatedHooks(updatedQueue);

    // devtool hook
    /* istanbul ignore if */
    if (devtools && config.devtools) {
      devtools.emit('flush');
    }
  }

  /**
   * 已经执行过更新的Watcher队列，
   * 执行所有Watcher.vm实例的updated生命周期函数 
   */
  function callUpdatedHooks (queue) {
    var i = queue.length;
    // 遍历queue中所有Watcher
    while (i--) {
      var watcher = queue[i];
      var vm = watcher.vm;
      if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
        // 命中：watcher是渲染watcher，且已挂载，且未销毁
        // 生命周期函数 updated
        callHook(vm, 'updated');
      }
    }
  }

  /**
   * Queue a kept-alive component that was activated during patch.
   * The queue will be processed after the entire tree has been patched.
   * 保存更新时的keep-alive子组件队列 在更新watcher.run()执行后，去执行此队列
   */
  function queueActivatedComponent (vm) {
    // setting _inactive to false here so that a render function can
    // rely on checking whether it's in an inactive tree (e.g. router-view)
    vm._inactive = false;
    activatedChildren.push(vm);
  }

  /**
   * 执行所有keep-alive子组件的activated生命周期函数
   * @param {*} queue 
   */
  function callActivatedHooks (queue) {
    for (var i = 0; i < queue.length; i++) {
      queue[i]._inactive = true;
      activateChildComponent(queue[i], true /* true */);
    }
  }

  /**
   * Push a watcher into the watcher queue.
   * Jobs with duplicate IDs will be skipped unless it's
   * pushed when the queue is being flushed.
   * 派发更新时要更新的Watcher队列
   *  好处：非flushing阶段，同一个Watcher在一次tick可能会触发多次更新，但更新只执行一次更新
   *  实现：同一个Watcher在一个tick中的多个数据更新并不会每次数据改变都触发
   *        watcher的回调，⽽是把这些Watcher先添加到⼀个队列queue⾥，
   *        并且同一个Watcher在未flushing阶段只会添加一次到queue队列中，
   *        然后在nextTick中执⾏flushSchedulerQueue()
   *        保证一个tick中虽然触发多次更新，但实际会将多次更新合并成一次执行
   */
  function queueWatcher (watcher) {
    var id = watcher.id;
    if (has[id] == null) { // 未添加的Watcher
      /**
       * has对象保存Watcher的id，保证同一个Watcher只会添加一次
       * 保证同一个Watcher在一次tick中只执行一次更新
       */
      has[id] = true;

      if (!flushing) {
        // 非flushing阶段 将Watcher推入queue
        queue.push(watcher);
      } else {
        // flushing阶段 将Watcher根据它的id插入到queue队列
        // if already flushing, splice the watcher based on its id
        // if already past its id, it will be run next immediately.
        var i = queue.length - 1; // 初始化插入queue的索引
        while (i > index && queue[i].id > watcher.id) {
          // 待插入Watcher索引i大于当前正执行的Watcher索引index
          // 并且待插入Watcher.id大于当前队列中Watcher.id
          // 目的是获取queue中未执行的后一段队列，
          // 确定插入id正好大于前一个id，小于后一个id的索引位置
          i--;
        }
        // 将Watcher根据索引位置插入Watcher队列
        queue.splice(i + 1, 0, watcher);
      }

      // queue the flush
      if (!waiting) {
        // waiting 保证对nextTick(flushSchedulerQueue)只调用一次
        waiting = true;

        if (!config.async) {
          // 非生产环境且非异步
          flushSchedulerQueue();
          return
        }
        // 异步执行 下一个tick执行flushSchedulerQueue
        nextTick(flushSchedulerQueue);
      }
    }
  }

  /*  */



  var uid$2 = 0;

  /**
   * A watcher parses an expression, collects dependencies,
   * and fires callback when the expression value changes.
   * This is used for both the $watch() api and directives.
   */
  var Watcher = function Watcher (
    vm,
    expOrFn,
    cb,
    options,
    isRenderWatcher
  ) {
    this.vm = vm;

    if (isRenderWatcher) {
      // _watcher是监听vm上数据变化然后重新渲染的，所以它是一个渲染相关的watcher
      // 当前watcher实例是 渲染watcher，将此watcher添加到vm实例的_watcher上
      vm._watcher = this;
    }
    // 将当前watcher添加到vm实例的_watchers数组中
    vm._watchers.push(this);

    // options
    if (options) {
      /**
       * Watcher实例化时options
       *1. deep 侦听属性的userWatcher深度监听标志位
       *2. user 侦听属性的userWatcher标志位
       *3. lazy 计算属性的computedWatcher标志位
       *4. sync 侦听属性的userWatcher同步执行标志位 默认的所有类型Watcher都是异步执行的
       *5. before 渲染Watcher执行run前的回调函数，触发beforeUpdate生命周期函数
       */
      this.deep = !!options.deep;
      this.user = !!options.user;
      this.lazy = !!options.lazy;
      this.sync = !!options.sync;
      this.before = options.before;
    } else {
      // options未传值 默认都为false
      this.deep = this.user = this.lazy = this.sync = false;
    }

    // Watcher的回调函数
    this.cb = cb;
    // Watcher唯一标识id
    this.id = ++uid$2; // uid for batching
    this.active = true;
    // computedWatcher使用此标志位 来决定是否evaluate()
    this.dirty = this.lazy; // for lazy watchers
      
    /**
     * Watcher和Dep之间的关系：
     *Watcher会依赖很多数据，所以会订阅数据的Dep
     *1. Watcher会订阅自己关注的依赖数据Dep，数据变化时，Dep会通知Watcer；
     *   这个订阅关系存储在Dep.subs中
     *2. 一个Watcher会关注多个依赖数据Dep，因为一个vm实例中会有很多用户的数据；
     *   一个Dep中也会有多个订阅Watcher，因为一个数据可能被多个Watcher关注
     * 
     * Dep相关属性
     *1. this.deps和this.newDeps表示Watcher实例持有的Dep实例的数组
     *2. this.depIds和this.newDepIds分别代表this.deps和this.newDeps的id Set
     * 
     * this.deps保存了此Watcher关注的依赖数据Dep；Dep中又保存了订阅此Dep的Watcher
     */
    this.deps = []; // 旧的Dep实例的数组
    this.newDeps = []; // 新的Dep实例的数组
    this.depIds = new _Set(); // 旧的Dep的id Set
    this.newDepIds = new _Set(); // 新的Dep的id Set

    // 非production环境 expOrFn转成字符串
    this.expression = expOrFn.toString();
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      // expOrFn是函数，将它赋值给getter
      this.getter = expOrFn;
    } else {
      /**
       * 解析expOrFn，赋值给getter
       *userWatcher使用来解析字符串表达式，如a.b.c
       */
      this.getter = parsePath(expOrFn);
      if (!this.getter) {
        this.getter = noop;
        // expOrFn作为字符串，只能是用点分隔符连接
        warn(
          "Failed watching path: \"" + expOrFn + "\" " +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        );
      }
    }

    this.value = this.lazy
      // 计算属性computedWatcher不立即求值 
      ? undefined
      /**
       * 非lazy下直接进行一次Watcher求值
       *1. renderWatcher
       *2. userWatcher
       */
      : this.get();
  };

  /**
   * Evaluate the getter, and re-collect dependencies.
   * 依赖收集
   */
  Watcher.prototype.get = function get () {
    // 将当前的Watcher，作为当前正在计算的Watcher 
    pushTarget(this);

    var value;
    var vm = this.vm;
    try {
      /**
       * 执行getter
       *1. renderWatcher 渲染Watcher $mount()时getter就是mountComponent()中的updateComponent()，
       *   进行DOM渲染，并完成当前vm的数据依赖收集
       *2. userWatcher 用户定义的侦听属性的Watcher 执行获取侦听的key的值
       *3. computedWatcher 计算属性的Watcher 执行用户定义的计算属性的函数
       * getter中访问到的数据，会触发这些数据的getter，那么会触发当前Watcher关注的数据的Dep进行依赖收集
       */
      value = this.getter.call(vm, vm);
    } catch (e) {
      if (this.user) {
        handleError(e, vm, ("getter for watcher \"" + (this.expression) + "\""));
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        // 深度监听，对value进行递归访问，触发它所有子项的getter
        // 完成value的所有属性都对userWatcher进行依赖收集
        traverse(value);
      }
      // 当前vm的数据依赖收集已经完成，那么对应的渲染Dep.target也需要改变
      // 所以pop掉当前的Watcher，恢复上次正在计算的Watcher 
      popTarget();
      // 清除一些依赖收集
      this.cleanupDeps();
    }
    return value
  };

  /**
   * Add a dependency to this directive.
   * 依赖收集 每次渲染都添加一次新的newDepIds、newDeps
   * 将Watcher的依赖数据Dep记录到Watcher中
   * 将依赖此Dep数据的Watcher添加到此Dep的subs中
   */
  Watcher.prototype.addDep = function addDep (dep) {
    var id = dep.id;
    if (!this.newDepIds.has(id)) {
      // 新的newDepIds中没有这个dep的id
      // 记录此依赖数据Dep的id
      this.newDepIds.add(id);
      // 记录此依赖数据Dep到Watcher的新依赖newDeps中
      this.newDeps.push(dep);
      if (!this.depIds.has(id)) {
        // 新的newDepIds中没有dep.id 旧的depIds中也没有这个dep的id
        // 表示对于此依赖数据Dep这是一个新的订阅Watcher
        // 将新的订阅Watcher push到此依赖数据Dep的subs中
        // 这时，这个Watcher也会是这个数据的订阅者
        dep.addSub(this);
      }
    }
  };

  /**
   * Clean up for dependency collection.
   * 清除一些不再关注的数据依赖收集
   * 
   * 当我们满足某种条件的时候渲染a的时候，会访问到a中的数据，这时候我们对a使用的数据添
   * 加了getter，做了依赖收集，那么当我们去修改a的数据的时候，理应通知到这些订阅者。那么如
   * 果我们一旦改变了条件渲染了b模板，又会对b使用的数据添加了getter，如果我们没有依赖移
   * 除的过程，那么这时候我去修改a模板的数据，会通知a数据的订阅的回调，这显然是有浪费的。
   * 
   * 因此Vue设计了在每次添加完新的订阅，会移除掉旧的订阅，这样就保证了在我们刚才的场景中，
   * 如果渲染b模板的时候去修改a模板的数据，a数据订阅回调已经被移除了，所以不会有任何浪费
   */
  Watcher.prototype.cleanupDeps = function cleanupDeps () {
    var i = this.deps.length;
    while (i--) {
      var dep = this.deps[i];
      if (!this.newDepIds.has(dep.id)) {
        // 移除newDepIds中没有记录的dep的Watcher
        // 即移除新的Watcher中不再关注的依赖数据Dep
        // 也就是在Dep中删除此Watcher的订阅
        dep.removeSub(this);
      }
    }

    /**
     * 结束后，清空旧数据，新数据当作旧数据保存
     */
    // 将新的newDepIds作为旧的depIds保存
    // 清空旧的depIds Set，作为newDepIds的新Set
    var tmp = this.depIds;
    this.depIds = this.newDepIds;
    this.newDepIds = tmp;
    this.newDepIds.clear();
    // 将新的newDeps作为旧的deps保存
    // 清空旧的deps数组，作为新的newDeps的数组
    tmp = this.deps;
    this.deps = this.newDeps;
    this.newDeps = tmp;
    this.newDeps.length = 0;
  };

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  Watcher.prototype.update = function update () {
    /* istanbul ignore else */
    if (this.lazy) {// lazy为true 计算属性的computedWatcher
      // 重新设置dirty为true 方便下次访问计算属性求值
      this.dirty = true;
    } else if (this.sync) {
      // userWatcher 同步计算 直接执行run
      this.run();
    } else {
      // 渲染Watcher 和 非sync的userWatcher
      queueWatcher(this);
    }
  };

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  Watcher.prototype.run = function run () {
    if (this.active) {
      /**
       * 对Watcher进行重新求值
       *1. 渲染Watcher会重新渲染
       */
      var value = this.get();
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        /**
         * 1. 新值和旧值不相等 如果计算值不变，不会触发重新渲染
         * 2. 或 新值是对象
         * 3. 或 deep为真
         */
        // set new value
        var oldValue = this.value;
        this.value = value;
        if (this.user) {
          // userWatcher 用户定义侦听属性的Watcher，执行回调并处理错误
          var info = "callback for watcher \"" + (this.expression) + "\"";
          invokeWithErrorHandling(this.cb, this.vm, [value, oldValue], this.vm, info);
        } else {
          // 执行渲染Watcher的回调 noop()
          this.cb.call(this.vm, value, oldValue);
        }
      }
    }
  };

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   * 计算Watcher的值 该方法仅被lazy watchers 即computedWatcher调用
   */
  Watcher.prototype.evaluate = function evaluate () {
    /**
     * 计算属性getter在调用时，才进行computedWatcher的求值
     *computedWatcher在求值中，会触发computedWatcher关注的响应式key的Dep进行依赖收集，
     *那么key的Dep.subs会保存此computedWatcher，即computedWatcher订阅了此key的变化，
     *key发生变化时，会再触发computedWatcher进行evaluate()
     */
    this.value = this.get();
    this.dirty = false; // 求值后dirty置为false，表示计算属性已经求值
  };

  /**
   * Depend on all deps collected by this watcher.
   * 触发与此Watcher相关的dep依赖收集
   *1. computedWatcher会调用此方法，触发关注此计算属性的渲染Watcher或userWatcher去订阅此Dep
   *   那么，此计算属性的数据依赖Dep.subs中会push此渲染Watcher或userWatcher
   */
  Watcher.prototype.depend = function depend () {
    var i = this.deps.length;
    while (i--) {
      this.deps[i].depend();
    }
  };

  /**
   * Remove self from all dependencies' subscriber list.
   */
  Watcher.prototype.teardown = function teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this);
      }
      var i = this.deps.length;
      while (i--) {
        this.deps[i].removeSub(this);
      }
      this.active = false;
    }
  };

  /*  */

  var sharedPropertyDefinition = {
    enumerable: true,
    configurable: true,
    get: noop,
    set: noop
  };

  /**
   * 代理target[sourceKey][key]的访问到target[key]上
   *  为Vue组件构造函数添加的props和data添加代理访问方式
   *  这样可以通过vm.xxx访问到vm._props.xxx或vm._data.xxx
   * @param {*} target 
   * @param {*} sourceKey 
   * @param {*} key 
   */
  function proxy (target, sourceKey, key) {
    sharedPropertyDefinition.get = function proxyGetter () {
      return this[sourceKey][key]
    };
    sharedPropertyDefinition.set = function proxySetter (val) {
      this[sourceKey][key] = val;
    };
    Object.defineProperty(target, key, sharedPropertyDefinition);
  }

  /**
   * Vue会把props、data等变成响应式对象，在创建响应式对象过程中，
   * 发现子属性也为对象则递归把该对象变成响应式的；
   * 这样，整个data无论有多少层嵌套，任何属性都是响应式的，即整个对象是响应式对象
   * @param {*} vm 
   */
  function initState (vm) {
    vm._watchers = [];
    var opts = vm.$options;
    // 初始化 props
    if (opts.props) { initProps(vm, opts.props); }
    // 初始化 methods
    if (opts.methods) { initMethods(vm, opts.methods); }
    // 初始化 data
    if (opts.data) {
      initData(vm);
    } else {
      observe(vm._data = {}, true /* asRootData */);
    }
    // 初始化 computed
    if (opts.computed) { initComputed(vm, opts.computed); }
    // 初始化 watch
    if (opts.watch && opts.watch !== nativeWatch) {
      initWatch(vm, opts.watch);
    }
  }

  /**
   * 初始化props
   *  1. 调用defineReactive把每个prop对应的值变成响应式，
   *     可以通过vm._props.xxx访问到定义在props中对应的属性
   *  2. 通过proxy把vm._props.xxx的访问代理到vm.xxx上
   *  目的：用户设置的props会设置_props，再对_props设置代理，props又会设置为响应式的
   *        最终实现通过vm.xxx访问到用户定义在props中对应的属性，同时props中每个属性是响应式的
   *  表示：vm.xxx -> vm._props.xxx -> vm.props.xxx
   *  原理：vm._props和vm.$options.props是指向同一个props对象的指针
   *       通过proxy后，vm.xxx访问vm._props.xxx就是访问vm.$options.props.xxx
   * @param {*} vm 
   * @param {*} propsOptions 
   */
  function initProps (vm, propsOptions) {
    // propsData只用于new创建的实例中 作用是创建实例时传递props，为了方便测试。
    var propsData = vm.$options.propsData || {};
    // 定义vm._props
    var props = vm._props = {};
    // cache prop keys so that future props updates can iterate using Array
    // instead of dynamic object key enumeration.
    // 定义vm.$options._propKeys，用来缓存props中的key
    var keys = vm.$options._propKeys = [];
    var isRoot = !vm.$parent; // vm.$parent不为真时，vm则是根实例

    // root instance props should be converted
    if (!isRoot) { // vm不是根实例
      // vm不是根实例，对于对象的prop值，子组件的prop值始终指向父组件的prop值，只要父组件的prop值变化，
      // 就会触发子组件的重新渲染，所以这个observe过程是可以省略的
      // vm是根实例，那么这个props需要递归设置程响应式的，也就不命中这里
      toggleObserving(false);
    }

    /**
     * 遍历传入的props，将props中的每一项都定义成响应式的
     */
    var loop = function ( key ) {
      // 用户传入props的key，存入vm.$options._propKeys
      keys.push(key);
      // 校验传递的props数据是否满足prop的定义规范 并返回满足规范的prop的值value
      var value = validateProp(key, propsOptions, propsData, vm);

      /* istanbul ignore else */
      { // 非生产环境
        // 将key转换成带连字符号的key  helloWorld => hello-world
        var hyphenatedKey = hyphenate(key);
        if (isReservedAttribute(hyphenatedKey) ||
            config.isReservedAttr(hyphenatedKey)) {
          // 预留属性警告
          warn(
            ("\"" + hyphenatedKey + "\" is a reserved attribute and cannot be used as component prop."),
            vm
          );
        }

        // 把每个prop对应的值变成响应式 
        // 非根实例的props时会浅设置响应式的，不递归将每个属性设置成响应式的
        defineReactive$$1(props, key, value, function () {
          if (!isRoot && !isUpdatingChildComponent) {
            // 非根实例 且 非子组件更新 说明是子组件直接更新的props
            // 直接更新props报错 开发常见错误警告 子组件修改props的警告
            warn(
              "Avoid mutating a prop directly since the value will be " +
              "overwritten whenever the parent component re-renders. " +
              "Instead, use a data or computed property based on the prop's " +
              "value. Prop being mutated: \"" + key + "\"",
              vm
            );
          }
        });
      }

      // static props are already proxied on the component's prototype
      // during Vue.extend(). We only need to proxy props defined at
      // instantiation here.
      // 对于非根实例的子组件而言，prop的代理发生在Vue.extend阶段
      // 这么做的好处是不用为每个组件实例都做一层proxy，是一种优化手段
      if (!(key in vm)) {
        // 没有在extend实例化时添加成静态属性的props[key]，设置vm._props[key]的proxy
        // 代理props
        proxy(vm, "_props", key);
      }
    };

    for (var key in propsOptions) loop( key );

    toggleObserving(true);
  }

  /**
   * 初始化data
   *  1. 通过proxy把vm._data.xxx的访问代理到vm.xxx上
   *  2. 调用observe方法观测整个data的变化，把data也变成响应式，
   *  目的：用户传入的data会设置成_data，再对_data设置代理，data又会设置为响应式的
   *       最终实现通过vm.xxx访问到定义data返回函数中对应的属性，同时data中每个属性是响应式的
   *  表示：vm.xxx -> vm._data.xxx -> vm.$options.data.xxx
   *  原理：vm._data和vm.$options.data是指向同一个data对象的指针
   *       通过proxy后，vm.xxx访问vm._data.xxx就是访问vm.$options.data.xxx
   * @param {*} vm 
   */
  function initData (vm) {
    var data = vm.$options.data;
    /**
     * data定义
     *  1. data是函数，执行getData()返回data
     *  2. data是对象，获取data对象本身
     *  3. data未定义，设置为空对象
     */
    data = vm._data = typeof data === 'function'
      ? getData(data, vm)
      : data || {};

    // [object Object] data为函数返回的值不是普通对象类型时，data默认赋值为空对象
    if (!isPlainObject(data)) {
      data = {};
      // data返回值非普通对象类型，报错提示
      warn(
        'data functions should return an object:\n' +
        'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
        vm
      );
    }

    // proxy data on instance
    // 代理实例上的data
    var keys = Object.keys(data);
    var props = vm.$options.props;
    var methods = vm.$options.methods;
    var i = keys.length;
    while (i--) {
      /**
       * data中key与props或methods中重名，对应处理，并提示警告
       *  1. 与methods重名，data覆盖methods同名key
       *  2. 与props重名，data丢掉，使用props值
       */
      var key = keys[i];
      // methods重名
      {
        if (methods && hasOwn(methods, key)) {
          warn(
            ("Method \"" + key + "\" has already been defined as a data property."),
            vm
          );
        }
      }

      // props重名
      if (props && hasOwn(props, key)) {
        warn(
          "The data property \"" + key + "\" is already declared as a prop. " +
          "Use prop default value instead.",
          vm
        );
      } else if (!isReserved(key)) {
        // 设置访问器属性
        proxy(vm, "_data", key);
      }
    }

    // observe data
    observe(data, true /* asRootData */);
  }

  /**
   * data为函数时，执行data()获取返回值
   * @param {*} data 
   * @param {*} vm 
   * @returns 
   */
  function getData (data, vm) {
    // #7573 disable dep collection when invoking data getters
    pushTarget();
    try {
      return data.call(vm, vm)
    } catch (e) {
      handleError(e, vm, "data()");
      return {}
    } finally {
      popTarget();
    }
  }

  /**
   * computedWatcher的Options
   */
  var computedWatcherOptions = { lazy: true };
  /**
   * 初始化计算属性
   * @param {*} vm 
   * @param {*} computed 
   */
  function initComputed (vm, computed) {
    // 创建保存computedWatcher的空对象
    // $flow-disable-line
    var watchers = vm._computedWatchers = Object.create(null);
    
    // computed properties are just getters during SSR
    var isSSR = isServerRendering(); // 是否是ssr渲染

    for (var key in computed) {
      var userDef = computed[key];
      // 获取用户定义的计算属性的getter
      var getter = typeof userDef === 'function' ? userDef : userDef.get;
      if (getter == null) {
        // 计算属性未定义getter警告
        warn(
          ("Getter is missing for computed property \"" + key + "\"."),
          vm
        );
      }

      if (!isSSR) {
        // create internal watcher for the computed property.
        /**
         * 创建computedWatcher
         *  使用用户定义的计算属性的key，保存到vm._computedWatchers
         *  用户定义的getter，作为Watcher.getter()
         *  computedWatcher的options参数 { lazy: true } 保证初始化时不计算getter
         */
        watchers[key] = new Watcher(
          vm,
          getter || noop,
          noop,
          computedWatcherOptions
        );
      }

      // component-defined computed properties are already defined on the
      // component prototype. We only need to define computed properties defined
      // at instantiation here.
      if (!(key in vm)) {
        // 组件定义中的计算属性已经在初始化时添加到了原型中，这边只需要定义实例化时的计算属性
        defineComputed(vm, key, userDef);
      } else {
        // data props methods中与计算属性中定义相同的key，提示警告
        if (key in vm.$data) {
          warn(("The computed property \"" + key + "\" is already defined in data."), vm);
        } else if (vm.$options.props && key in vm.$options.props) {
          warn(("The computed property \"" + key + "\" is already defined as a prop."), vm);
        } else if (vm.$options.methods && key in vm.$options.methods) {
          warn(("The computed property \"" + key + "\" is already defined as a method."), vm);
        }
      }
    }
  }

  /**
   * 定义计算属性并进行代理设置
   *  代理设置：保证计算属性vm.computed.xxx可以通过vm.xxx访问到
   * @param {*} target 
   * @param {*} key 
   * @param {*} userDef 
   */
  function defineComputed (
    target,
    key,
    userDef
  ) {
    var shouldCache = !isServerRendering();

    if (typeof userDef === 'function') {
      // 定义getter 默认函数作为getter
      sharedPropertyDefinition.get = shouldCache
        // 非服务端渲染
        ? createComputedGetter(key)
        // 服务端渲染
        : createGetterInvoker(userDef);
      // 定义setter
      sharedPropertyDefinition.set = noop;
    } else {
      // 计算属性定义getter和setter

      // 设置getter
      sharedPropertyDefinition.get = userDef.get
        ? shouldCache && userDef.cache !== false
          // 非服务端渲染 且 需cache 
          ? createComputedGetter(key)
          // 服务端渲染 或 无需cache
          : createGetterInvoker(userDef.get)
        : noop;
      
      // 设置setter
      sharedPropertyDefinition.set = userDef.set || noop;
    }

    // 访问器属性 无setter警告
    if (sharedPropertyDefinition.set === noop) {
      sharedPropertyDefinition.set = function () {
        warn(
          ("Computed property \"" + key + "\" was assigned to but it has no setter."),
          this
        );
      };
    }

    // 代理计算属性 保证计算属性vm.computed.xxx可以通过vm.xxx访问到
    Object.defineProperty(target, key, sharedPropertyDefinition);
  }

  /**
   * 非服务端渲染的计算属性getter生成器
   * @param {*} key 
   * @returns 
   */
  function createComputedGetter (key) {
    // 返回计算属性的getter
    return function computedGetter () {
      var watcher = this._computedWatchers && this._computedWatchers[key];
      if (watcher) {
        if (watcher.dirty) {
          // dirty为true，表示computedWatcher需要求值
          // 当一次渲染中多次访问同一个计算属性，除第一次访问外，访问dirty都是false，避免重复计算
          // computedWatcher会触发它关注的数据属性key的Dep进行依赖收集
          // 达到computedWatcher订阅关注的数据属性key的Dep
          // Dep是key的依赖收集实例 Dep.subs = [ fullName的computedWatcher ]
          watcher.evaluate();
        }

        if (Dep.target) {
          /**
           * Dep.target是关注此computedWatcher的Watcher，Watcher是渲染Watcher或userWatcher：
           *  1. 渲染Watcher 调用computedWatcher.depend，最终会触发渲染Watcher
           *     也订阅此计算属性关注的数据属性key的Dep，那么就达到了key发生变化，
           *     就会触发computedWatcher和渲染Watcher
           *     Dep是key的依赖收集实例 Dep.subs = [ fullName的computedWatcher，关注fullName变化的渲染Watcher ]
           *  2. userWatcher userWatcher执行和上面渲染Watcher相同的逻辑，完成对此key的Dep的订阅
           *     Dep是key的依赖收集实例 Dep.subs = [ fullName的computedWatcher，关注fullName变化的userWatcher ]
           */
          watcher.depend();
        }
        return watcher.value
      }
    }
  }

  /**
   * 服务端渲染的计算属性getter生成器
   * @param {*} fn 
   * @returns 
   */
  function createGetterInvoker(fn) {
    return function computedGetter () {
      return fn.call(this, this)
    }
  }

  /**
   * 初始化methods
   *  将methods中的方法添加到vm实例的根上，并绑定方法的this为vm实例
   * @param {*} vm 
   * @param {*} methods 
   */
  function initMethods (vm, methods) {
    var props = vm.$options.props;
    for (var key in methods) {
      {
        if (typeof methods[key] !== 'function') {
          // 非函数定义警告
          warn(
            "Method \"" + key + "\" has type \"" + (typeof methods[key]) + "\" in the component definition. " +
            "Did you reference the function correctly?",
            vm
          );
        }
        if (props && hasOwn(props, key)) {
          // 该key在props中已存在警告
          warn(
            ("Method \"" + key + "\" has already been defined as a prop."),
            vm
          );
        }
        if ((key in vm) && isReserved(key)) {
          // 该key是预留的Vue实例key警告
          warn(
            "Method \"" + key + "\" conflicts with an existing Vue instance method. " +
            "Avoid defining component methods that start with _ or $."
          );
        }
      }
      /**
       * 将methds中的方法添加到vm实例上
       *  1. method[key]不是函数赋值为空操作noop
       *  2. method[key]是函数，method[key].bind(vm) 绑定函数this为vm实例
       */
      vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm);
    }
  }

  /**
   * 初始化 watch
   * @param {*} vm 
   * @param {*} watch 
   */
  function initWatch (vm, watch) {
    /**
     * watch的key是要观察的：
     *  1. 一个字符串表达式 'a' 'a.b.c' 
     *  2. 一个函数计算结果的变化  组件中watch不可用，仅在$watch时可使用
     * 回调handler可以是
     *  1. 函数名字符串
     *  2. 普通函数
     *  3. 对象 { handler, deep, immediate }
     *  4. 数组 元素是1 2 3的任意类型
     */
    for (var key in watch) {
      var handler = watch[key];
      if (Array.isArray(handler)) {
        // watch的回调是一个回调数组
        for (var i = 0; i < handler.length; i++) {
          createWatcher(vm, key, handler[i]);
        }
      } else {
        createWatcher(vm, key, handler);
      }
    }
  }

  /**
   * 创建userWatcher
   *  本质是将数据进行标准化处理，最终调用$watch方法
   * @param {*} vm 
   * @param {*} expOrFn 要侦听的表达式或函数
   * @param {*} handler 侦听回调 是普通函数、对象 或 字符串
   * @param {*} options { deep, immediate, handler }
   * @returns 
   */
  function createWatcher (
    vm,
    expOrFn,
    handler,
    options
  ) {
    if (isPlainObject(handler)) {
      // handler是对象
      options = handler;
      handler = handler.handler;
    }
    
    if (typeof handler === 'string') {
      // handler是字符串
      // 此时handler已经经过代理，是vm实例上的一个属性，handler定义在methods中
      handler = vm[handler];
    }
    // 调用$watch方法
    return vm.$watch(expOrFn, handler, options)
  }

  /**
   * 混入state相关原型属性和方法
   *  属性
   *    Vue.prototype.$data
   *    Vue.prototype.$props
   *  方法
   *    Vue.prototype.$set()
   *    Vue.prototype.$delete() 
   *    Vue.prototype.$watch()
   */
  function stateMixin (Vue) {
    // flow somehow has problems with directly declared definition object
    // when using Object.defineProperty, so we have to procedurally build up
    // the object here.
    // 定义$data和$props
    var dataDef = {};
    dataDef.get = function () { return this._data };
    var propsDef = {};
    propsDef.get = function () { return this._props };
    // $data和$props 开发环境设置setter方法，以便提示警告
    {
      dataDef.set = function () {
        warn(
          'Avoid replacing instance root $data. ' +
          'Use nested data properties instead.',
          this
        );
      };
      propsDef.set = function () {
        warn("$props is readonly.", this);
      };
    }
    Object.defineProperty(Vue.prototype, '$data', dataDef);
    Object.defineProperty(Vue.prototype, '$props', propsDef);

    // 设置响应式 $set和$delete方法
    Vue.prototype.$set = set;
    Vue.prototype.$delete = del;

    // 设置 $watch方法
    Vue.prototype.$watch = function (
      expOrFn,
      cb,
      options
    ) {
      var vm = this;
      if (isPlainObject(cb)) {
        // cb是对象，直接调用$watch会命中
        // createWatcher会重新调用$watch，将cb处理成一个普通函数
        return createWatcher(vm, expOrFn, cb, options)
      }

      options = options || {};
      options.user = true;

      /**
       * 创建userWatcher
       * 并对侦听的属性收集依赖，让这些属性的Dep.subs中有userWatcher，
       * 以便这些监听的属性发生变更的时候，能触发用户定义的回调执行
       */
      var watcher = new Watcher(vm, expOrFn, cb, options);

      if (options.immediate) {
        // 立即执行userWatcher的用户定义handler一次
        var info = "callback for immediate watcher \"" + (watcher.expression) + "\"";
        // 此时将正在计算的Watcher Dep.target设置成undefined，
        // immediate为true，立即计算时，正在计算的渲染Watcher不关注此属性
        pushTarget();
        invokeWithErrorHandling(cb, vm, [watcher.value], vm, info);
        popTarget();
      }

      // 返回销毁userWatcher的函数
      return function unwatchFn () {
        watcher.teardown();
      }
    };
  }

  /*  */

  var uid$3 = 0;

  /**
   * 混入init相关原型方法
   *  Vue.prototype._init()
   */
  function initMixin (Vue) {
    // 使用new调用Vue构造函数时，执行Vue.prototype._init()方法
    Vue.prototype._init = function (options) {
      var vm = this;
      // a uid
      vm._uid = uid$3++;

      var startTag, endTag;
      /* istanbul ignore if */
      if (config.performance && mark) {
        startTag = "vue-perf-start:" + (vm._uid);
        endTag = "vue-perf-end:" + (vm._uid);
        mark(startTag);
      }

      // a flag to avoid this being observed
      vm._isVue = true;

      // 将用户传入的options最终merge到$options上

      // merge options
      if (options && options._isComponent) {
        // optimize internal component instantiation
        // since dynamic options merging is pretty slow, and none of the
        // internal component options needs special treatment.
        // 内部自调用 new Sub()的 merge options 
        // 自调用生成的options再做合并
        initInternalComponent(vm, options);
      } else {
        // 用户主动调用 new Vue()的merge options
        // 把Vue构造函数vm.constructor的默认options和用户自定义options做合并，到vm.$options上
        vm.$options = mergeOptions(
          // Vue.options
          resolveConstructorOptions(vm.constructor),
          options || {},
          vm
        );
      }

      // 初始化 _renderProxy
      /* istanbul ignore else */
      {
        initProxy(vm);
      }
      // expose real self
      vm._self = vm;
      // 初始化 生命周期
      initLifecycle(vm);
      // 初始化 事件
      initEvents(vm);
      // 初始化 render
      initRender(vm);
      /**
       * 生命周期函数 beforeCreate 
       *  执行时机：initLifecycle、initEvents、initRender之后
       *  执行顺序：先父后子
       *  此时获取不到 data props method watch等数据
       */
      callHook(vm, 'beforeCreate');
      initInjections(vm); // resolve injections before data/props
      // 初始化 data
      initState(vm);
      initProvide(vm); // resolve provide after data/props
      /**
       * 生命周期函数 created
       *  执行时机：initInjections、initState、initProvide之后
       *  执行顺序：先父后子
       */
      callHook(vm, 'created');

      /* istanbul ignore if */
      if (config.performance && mark) {
        vm._name = formatComponentName(vm, false);
        mark(endTag);
        measure(("vue " + (vm._name) + " init"), startTag, endTag);
      }

      if (vm.$options.el) {
        // 有el 调用$mount进行挂载
        // 说明根Vue实例提供了el，未提供需要手动调用
        vm.$mount(vm.$options.el);
      }
    };
  }

  /**
   * 初始化组件的$options属性 递归合并父Vue类中的options
   * @param {*} vm 
   * @param {*} options 
   */
  function initInternalComponent (vm, options) {
    // 将组件的options作为原型赋值给组件实例的$options
    var opts = vm.$options = Object.create(vm.constructor.options);

    /**
     * 下面对组件实例的vm.$options做进一步扩展 
     */
    // doing this because it's faster than dynamic enumeration.
    var parentVnode = options._parentVnode;
    // vm是当前组件实例  options._parentVnode是当前组件的VNode  options.parent 是当前组件VNode的父级组件实例
    opts.parent = options.parent; // 当前组件VNode的父级vm实例 子级最终要插入到父级上 确定层级关系
    opts._parentVnode = parentVnode; // 当前组件VNode 占位符VNode

    var vnodeComponentOptions = parentVnode.componentOptions;
    opts.propsData = vnodeComponentOptions.propsData; // 组件的propsData
    opts._parentListeners = vnodeComponentOptions.listeners; // 在组件VNode占位符上的自定义事件，传到了组件的渲染VNode上
    opts._renderChildren = vnodeComponentOptions.children; // 组件VNode的children
    opts._componentTag = vnodeComponentOptions.tag; // 组件占位符VNode的tag

    if (options.render) {
      opts.render = options.render;
      opts.staticRenderFns = options.staticRenderFns;
    }
  }

  // 处理Vue构造函数的options 并返回Vue的默认options即Vue.options
  function resolveConstructorOptions (Ctor) {
    var options = Ctor.options; // Vue构造函数默认option
    if (Ctor.super) {
      // Ctor.super为真，说明是Vue子类，递归调用resolveConstructorOptions，最终实现继承所有的父Vue类中的options
      var superOptions = resolveConstructorOptions(Ctor.super);
      var cachedSuperOptions = Ctor.superOptions;
      if (superOptions !== cachedSuperOptions) { // 父Vue.options有改变
        // super option changed,
        // need to resolve new options.
        Ctor.superOptions = superOptions; // 父Vue.options已变，重新赋值获取新的superOptions
        // check if there are any late-modified/attached options (#4976)
        var modifiedOptions = resolveModifiedOptions(Ctor);
        // update base extend options
        if (modifiedOptions) {
          // 改变的options再合并到用户自定义的extendOptions
          extend(Ctor.extendOptions, modifiedOptions);
        }
        // 合并策略
        options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions);
        if (options.name) {
          // 更新当前组件构造函数到components
          options.components[options.name] = Ctor;
        }
      }
    }
    return options
  }

  /**
   * Vue.options有变动，返回已变动的options项modified
   * @param {*} Ctor 
   * @returns 
   */
  function resolveModifiedOptions (Ctor) {
    var modified;
    var latest = Ctor.options; // 当前的options
    var sealed = Ctor.sealedOptions; // 原options的封存备份
    for (var key in latest) {
      if (latest[key] !== sealed[key]) {
        // 记录有变动的options项到modified
        if (!modified) { modified = {}; }
        modified[key] = latest[key];
      }
    }
    // 返回变动的options项
    return modified
  }

  /**
   * Vue构造函数
   */
  function Vue (options) {
    if (!(this instanceof Vue)
    ) {
      // 警告 Vue是构造函数，应该使用new来调用
      warn('Vue is a constructor and should be called with the `new` keyword');
    }

    // 调用 Vue.prototype._init()
    this._init(options);
  }

  // 对Vue.prototype原型对象进行扩展，Vue按功能将这些扩展分散到多个模块中进行实现
  initMixin(Vue);
  stateMixin(Vue);
  eventsMixin(Vue);
  lifecycleMixin(Vue);
  renderMixin(Vue);

  /*  */

  function initUse (Vue) {
    // 向Vue._installedPlugins中添加插件
    Vue.use = function (plugin) {
      var installedPlugins = (this._installedPlugins || (this._installedPlugins = []));
      if (installedPlugins.indexOf(plugin) > -1) {
        // 已添加过
        return this
      }

      // additional parameters
      var args = toArray(arguments, 1);
      args.unshift(this); // 第一个参数是Vue本身
      if (typeof plugin.install === 'function') {
        // 执行插件的install方法
        plugin.install.apply(plugin, args);
      } else if (typeof plugin === 'function') {
        // plugin是一个函数，当作install方法执行
        plugin.apply(null, args);
      }
      installedPlugins.push(plugin);
      return this
    };
  }

  /*  */

  function initMixin$1 (Vue) {
    Vue.mixin = function (mixin) {
      // mixin 实际是调用 mergeOptions 混入到 Vue.options 
      this.options = mergeOptions(this.options, mixin);
      return this
    };
  }

  /*  */

  function initExtend (Vue) {
    /**
     * Each instance constructor, including Vue, has a unique
     * cid. This enables us to create wrapped "child
     * constructors" for prototypal inheritance and cache them.
     */
    Vue.cid = 0;
    var cid = 1;

    /**
     * Class inheritance
     */
    Vue.extend = function (extendOptions) {
      extendOptions = extendOptions || {};
      var Super = this;
      var SuperId = Super.cid;
      // _Ctor 添加_Ctor属性，做缓存优化
      // _Ctor的值是{ cid: VueComponent }的map映射
      // 好处：当多个父组件都使用同一个组件，即多处使用时，同一个组件extend初始化逻辑只会执行一次
      var cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
      if (cachedCtors[SuperId]) {
        return cachedCtors[SuperId]
      }

      var name = extendOptions.name || Super.options.name;
      // 验证标签名是否有效
      if (name) {
        validateComponentName(name);
      }

      // 寄生式组合继承 使用父类原型Super.prototype作为Sub的原型
      var Sub = function VueComponent (options) {
        // 实例化Sub的时候，就会执行this._init逻辑，再次走到Vue实例的初始化逻辑
        this._init(options);
      };
      Sub.prototype = Object.create(Super.prototype);
      Sub.prototype.constructor = Sub;

      // 接下来再对Sub进行扩展

      // 生成cid
      Sub.cid = cid++;
      // 合并生成options 
      // 组件的默认options使用基类Vue.options 和 用户传入的options合并
      // 用户在extendOptions传入的components、directive、filter都会是局部的
      Sub.options = mergeOptions(
        Super.options,
        extendOptions
      );
      // super指向父类Super构造函数
      Sub['super'] = Super;

      // For props and computed properties, we define the proxy getters on
      // the Vue instances at extension time, on the extended prototype. This
      // avoids Object.defineProperty calls for each instance created.
      // props和computed，定义到原型上实现共享，这样可以避免每次实例化时都对props中的每个key进行proxy代理设置
      if (Sub.options.props) {
        initProps$1(Sub);
      }
      if (Sub.options.computed) {
        initComputed$1(Sub);
      }

      // allow further extension/mixin/plugin usage
      // 添加全局Super上的实例（静态）方法到Sub上 让各个组件中有这些全局静态方法
      Sub.extend = Super.extend;
      Sub.mixin = Super.mixin;
      Sub.use = Super.use;

      // create asset registers, so extended classes
      // can have their private assets too.
      // 将全局Super上的component、directive、filter方法添加到Sub上
      ASSET_TYPES.forEach(function (type) {
        Sub[type] = Super[type];
      });

      // enable recursive self-lookup
      // 允许自查找 添加自身到components中
      if (name) {
        Sub.options.components[name] = Sub;
      }

      // keep a reference to the super options at extension time.
      // later at instantiation we can check if Super's options have
      // been updated.
      Sub.superOptions = Super.options; // 保存父Vue的options 更新检测使用
      Sub.extendOptions = extendOptions; // 保存子组件用来扩展的options
      Sub.sealedOptions = extend({}, Sub.options); // 扩展完成的子Vue.options 做初始状态的封存

      // cache constructor
      // 缓存 cid: Sub 的map映射
      cachedCtors[SuperId] = Sub;
      return Sub
    };
  }

  /**
   * 初始化props
   *  为props中的每一项的访问方式添加代理 详见proxy()方法
   * @param {*} Comp 
   */
  function initProps$1 (Comp) {
    var props = Comp.options.props;
    for (var key in props) {
      proxy(Comp.prototype, "_props", key);
    }
  }

  /**
   * 初始化计算属性
   *  为computed中的每一项设置计算属性并进行代理设置 详见defineComputed()方法
   * @param {*} Comp 
   */
  function initComputed$1 (Comp) {
    var computed = Comp.options.computed;
    for (var key in computed) {
      defineComputed(Comp.prototype, key, computed[key]);
    }
  }

  /*  */

  function initAssetRegisters (Vue) {
    /**
     * Create asset registration methods.
     *  初始化3个全局函数
     *    Vue.component()
     *    Vue.directive()
     *    Vue.filter()
     * 调用方法时，其实是向Vue.options[components|directives|filters]中添加定义或获取定义
     */
    ASSET_TYPES.forEach(function (type) {
      Vue[type] = function (
        id,
        definition
      ) {
        if (!definition) {
          // 只传id 直接返回该id的对应的asset
          return this.options[type + 's'][id]
        } else {
          /* istanbul ignore if */
          if (type === 'component') {
            validateComponentName(id);
          }

          // 全局同步组件
          if (type === 'component' && isPlainObject(definition)) {
            // 有name，使用name作为组件名，否则使用id作为组件名
            definition.name = definition.name || id;
            // 使用definition作为options 调用Vue.extend生成注册组件构造函数
            definition = this.options._base.extend(definition);
          }

          // 全局指令
          if (type === 'directive' && typeof definition === 'function') {
            definition = { bind: definition, update: definition };
          }

          /**
           * 对全局Vue.options进行扩展
           *  filter 直接赋值
           *  异步组件 直接赋值
           */
          this.options[type + 's'][id] = definition;
          // 返回调用asset函数后的definition
          return definition
        }
      };
    });
  }

  /*  */

  /**
   * 缓存的vm实例数据类型
   */




  /**
   * 获取组件名
   * @param {*} opts 
   * @returns 
   */
  function getComponentName (opts) {
    return opts && (opts.Ctor.options.name || opts.tag)
  }

  /**
   * 匹配include、exclude的要求格式
   * @param {*} pattern 匹配格式 支持 逗号,隔开的字符串、正则、数组
   * @param {*} name 要匹配的值
   * @returns 是否满足匹配
   */
  function matches (pattern, name) {
    if (Array.isArray(pattern)) {
      return pattern.indexOf(name) > -1
    } else if (typeof pattern === 'string') {
      return pattern.split(',').indexOf(name) > -1
    } else if (isRegExp(pattern)) {
      return pattern.test(name)
    }
    /* istanbul ignore next */
    return false
  }

  /**
   * 遍历逐个删除keep-alive缓存的vm实例
   * @param {*} keepAliveInstance 
   * @param {*} filter 
   */
  function pruneCache (keepAliveInstance, filter) {
    var cache = keepAliveInstance.cache;
    var keys = keepAliveInstance.keys;
    var _vnode = keepAliveInstance._vnode;
    for (var key in cache) {
      var entry = cache[key];
      if (entry) {
        var name = entry.name;
        if (name && !filter(name)) {
          // 不满足过滤条件 删除keep-alive中的VNode缓存
          pruneCacheEntry(cache, key, keys, _vnode);
        }
      }
    }
  }

  /**
   * 删除keep-alive中指定key的缓存的vm实例
   * @param {*} cache 
   * @param {*} key 要删除的节点key
   * @param {*} keys 所有缓存的节点key
   * @param {*} current 当前的渲染VNode
   */
  function pruneCacheEntry (
    cache,
    key,
    keys,
    current
  ) {
    var entry = cache[key];
    if (entry && (!current || entry.tag !== current.tag)) {
      // 当前渲染的节点不存在 或 要删除的缓存节点不是当前的渲染VNode节点 执行实例的$destroy()
      // 即当前渲染VNode节点如果是将要删除的cache的话，不执行destroy函数
      // 因为是正要渲染的，不应该执行销毁，而只是之后清掉缓存即可
      entry.componentInstance.$destroy();
    }
    // 删除key的vm实例缓存 触发垃圾回收
    cache[key] = null;
    // keys中删除指定的key
    remove(keys, key);
  }

  /**
   * include、include匹配格式类型 字符串、正则表达式或数组 
   */
  var patternTypes = [String, RegExp, Array];

  /**
   * keep-alive组件是一个抽象组件，它的实现通过自定义render函数并且利用了插槽
   * keep-alive组件的渲染分为首次渲染和缓存渲染，当命中缓存，则不会执行created和mounted
   * 钩子函数，而会执行activated钩子函数。销毁时，不会执行destroy钩子函数，
   * 而执行deactivated钩子函数
   */

  var KeepAlive = {
    name: 'keep-alive',
    abstract: true,

    props: {
      // 只有名称匹配的组件会被缓存
      include: patternTypes, 
      // 任何名称匹配的组件都不会被缓存
      exclude: patternTypes,
      /**
       * 最多可以缓存多少组件实例。一旦这个数字达到了，在新实例被创建之前，已缓存组件中
       * 最久没有被访问的实例会被销毁掉。
       * 因为我们是缓存的vnode对象，它也会持有DOM，当我们缓存很多的时候，会比较占用内存，
       * 所以该配置允许我们指定缓存大小
       */
      max: [String, Number] // 最多可以缓存多少组件实例
    },

    methods: {
      /**
       * 缓存vm实例
       */
      cacheVNode: function cacheVNode() {
        var ref = this;
        var cache = ref.cache;
        var keys = ref.keys;
        var vnodeToCache = ref.vnodeToCache;
        var keyToCache = ref.keyToCache;
        if (vnodeToCache) {
          var tag = vnodeToCache.tag;
          var componentInstance = vnodeToCache.componentInstance;
          var componentOptions = vnodeToCache.componentOptions;
          // 缓存实例
          cache[keyToCache] = {
            name: getComponentName(componentOptions),
            tag: tag,
            componentInstance: componentInstance,
          };
          // 记录缓存key
          keys.push(keyToCache);
          // prune oldest entry
          if (this.max && keys.length > parseInt(this.max)) {
            // 缓存vm数超过最大缓存数，删除最久没使用到的vm实例
            pruneCacheEntry(cache, keys[0], keys, this._vnode);
          }
          this.vnodeToCache = null; // 清除已缓存vm实例的VNode
        }
      }
    },

    created: function created () {
      // 用来缓存已经创建过的VNode实例vm
      this.cache = Object.create(null);
      this.keys = []; // 保存缓存vm实例对应的key值
    },

    destroyed: function destroyed () {
      // keep-alive销毁 清掉所有缓存
      for (var key in this.cache) {
        pruneCacheEntry(this.cache, key, this.keys);
      }
    },

    mounted: function mounted () {
      var this$1 = this;

      // 挂载后缓存渲染VNode对应的实例 因为子组件先挂载，这里能够拿到子组件的vm实例
      this.cacheVNode();
      // 侦听include
      this.$watch('include', function (val) {
        // 只保留符合include的cache缓存
        pruneCache(this$1, function (name) { return matches(val, name); });
      });
      // 侦听exclude
      this.$watch('exclude', function (val) {
        // 过滤掉符合exclude的cache缓存
        pruneCache(this$1, function (name) { return !matches(val, name); });
      });
    },

    updated: function updated () {
      // 更新后缓存渲染VNode对应的实例
      this.cacheVNode();
    },

    render: function render () {
      // 获取keep-alive组件下的插槽元素
      var slot = this.$slots.default;
      // 找到第一个子组件节点
      var vnode = getFirstComponentChild(slot);
      var componentOptions = vnode && vnode.componentOptions;
      if (componentOptions) {
        // check pattern
        var name = getComponentName(componentOptions);
        var ref = this;
        var include = ref.include;
        var exclude = ref.exclude;
        if (
          // not included
          (include && (!name || !matches(include, name))) ||
          // excluded
          (exclude && name && matches(exclude, name))
        ) {
          // 直接返回 不匹配include和匹配exclude规则的VNode
          return vnode
        }

        var ref$1 = this;
        var cache = ref$1.cache;
        var keys = ref$1.keys;
        // 缓存key
        var key = vnode.key == null
          // same constructor may get registered as different local components
          // so cid alone is not enough (#3269)
          // 没有key，通过组件cid加组件tag生成key
          ? componentOptions.Ctor.cid + (componentOptions.tag ? ("::" + (componentOptions.tag)) : '')
          : vnode.key;
        if (cache[key]) {
          /**
           * keep-alive组件更新时，执行patchVNode，会执行prepatch，这时会执行updateChildComponent，
           * 命中needsForceUpdate，再次resolveSlots生成keep-alive子组件的默认插槽$slots.default内容，然后执行keep-alive组件的$forceUpdate，
           * 重新执行到keep-alive组件的render，那么就会执行到这里；之后会再执行子组件的patch，命中子组件init的keep-alive子组件处理逻辑
           */
          // 实例已缓存 直接将渲染的VNode的实例vm指向缓存中的实例VNode
          vnode.componentInstance = cache[key].componentInstance;
          // LRU策略 保证当前访问的实例是最新的活跃
          // make current key freshest
          remove(keys, key);
          keys.push(key);
        } else {
          // 实例未缓存 先暂存VNode和key render后再mounted或updated时再缓存
          // delay setting the cache until update
          this.vnodeToCache = vnode;
          this.keyToCache = key;
        }
        // 子组件节点添加keepAlive标识
        vnode.data.keepAlive = true;
      }

      /**
       * $mount挂载keep-alive节点，执行render时，keep-alive组件渲染返回的渲染VNode是它的
       * 子节点，并不是keep-alive组件本身
       */
      return vnode || (slot && slot[0])
    }
  };

  var builtInComponents = {
    KeepAlive: KeepAlive
  };

  /*  */

  /**
   * Vue实例静态属性和方法
   */

  function initGlobalAPI (Vue) {
    // config
    var configDef = {};
    configDef.get = function () { return config; };
    {
      configDef.set = function () {
        // 警告 不要直接替换掉Vue.config的定义
        warn(
          'Do not replace the Vue.config object, set individual fields instead.'
        );
      };
    }
    // 定义 全局配置的访问器属性 Vue.config
    Object.defineProperty(Vue, 'config', configDef);

    // exposed util methods.
    // NOTE: these are not considered part of the public API - avoid relying on
    // them unless you are aware of the risk.
    // 定义util工具函数 不推荐外部使用
    Vue.util = {
      warn: warn,
      extend: extend,
      mergeOptions: mergeOptions,
      defineReactive: defineReactive$$1
    };

    Vue.set = set;
    Vue.delete = del;
    Vue.nextTick = nextTick;

    // 2.6 explicit observable API
    Vue.observable = function (obj) {
      observe(obj);
      return obj
    };

    /**
     * 全局的Vue.options 即 构造函数的默认选项初始化
     * Vue.options = {
     *  _base: Vue,  // 指向Vue基类构造函数本身
     *  components: {},
     *  directives: {},
     *  filters: {},
     * }
     * 还包括用户调用 Vue.mixin() 时，混入的options
     */
    Vue.options = Object.create(null);
    ASSET_TYPES.forEach(function (type) {
      Vue.options[type + 's'] = Object.create(null);
    });

    // this is used to identify the "base" constructor to extend all plain-object
    // components with in Weex's multi-instance scenarios.
    // _base就是Vue构造函数 用于vdom/create-component/createComponent
    // 目的是扩展普通对象组件，让它们具有Vue构造函数上定义的属性
    Vue.options._base = Vue;

    // 扩展内置组件到 options.components
    extend(Vue.options.components, builtInComponents);
    
    initUse(Vue); // Vue.use
    initMixin$1(Vue); // Vue.mixin
    initExtend(Vue); // Vue.extend
    initAssetRegisters(Vue); // Vue.component Vue.filter Vue.directive
  }

  // 定义 Vue的静态属性
  initGlobalAPI(Vue);

  // 定义 访问器属性 $isServer
  Object.defineProperty(Vue.prototype, '$isServer', {
    get: isServerRendering
  });

  // 定义 访问器属性 $ssrContext
  Object.defineProperty(Vue.prototype, '$ssrContext', {
    get: function get () {
      /* istanbul ignore next */
      return this.$vnode && this.$vnode.ssrContext
    }
  });

  // 定义 数据属性 FunctionalRenderContext
  // expose FunctionalRenderContext for ssr runtime helper installation
  Object.defineProperty(Vue, 'FunctionalRenderContext', {
    value: FunctionalRenderContext
  });

  Vue.version = '2.6.14';

  /*  */

  // these are reserved for web because they are directly compiled away
  // during template compilation
  var isReservedAttr = makeMap('style,class');

  // attributes that should be using props for binding
  var acceptValue = makeMap('input,textarea,option,select,progress');
  var mustUseProp = function (tag, type, attr) {
    // 这些html元素的属性attr 将属性绑定到props
    return (
      (attr === 'value' && acceptValue(tag)) && type !== 'button' ||
      (attr === 'selected' && tag === 'option') ||
      (attr === 'checked' && tag === 'input') ||
      (attr === 'muted' && tag === 'video')
    )
  };

  var isEnumeratedAttr = makeMap('contenteditable,draggable,spellcheck');

  var isValidContentEditableValue = makeMap('events,caret,typing,plaintext-only');

  var convertEnumeratedValue = function (key, value) {
    return isFalsyAttrValue(value) || value === 'false'
      ? 'false'
      // allow arbitrary string value for contenteditable
      : key === 'contenteditable' && isValidContentEditableValue(value)
        ? value
        : 'true'
  };

  var isBooleanAttr = makeMap(
    'allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,' +
    'default,defaultchecked,defaultmuted,defaultselected,defer,disabled,' +
    'enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,' +
    'muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,' +
    'required,reversed,scoped,seamless,selected,sortable,' +
    'truespeed,typemustmatch,visible'
  );

  var xlinkNS = 'http://www.w3.org/1999/xlink';

  var isXlink = function (name) {
    return name.charAt(5) === ':' && name.slice(0, 5) === 'xlink'
  };

  var getXlinkProp = function (name) {
    return isXlink(name) ? name.slice(6, name.length) : ''
  };

  var isFalsyAttrValue = function (val) {
    return val == null || val === false
  };

  /*  */

  function genClassForVnode (vnode) {
    var data = vnode.data;
    var parentNode = vnode;
    var childNode = vnode;
    while (isDef(childNode.componentInstance)) {
      childNode = childNode.componentInstance._vnode;
      if (childNode && childNode.data) {
        data = mergeClassData(childNode.data, data);
      }
    }
    while (isDef(parentNode = parentNode.parent)) {
      if (parentNode && parentNode.data) {
        data = mergeClassData(data, parentNode.data);
      }
    }
    return renderClass(data.staticClass, data.class)
  }

  function mergeClassData (child, parent) {
    return {
      staticClass: concat(child.staticClass, parent.staticClass),
      class: isDef(child.class)
        ? [child.class, parent.class]
        : parent.class
    }
  }

  function renderClass (
    staticClass,
    dynamicClass
  ) {
    if (isDef(staticClass) || isDef(dynamicClass)) {
      return concat(staticClass, stringifyClass(dynamicClass))
    }
    /* istanbul ignore next */
    return ''
  }

  function concat (a, b) {
    return a ? b ? (a + ' ' + b) : a : (b || '')
  }

  function stringifyClass (value) {
    if (Array.isArray(value)) {
      return stringifyArray(value)
    }
    if (isObject(value)) {
      return stringifyObject(value)
    }
    if (typeof value === 'string') {
      return value
    }
    /* istanbul ignore next */
    return ''
  }

  function stringifyArray (value) {
    var res = '';
    var stringified;
    for (var i = 0, l = value.length; i < l; i++) {
      if (isDef(stringified = stringifyClass(value[i])) && stringified !== '') {
        if (res) { res += ' '; }
        res += stringified;
      }
    }
    return res
  }

  function stringifyObject (value) {
    var res = '';
    for (var key in value) {
      if (value[key]) {
        if (res) { res += ' '; }
        res += key;
      }
    }
    return res
  }

  /*  */

  var namespaceMap = {
    svg: 'http://www.w3.org/2000/svg',
    math: 'http://www.w3.org/1998/Math/MathML'
  };

  // Web端HTML元素标签
  var isHTMLTag = makeMap(
    'html,body,base,head,link,meta,style,title,' +
    'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' +
    'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,' +
    'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' +
    's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' +
    'embed,object,param,source,canvas,script,noscript,del,ins,' +
    'caption,col,colgroup,table,thead,tbody,td,th,tr,' +
    'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' +
    'output,progress,select,textarea,' +
    'details,dialog,menu,menuitem,summary,' +
    'content,element,shadow,template,blockquote,iframe,tfoot'
  );

  // Web端SVG元素标签
  // this map is intentionally selective, only covering SVG elements that may
  // contain child elements.
  var isSVG = makeMap(
    'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' +
    'foreignobject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' +
    'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
    true
  );

  /**
   * 是否是pre标签
   * @param {*} tag 
   * @returns 
   */
  var isPreTag = function (tag) { return tag === 'pre'; };

  /**
   * 是否是Web端的元素标签
   * @param {*} tag 
   * @returns 
   */
  var isReservedTag = function (tag) {
    return isHTMLTag(tag) || isSVG(tag)
  };

  /**
   * 获取html中svg或math标签的命名空间
   * @param {*} tag 
   * @returns 
   */
  function getTagNamespace (tag) {
    if (isSVG(tag)) {
      return 'svg'
    }
    // basic support for MathML
    // note it doesn't support other MathML elements being component roots
    if (tag === 'math') {
      return 'math'
    }
  }

  // 判断是否是未知节点
  var unknownElementCache = Object.create(null);
  function isUnknownElement (tag) {
    /* istanbul ignore if */
    if (!inBrowser) {
      return true
    }
    if (isReservedTag(tag)) {
      return false
    }
    tag = tag.toLowerCase();
    /* istanbul ignore if */
    if (unknownElementCache[tag] != null) {
      return unknownElementCache[tag]
    }
    var el = document.createElement(tag);
    if (tag.indexOf('-') > -1) {
      // http://stackoverflow.com/a/28210364/1070244
      return (unknownElementCache[tag] = (
        el.constructor === window.HTMLUnknownElement ||
        el.constructor === window.HTMLElement
      ))
    } else {
      return (unknownElementCache[tag] = /HTMLUnknownElement/.test(el.toString()))
    }
  }

  // input类型标签 使用此类型做v-model可绑定的input类型
  var isTextInputType = makeMap('text,number,password,search,email,tel,url');

  /*  */

  /**
   * Query an element selector if it's not an element already.
   *  el 如果是DOM节点，直接返回此节点 
   *  el 如果是string 
   *    document.querySelector获取此DOM节点
   *    节点不存在，则创建div节点
   *    最终返回DOM节点
   */
  function query (el) {
    if (typeof el === 'string') {
      var selected = document.querySelector(el);
      if (!selected) {
        warn(
          'Cannot find element: ' + el
        );
        return document.createElement('div')
      }
      return selected
    } else {
      return el
    }
  }

  /*  */

  // 真实DOM操作相关API

  // 创建Element的DOM元素
  function createElement$1 (tagName, vnode) {
    var elm = document.createElement(tagName);
    // 非select元素直接返回
    if (tagName !== 'select') {
      return elm
    }
    // false or null will remove the attribute but undefined will not
    if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
      // select元素多选时,添加多选属性
      elm.setAttribute('multiple', 'multiple');
    }
    return elm
  }

  // 创建带命名空间的Element的DOM元素
  function createElementNS (namespace, tagName) {
    return document.createElementNS(namespaceMap[namespace], tagName)
  }

  function createTextNode (text) {
    return document.createTextNode(text)
  }

  function createComment (text) {
    return document.createComment(text)
  }

  function insertBefore (parentNode, newNode, referenceNode) {
    parentNode.insertBefore(newNode, referenceNode);
  }

  function removeChild (node, child) {
    node.removeChild(child);
  }

  function appendChild (node, child) {
    node.appendChild(child);
  }

  function parentNode (node) {
    return node.parentNode
  }

  function nextSibling (node) {
    return node.nextSibling
  }

  function tagName (node) {
    return node.tagName
  }

  function setTextContent (node, text) {
    node.textContent = text;
  }

  function setStyleScope (node, scopeId) {
    node.setAttribute(scopeId, '');
  }

  var nodeOps = /*#__PURE__*/Object.freeze({
    createElement: createElement$1,
    createElementNS: createElementNS,
    createTextNode: createTextNode,
    createComment: createComment,
    insertBefore: insertBefore,
    removeChild: removeChild,
    appendChild: appendChild,
    parentNode: parentNode,
    nextSibling: nextSibling,
    tagName: tagName,
    setTextContent: setTextContent,
    setStyleScope: setStyleScope
  });

  /*  */

  var ref = {
    create: function create (_, vnode) {
      registerRef(vnode);
    },
    update: function update (oldVnode, vnode) {
      if (oldVnode.data.ref !== vnode.data.ref) {
        registerRef(oldVnode, true);
        registerRef(vnode);
      }
    },
    destroy: function destroy (vnode) {
      registerRef(vnode, true);
    }
  };

  function registerRef (vnode, isRemoval) {
    var key = vnode.data.ref;
    if (!isDef(key)) { return }

    var vm = vnode.context;
    var ref = vnode.componentInstance || vnode.elm;
    var refs = vm.$refs;
    if (isRemoval) {
      if (Array.isArray(refs[key])) {
        remove(refs[key], ref);
      } else if (refs[key] === ref) {
        refs[key] = undefined;
      }
    } else {
      if (vnode.data.refInFor) {
        if (!Array.isArray(refs[key])) {
          refs[key] = [ref];
        } else if (refs[key].indexOf(ref) < 0) {
          // $flow-disable-line
          refs[key].push(ref);
        }
      } else {
        refs[key] = ref;
      }
    }
  }

  /**
   * Virtual DOM patching algorithm based on Snabbdom by
   * Simon Friis Vindum (@paldepind)
   * Licensed under the MIT License
   * https://github.com/paldepind/snabbdom/blob/master/LICENSE
   *
   * modified by Evan You (@yyx990803)
   *
   * Not type-checking this because this file is perf-critical and the cost
   * of making flow understand it is not worth it.
   */

  var emptyNode = new VNode('', {}, []);

  var hooks = ['create', 'activate', 'update', 'remove', 'destroy'];

  /**
   * 判断两个VNode节点是否相同
   * 条件：
   *  1. 两个VNode的key相等，如都是undefined、v-for中的key
   *  2. 并且 是相同的异步VNode，或 同步节点asyncFactory为undefined
   *  3. 并且 都是同步节点
   *            tag相同、都是注释或非注释节点、都定义了data、相同的input节点类型
   *          或都是异步节点：
   *            节点a是异步占位符节点、且 b异步节点无报错
   * @param {*} a 
   * @param {*} b 
   * @returns 
   */
  function sameVnode (a, b) {
    return (
      a.key === b.key &&
      a.asyncFactory === b.asyncFactory && (
        (
          a.tag === b.tag &&
          a.isComment === b.isComment &&
          isDef(a.data) === isDef(b.data) &&
          sameInputType(a, b)
        ) || (
          isTrue(a.isAsyncPlaceholder) &&
          isUndef(b.asyncFactory.error)
        )
      )
    )
  }

  function sameInputType (a, b) {
    if (a.tag !== 'input') { return true }
    var i;
    var typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type;
    var typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type;
    return typeA === typeB || isTextInputType(typeA) && isTextInputType(typeB)
  }

  /**
   * 为VNode的列表创建一个key的映射集合
   * @param {*} children 
   * @param {*} beginIdx 
   * @param {*} endIdx 
   * @returns 
   */
  function createKeyToOldIdx (children, beginIdx, endIdx) {
    var i, key;
    var map = {};
    for (i = beginIdx; i <= endIdx; ++i) {
      key = children[i].key;
      if (isDef(key)) { map[key] = i; }
    }
    return map
  }

  // 返回patch方法
  // 利用闭包，把差异化参数提前固化，这样不用每次调用patch的时候都传递nodeOps和modules
  function createPatchFunction (backend) {
    var i, j;
    var cbs = {};

    var modules = backend.modules;
    var nodeOps = backend.nodeOps;

    // 初始化钩子函数对象
    // cbs中每个属性都是一个需要执行的钩子函数数组
    //  {
    //    create: [updateAttrs(), updateClass(), updateDOMListeners(), updateDOMProps(), updateStyle(), _enter(), create(), updateDirectives()],
    //    activate: [_enter()],
    //    update: [updateAttrs(), updateClass(), updateDOMListeners(), updateDOMProps(), updateStyle(), update(), updateDirectives()]
    //    remove: [remove$$1()],
    //    destroy: [destroy(), unbindDirectives()]
    //  }
    // 在patch()函数的执行过程中，会执行各个阶段的钩子
    for (i = 0; i < hooks.length; ++i) {
      cbs[hooks[i]] = [];
      for (j = 0; j < modules.length; ++j) {
        if (isDef(modules[j][hooks[i]])) {
          cbs[hooks[i]].push(modules[j][hooks[i]]);
        }
      }
    }

    /**
     * 创建没有内容的对应渲染VNode节点
     *  如创建一个没有内容的div标签VNode节点
     * @param {*} elm DOM节点
     * @returns VNode节点
     */
    function emptyNodeAt (elm) {
      return new VNode(nodeOps.tagName(elm).toLowerCase(), {}, [], undefined, elm)
    }

    /**
     * 创建移除真实DOM节点的回调执行
     * ，移除DOM节点
     * @param {*} childElm  DOM节点
     * @param {*} listeners cbs.remove队列
     * @returns 
     */
    function createRmCb (childElm, listeners) {
      function remove$$1 () {
        if (--remove$$1.listeners === 0) {
          removeNode(childElm);
        }
      }
      remove$$1.listeners = listeners;
      return remove$$1
    }

    /**
     * 移除DOM节点
     * @param {*} el 要移除的DOM节点 
     */
    function removeNode (el) {
      var parent = nodeOps.parentNode(el);
      // element may have already been removed due to v-html / v-text
      if (isDef(parent)) {
        nodeOps.removeChild(parent, el);
      }
    }

    /**
     * 是否是未知VNode
     * @param {*} vnode
     * @param {*} inVPre 
     * @returns 
     */
    function isUnknownElement$$1 (vnode, inVPre) {
      return (
        !inVPre &&
        !vnode.ns &&
        !(
          // 配置的忽略节点
          config.ignoredElements.length &&
          config.ignoredElements.some(function (ignore) {
            return isRegExp(ignore)
              ? ignore.test(vnode.tag)
              : ignore === vnode.tag
          })
        ) &&
        config.isUnknownElement(vnode.tag)
      )
    }

    var creatingElmInVPre = 0;

    /**
     * 将VNode挂载到真实DOM上
     * @param {渲染VNode|占位符VNode} vnode 渲染VNode是普通HTML标签的VNode | 占位符VNode是组件标签的VNode
     * @param {*} insertedVnodeQueue  已插入到真实DOM的VNode节点队列，用于执行插入DOM节点后的操作
     * @param {*} parentElm           父DOM节点
     * @param {*} refElm              参照DOM节点
     * @param {*} nested              transition enter使用参数
     * @param {*} ownerArray          递归创建节点时的children
     * @param {*} index               当前节点的索引
     * @returns 
     */
    function createElm (
      vnode,
      insertedVnodeQueue,
      parentElm,
      refElm,
      nested,
      ownerArray,
      index
    ) {
      if (isDef(vnode.elm) && isDef(ownerArray)) {
        // FIXME: 跳过
        // This vnode was used in a previous render!
        // now it's used as a new node, overwriting its elm would cause
        // potential patch errors down the road when it's used as an insertion
        // reference node. Instead, we clone the node on-demand before creating
        // associated DOM element for it.
        vnode = ownerArray[index] = cloneVNode(vnode);
      }

      vnode.isRootInsert = !nested; // for transition enter check
      // 创建组件渲染VNode节点
      // 判断VNode节点的是否是组件占位符VNode
      // 如果是组件VNode 就创建组件VNode节点的渲染VNode
      if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
        return
      }

      // 如果不是占位符VNode而是渲染VNode 执行下面逻辑

      var data = vnode.data;
      var children = vnode.children;
      var tag = vnode.tag;
      if (isDef(tag)) { // 有标签
        {
          // 未知节点
          if (data && data.pre) {
            creatingElmInVPre++;
          }
          // 开发中常见 组件未全局注册或局部注册 未知标签警告提示
          if (isUnknownElement$$1(vnode, creatingElmInVPre)) {
            warn(
              'Unknown custom element: <' + tag + '> - did you ' +
              'register the component correctly? For recursive components, ' +
              'make sure to provide the "name" option.',
              vnode.context
            );
          }
        }

        vnode.elm = vnode.ns
          // 有namespace创建namespace的元素 
          ? nodeOps.createElementNS(vnode.ns, tag)
          // 创建元素
          : nodeOps.createElement(tag, vnode);
        setScope(vnode);

        /* istanbul ignore if */
        {
          // 创建子节点 该方法会递归调用 createElm
          // 所以会先插入子节点，再插入父节点
          createChildren(vnode, children, insertedVnodeQueue);
          if (isDef(data)) {
            // 执行 create 钩子函数
            // 每插入一个节点
            invokeCreateHooks(vnode, insertedVnodeQueue);
          }
          // 插入节点
          insert(parentElm, vnode.elm, refElm);
        }

        if (data && data.pre) {
          creatingElmInVPre--;
        }
      } else if (isTrue(vnode.isComment)) { // 注释节点
        // 创建注释节点
        vnode.elm = nodeOps.createComment(vnode.text);
        insert(parentElm, vnode.elm, refElm);
      } else { // 文本节点
        // 创建文本节点
        vnode.elm = nodeOps.createTextNode(vnode.text);
        insert(parentElm, vnode.elm, refElm);
      }
    }

    /**
     * 创建组件占位符VNode节点的实例组件
     *  1. vnode如果是组件占位符VNode节点，那么创建组件实例，保存到vnode.componentInstance上，
     *     并调用组件实例的$mount方法，挂载到，返回true
     *  2. vnode不是组件VNode节点，而是真实的HTML渲染VNode节点，不做处理并返回undefined
     * @param {*} vnode 
     * @param {*} insertedVnodeQueue 
     * @param {*} parentElm 
     * @param {*} refElm 
     * @returns 
     */
    function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
      var i = vnode.data;
      if (isDef(i)) { // vnode.data定义
        // 是否是keep-alive的子组件 keep-alive重新渲染子组件会直接拿到componentInstance
        var isReactivated = isDef(vnode.componentInstance) && i.keepAlive;

        // i中有hook说明是 组件的 hook中有init钩子函数  vnode.data.hook.init
        if (isDef(i = i.hook) && isDef(i = i.init)) {
          // vdom/create-component下的componentVNodeHooks.init
          // 执行init()钩子函数 实际上会递归地执行
          // 因为在执行组件的createComponent时
          // 实际上会执行 子组件的创建 -> render -> update -> patch
          // patch过程中如果又遇到组件，就会又执行孙子组件的createComponent
          // 递归执行，最终完成整个patch过程
          // 所以子组件会先父组件执行init()后的逻辑，进行insert，之后执行父组件的insert
          // 最终完成整个patch过程
          i(vnode, false /* hydrating */);
        }

        // after calling the init hook, if the vnode is a child component
        // it should've created a child instance and mounted it. the child
        // component also has set the placeholder vnode's elm.
        // in that case we can just return the element and be done.
        // init后，vnode是一个已经挂载了componentInstance的组件的占位符VNode
        if (isDef(vnode.componentInstance)) {
          initComponent(vnode, insertedVnodeQueue);
          // 组件在这里插入真实DOM节点 整个插入顺序是先子后父 原因在 hook.init() 执行
          insert(parentElm, vnode.elm, refElm);

          if (isTrue(isReactivated)) {
            // keep-alive包裹的子组件处理
            reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm);
          }
          return true
        }
      }
    }

    // 初始化组件
    function initComponent (vnode, insertedVnodeQueue) {
      if (isDef(vnode.data.pendingInsert)) {
        // 首次初始化的VNode队列 插入VNode到insertedVnodeQueue中
        insertedVnodeQueue.push.apply(insertedVnodeQueue, vnode.data.pendingInsert);
        vnode.data.pendingInsert = null;
      }

      // 将VNode上的componentInstance的真实DOM $el 赋值给elm
      vnode.elm = vnode.componentInstance.$el;

      if (isPatchable(vnode)) {
        // 插入VNode到insertedVnodeQueue中
        invokeCreateHooks(vnode, insertedVnodeQueue);
        setScope(vnode);
      } else {
        // empty component root.
        // skip all element-related modules except for ref (#3455)
        registerRef(vnode);
        // make sure to invoke the insert hook
        // 插入VNode到insertedVnodeQueue中
        insertedVnodeQueue.push(vnode);
      }
    }

    /**
     * keepa-alive子组件处理
     * @param {*} vnode 
     * @param {*} insertedVnodeQueue 
     * @param {*} parentElm 
     * @param {*} refElm 
     */
    function reactivateComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
      var i;
      // hack for #4339: a reactivated component with inner transition
      // does not trigger because the inner node's created hooks are not called
      // again. It's not ideal to involve module-specific logic in here but
      // there doesn't seem to be a better way to do it.
      // keep-alive组件中有transition组件中问题处理
      var innerNode = vnode;
      while (innerNode.componentInstance) {
        innerNode = innerNode.componentInstance._vnode;
        if (isDef(i = innerNode.data) && isDef(i = i.transition)) {
          for (i = 0; i < cbs.activate.length; ++i) {
            // 执行transition组件的activate钩子函数
            cbs.activate[i](emptyNode, innerNode);
          }
          insertedVnodeQueue.push(innerNode);
          break
        }
      }

      // 手动插入keep-alive的子组件DOM节点 上面已经插入一次，又执行一次？好像多余了
      // unlike a newly created component,
      // a reactivated keep-alive component doesn't insert itself
      insert(parentElm, vnode.elm, refElm);
    }

    // 插入节点
    function insert (parent, elm, ref$$1) {
      if (isDef(parent)) {
        if (isDef(ref$$1)) {
          // 有参考节点,且有相同的父级节点 插入节点
          if (nodeOps.parentNode(ref$$1) === parent) {
            nodeOps.insertBefore(parent, elm, ref$$1);
          }
        } else {
          // 没有参照节点,appendChild添加到末尾
          nodeOps.appendChild(parent, elm);
        }
      }
    }

    // 创建真实DOM子节点 先创建子节点，再创建父节点
    function createChildren (vnode, children, insertedVnodeQueue) {
      if (Array.isArray(children)) {
        {
          // 子节点重复key校验
          checkDuplicateKeys(children);
        }
        // 遍历子虚拟节点，递归调用createElm，这是一种常用的深度优先的遍历算法
        // 并将当前vnode.elm作为父节点
        for (var i = 0; i < children.length; ++i) {
          createElm(children[i], insertedVnodeQueue, vnode.elm, null, true, children, i);
        }
      } else if (isPrimitive(vnode.text)) {
        // vnode.text 普通值 直接添加为子节点
        nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)));
      }
    }

    // 判断当前vnode是否可挂载，循环遍历，获取该节点是否有可挂载的真实渲染VNode节点
    function isPatchable (vnode) {
      // vnode是渲染VNode节点，但是此渲染VNode节点，可能还是一个组件占位符VNode节点，
      // 出现此种情况是，定义一个组件实现的根节点，引用了另一个组件，即一个组件的根节点是另一个组件
      // 循环找到它的真正渲染VNode即可挂载VNode 渲染VNode其实也就是组件的根的VNode
      while (vnode.componentInstance) { // vnode.componentInstance为真，说明此节点是组件占位符VNode，
        // 找到当前占位符VNode节点的子渲染VNode节点 循环执行，直至找到真正的渲染VNode
        vnode = vnode.componentInstance._vnode;
      }
      return isDef(vnode.tag)
    }

    /**
     * 执行create钩子函数 包括系统的和用户自定义的
     * 调用时机：节点创建阶段调用的钩子
     *  1. 创建一个真实的DOM节点时 createElm() 
     *  2. 创建组件 initComponent()
     * @param {*} vnode 
     * @param {*} insertedVnodeQueue 
     */
    function invokeCreateHooks (vnode, insertedVnodeQueue) {
      // 执行 cbs.create 队列
      for (var i$1 = 0; i$1 < cbs.create.length; ++i$1) {
        cbs.create[i$1](emptyNode, vnode);
      }
      i = vnode.data.hook; // Reuse variable
      if (isDef(i)) {
        // 执行节点自定义create方法 此时没有旧节点，传空VNode节点作为旧节点
        if (isDef(i.create)) { i.create(emptyNode, vnode); }
        // 将插入的节点VNode，加入insertedVnodeQueue
        // 目的是patch过程中插入vnode节点完毕之后，执行insert钩子
        if (isDef(i.insert)) { insertedVnodeQueue.push(vnode); }
      }
    }

    // set scope id attribute for scoped CSS.
    // this is implemented as a special case to avoid the overhead
    // of going through the normal attribute patching process.
    // 为作用域CSS设置作用域 id 属性。 
    // 这是作为一种特殊情况来实现的，以避免通过正常属性patching过程的开销。
    // FIXME: 跳过
    function setScope (vnode) {
      var i;
      if (isDef(i = vnode.fnScopeId)) {
        nodeOps.setStyleScope(vnode.elm, i);
      } else {
        var ancestor = vnode;
        while (ancestor) {
          if (isDef(i = ancestor.context) && isDef(i = i.$options._scopeId)) {
            nodeOps.setStyleScope(vnode.elm, i);
          }
          ancestor = ancestor.parent;
        }
      }
      // for slot content they should also get the scopeId from the host instance.
      if (isDef(i = activeInstance) &&
        i !== vnode.context &&
        i !== vnode.fnContext &&
        isDef(i = i.$options._scopeId)
      ) {
        nodeOps.setStyleScope(vnode.elm, i);
      }
    }

    /**
     * 创建VNode对应的DOM节点
     *  内部循环调用createElm()方法
     * @param {*} parentElm 
     * @param {*} refElm 
     * @param {*} vnodes 
     * @param {*} startIdx 
     * @param {*} endIdx 
     * @param {*} insertedVnodeQueue 
     */
    function addVnodes (parentElm, refElm, vnodes, startIdx, endIdx, insertedVnodeQueue) {
      for (; startIdx <= endIdx; ++startIdx) {
        createElm(vnodes[startIdx], insertedVnodeQueue, parentElm, refElm, false, vnodes, startIdx);
      }
    }

    /**
     * 执行destory钩子 包括系统的和用户自定义的
     * @param {*} vnode 
     */
    function invokeDestroyHook (vnode) {
      var i, j;
      var data = vnode.data;
      if (isDef(data)) {
        // 执行destroy钩子函数
        if (isDef(i = data.hook) && isDef(i = i.destroy)) { i(vnode); }
        // 执行 cbs.destroy 队列
        for (i = 0; i < cbs.destroy.length; ++i) { cbs.destroy[i](vnode); }
      }

      if (isDef(i = vnode.children)) {
        // 有子节点，遍历-递归 destroy子节点
        for (j = 0; j < vnode.children.length; ++j) {
          invokeDestroyHook(vnode.children[j]);
        }
      }
    }

    /**
     * 移除VNode节点
     * 遍历待删除的VNode节点，并进行删除
     * @param {*} vnodes 
     * @param {*} startIdx 
     * @param {*} endIdx 
     */
    function removeVnodes (vnodes, startIdx, endIdx) {
      for (; startIdx <= endIdx; ++startIdx) {
        var ch = vnodes[startIdx];
        if (isDef(ch)) {
          if (isDef(ch.tag)) {
            removeAndInvokeRemoveHook(ch);
            // 执行destory钩子
            invokeDestroyHook(ch);
          } else { // Text node
            // 移除文本DOM节点
            removeNode(ch.elm);
          }
        }
      }
    }

    /**
     * 从DOM中移除节点 并执行remove钩子函数
     * @param {*} vnode 
     * @param {*} rm 
     */
    function removeAndInvokeRemoveHook (vnode, rm) {
      if (isDef(rm) || isDef(vnode.data)) {
        var i;
        var listeners = cbs.remove.length + 1;
        if (isDef(rm)) {
          // we have a recursively passed down rm callback
          // increase the listeners count
          rm.listeners += listeners;
        } else {
          // directly removing
          rm = createRmCb(vnode.elm, listeners);
        }

        // 子节点挂载的组件占位符VNode，获取此VNode的实例的渲染VNode，并递归调用removeAndInvokeRemoveHook  统计listeners的数量统计会递增
        // recursively invoke hooks on child component root node
        if (isDef(i = vnode.componentInstance) && isDef(i = i._vnode) && isDef(i.data)) {
          removeAndInvokeRemoveHook(i, rm);
        }

        // 执行 cbs.remove 队列
        for (i = 0; i < cbs.remove.length; ++i) {
          cbs.remove[i](vnode, rm);
        }

        if (isDef(i = vnode.data.hook) && isDef(i = i.remove)) {
          // 移除的节点是组件占位符节点 有定义remove钩子，执行节点的remove钩子
          i(vnode, rm);
        } else {
          // 没有hook或没有hook.remove 手动直接remove
          rm();
        }
      } else {
        // 节点上没有VNodeData数据 直接移除
        removeNode(vnode.elm);
      }
    }

    /**
     * 新旧节点相同的diff算法
     * @param {*} parentElm           父DOM节点
     * @param {*} oldCh               旧子VNode数组
     * @param {*} newCh               新子VNode数组
     * @param {*} insertedVnodeQueue  已插入到DOM中的VNode节点队列
     * @param {*} removeOnly          
     */
    function updateChildren (parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
      var oldStartIdx = 0; // 旧VNode数组开始索引
      var newStartIdx = 0; // 新VNode数组开始索引
      var oldEndIdx = oldCh.length - 1; // 旧VNode数组结束索引
      var oldStartVnode = oldCh[0]; // 旧VNode数组第一个元素
      var oldEndVnode = oldCh[oldEndIdx]; // 旧VNode数组最后一个元素
      var newEndIdx = newCh.length - 1; // 新VNode数组结束索引
      var newStartVnode = newCh[0]; // 新VNode数组第一个元素
      var newEndVnode = newCh[newEndIdx]; // 新VNode数组最后一个元素

      var oldKeyToIdx, idxInOld, vnodeToMove, refElm;

      // removeOnly is a special flag used only by <transition-group>
      // to ensure removed elements stay in correct relative positions
      // during leaving transitions
      var canMove = !removeOnly;

      {
        // 检查新的children是否有相同key
        checkDuplicateKeys(newCh);
      }

      // oldStartIdx、newStartIdx不断变大，oldEndIdx、newEndIdx不断变小
      while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
        if (isUndef(oldStartVnode)) {
          // oldStartVnode已经被移除
          oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
        } else if (isUndef(oldEndVnode)) {
          // oldEndVnode已经被移除
          oldEndVnode = oldCh[--oldEndIdx];
        } else if (sameVnode(oldStartVnode, newStartVnode)) {
          // 新旧开始位置更新节点相同 只是更新
          patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
          oldStartVnode = oldCh[++oldStartIdx];
          newStartVnode = newCh[++newStartIdx];
        } else if (sameVnode(oldEndVnode, newEndVnode)) {
          // 新旧结束节点位置相同 只是更新
          patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
          oldEndVnode = oldCh[--oldEndIdx];
          newEndVnode = newCh[--newEndIdx];
        } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
          // 旧节点开始位置等于新节点结束位置
          patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
          canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm));
          oldStartVnode = oldCh[++oldStartIdx];
          newEndVnode = newCh[--newEndIdx];
        } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
          // 旧节点结束位置等于新节点开始位置
          patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
          canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
          oldEndVnode = oldCh[--oldEndIdx];
          newStartVnode = newCh[++newStartIdx];
        } else {
          // 新旧节点的key不相等：1. 新旧节点有一个没定义key；2.新旧节点定义的key不相同

          // 创建旧VNode数组的key到索引位置的映射  { key1: 0, key2: 1, ... }
          if (isUndef(oldKeyToIdx)) { oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx); }

          // 新VNode数组元素在旧VNode数组中的位置索引
          idxInOld = isDef(newStartVnode.key)
            ? oldKeyToIdx[newStartVnode.key]
            : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx);

          if (isUndef(idxInOld)) { // New element
            // idxInOld未定义，说明是一个新VNode元素，当作新DOM节点处理
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
          } else {
            // 新节点在旧节点中做了插入操作
            vnodeToMove = oldCh[idxInOld];
            if (sameVnode(vnodeToMove, newStartVnode)) {
              // 新旧节点相同 做了节点移动到中间位置的操作
              patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
              oldCh[idxInOld] = undefined;
              canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm);
            } else {
              // same key but different element. treat as new element
              // 新旧节点key相同但是是不同的DOM元素，当作新DOM节点处理
              createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
            }
          }
          newStartVnode = newCh[++newStartIdx];
        }
      }

      if (oldStartIdx > oldEndIdx) {
        // 还有剩余的节点，再做插入
        refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm;
        // 剩下的要插入的节点，从newStartIdx到newEndIdx
        addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
      } else if (newStartIdx > newEndIdx) {
        // 
        removeVnodes(oldCh, oldStartIdx, oldEndIdx);
      }
    }

    // 重复key校验
    function checkDuplicateKeys (children) {
      var seenKeys = {};
      for (var i = 0; i < children.length; i++) {
        var vnode = children[i];
        var key = vnode.key;
        if (isDef(key)) {
          if (seenKeys[key]) {
            // 开发常见的警告 重复key
            warn(
              ("Duplicate keys detected: '" + key + "'. This may cause an update error."),
              vnode.context
            );
          } else {
            seenKeys[key] = true;
          }
        }
      }
    }

    function findIdxInOld (node, oldCh, start, end) {
      for (var i = start; i < end; i++) {
        var c = oldCh[i];
        if (isDef(c) && sameVnode(node, c)) { return i }
      }
    }

    /**
     * 把新的VNode节点patch到旧的VNode节点上
     *    1. 执行prepatch钩子函数
     *    2. 执行update钩子函数
     *    3. 执行patch过程
     * @param {*} oldVnode 
     * @param {*} vnode 
     * @param {*} insertedVnodeQueue 
     * @param {*} ownerArray 
     * @param {*} index 
     * @param {*} removeOnly 
     * @returns 
     */
    function patchVnode (
      oldVnode,
      vnode,
      insertedVnodeQueue,
      ownerArray,
      index,
      removeOnly
    ) {
      if (oldVnode === vnode) {
        // reject 新旧节点相同
        return
      }

      if (isDef(vnode.elm) && isDef(ownerArray)) {
        // clone reused vnode
        // 浅拷贝VNode节点
        vnode = ownerArray[index] = cloneVNode(vnode);
      }
      // 旧的真实DOM节点赋值给新的vnode的elm
      var elm = vnode.elm = oldVnode.elm; // 旧的真实DOM节点

      // FIXME: 跳过 异步组件处理
      if (isTrue(oldVnode.isAsyncPlaceholder)) {
        if (isDef(vnode.asyncFactory.resolved)) {
          hydrate(oldVnode.elm, vnode, insertedVnodeQueue);
        } else {
          vnode.isAsyncPlaceholder = true;
        }
        return
      }

      // reuse element for static trees.
      // note we only do this if the vnode is cloned -
      // if the new node is not cloned it means the render functions have been
      // reset by the hot-reload-api and we need to do a proper re-render.
      // FIXME： 跳过 编译过程中处理
      if (isTrue(vnode.isStatic) &&
        isTrue(oldVnode.isStatic) &&
        vnode.key === oldVnode.key &&
        (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
      ) {
        vnode.componentInstance = oldVnode.componentInstance;
        return
      }

      var i;
      var data = vnode.data;
      if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
        // 1. 执行prepatch钩子函数
        // 当更新的VNode是一个组件占位符VNode，执行组件prepatch钩子
        // prepatch会拿到新的组件占位符VNode配置，再通过旧的组件占位符VNode访问到
        // 此VNode占位符的组件实例，然后去更新此组件实例
        i(oldVnode, vnode);
      }

      /**
       * 获取新旧VNode节点的children
       *    如果有children说明该VNode节点是渲染VNode节点，不是组件占位符节点
       *    在生成组件VNode占位符时，children是undefined，详见create-component.js/createcomponent()
       */
      var oldCh = oldVnode.children;
      var ch = vnode.children;

      if (isDef(data) && isPatchable(vnode)) {
        // 2. 执行update钩子函数
        // 当前VNode定义了data，且是可patch的
        // 执行 cbs.update 队列
        for (i = 0; i < cbs.update.length; ++i) { cbs.update[i](oldVnode, vnode); }
        // data中定义了hook.update钩子，执行update钩子
        if (isDef(i = data.hook) && isDef(i = i.update)) { i(oldVnode, vnode); }
      }

      // 3. 执行patch过程
      if (isUndef(vnode.text)) { // 新VNode不是文本节点
        if (isDef(oldCh) && isDef(ch)) {
          /**
           * 新旧VNode的children都存在，且不相同
           *  执行updateChildren() diff算法更新
           */
          if (oldCh !== ch) { updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly); }
        } else if (isDef(ch)) {
          /**
           * 只有新VNode的children，旧的不存，表示旧节点不需要了
           *  此时若旧VNode是一个文本节点，DOM操作将节点置为空字符串
           *  然后创建新VNode的children的VNode节点 将新VNode的children批量插入到新VNode节点elm下
           */
          {
            // 检查新的children是否有相同key
            checkDuplicateKeys(ch);
          }
          // 老的节点是文本节点，DOM操作将节点置为空字符串
          if (isDef(oldVnode.text)) { nodeOps.setTextContent(elm, ''); }
          // 创建新VNode的children的VNode节点，内部循环调用createElm()
          // 将新VNode的children批量插入到新节点elm下
          addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
        } else if (isDef(oldCh)) {
          // 只有旧VNode的children存在，表示更新的是空节点
          // 将旧的节点通过removeVnodes全部清除
          removeVnodes(oldCh, 0, oldCh.length - 1);
        } else if (isDef(oldVnode.text)) {
          /**
           * 只有旧VNode有文本text，清除其节点文本内容
           * DOM操作将旧VNode节点置为空字符串
           */
          nodeOps.setTextContent(elm, '');
        }
      } else if (oldVnode.text !== vnode.text) {
        // 最内层的文本节点
        // 新VNode是文本节点，且新旧VNode文本节点不相等，将DOM的text文本更新
        nodeOps.setTextContent(elm, vnode.text);
      }

      if (isDef(data)) {
        // 执行postpatch钩子 它是组件⾃定义的钩⼦函数，有则执⾏
        if (isDef(i = data.hook) && isDef(i = i.postpatch)) { i(oldVnode, vnode); }
      }
    }

    /**
     * 执行insert钩子函数
     * @param {*} vnode   当前VNode渲染节点
     * @param {*} queue   按顺序插入的VNode队列
     * @param {*} initial 首次渲染或ssr渲染标识
     */
    function invokeInsertHook (vnode, queue, initial) {
      // delay insert hooks for component root nodes, invoke them after the
      // element is really inserted
      if (isTrue(initial) && isDef(vnode.parent)) {
        // 首次渲染，将VNode放入pendingInsert
        vnode.parent.data.pendingInsert = queue;
      } else {
        // 遍历执行每个组件占位符VNode节点的insert钩子函数
        for (var i = 0; i < queue.length; ++i) {
          // vnode.data.hook.insert(vnode)
          queue[i].data.hook.insert(queue[i]);
        }
      }
    }

    var hydrationBailed = false;
    // list of modules that can skip create hook during hydration because they
    // are already rendered on the client or has no need for initialization
    // Note: style is excluded because it relies on initial clone for future
    // deep updates (#7063).
    var isRenderedModule = makeMap('attrs,class,staticClass,staticStyle,key');

    // Note: this is a browser-only function so we can assume elms are DOM nodes.
    function hydrate (elm, vnode, insertedVnodeQueue, inVPre) {
      var i;
      var tag = vnode.tag;
      var data = vnode.data;
      var children = vnode.children;
      inVPre = inVPre || (data && data.pre);
      vnode.elm = elm;

      if (isTrue(vnode.isComment) && isDef(vnode.asyncFactory)) {
        vnode.isAsyncPlaceholder = true;
        return true
      }
      // assert node match
      {
        if (!assertNodeMatch(elm, vnode, inVPre)) {
          return false
        }
      }
      if (isDef(data)) {
        if (isDef(i = data.hook) && isDef(i = i.init)) { i(vnode, true /* hydrating */); }
        if (isDef(i = vnode.componentInstance)) {
          // child component. it should have hydrated its own tree.
          initComponent(vnode, insertedVnodeQueue);
          return true
        }
      }
      if (isDef(tag)) {
        if (isDef(children)) {
          // empty element, allow client to pick up and populate children
          if (!elm.hasChildNodes()) {
            createChildren(vnode, children, insertedVnodeQueue);
          } else {
            // v-html and domProps: innerHTML
            if (isDef(i = data) && isDef(i = i.domProps) && isDef(i = i.innerHTML)) {
              if (i !== elm.innerHTML) {
                /* istanbul ignore if */
                if (typeof console !== 'undefined' &&
                  !hydrationBailed
                ) {
                  hydrationBailed = true;
                  console.warn('Parent: ', elm);
                  console.warn('server innerHTML: ', i);
                  console.warn('client innerHTML: ', elm.innerHTML);
                }
                return false
              }
            } else {
              // iterate and compare children lists
              var childrenMatch = true;
              var childNode = elm.firstChild;
              for (var i$1 = 0; i$1 < children.length; i$1++) {
                if (!childNode || !hydrate(childNode, children[i$1], insertedVnodeQueue, inVPre)) {
                  childrenMatch = false;
                  break
                }
                childNode = childNode.nextSibling;
              }
              // if childNode is not null, it means the actual childNodes list is
              // longer than the virtual children list.
              if (!childrenMatch || childNode) {
                /* istanbul ignore if */
                if (typeof console !== 'undefined' &&
                  !hydrationBailed
                ) {
                  hydrationBailed = true;
                  console.warn('Parent: ', elm);
                  console.warn('Mismatching childNodes vs. VNodes: ', elm.childNodes, children);
                }
                return false
              }
            }
          }
        }
        if (isDef(data)) {
          var fullInvoke = false;
          for (var key in data) {
            if (!isRenderedModule(key)) {
              fullInvoke = true;
              invokeCreateHooks(vnode, insertedVnodeQueue);
              break
            }
          }
          if (!fullInvoke && data['class']) {
            // ensure collecting deps for deep class bindings for future updates
            traverse(data['class']);
          }
        }
      } else if (elm.data !== vnode.text) {
        elm.data = vnode.text;
      }
      return true
    }

    function assertNodeMatch (node, vnode, inVPre) {
      if (isDef(vnode.tag)) {
        return vnode.tag.indexOf('vue-component') === 0 || (
          !isUnknownElement$$1(vnode, inVPre) &&
          vnode.tag.toLowerCase() === (node.tagName && node.tagName.toLowerCase())
        )
      } else {
        return node.nodeType === (vnode.isComment ? 8 : 3)
      }
    }

    /**
     * 递归创建一个完整的DOM树并插入到Body上
     * @param {*} oldVnode    旧的VNode节点 可以不存在或是一个DOM对象或是一个VNode
     * @param {*} vnode       执行_render后返回的VNode的节点 占位符VNode或渲染VNode
     * @param {*} hydrating   是否是服务端渲染 
     * @param {*} removeOnly  transition-group组件使用参数
     * @returns               真实DOM
     */
    return function patch (oldVnode, vnode, hydrating, removeOnly) {
      // 删除VNode逻辑 $destroy执行
      if (isUndef(vnode)) {
        // vnode未定义 表明该节点已被销毁卸载
        // oldVnode定义 从旧的VNode上卸载销毁VNode本身及相关的子VNode节点 执行destroy钩子
        if (isDef(oldVnode)) { invokeDestroyHook(oldVnode); }
        return
      }

      var isInitialPatch = false;
      var insertedVnodeQueue = [];

      if (isUndef(oldVnode)) {
        // empty mount (likely as component), create new root element
        // 首次渲染的组件 oldVnode为undefined
        isInitialPatch = true;
        // 创建渲染VNode的DOM
        createElm(vnode, insertedVnodeQueue);
      } else {
        // 命中：首次渲染 或 组件更新
        // nodeType判断是否是真实DOM节点
        var isRealElement = isDef(oldVnode.nodeType);

        if (!isRealElement && sameVnode(oldVnode, vnode)) {
          // 旧节点已经存在，且新节点和就节点VNode相同
          // patch existing root node
          patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly);
        } else {
          /**
           * 命中有两种情况：
           * 1. oldVnode节点是真实HTML节点
           * 2. oldVnode不是真实节点，即是VNode节点，但oldVnode和vnode不是同一个VNode节点
           */
          if (isRealElement) { // oldVnode节点是真实HTML节点
            // mounting to a real element
            // check if this is server-rendered content and if we can perform
            // a successful hydration.
            if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
              // 服务端渲染标识处理
              oldVnode.removeAttribute(SSR_ATTR);
              hydrating = true;
            }

            // FIXME: 跳过 服务端渲染处理
            if (isTrue(hydrating)) {
              if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
                invokeInsertHook(vnode, insertedVnodeQueue, true);
                return oldVnode
              } else {
                warn(
                  'The client-side rendered virtual DOM tree is not matching ' +
                  'server-rendered content. This is likely caused by incorrect ' +
                  'HTML markup, for example nesting block-level elements inside ' +
                  '<p>, or missing <tbody>. Bailing hydration and performing ' +
                  'full client-side render.'
                );
              }
            }
            // either not server-rendered, or hydration failed.
            // create an empty node and replace it
            // 非服务端渲染或hydration失败
            // 将真实DOM节点转换成VNode节点 如 emptyNodeAt(div)
            oldVnode = emptyNodeAt(oldVnode);
          }

          // replacing existing element
          // 通过旧的VNode节点，拿到父DOM节点
          var oldElm = oldVnode.elm;
          var parentElm = nodeOps.parentNode(oldElm);

          // create new node
          // 创建一个新的节点 创建VNode节点以及该节点的所有子节点的真实DOM节点 递归创建 先子后父
          // 以当前旧节点为参考节点，创建新的节点，并插入到 DOM 中
          createElm(
            vnode,
            insertedVnodeQueue,
            // extremely rare edge case: do not insert if old element is in a
            // leaving transition. Only happens when combining transition +
            // keep-alive + HOCs. (#4590)
            oldElm._leaveCb ? null : parentElm,
            nodeOps.nextSibling(oldElm)
          );

          /**
           * 递归更新渲染VNode节点的组件占位符VNode节点 执行当前VNode节点的组件占位符节点的更新操作
           * 如HelloWorld组件的具体实现生成的渲染VNode节点，它的parent是组件的占位符HelloWorld节点
           * 
           * 组件更新时候，上一步创建节点时，会更新组件占位符VNode对应的组件实例componentInstance，
           * 这一步是更新组件占位符VNode本身；以及递归更新父级，如果该组件占位符VNode是另一个组件的RootVNode
           */
          // update parent placeholder node element, recursively
          // 当前渲染VNode节点是组件占位符VNode生成的节点，它的parent会指向它的组件占位符VNode
          if (isDef(vnode.parent)) { 
            var ancestor = vnode.parent; // 当前渲染VNode的组件占位符VNode
            // 判断当前VNode是否是可挂载的节点 vnode下有可挂载的渲染节点返回true
            var patchable = isPatchable(vnode);
            while (ancestor) {
              // 执行组件占位符节点的cbs.destroy队列
              for (var i = 0; i < cbs.destroy.length; ++i) {
                cbs.destroy[i](ancestor);
              }

              // 将当前新的渲染VNode节点的elm赋值给组件占位符VNode的elm
              // 更新组件占位符VNode的DOM引用elm
              ancestor.elm = vnode.elm;

              if (patchable) { // 当前渲染vnode是可挂载的节点
                // 执行组件占位符节点的 cbs.create 队列
                for (var i$1 = 0; i$1 < cbs.create.length; ++i$1) {
                  cbs.create[i$1](emptyNode, ancestor);
                }
                // #6513
                // invoke insert hooks that may have been merged by create hooks.
                // e.g. for directives that uses the "inserted" hook.
                var insert = ancestor.data.hook.insert;
                if (insert.merged) {
                  // 执行insert钩子
                  // start at index 1 to avoid re-invoking component mounted hook
                  for (var i$2 = 1; i$2 < insert.fns.length; i$2++) {
                    insert.fns[i$2]();
                  }
                }
              } else {
                registerRef(ancestor);
              }

              // 组件占位符VNode的父级组件占位符节点 然后重新循环，做父级的组件占位符节点的更新
              // 组件占位符VNode是另一个组件的RootVNode时，会继续循环，否则会使undefined
              ancestor = ancestor.parent;
            }
          }

          // destroy old node
          // 删除旧的节点
          if (isDef(parentElm)) {
            // 父节点存在，把oldVnode渲染节点移除，从当前DOM树中删除
            removeVnodes([oldVnode], 0, 0);
          } else if (isDef(oldVnode.tag)) {
            // 父节点不存在 即父节点已经被删掉了 直接执行destroy钩子
            invokeDestroyHook(oldVnode);
          }
        }
      }

      // 执行insert钩子函数 insertedVnodeQueue在整个patch过程中是不断添加的
      invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch);
      // 返回真实DOM
      return vnode.elm
    }
  }

  /*  */

  var directives = {
    create: updateDirectives,
    update: updateDirectives,
    destroy: function unbindDirectives (vnode) {
      updateDirectives(vnode, emptyNode);
    }
  };

  /**
   * 更新指令
   * patch创建阶段、更新阶段、销毁阶段会执行
   * @param {*} oldVnode 
   * @param {*} vnode 
   */
  function updateDirectives (oldVnode, vnode) {
    if (oldVnode.data.directives || vnode.data.directives) {
      _update(oldVnode, vnode);
    }
  }

  /**
   * 实际执行
   *  执行指令定义的hook
   * @param {*} oldVnode 
   * @param {*} vnode 
   */
  function _update (oldVnode, vnode) {
    // 根据oldVnode和vnode的不同，来决定VNode是一个create过程还是一个destroy过程
    var isCreate = oldVnode === emptyNode; // 旧节点是空VNode，则也是指令创建过程
    var isDestroy = vnode === emptyNode; // 当前节点是空VNode，则也是指令销毁过程
    var oldDirs = normalizeDirectives$1(oldVnode.data.directives, oldVnode.context);
    var newDirs = normalizeDirectives$1(vnode.data.directives, vnode.context);

    var dirsWithInsert = []; // 新增VNode 有inserted钩子函数的指令
    var dirsWithPostpatch = []; // 更新VNode 有componentUpdated钩子函数的指令

    var key, oldDir, dir;
    // 新节点指令遍历处理
    for (key in newDirs) {
      oldDir = oldDirs[key]; // 旧VNode上的指令
      dir = newDirs[key]; // 新VNode上的指令
      if (!oldDir) {
        // 旧VNode上没有没有该指令，即是VNode上的新增指令
        // new directive, bind
        callHook$1(dir, 'bind', vnode, oldVnode); // 执行指令的bind钩子函数
        if (dir.def && dir.def.inserted) {
          // 新增的指令定义了inserted，存储指令，以便之后patch插入后执行insert钩子函数
          dirsWithInsert.push(dir);
        }
      } else {
        // 旧VNode上该指令存在，新VNode上指令存在，即更新此VNode指令
        // existing directive, update
        // 旧VNode上指令的值和参数扩展到新VNode指令上
        dir.oldValue = oldDir.value;
        dir.oldArg = oldDir.arg;
        callHook$1(dir, 'update', vnode, oldVnode); // 执行指令的update钩子函数
        if (dir.def && dir.def.componentUpdated) {
          // 新VNode上指令定义了componentUpdated钩子，则记录组件更新完毕指令
          dirsWithPostpatch.push(dir);
        }
      }
    }

    if (dirsWithInsert.length) {
      // 新插入VNode上的指令有inserted钩子
      var callInsert = function () {
        for (var i = 0; i < dirsWithInsert.length; i++) {
          // 在执行insert钩子后，说明已经插入，此时再执行inserted钩子
          callHook$1(dirsWithInsert[i], 'inserted', vnode, oldVnode);
        }
      };
      if (isCreate) {
        // 创建VNode 在vnode.data.hook[insert]上存储指令的钩子函数
        // 以便 在patch阶段，节点已插入后，执行invokeInsertHook
        mergeVNodeHook(vnode, 'insert', callInsert);
      } else {
        // 更新VNode时 执行VNode节点上的inserted钩子函数
        callInsert();
      }
    }

    if (dirsWithPostpatch.length) {
      // 更新VNode上的指令有componentUpdated钩子
      // 更新VNode时 在vnode.data.hook[postpatch]上存储指令的钩子函数
      mergeVNodeHook(vnode, 'postpatch', function () {
        for (var i = 0; i < dirsWithPostpatch.length; i++) {
          callHook$1(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode);
        }
      });
    }

    if (!isCreate) {
      // VNode销毁过程，执行不再使用指令的unbind
      for (key in oldDirs) {
        if (!newDirs[key]) {
          // newDirs[key]没有该指令，说明不再用到，执行unbind钩子函数
          // no longer present, unbind
          callHook$1(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy);
        }
      }
    }
  }

  var emptyModifiers = Object.create(null);

  /**
   * 标准化指令
   *  - 没有modifiers，扩展空modifiers
   *  - 在指令上扩展指令的定义实现def
   * @param {*} dirs VNode的指令
   * @param {*} vm 上下文实例
   */
  function normalizeDirectives$1 (
    dirs,
    vm
  ) {
    var res = Object.create(null);
    if (!dirs) {
      // VNode上未定义指令dirs，返回一个空对象
      // $flow-disable-line
      return res
    }
    var i, dir;
    for (i = 0; i < dirs.length; i++) {
      dir = dirs[i];
      if (!dir.modifiers) {
        // $flow-disable-line
        dir.modifiers = emptyModifiers; // 指令没有修饰符，创建空修饰符对象
      }
      res[getRawDirName(dir)] = dir;
      // 查找指令的定义asset 即 实际的指令定义 如 def: { inserted, componentUpdated }
      dir.def = resolveAsset(vm.$options, 'directives', dir.name, true);
    }
    // $flow-disable-line
    return res
  }

  /**
   * 返回用户定义的指令名
   * @param {*} dir 
   * @returns 
   */
  function getRawDirName (dir) {
    return dir.rawName || ((dir.name) + "." + (Object.keys(dir.modifiers || {}).join('.')))
  }

  /**
   * 调用指令定义的钩子方法
   * @param {*} dir 指令定义
   * @param {*} hook 钩子函数名 bind insert update unbind
   * @param {*} vnode 
   * @param {*} oldVnode 
   * @param {*} isDestroy 
   */
  function callHook$1 (dir, hook, vnode, oldVnode, isDestroy) {
    var fn = dir.def && dir.def[hook]; // 钩子函数
    if (fn) {
      try {
        // 执行指令的钩子函数
        fn(vnode.elm, dir, vnode, oldVnode, isDestroy);
      } catch (e) {
        handleError(e, vnode.context, ("directive " + (dir.name) + " " + hook + " hook"));
      }
    }
  }

  /**
   * 跨平台module
   */
  var baseModules = [
    ref,
    directives
  ];

  /*  */

  function updateAttrs (oldVnode, vnode) {
    var opts = vnode.componentOptions;
    if (isDef(opts) && opts.Ctor.options.inheritAttrs === false) {
      return
    }
    if (isUndef(oldVnode.data.attrs) && isUndef(vnode.data.attrs)) {
      return
    }
    var key, cur, old;
    var elm = vnode.elm;
    var oldAttrs = oldVnode.data.attrs || {};
    var attrs = vnode.data.attrs || {};
    // clone observed objects, as the user probably wants to mutate it
    if (isDef(attrs.__ob__)) {
      attrs = vnode.data.attrs = extend({}, attrs);
    }

    for (key in attrs) {
      cur = attrs[key];
      old = oldAttrs[key];
      if (old !== cur) {
        setAttr(elm, key, cur, vnode.data.pre);
      }
    }
    // #4391: in IE9, setting type can reset value for input[type=radio]
    // #6666: IE/Edge forces progress value down to 1 before setting a max
    /* istanbul ignore if */
    if ((isIE || isEdge) && attrs.value !== oldAttrs.value) {
      setAttr(elm, 'value', attrs.value);
    }
    for (key in oldAttrs) {
      if (isUndef(attrs[key])) {
        if (isXlink(key)) {
          elm.removeAttributeNS(xlinkNS, getXlinkProp(key));
        } else if (!isEnumeratedAttr(key)) {
          elm.removeAttribute(key);
        }
      }
    }
  }

  function setAttr (el, key, value, isInPre) {
    if (isInPre || el.tagName.indexOf('-') > -1) {
      baseSetAttr(el, key, value);
    } else if (isBooleanAttr(key)) {
      // set attribute for blank value
      // e.g. <option disabled>Select one</option>
      if (isFalsyAttrValue(value)) {
        el.removeAttribute(key);
      } else {
        // technically allowfullscreen is a boolean attribute for <iframe>,
        // but Flash expects a value of "true" when used on <embed> tag
        value = key === 'allowfullscreen' && el.tagName === 'EMBED'
          ? 'true'
          : key;
        el.setAttribute(key, value);
      }
    } else if (isEnumeratedAttr(key)) {
      el.setAttribute(key, convertEnumeratedValue(key, value));
    } else if (isXlink(key)) {
      if (isFalsyAttrValue(value)) {
        el.removeAttributeNS(xlinkNS, getXlinkProp(key));
      } else {
        el.setAttributeNS(xlinkNS, key, value);
      }
    } else {
      baseSetAttr(el, key, value);
    }
  }

  function baseSetAttr (el, key, value) {
    if (isFalsyAttrValue(value)) {
      el.removeAttribute(key);
    } else {
      // #7138: IE10 & 11 fires input event when setting placeholder on
      // <textarea>... block the first input event and remove the blocker
      // immediately.
      /* istanbul ignore if */
      if (
        isIE && !isIE9 &&
        el.tagName === 'TEXTAREA' &&
        key === 'placeholder' && value !== '' && !el.__ieph
      ) {
        var blocker = function (e) {
          e.stopImmediatePropagation();
          el.removeEventListener('input', blocker);
        };
        el.addEventListener('input', blocker);
        // $flow-disable-line
        el.__ieph = true; /* IE placeholder patched */
      }
      el.setAttribute(key, value);
    }
  }

  var attrs = {
    create: updateAttrs,
    update: updateAttrs
  };

  /*  */

  function updateClass (oldVnode, vnode) {
    var el = vnode.elm;
    var data = vnode.data;
    var oldData = oldVnode.data;
    if (
      isUndef(data.staticClass) &&
      isUndef(data.class) && (
        isUndef(oldData) || (
          isUndef(oldData.staticClass) &&
          isUndef(oldData.class)
        )
      )
    ) {
      return
    }

    var cls = genClassForVnode(vnode);

    // handle transition classes
    var transitionClass = el._transitionClasses;
    if (isDef(transitionClass)) {
      cls = concat(cls, stringifyClass(transitionClass));
    }

    // set the class
    if (cls !== el._prevClass) {
      el.setAttribute('class', cls);
      el._prevClass = cls;
    }
  }

  var klass = {
    create: updateClass,
    update: updateClass
  };

  /*  */

  var validDivisionCharRE = /[\w).+\-_$\]]/;

  /**
   * 解析动态属性的绑定值
   * @param {*} exp 
   * @returns 解析后的表达式
   */
  function parseFilters (exp) {
    var inSingle = false;
    var inDouble = false;
    var inTemplateString = false;
    var inRegex = false;
    var curly = 0;
    var square = 0;
    var paren = 0;
    var lastFilterIndex = 0;
    var c, prev, i, expression, filters;

    for (i = 0; i < exp.length; i++) {
      prev = c;
      c = exp.charCodeAt(i);
      if (inSingle) {
        if (c === 0x27 && prev !== 0x5C) { inSingle = false; }
      } else if (inDouble) {
        if (c === 0x22 && prev !== 0x5C) { inDouble = false; }
      } else if (inTemplateString) {
        if (c === 0x60 && prev !== 0x5C) { inTemplateString = false; }
      } else if (inRegex) {
        if (c === 0x2f && prev !== 0x5C) { inRegex = false; }
      } else if (
        c === 0x7C && // pipe
        exp.charCodeAt(i + 1) !== 0x7C &&
        exp.charCodeAt(i - 1) !== 0x7C &&
        !curly && !square && !paren
      ) {
        if (expression === undefined) {
          // first filter, end of expression
          lastFilterIndex = i + 1;
          expression = exp.slice(0, i).trim();
        } else {
          pushFilter();
        }
      } else {
        switch (c) {
          case 0x22: inDouble = true; break         // "
          case 0x27: inSingle = true; break         // '
          case 0x60: inTemplateString = true; break // `
          case 0x28: paren++; break                 // (
          case 0x29: paren--; break                 // )
          case 0x5B: square++; break                // [
          case 0x5D: square--; break                // ]
          case 0x7B: curly++; break                 // {
          case 0x7D: curly--; break                 // }
        }
        if (c === 0x2f) { // /
          var j = i - 1;
          var p = (void 0);
          // find first non-whitespace prev char
          for (; j >= 0; j--) {
            p = exp.charAt(j);
            if (p !== ' ') { break }
          }
          if (!p || !validDivisionCharRE.test(p)) {
            inRegex = true;
          }
        }
      }
    }

    if (expression === undefined) {
      expression = exp.slice(0, i).trim();
    } else if (lastFilterIndex !== 0) {
      pushFilter();
    }

    function pushFilter () {
      (filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim());
      lastFilterIndex = i + 1;
    }

    if (filters) {
      for (i = 0; i < filters.length; i++) {
        expression = wrapFilter(expression, filters[i]);
      }
    }

    return expression
  }

  function wrapFilter (exp, filter) {
    var i = filter.indexOf('(');
    if (i < 0) {
      // _f: resolveFilter
      return ("_f(\"" + filter + "\")(" + exp + ")")
    } else {
      var name = filter.slice(0, i);
      var args = filter.slice(i + 1);
      return ("_f(\"" + name + "\")(" + exp + (args !== ')' ? ',' + args : args))
    }
  }

  /*  */



  /**
   * Vue编译错误警告
   * @param {*} msg 
   * @param {*} range 
   */
  /* eslint-disable no-unused-vars */
  function baseWarn (msg, range) {
    console.error(("[Vue compiler]: " + msg));
  }
  /* eslint-enable no-unused-vars */

  /**
   * 获取modules数组中的指定方法，并返回获取到的方法数组
   * @param {*} modules 
   * @param {*} key 指定的方法名
   * @returns 
   */
  function pluckModuleFunction (
    modules,
    key
  ) {
    return modules
      // filter(_ => _) 会过滤掉非真值
      ? modules.map(function (m) { return m[key]; }).filter(function (_) { return _; })
      : []
  }

  /**
   * AST元素上扩展props属性
   * @param {*} el 
   * @param {*} name 
   * @param {*} value 
   * @param {*} range 
   * @param {*} dynamic 
   */
  function addProp (el, name, value, range, dynamic) {
    (el.props || (el.props = [])).push(rangeSetItem({ name: name, value: value, dynamic: dynamic }, range));
    el.plain = false;
  }

  /**
   * AST元素上扩展静态属性或动态属性
   *  静态属性添加到AST元素的dynamicAttrs数组中
   *  动态属性添加到AST元素的attrs数组中
   * 
   *  格式：{ name, value, dynamic, start, end }
   * @param {*} el 
   * @param {*} name 
   * @param {*} value 
   * @param {*} range 
   * @param {*} dynamic 
   */
  function addAttr (el, name, value, range, dynamic) {
    var attrs = dynamic
      ? (el.dynamicAttrs || (el.dynamicAttrs = []))
      : (el.attrs || (el.attrs = []));
    attrs.push(rangeSetItem({ name: name, value: value, dynamic: dynamic }, range));
    // el置为非普通AST元素
    el.plain = false;
  }

  /**
   * add a raw attr (use this in preTransforms)
   * AST元素上扩展attrsMap和attrsList属性 preTransforms中使用
   * @param {*} el 
   * @param {*} name 
   * @param {*} value 
   * @param {*} range 
   */
  function addRawAttr (el, name, value, range) {
    el.attrsMap[name] = value;
    el.attrsList.push(rangeSetItem({ name: name, value: value }, range));
  }

  /**
   * 对AST元素扩展directives属性
   * @param {*} el 
   * @param {*} name 
   * @param {*} rawName 
   * @param {*} value 
   * @param {*} arg 
   * @param {*} isDynamicArg 
   * @param {*} modifiers 
   * @param {*} range 
   */
  function addDirective (
    el,
    name,
    rawName,
    value,
    arg,
    isDynamicArg,
    modifiers,
    range
  ) {
    (el.directives || (el.directives = [])).push(rangeSetItem({
      name: name,
      rawName: rawName,
      value: value,
      arg: arg,
      isDynamicArg: isDynamicArg,
      modifiers: modifiers
    }, range));
    el.plain = false;
  }

  /**
   * 预处理修饰符 将修饰符换成对应前缀符号
   * 修饰符对应的前缀：
   *    .passive  =>  &
   *    .capture  =>  !
   *    .once     =>  ~
   * @param {*} symbol 要生成的前缀符号
   * @param {*} name  
   * @param {*} dynamic 是否是动态属性[key] 
   * @returns 
   */
  function prependModifierMarker (symbol, name, dynamic) {
    return dynamic
      // 包裹动态key处理的修饰符 
      ? ("_p(" + name + ",\"" + symbol + "\")")
      : symbol + name // mark the event as captured
  }

  /**
   * 对AST元素扩展events或nativeEvents属性
   *  1. 根据modifier修饰符对事件名name做处理
   *  2. 根据modifier.native判断是一个纯原生事件还是普通事件，
   *     分别对应el.nativeEvents和el.events
   *  3. 按照name对事件做归类，并把回调函数的字符串保留到对应的事件中，
   *     - 同类单个事件保存成对象{ name: event1 }
   *     - 同类多个事件保存成数组{ name: [event1, event2] }
   * @param {*} el AST元素
   * @param {*} name 属性名
   * @param {*} value 属性值
   * @param {*} modifiers 修饰符对象Map
   * @param {*} important 事件权重 true放在同类型事件队列第一个 false放在最后一个 v-model时为true
   * @param {*} warn 
   * @param {*} range 属性的索引
   * @param {*} dynamic 是否是动态名属性 @[test] test是一个变量
   */
  function addHandler (
    el,
    name,
    value,
    modifiers,
    important,
    warn,
    range,
    dynamic
  ) {
    modifiers = modifiers || emptyObject;
    // warn prevent and passive modifier
    /* istanbul ignore if */
    if (
      warn &&
      modifiers.prevent && modifiers.passive
    ) {
      // prevent和passive修饰符不能同时使用
      warn(
        'passive and prevent can\'t be used together. ' +
        'Passive handler can\'t prevent default event.',
        range
      );
    }

    // normalize click.right and click.middle since they don't actually fire
    // this is technically browser-specific, but at least for now browsers are
    // the only target envs that have right/middle clicks.
    if (modifiers.right) {
      // 鼠标右键 替换成 contextmenu
      if (dynamic) {
        name = "(" + name + ")==='click'?'contextmenu':(" + name + ")";
      } else if (name === 'click') {
        name = 'contextmenu';
        delete modifiers.right;
      }
    } else if (modifiers.middle) {
      // 鼠标滚轮键 替换成 mouseup
      if (dynamic) {
        name = "(" + name + ")==='click'?'mouseup':(" + name + ")";
      } else if (name === 'click') {
        name = 'mouseup';
      }
    }

    // check capture modifier
    if (modifiers.capture) {
      // DOM capture事件
      delete modifiers.capture;
      // name = !name
      name = prependModifierMarker('!', name, dynamic);
    }
    if (modifiers.once) {
      // DOM once事件
      delete modifiers.once;
      // name = ~name
      name = prependModifierMarker('~', name, dynamic);
    }
    /* istanbul ignore if */
    if (modifiers.passive) {
      // DOM passive事件
      delete modifiers.passive;
      // name = &name
      name = prependModifierMarker('&', name, dynamic);
    }

    var events;
    if (modifiers.native) {
      // 有native修饰符，将事件添加到el.nativeEvents
      delete modifiers.native;
      events = el.nativeEvents || (el.nativeEvents = {});
    } else {
      // 默认将事件添加到el.events
      events = el.events || (el.events = {});
    }

    // newHandler = { value, dynamic, start, end, modifiers }
    var newHandler = rangeSetItem({ value: value.trim(), dynamic: dynamic }, range);
    if (modifiers !== emptyObject) {
      // 保存还没处理的修饰符
      newHandler.modifiers = modifiers;
    }

    var handlers = events[name];
    /* istanbul ignore if */
    if (Array.isArray(handlers)) {
      // 多个同类型事件，保存成数组 important将新事件放在第一个 否则放最后一个
      important ? handlers.unshift(newHandler) : handlers.push(newHandler);
    } else if (handlers) {
      // 同类新的有两个事件 保存成数组
      events[name] = important ? [newHandler, handlers] : [handlers, newHandler];
    } else {
      // 同类型的事件只有一个，保存成对象
      events[name] = newHandler;
    }

    el.plain = false;
  }

  /**
   * 获取AST上指定的属性
   * @param {*} el 
   * @param {*} name 要获取的属性属性名
   * @returns 
   */
  function getRawBindingAttr (
    el,
    name
  ) {
    return el.rawAttrsMap[':' + name] ||
      el.rawAttrsMap['v-bind:' + name] ||
      el.rawAttrsMap[name]
  }

  /**
   * 获取静态属性或动态绑定属性的值的表达式 或 值的字符串 
   * @param {*} el 
   * @param {*} name 
   * @param {*} getStatic 是否获取静态 true 直接返回绑定值字符串
   * @returns 
   */
  function getBindingAttr (
    el,
    name,
    getStatic
  ) {
    // 绑定属性值 : 或 v-bind 语法 
    var dynamicValue =
      getAndRemoveAttr(el, ':' + name) ||
      getAndRemoveAttr(el, 'v-bind:' + name);
    if (dynamicValue != null) {
      // 解析绑定值得到表达式并返回
      return parseFilters(dynamicValue)
    } else if (getStatic !== false) {
      // 静态
      var staticValue = getAndRemoveAttr(el, name);
      if (staticValue != null) {
        // 直接返回绑定值的字符串格式
        return JSON.stringify(staticValue)
      }
    }
  }

  // note: this only removes the attr from the Array (attrsList) so that it
  // doesn't get processed by processAttrs.
  // By default it does NOT remove it from the map (attrsMap) because the map is
  // needed during codegen.
  /**
   * 从attrsList中移除掉指定属性，并获取这个属性
   * @param {*} el   AST元素
   * @param {*} name 要移除属性
   * @param {*} removeFromMap 是否从attrsMap中也移除指定属性
   * @returns 被移除的属性的value值
   */
  function getAndRemoveAttr (
    el,
    name,
    removeFromMap
  ) {
    var val;
    if ((val = el.attrsMap[name]) != null) {
      var list = el.attrsList;
      for (var i = 0, l = list.length; i < l; i++) {
        if (list[i].name === name) {
          list.splice(i, 1);
          break
        }
      }
    }
    if (removeFromMap) {
      delete el.attrsMap[name];
    }
    return val
  }

  /**
   * 根据正则，从attrsList中移除掉指定属性，并获取这个属性
   * @param {*} el 
   * @param {*} name 
   * @returns 
   */
  function getAndRemoveAttrByRegex (
    el,
    name
  ) {
    var list = el.attrsList;
    for (var i = 0, l = list.length; i < l; i++) {
      var attr = list[i];
      if (name.test(attr.name)) {
        list.splice(i, 1);
        return attr
      }
    }
  }

  /**
   * 设置解析html值的开始和结束索引
   * @param {*} item 
   * @param {*} range 
   * @returns 
   */
  function rangeSetItem (
    item,
    range
  ) {
    if (range) {
      if (range.start != null) {
        item.start = range.start;
      }
      if (range.end != null) {
        item.end = range.end;
      }
    }
    return item
  }

  /*  */

  /**
   * Cross-platform code generation for component v-model
   * 生成组件v-model的code
   *  组件的v-model做的事情，只是在组件上添加一个事件和prop，没有runtime处理
   */
  function genComponentModel (
    el,
    value,
    modifiers
  ) {
    var ref = modifiers || {};
    var number = ref.number;
    var trim = ref.trim;

    var baseValueExpression = '$$v'; // 默认value的code
    var valueExpression = baseValueExpression;
    if (trim) {
      // 添加trim修饰符code
      valueExpression =
        "(typeof " + baseValueExpression + " === 'string'" +
        "? " + baseValueExpression + ".trim()" +
        ": " + baseValueExpression + ")";
    }
    if (number) {
      // 添加number修饰符code
      valueExpression = "_n(" + valueExpression + ")";
    }
    var assignment = genAssignmentCode(value, valueExpression);

    /**
     * 生成组件v-model的处理对象
     */
    el.model = {
      value: ("(" + value + ")"),
      expression: JSON.stringify(value),
      callback: ("function (" + baseValueExpression + ") {" + assignment + "}")
    };
  }

  /**
   * Cross-platform codegen helper for generating v-model value assignment code.
   * 生成v-model绑定值value的赋值code
   * @param {*} value 
   * @param {*} assignment 
   * @returns 
   */
  function genAssignmentCode (
    value,
    assignment
  ) {
    // 解析绑定值
    var res = parseModel(value);
    if (res.key === null) {
      // value的赋值code 'hello=$event.target.value' 
      return (value + "=" + assignment)
    } else {
      // 有值 说明是响应式的，生成$set赋值code
      return ("$set(" + (res.exp) + ", " + (res.key) + ", " + assignment + ")")
    }
  }

  /**
   * Parse a v-model expression into a base path and a final key segment.
   * Handles both dot-path and possible square brackets.
   *
   * Possible cases:
   *
   * - test
   * - test[key]
   * - test[test1[key]]
   * - test["a"][key]
   * - xxx.test[a[a].test1[key]]
   * - test.xxx.a["asa"][test1[key]]
   *
   */

  var len, str, chr, index$1, expressionPos, expressionEndPos;



  /**
   * 解析v-model的绑定值格式 点操作符、中括号
   * 
   * 如下格式：
   * - test
   * - test[key]
   * - test[test1[key]]
   * - test["a"][key]
   * - xxx.test[a[a].test1[key]]
   * - test.xxx.a["asa"][test1[key]]
   * 
   * 解析结果：
   *  {
   *    exp:
   *    key:
   *  }
   * @param {*} val 
   * @returns 
   */
  function parseModel (val) {
    // Fix https://github.com/vuejs/vue/pull/7730
    // allow v-model="obj.val " (trailing whitespace)
    val = val.trim();
    len = val.length;

    if (val.indexOf('[') < 0 || val.lastIndexOf(']') < len - 1) {
      index$1 = val.lastIndexOf('.');
      if (index$1 > -1) {
        return {
          exp: val.slice(0, index$1),
          key: '"' + val.slice(index$1 + 1) + '"'
        }
      } else {
        return {
          exp: val,
          key: null
        }
      }
    }

    str = val;
    index$1 = expressionPos = expressionEndPos = 0;

    while (!eof()) {
      chr = next();
      /* istanbul ignore if */
      if (isStringStart(chr)) {
        parseString(chr);
      } else if (chr === 0x5B) {
        parseBracket(chr);
      }
    }

    return {
      exp: val.slice(0, expressionPos),
      key: val.slice(expressionPos + 1, expressionEndPos)
    }
  }

  function next () {
    return str.charCodeAt(++index$1)
  }

  function eof () {
    return index$1 >= len
  }

  function isStringStart (chr) {
    return chr === 0x22 || chr === 0x27
  }

  function parseBracket (chr) {
    var inBracket = 1;
    expressionPos = index$1;
    while (!eof()) {
      chr = next();
      if (isStringStart(chr)) {
        parseString(chr);
        continue
      }
      if (chr === 0x5B) { inBracket++; }
      if (chr === 0x5D) { inBracket--; }
      if (inBracket === 0) {
        expressionEndPos = index$1;
        break
      }
    }
  }

  function parseString (chr) {
    var stringQuote = chr;
    while (!eof()) {
      chr = next();
      if (chr === stringQuote) {
        break
      }
    }
  }

  /*  */

  var warn$1;

  // in some cases, the event used has to be determined at runtime
  // so we used some reserved tokens during compile.
  var RANGE_TOKEN = '__r';
  var CHECKBOX_RADIO_TOKEN = '__c';

  /**
   * Web平台v-model指令handler
   * @param {*} el  AST元素
   * @param {*} dir AST指令
   * @param {*} _warn 
   * @returns 
   */
  function model (
    el,
    dir,
    _warn
  ) {
    warn$1 = _warn;
    var value = dir.value; // v-model绑定的值
    var modifiers = dir.modifiers; // 修饰符
    var tag = el.tag;
    var type = el.attrsMap.type; // AST input元素输入框type类型

    {
      // inputs with type="file" are read only and setting the input's
      // value will throw an error.
      // input输入框的type="file"类型不能设置v-model，是只读的，可以使用v-on:change
      if (tag === 'input' && type === 'file') {
        warn$1(
          "<" + (el.tag) + " v-model=\"" + value + "\" type=\"file\">:\n" +
          "File inputs are read only. Use a v-on:change listener instead.",
          el.rawAttrsMap['v-model']
        );
      }
    }

    if (el.component) {
      genComponentModel(el, value, modifiers);
      // component v-model doesn't need extra runtime
      return false
    } else if (tag === 'select') {
      genSelect(el, value, modifiers);
    } else if (tag === 'input' && type === 'checkbox') {
      genCheckboxModel(el, value, modifiers);
    } else if (tag === 'input' && type === 'radio') {
      genRadioModel(el, value, modifiers);
    } else if (tag === 'input' || tag === 'textarea') {
      genDefaultModel(el, value, modifiers);
    } else if (!config.isReservedTag(tag)) {
      // 组件的v-model做的事情，只是在组件上VNode上添加一个事件和prop，没有runtime处理
      genComponentModel(el, value, modifiers);
      // component v-model doesn't need extra runtime
      return false
    } else {
      // 警告 v-model不能使用在除上述类型的元素上
      warn$1(
        "<" + (el.tag) + " v-model=\"" + value + "\">: " +
        "v-model is not supported on this element type. " +
        'If you are working with contenteditable, it\'s recommended to ' +
        'wrap a library dedicated for that purpose inside a custom component.',
        el.rawAttrsMap['v-model']
      );
    }

    // ensure runtime directive metadata
    return true
  }

  function genCheckboxModel (
    el,
    value,
    modifiers
  ) {
    var number = modifiers && modifiers.number;
    var valueBinding = getBindingAttr(el, 'value') || 'null';
    var trueValueBinding = getBindingAttr(el, 'true-value') || 'true';
    var falseValueBinding = getBindingAttr(el, 'false-value') || 'false';
    addProp(el, 'checked',
      "Array.isArray(" + value + ")" +
      "?_i(" + value + "," + valueBinding + ")>-1" + (
        trueValueBinding === 'true'
          ? (":(" + value + ")")
          : (":_q(" + value + "," + trueValueBinding + ")")
      )
    );
    addHandler(el, 'change',
      "var $$a=" + value + "," +
          '$$el=$event.target,' +
          "$$c=$$el.checked?(" + trueValueBinding + "):(" + falseValueBinding + ");" +
      'if(Array.isArray($$a)){' +
        "var $$v=" + (number ? '_n(' + valueBinding + ')' : valueBinding) + "," +
            '$$i=_i($$a,$$v);' +
        "if($$el.checked){$$i<0&&(" + (genAssignmentCode(value, '$$a.concat([$$v])')) + ")}" +
        "else{$$i>-1&&(" + (genAssignmentCode(value, '$$a.slice(0,$$i).concat($$a.slice($$i+1))')) + ")}" +
      "}else{" + (genAssignmentCode(value, '$$c')) + "}",
      null, true
    );
  }

  function genRadioModel (
    el,
    value,
    modifiers
  ) {
    var number = modifiers && modifiers.number;
    var valueBinding = getBindingAttr(el, 'value') || 'null';
    valueBinding = number ? ("_n(" + valueBinding + ")") : valueBinding;
    addProp(el, 'checked', ("_q(" + value + "," + valueBinding + ")"));
    addHandler(el, 'change', genAssignmentCode(value, valueBinding), null, true);
  }

  function genSelect (
    el,
    value,
    modifiers
  ) {
    var number = modifiers && modifiers.number;
    var selectedVal = "Array.prototype.filter" +
      ".call($event.target.options,function(o){return o.selected})" +
      ".map(function(o){var val = \"_value\" in o ? o._value : o.value;" +
      "return " + (number ? '_n(val)' : 'val') + "})";

    var assignment = '$event.target.multiple ? $$selectedVal : $$selectedVal[0]';
    var code = "var $$selectedVal = " + selectedVal + ";";
    code = code + " " + (genAssignmentCode(value, assignment));
    addHandler(el, 'change', code, null, true);
  }

  /**
   * 生成input、textarea的v-model处理
   * @param {*} el 
   * @param {*} value 
   * @param {*} modifiers 
   */
  function genDefaultModel (
    el,
    value,
    modifiers
  ) {
    var type = el.attrsMap.type;

    // warn if v-bind:value conflicts with v-model
    // except for inputs with v-bind:type
    {
      var value$1 = el.attrsMap['v-bind:value'] || el.attrsMap[':value'];
      var typeBinding = el.attrsMap['v-bind:type'] || el.attrsMap[':type'];
      if (value$1 && !typeBinding) {
        var binding = el.attrsMap['v-bind:value'] ? 'v-bind:value' : ':value';
        // v-model使用时 不能同时使用:value|v-bind:value
        warn$1(
          binding + "=\"" + value$1 + "\" conflicts with v-model on the same element " +
          'because the latter already expands to a value binding internally',
          el.rawAttrsMap[binding]
        );
      }
    }

    // 获取修饰符
    var ref = modifiers || {};
    var lazy = ref.lazy;
    var number = ref.number;
    var trim = ref.trim;
    var needCompositionGuard = !lazy && type !== 'range'; // 非lazy修饰符 且 非range
    var event = lazy
      // 设置lazy，使用change事件
      ? 'change'
      : type === 'range'
        // 单选的input 用__r
        ? RANGE_TOKEN
        // 非lazy 非单选 使用input事件
        : 'input';

    // 获取value值的表达式
    var valueExpression = '$event.target.value';
    if (trim) {
      // trim修饰符 添加trim()
      valueExpression = "$event.target.value.trim()";
    }
    if (number) {
      // number修饰符 包裹强制转Number类型函数
      valueExpression = "_n(" + valueExpression + ")";
    }

    // 生成v-model的绑定值value的赋值code
    var code = genAssignmentCode(value, valueExpression);
    if (needCompositionGuard) {
      // 添加composing，用作需要输入法输入的文字类型判断
      // 只有当composing为false，即输入法输入文字结束时触发${code}的赋值执行
      code = "if($event.target.composing)return;" + code;
    }

    // el.props属性上增加value 添加到prop上
    addProp(el, 'value', ("(" + value + ")"));
    // el.events或el.nativeEvents上增加事件event
    addHandler(el, event, code, null, true /* important */);
    if (trim || number) {
      // 有trim或number修饰符 添加blur事件 强制刷新$forceUpdate()
      addHandler(el, 'blur', '$forceUpdate()');
    }
  }

  /*  */

  // Web运行时事件处理

  // normalize v-model event tokens that can only be determined at runtime.
  // it's important to place the event as the first in the array because
  // the whole point is ensuring the v-model callback gets called before
  // user-attached handlers.
  /**
   * 标准化v-model
   * @param {*} on 
   */
  function normalizeEvents (on) {
    /* istanbul ignore if */
    if (isDef(on[RANGE_TOKEN])) {
      // IE input[type=range] only supports `change` event
      var event = isIE ? 'change' : 'input';
      on[event] = [].concat(on[RANGE_TOKEN], on[event] || []);
      delete on[RANGE_TOKEN];
    }

    // This was originally intended to fix #4521 but no longer necessary
    // after 2.5. Keeping it for backwards compat with generated code from < 2.4
    // < 2.4兼容代码
    /* istanbul ignore if */
    if (isDef(on[CHECKBOX_RADIO_TOKEN])) {
      on.change = [].concat(on[CHECKBOX_RADIO_TOKEN], on.change || []);
      delete on[CHECKBOX_RADIO_TOKEN];
    }
  }

  var target$1;

  /**
   * 创建一次性执行的事件定义函数
   * @param {*} event 
   * @param {*} handler 
   * @param {*} capture 
   * @returns 一次性执行的事件定义函数
   */
  function createOnceHandler$1 (event, handler, capture) {
    var _target = target$1; // save current target element in closure
    /**
     * 一次性执行的事件定义函数
     */
    return function onceHandler () {
      var res = handler.apply(null, arguments);
      if (res !== null) {
        // 执行后，直接移除事件监听
        remove$2(event, onceHandler, capture, _target);
      }
    }
  }

  // #9446: Firefox <= 53 (in particular, ESR 52) has incorrect Event.timeStamp
  // implementation and does not fire microtasks in between event propagation, so
  // safe to exclude.
  var useMicrotaskFix = isUsingMicroTask && !(isFF && Number(isFF[1]) <= 53);

  /**
   * 添加DOM事件监听
   * @param {*} name 
   * @param {*} handler 
   * @param {*} capture 
   * @param {*} passive 
   */
  function add$1 (
    name,
    handler,
    capture,
    passive
  ) {
    // async edge case #6566: inner click event triggers patch, event handler
    // attached to outer element during patch, and triggered again. This
    // happens because browsers fire microtask ticks between event propagation.
    // the solution is simple: we save the timestamp when a handler is attached,
    // and the handler would only fire if the event passed to it was fired
    // AFTER it was attached.
    if (useMicrotaskFix) {
      // 微任务并且是<=53的火狐 解决bug
      var attachedTimestamp = currentFlushTimestamp;
      var original = handler;
      handler = original._wrapper = function (e) {
        if (
          // no bubbling, should always fire.
          // this is just a safety net in case event.timeStamp is unreliable in
          // certain weird environments...
          e.target === e.currentTarget ||
          // event is fired after handler attachment
          e.timeStamp >= attachedTimestamp ||
          // bail for environments that have buggy event.timeStamp implementations
          // #9462 iOS 9 bug: event.timeStamp is 0 after history.pushState
          // #9681 QtWebEngine event.timeStamp is negative value
          e.timeStamp <= 0 ||
          // #9448 bail if event is fired in another document in a multi-page
          // electron/nw.js app, since event.timeStamp will be using a different
          // starting reference
          e.target.ownerDocument !== document
        ) {
          return original.apply(this, arguments)
        }
      };
    }
    // 添加DOM事件
    target$1.addEventListener(
      name,
      handler,
      supportsPassive
        ? { capture: capture, passive: passive }
        : capture
    );
  }

  /**
   * 移除DOM事件监听
   * @param {*} name 
   * @param {*} handler 
   * @param {*} capture 
   * @param {*} _target 
   */
  function remove$2 (
    name,
    handler,
    capture,
    _target
  ) {
    // 移除DOM事件
    (_target || target$1).removeEventListener(
      name,
      handler._wrapper || handler,
      capture
    );
  }

  /**
   * 更新事件
   * patch创建阶段、更新阶段、销毁阶段会执行
   * patch阶段执行cbs.create、cbs.update、cb.destroy队列
   * @param {*} oldVnode 
   * @param {*} vnode 
   * @returns 
   */
  function updateDOMListeners (oldVnode, vnode) {
    if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
      // 新旧VNode节点上都没有事件
      return
    }
    var on = vnode.data.on || {};
    var oldOn = oldVnode.data.on || {};
    // vnode is empty when removing all listeners,
    // and use old vnode dom element
    // destroy时，新vnode是空节点，使用旧的DOM节点
    target$1 = vnode.elm || oldVnode.elm;
    // 处理v-model
    normalizeEvents(on);
    // 更新事件
    updateListeners(on, oldOn, add$1, remove$2, createOnceHandler$1, vnode.context);
    target$1 = undefined;
  }

  var events = {
    create: updateDOMListeners,
    update: updateDOMListeners,
    destroy: function (vnode) { return updateDOMListeners(vnode, emptyNode); }
  };

  /*  */

  var svgContainer;

  function updateDOMProps (oldVnode, vnode) {
    if (isUndef(oldVnode.data.domProps) && isUndef(vnode.data.domProps)) {
      return
    }
    var key, cur;
    var elm = vnode.elm;
    var oldProps = oldVnode.data.domProps || {};
    var props = vnode.data.domProps || {};
    // clone observed objects, as the user probably wants to mutate it
    if (isDef(props.__ob__)) {
      props = vnode.data.domProps = extend({}, props);
    }

    for (key in oldProps) {
      if (!(key in props)) {
        elm[key] = '';
      }
    }

    for (key in props) {
      cur = props[key];
      // ignore children if the node has textContent or innerHTML,
      // as these will throw away existing DOM nodes and cause removal errors
      // on subsequent patches (#3360)
      if (key === 'textContent' || key === 'innerHTML') {
        if (vnode.children) { vnode.children.length = 0; }
        if (cur === oldProps[key]) { continue }
        // #6601 work around Chrome version <= 55 bug where single textNode
        // replaced by innerHTML/textContent retains its parentNode property
        if (elm.childNodes.length === 1) {
          elm.removeChild(elm.childNodes[0]);
        }
      }

      if (key === 'value' && elm.tagName !== 'PROGRESS') {
        // store value as _value as well since
        // non-string values will be stringified
        elm._value = cur;
        // avoid resetting cursor position when value is the same
        var strCur = isUndef(cur) ? '' : String(cur);
        if (shouldUpdateValue(elm, strCur)) {
          elm.value = strCur;
        }
      } else if (key === 'innerHTML' && isSVG(elm.tagName) && isUndef(elm.innerHTML)) {
        // IE doesn't support innerHTML for SVG elements
        svgContainer = svgContainer || document.createElement('div');
        svgContainer.innerHTML = "<svg>" + cur + "</svg>";
        var svg = svgContainer.firstChild;
        while (elm.firstChild) {
          elm.removeChild(elm.firstChild);
        }
        while (svg.firstChild) {
          elm.appendChild(svg.firstChild);
        }
      } else if (
        // skip the update if old and new VDOM state is the same.
        // `value` is handled separately because the DOM value may be temporarily
        // out of sync with VDOM state due to focus, composition and modifiers.
        // This  #4521 by skipping the unnecessary `checked` update.
        cur !== oldProps[key]
      ) {
        // some property updates can throw
        // e.g. `value` on <progress> w/ non-finite value
        try {
          elm[key] = cur;
        } catch (e) {}
      }
    }
  }

  // check platforms/web/util/attrs.js acceptValue


  function shouldUpdateValue (elm, checkVal) {
    return (!elm.composing && (
      elm.tagName === 'OPTION' ||
      isNotInFocusAndDirty(elm, checkVal) ||
      isDirtyWithModifiers(elm, checkVal)
    ))
  }

  function isNotInFocusAndDirty (elm, checkVal) {
    // return true when textbox (.number and .trim) loses focus and its value is
    // not equal to the updated value
    var notInFocus = true;
    // #6157
    // work around IE bug when accessing document.activeElement in an iframe
    try { notInFocus = document.activeElement !== elm; } catch (e) {}
    return notInFocus && elm.value !== checkVal
  }

  function isDirtyWithModifiers (elm, newVal) {
    var value = elm.value;
    var modifiers = elm._vModifiers; // injected by v-model runtime
    if (isDef(modifiers)) {
      if (modifiers.number) {
        return toNumber(value) !== toNumber(newVal)
      }
      if (modifiers.trim) {
        return value.trim() !== newVal.trim()
      }
    }
    return value !== newVal
  }

  var domProps = {
    create: updateDOMProps,
    update: updateDOMProps
  };

  /*  */

  /**
   * 解析静态的style字符串
   *   backgournd: red; color: green; => { red: red, color: green }
   */
  var parseStyleText = cached(function (cssText) {
    var res = {};
    var listDelimiter = /;(?![^(]*\))/g;
    var propertyDelimiter = /:(.+)/;
    cssText.split(listDelimiter).forEach(function (item) {
      if (item) {
        var tmp = item.split(propertyDelimiter);
        tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim());
      }
    });
    return res
  });

  // merge static and dynamic style data on the same vnode
  function normalizeStyleData (data) {
    var style = normalizeStyleBinding(data.style);
    // static style is pre-processed into an object during compilation
    // and is always a fresh object, so it's safe to merge into it
    return data.staticStyle
      ? extend(data.staticStyle, style)
      : style
  }

  // normalize possible array / string values into Object
  function normalizeStyleBinding (bindingStyle) {
    if (Array.isArray(bindingStyle)) {
      return toObject(bindingStyle)
    }
    if (typeof bindingStyle === 'string') {
      return parseStyleText(bindingStyle)
    }
    return bindingStyle
  }

  /**
   * parent component style should be after child's
   * so that parent component's style could override it
   */
  function getStyle (vnode, checkChild) {
    var res = {};
    var styleData;

    if (checkChild) {
      var childNode = vnode;
      while (childNode.componentInstance) {
        childNode = childNode.componentInstance._vnode;
        if (
          childNode && childNode.data &&
          (styleData = normalizeStyleData(childNode.data))
        ) {
          extend(res, styleData);
        }
      }
    }

    if ((styleData = normalizeStyleData(vnode.data))) {
      extend(res, styleData);
    }

    var parentNode = vnode;
    while ((parentNode = parentNode.parent)) {
      if (parentNode.data && (styleData = normalizeStyleData(parentNode.data))) {
        extend(res, styleData);
      }
    }
    return res
  }

  /*  */

  var cssVarRE = /^--/;
  var importantRE = /\s*!important$/;
  var setProp = function (el, name, val) {
    /* istanbul ignore if */
    if (cssVarRE.test(name)) {
      el.style.setProperty(name, val);
    } else if (importantRE.test(val)) {
      el.style.setProperty(hyphenate(name), val.replace(importantRE, ''), 'important');
    } else {
      var normalizedName = normalize(name);
      if (Array.isArray(val)) {
        // Support values array created by autoprefixer, e.g.
        // {display: ["-webkit-box", "-ms-flexbox", "flex"]}
        // Set them one by one, and the browser will only set those it can recognize
        for (var i = 0, len = val.length; i < len; i++) {
          el.style[normalizedName] = val[i];
        }
      } else {
        el.style[normalizedName] = val;
      }
    }
  };

  var vendorNames = ['Webkit', 'Moz', 'ms'];

  var emptyStyle;
  var normalize = cached(function (prop) {
    emptyStyle = emptyStyle || document.createElement('div').style;
    prop = camelize(prop);
    if (prop !== 'filter' && (prop in emptyStyle)) {
      return prop
    }
    var capName = prop.charAt(0).toUpperCase() + prop.slice(1);
    for (var i = 0; i < vendorNames.length; i++) {
      var name = vendorNames[i] + capName;
      if (name in emptyStyle) {
        return name
      }
    }
  });

  function updateStyle (oldVnode, vnode) {
    var data = vnode.data;
    var oldData = oldVnode.data;

    if (isUndef(data.staticStyle) && isUndef(data.style) &&
      isUndef(oldData.staticStyle) && isUndef(oldData.style)
    ) {
      return
    }

    var cur, name;
    var el = vnode.elm;
    var oldStaticStyle = oldData.staticStyle;
    var oldStyleBinding = oldData.normalizedStyle || oldData.style || {};

    // if static style exists, stylebinding already merged into it when doing normalizeStyleData
    var oldStyle = oldStaticStyle || oldStyleBinding;

    var style = normalizeStyleBinding(vnode.data.style) || {};

    // store normalized style under a different key for next diff
    // make sure to clone it if it's reactive, since the user likely wants
    // to mutate it.
    vnode.data.normalizedStyle = isDef(style.__ob__)
      ? extend({}, style)
      : style;

    var newStyle = getStyle(vnode, true);

    for (name in oldStyle) {
      if (isUndef(newStyle[name])) {
        setProp(el, name, '');
      }
    }
    for (name in newStyle) {
      cur = newStyle[name];
      if (cur !== oldStyle[name]) {
        // ie9 setting to null has no effect, must use empty string
        setProp(el, name, cur == null ? '' : cur);
      }
    }
  }

  var style = {
    create: updateStyle,
    update: updateStyle
  };

  /*  */

  var whitespaceRE = /\s+/;

  /**
   * Add class with compatibility for SVG since classList is not supported on
   * SVG elements in IE
   * 元素添加class
   */
  function addClass (el, cls) {
    /* istanbul ignore if */
    if (!cls || !(cls = cls.trim())) {
      return
    }

    /* istanbul ignore else */
    if (el.classList) {
      if (cls.indexOf(' ') > -1) {
        cls.split(whitespaceRE).forEach(function (c) { return el.classList.add(c); });
      } else {
        el.classList.add(cls);
      }
    } else {
      var cur = " " + (el.getAttribute('class') || '') + " ";
      if (cur.indexOf(' ' + cls + ' ') < 0) {
        el.setAttribute('class', (cur + cls).trim());
      }
    }
  }

  /**
   * Remove class with compatibility for SVG since classList is not supported on
   * SVG elements in IE
   */
  function removeClass (el, cls) {
    /* istanbul ignore if */
    if (!cls || !(cls = cls.trim())) {
      return
    }

    /* istanbul ignore else */
    if (el.classList) {
      if (cls.indexOf(' ') > -1) {
        cls.split(whitespaceRE).forEach(function (c) { return el.classList.remove(c); });
      } else {
        el.classList.remove(cls);
      }
      if (!el.classList.length) {
        el.removeAttribute('class');
      }
    } else {
      var cur = " " + (el.getAttribute('class') || '') + " ";
      var tar = ' ' + cls + ' ';
      while (cur.indexOf(tar) >= 0) {
        cur = cur.replace(tar, ' ');
      }
      cur = cur.trim();
      if (cur) {
        el.setAttribute('class', cur);
      } else {
        el.removeAttribute('class');
      }
    }
  }

  /*  */

  /**
   * 解析transition的数据
   *  对象上扩展css过渡类
   * @param {*} def 
   * @returns 
   */
  function resolveTransition (def$$1) {
    if (!def$$1) { // 未定义
      return
    }
    /* istanbul ignore else */
    if (typeof def$$1 === 'object') {
      var res = {};
      if (def$$1.css !== false) {
        // 扩展css的所有默认的过渡类名到res上
        extend(res, autoCssTransition(def$$1.name || 'v'));
      }
      // 扩展定义的trasition对象到res上
      // def扩展在过渡类名之后，是因为过渡类名用户可以自定义，覆盖掉默认的过渡类名
      extend(res, def$$1);
      return res
    } else if (typeof def$$1 === 'string') {
      // def是字符串，直接返回扩展的css过度类对象
      return autoCssTransition(def$$1)
    }
  }

  // traisition需要的css缓存对象
  var autoCssTransition = cached(function (name) {
    return {
      enterClass: (name + "-enter"),
      enterToClass: (name + "-enter-to"),
      enterActiveClass: (name + "-enter-active"),
      leaveClass: (name + "-leave"),
      leaveToClass: (name + "-leave-to"),
      leaveActiveClass: (name + "-leave-active")
    }
  });

  var hasTransition = inBrowser && !isIE9;
  var TRANSITION = 'transition';
  var ANIMATION = 'animation';

  // Transition property/event sniffing
  var transitionProp = 'transition';
  var transitionEndEvent = 'transitionend';
  var animationProp = 'animation';
  var animationEndEvent = 'animationend';
  if (hasTransition) {
    /* istanbul ignore if */
    if (window.ontransitionend === undefined &&
      window.onwebkittransitionend !== undefined
    ) {
      transitionProp = 'WebkitTransition';
      transitionEndEvent = 'webkitTransitionEnd';
    }
    if (window.onanimationend === undefined &&
      window.onwebkitanimationend !== undefined
    ) {
      animationProp = 'WebkitAnimation';
      animationEndEvent = 'webkitAnimationEnd';
    }
  }

  // binding to window is necessary to make hot reload work in IE in strict mode
  var raf = inBrowser
    ? window.requestAnimationFrame
      ? window.requestAnimationFrame.bind(window)
      : setTimeout
    : /* istanbul ignore next */ function (fn) { return fn(); };
  /**
   * requestAnimationFrame封装
   * @param {*} fn 
   */
  function nextFrame (fn) {
    raf(function () {
      raf(fn);
    });
  }

  /**
   * 元素节点添加过渡的class
   * @param {*} el 
   * @param {*} cls 
   */
  function addTransitionClass (el, cls) {
    var transitionClasses = el._transitionClasses || (el._transitionClasses = []);
    if (transitionClasses.indexOf(cls) < 0) {
      transitionClasses.push(cls);
      addClass(el, cls);
    }
  }

  function removeTransitionClass (el, cls) {
    if (el._transitionClasses) {
      remove(el._transitionClasses, cls);
    }
    removeClass(el, cls);
  }

  /**
   * 根据过渡或动画结束事件执行_enterCb回调
   * @param {*} el 
   * @param {*} expectedType 
   * @param {*} cb 
   * @returns 
   */
  function whenTransitionEnds (
    el,
    expectedType,
    cb
  ) {
    var ref = getTransitionInfo(el, expectedType);
    var type = ref.type;
    var timeout = ref.timeout;
    var propCount = ref.propCount;
    if (!type) { return cb() }
    var event = type === TRANSITION ? transitionEndEvent : animationEndEvent;
    var ended = 0;
    var end = function () {
      el.removeEventListener(event, onEnd);
      cb();
    };
    var onEnd = function (e) {
      if (e.target === el) {
        if (++ended >= propCount) {
          end();
        }
      }
    };
    setTimeout(function () {
      if (ended < propCount) {
        end();
      }
    }, timeout + 1);
    // 监听transitionend或animationend，根据动画结束事件，执行_enterCb回调
    el.addEventListener(event, onEnd);
  }

  var transformRE = /\b(transform|all)(,|$)/;

  function getTransitionInfo (el, expectedType) {
    var styles = window.getComputedStyle(el);
    // JSDOM may return undefined for transition properties
    var transitionDelays = (styles[transitionProp + 'Delay'] || '').split(', ');
    var transitionDurations = (styles[transitionProp + 'Duration'] || '').split(', ');
    var transitionTimeout = getTimeout(transitionDelays, transitionDurations);
    var animationDelays = (styles[animationProp + 'Delay'] || '').split(', ');
    var animationDurations = (styles[animationProp + 'Duration'] || '').split(', ');
    var animationTimeout = getTimeout(animationDelays, animationDurations);

    var type;
    var timeout = 0;
    var propCount = 0;
    /* istanbul ignore if */
    if (expectedType === TRANSITION) {
      if (transitionTimeout > 0) {
        type = TRANSITION;
        timeout = transitionTimeout;
        propCount = transitionDurations.length;
      }
    } else if (expectedType === ANIMATION) {
      if (animationTimeout > 0) {
        type = ANIMATION;
        timeout = animationTimeout;
        propCount = animationDurations.length;
      }
    } else {
      timeout = Math.max(transitionTimeout, animationTimeout);
      type = timeout > 0
        ? transitionTimeout > animationTimeout
          ? TRANSITION
          : ANIMATION
        : null;
      propCount = type
        ? type === TRANSITION
          ? transitionDurations.length
          : animationDurations.length
        : 0;
    }
    var hasTransform =
      type === TRANSITION &&
      transformRE.test(styles[transitionProp + 'Property']);
    return {
      type: type,
      timeout: timeout,
      propCount: propCount,
      hasTransform: hasTransform
    }
  }

  function getTimeout (delays, durations) {
    /* istanbul ignore next */
    while (delays.length < durations.length) {
      delays = delays.concat(delays);
    }

    return Math.max.apply(null, durations.map(function (d, i) {
      return toMs(d) + toMs(delays[i])
    }))
  }

  // Old versions of Chromium (below 61.0.3163.100) formats floating pointer numbers
  // in a locale-dependent way, using a comma instead of a dot.
  // If comma is not replaced with a dot, the input will be rounded down (i.e. acting
  // as a floor function) causing unexpected behaviors
  function toMs (s) {
    return Number(s.slice(0, -1).replace(',', '.')) * 1000
  }

  /*  */

  function enter (vnode, toggleDisplay) {
    var el = vnode.elm;

    // FIXME： 跳过 leave回调执行 执行leave钩子时，又执行了enter处理逻辑
    // leave执行需要时间，还未执行完的时候，又执行了enter，就会命中这里
    // call leave callback now
    if (isDef(el._leaveCb)) {
      el._leaveCb.cancelled = true;
      el._leaveCb();
    }

    // 解析transition的数据
    var data = resolveTransition(vnode.data.transition);
    if (isUndef(data)) {
      // vnode.data.transition未定义 即不是transition组件 不处理
      return
    }

    /* istanbul ignore if */
    if (isDef(el._enterCb) || el.nodeType !== 1) {
      // enter还未执行结束又执行 或 不是HTML元素节点 不处理
      return
    }

    // transition所有的属性
    var css = data.css;
    var type = data.type;
    var enterClass = data.enterClass;
    var enterToClass = data.enterToClass;
    var enterActiveClass = data.enterActiveClass;
    var appearClass = data.appearClass;
    var appearToClass = data.appearToClass;
    var appearActiveClass = data.appearActiveClass;
    var beforeEnter = data.beforeEnter;
    var enter = data.enter;
    var afterEnter = data.afterEnter;
    var enterCancelled = data.enterCancelled;
    var beforeAppear = data.beforeAppear;
    var appear = data.appear;
    var afterAppear = data.afterAppear;
    var appearCancelled = data.appearCancelled;
    var duration = data.duration;

    // activeInstance will always be the <transition> component managing this
    // transition. One edge case to check is when the <transition> is placed
    // as the root node of a child component. In that case we need to check
    // <transition>'s parent for appear check.
    /**
     * 边界情况处理：当<transition>作为子组件的根节点，那么我们需要检查它的父组件作为appear的检查
     * 这个时候<transition>组件已经是根节点了，那么为了判断<transition>组件是否已挂载
     * _isMounted应该由父节点来决定
     */
    var context = activeInstance; // transition渲染的上下文vm实例
    var transitionNode = activeInstance.$vnode; // transition组件的占位符VNode
    while (transitionNode && transitionNode.parent) {
      // transitionNode.parent为真，说明<transition>是一个组件的根节点
      context = transitionNode.context;
      transitionNode = transitionNode.parent;
    }
    // isAppear表示当前上下文实例还没有mounted，即第一次出现的时机
    var isAppear = !context._isMounted || !vnode.isRootInsert; // 未挂载 或 不是根插入节点
    if (isAppear && !appear && appear !== '') {
      // 如果是第一次渲染，并且<transition>组件没有配置appear的话，直接返回
      return
    }

    // 获取过渡类名处理
    var startClass = isAppear && appearClass
      ? appearClass
      : enterClass;
    var activeClass = isAppear && appearActiveClass
      ? appearActiveClass
      : enterActiveClass;
    var toClass = isAppear && appearToClass
      ? appearToClass
      : enterToClass;

    // 获取钩子函数处理
    var beforeEnterHook = isAppear
      ? (beforeAppear || beforeEnter)
      : beforeEnter;
    var enterHook = isAppear
      ? (typeof appear === 'function' ? appear : enter)
      : enter;
    var afterEnterHook = isAppear
      ? (afterAppear || afterEnter)
      : afterEnter;
    var enterCancelledHook = isAppear
      ? (appearCancelled || enterCancelled)
      : enterCancelled;

    // 正常情况下，结束是根据transition自身的transitionend事件决定的 也可指定过渡结束时间
    // 显性过渡持续时间处理 number | { enter: number, leave: number }
    var explicitEnterDuration = toNumber(
      isObject(duration)
        ? duration.enter
        : duration
    );

    if (explicitEnterDuration != null) {
      checkDuration(explicitEnterDuration, 'enter', vnode);
    }

    // 使用css
    var expectsCSS = css !== false && !isIE9; // css为true 且 非IE9
    var userWantsControl = getHookArgumentsLength(enterHook); // 用户是否想要控制

    // 定义_enterCb回调
    var cb = el._enterCb = once(function () {
      if (expectsCSS) {
        removeTransitionClass(el, toClass); // 移除toClass
        removeTransitionClass(el, activeClass); // 移除activeClass
      }
      if (cb.cancelled) {
        if (expectsCSS) {
          removeTransitionClass(el, startClass); // 移除startClass
        }
        enterCancelledHook && enterCancelledHook(el);
      } else {
        // cancelled
        afterEnterHook && afterEnterHook(el);
      }
      el._enterCb = null;
    });

    if (!vnode.data.show) {
      // remove pending leave element on enter by injecting an insert hook
      // 在vnode.data.hook.insert中插入钩子 
      mergeVNodeHook(vnode, 'insert', function () {
        var parent = el.parentNode;
        var pendingNode = parent && parent._pending && parent._pending[vnode.key];
        if (pendingNode &&
          pendingNode.tag === vnode.tag &&
          pendingNode.elm._leaveCb
        ) {
          /**
           * parentNode是pending状态，执行leave回调
           */
          pendingNode.elm._leaveCb();
        }
        // 执行enterHook
        enterHook && enterHook(el, cb);
      });
    }

    // start enter transition
    beforeEnterHook && beforeEnterHook(el); // 执行beforeEnter钩子

    if (expectsCSS) {
      // 添加startClass、activeClass
      addTransitionClass(el, startClass);
      addTransitionClass(el, activeClass);
      // 下一帧开始执行动画
      nextFrame(function () {
        // 重绘屏幕前调用此回调函数
        // 移除startClass
        removeTransitionClass(el, startClass);
        if (!cb.cancelled) {
          // enter的回调cb没有被取消cancelled，添加toClass
          addTransitionClass(el, toClass);
          if (!userWantsControl) { // 不是用户想要控制
            if (isValidDuration(explicitEnterDuration)) {
              // 定义了显性过渡持续时间 使用setTimeout执行
              setTimeout(cb, explicitEnterDuration);
            } else {
              // 
              whenTransitionEnds(el, type, cb);
            }
          }
        }
      });
    }

    if (vnode.data.show) {
      toggleDisplay && toggleDisplay();
      enterHook && enterHook(el, cb);
    }

    if (!expectsCSS && !userWantsControl) {
      cb();
    }
  }

  function leave (vnode, rm) {
    var el = vnode.elm;

    // call enter callback now
    if (isDef(el._enterCb)) {
      el._enterCb.cancelled = true;
      el._enterCb();
    }

    var data = resolveTransition(vnode.data.transition);
    if (isUndef(data) || el.nodeType !== 1) {
      return rm()
    }

    /* istanbul ignore if */
    if (isDef(el._leaveCb)) {
      return
    }

    var css = data.css;
    var type = data.type;
    var leaveClass = data.leaveClass;
    var leaveToClass = data.leaveToClass;
    var leaveActiveClass = data.leaveActiveClass;
    var beforeLeave = data.beforeLeave;
    var leave = data.leave;
    var afterLeave = data.afterLeave;
    var leaveCancelled = data.leaveCancelled;
    var delayLeave = data.delayLeave;
    var duration = data.duration;

    var expectsCSS = css !== false && !isIE9;
    var userWantsControl = getHookArgumentsLength(leave);

    var explicitLeaveDuration = toNumber(
      isObject(duration)
        ? duration.leave
        : duration
    );

    if (isDef(explicitLeaveDuration)) {
      checkDuration(explicitLeaveDuration, 'leave', vnode);
    }

    var cb = el._leaveCb = once(function () {
      if (el.parentNode && el.parentNode._pending) {
        el.parentNode._pending[vnode.key] = null;
      }
      if (expectsCSS) {
        removeTransitionClass(el, leaveToClass);
        removeTransitionClass(el, leaveActiveClass);
      }
      if (cb.cancelled) {
        if (expectsCSS) {
          removeTransitionClass(el, leaveClass);
        }
        leaveCancelled && leaveCancelled(el);
      } else {
        rm();
        afterLeave && afterLeave(el);
      }
      el._leaveCb = null;
    });

    if (delayLeave) {
      delayLeave(performLeave);
    } else {
      performLeave();
    }

    function performLeave () {
      // the delayed leave may have already been cancelled
      if (cb.cancelled) {
        return
      }
      // record leaving element
      if (!vnode.data.show && el.parentNode) {
        (el.parentNode._pending || (el.parentNode._pending = {}))[(vnode.key)] = vnode;
      }
      beforeLeave && beforeLeave(el);
      if (expectsCSS) {
        addTransitionClass(el, leaveClass);
        addTransitionClass(el, leaveActiveClass);
        nextFrame(function () {
          removeTransitionClass(el, leaveClass);
          if (!cb.cancelled) {
            addTransitionClass(el, leaveToClass);
            if (!userWantsControl) {
              if (isValidDuration(explicitLeaveDuration)) {
                setTimeout(cb, explicitLeaveDuration);
              } else {
                whenTransitionEnds(el, type, cb);
              }
            }
          }
        });
      }
      leave && leave(el, cb);
      if (!expectsCSS && !userWantsControl) {
        cb();
      }
    }
  }

  // only used in dev mode
  function checkDuration (val, name, vnode) {
    if (typeof val !== 'number') {
      warn(
        "<transition> explicit " + name + " duration is not a valid number - " +
        "got " + (JSON.stringify(val)) + ".",
        vnode.context
      );
    } else if (isNaN(val)) {
      warn(
        "<transition> explicit " + name + " duration is NaN - " +
        'the duration expression might be incorrect.',
        vnode.context
      );
    }
  }

  function isValidDuration (val) {
    return typeof val === 'number' && !isNaN(val)
  }

  /**
   * Normalize a transition hook's argument length. The hook may be:
   * - a merged hook (invoker) with the original in .fns
   * - a wrapped component method (check ._length)
   * - a plain function (.length)
   */
  function getHookArgumentsLength (fn) {
    if (isUndef(fn)) {
      return false
    }
    var invokerFns = fn.fns;
    if (isDef(invokerFns)) {
      // invoker处理函数递归调用getHookArgumentsLength
      // invoker
      return getHookArgumentsLength(
        Array.isArray(invokerFns)
          ? invokerFns[0]
          : invokerFns
      )
    } else {
      // 函数参数个数大于1 说明用户想控制
      return (fn._length || fn.length) > 1
    }
  }

  /**
   * create activate钩子时执行
   * @param {*} _ 
   * @param {*} vnode 
   */
  function _enter (_, vnode) {
    if (vnode.data.show !== true) {
      enter(vnode);
    }
  }

  /**
   * transiton组件钩子函数
   */
  var transition = inBrowser ? {
    create: _enter,
    activate: _enter,
    remove: function remove$$1 (vnode, rm) {
      /* istanbul ignore else */
      if (vnode.data.show !== true) {
        leave(vnode, rm);
      } else {
        rm();
      }
    }
  } : {};

  /**
   * Web平台 module
   */
  var platformModules = [
    attrs,
    klass,
    events,
    domProps,
    style,
    transition
  ];

  /*  */

  // the directive module should be applied last, after all
  // built-in modules have been applied.
  var modules = platformModules.concat(baseModules);

  // 创建patch方法
  // nodeOps 真实DOM操作的封装API
  // modules 模块的钩子函数的实现 如操作directive ref attr class style event等的生命周期钩子函数
  var patch = createPatchFunction({ nodeOps: nodeOps, modules: modules });

  /**
   * Not type checking this file because flow doesn't like attaching
   * properties to Elements.
   */

  /* istanbul ignore if */
  if (isIE9) {
    // http://www.matts411.com/post/internet-explorer-9-oninput/
    document.addEventListener('selectionchange', function () {
      var el = document.activeElement;
      if (el && el.vmodel) {
        trigger(el, 'input');
      }
    });
  }

  /**
   * v-model指令的handler
   */
  var directive = {
    inserted: function inserted (el, binding, vnode, oldVnode) {
      if (vnode.tag === 'select') {
        // FIXME：select元素即下拉框处理
        // #6903
        if (oldVnode.elm && !oldVnode.elm._vOptions) {
          mergeVNodeHook(vnode, 'postpatch', function () {
            directive.componentUpdated(el, binding, vnode);
          });
        } else {
          setSelected(el, binding, vnode.context);
        }
        el._vOptions = [].map.call(el.options, getValue);
      } else if (vnode.tag === 'textarea' || isTextInputType(el.type)) {
        // textarea输入框或是指定类型的input
        el._vModifiers = binding.modifiers;
        if (!binding.modifiers.lazy) { // 没有lazy修饰符
          // 添加合成事件compositionstart、compositionend
          el.addEventListener('compositionstart', onCompositionStart);
          el.addEventListener('compositionend', onCompositionEnd);
          // Safari < 10.2 & UIWebView doesn't fire compositionend when
          // switching focus before confirming composition choice
          // this also fixes the issue where some browsers e.g. iOS Chrome
          // fires "change" instead of "input" on autocomplete.
          el.addEventListener('change', onCompositionEnd);
          /* istanbul ignore if */
          if (isIE9) {
            el.vmodel = true;
          }
        }
      }
    },

    componentUpdated: function componentUpdated (el, binding, vnode) {
      if (vnode.tag === 'select') {
        // FIXME：下拉框处理
        setSelected(el, binding, vnode.context);
        // in case the options rendered by v-for have changed,
        // it's possible that the value is out-of-sync with the rendered options.
        // detect such cases and filter out values that no longer has a matching
        // option in the DOM.
        var prevOptions = el._vOptions;
        var curOptions = el._vOptions = [].map.call(el.options, getValue);
        if (curOptions.some(function (o, i) { return !looseEqual(o, prevOptions[i]); })) {
          // trigger change event if
          // no matching option found for at least one value
          var needReset = el.multiple
            ? binding.value.some(function (v) { return hasNoMatchingOption(v, curOptions); })
            : binding.value !== binding.oldValue && hasNoMatchingOption(binding.value, curOptions);
          if (needReset) {
            trigger(el, 'change');
          }
        }
      }
    }
  };

  function setSelected (el, binding, vm) {
    actuallySetSelected(el, binding, vm);
    /* istanbul ignore if */
    if (isIE || isEdge) {
      setTimeout(function () {
        actuallySetSelected(el, binding, vm);
      }, 0);
    }
  }

  function actuallySetSelected (el, binding, vm) {
    var value = binding.value;
    var isMultiple = el.multiple;
    if (isMultiple && !Array.isArray(value)) {
      warn(
        "<select multiple v-model=\"" + (binding.expression) + "\"> " +
        "expects an Array value for its binding, but got " + (Object.prototype.toString.call(value).slice(8, -1)),
        vm
      );
      return
    }
    var selected, option;
    for (var i = 0, l = el.options.length; i < l; i++) {
      option = el.options[i];
      if (isMultiple) {
        selected = looseIndexOf(value, getValue(option)) > -1;
        if (option.selected !== selected) {
          option.selected = selected;
        }
      } else {
        if (looseEqual(getValue(option), value)) {
          if (el.selectedIndex !== i) {
            el.selectedIndex = i;
          }
          return
        }
      }
    }
    if (!isMultiple) {
      el.selectedIndex = -1;
    }
  }

  function hasNoMatchingOption (value, options) {
    return options.every(function (o) { return !looseEqual(o, value); })
  }

  function getValue (option) {
    return '_value' in option
      ? option._value
      : option.value
  }

  /**
   * DOM事件compositionstart回调
   * @param {*} e 
   */
  function onCompositionStart (e) {
    // 开启IEM输入标识
    e.target.composing = true;
  }

  /**
   * DOM事件compositionend回调
   * @param {*} e 
   * @returns 
   */
  function onCompositionEnd (e) {
    // prevent triggering an input event for no reason
    if (!e.target.composing) { return }
    // 关闭IEM输入标识
    e.target.composing = false;
    // 手动触发DOM的input事件
    trigger(e.target, 'input');
  }

  function trigger (el, type) {
    // https://developer.mozilla.org/zh-CN/docs/Web/API/Event/initEvent
    // 创建一个事件
    var e = document.createEvent('HTMLEvents');
    // 初始化一个事件，如 input事件，可以冒泡，可以取消
    e.initEvent(type, true, true);
    // 触发el上的此事件监听
    el.dispatchEvent(e);
  }

  /*  */

  // recursively search for possible transition defined inside the component root
  function locateNode (vnode) {
    return vnode.componentInstance && (!vnode.data || !vnode.data.transition)
      ? locateNode(vnode.componentInstance._vnode)
      : vnode
  }

  var show = {
    bind: function bind (el, ref, vnode) {
      var value = ref.value;

      vnode = locateNode(vnode);
      var transition$$1 = vnode.data && vnode.data.transition;
      var originalDisplay = el.__vOriginalDisplay =
        el.style.display === 'none' ? '' : el.style.display;
      if (value && transition$$1) {
        vnode.data.show = true;
        enter(vnode, function () {
          el.style.display = originalDisplay;
        });
      } else {
        el.style.display = value ? originalDisplay : 'none';
      }
    },

    update: function update (el, ref, vnode) {
      var value = ref.value;
      var oldValue = ref.oldValue;

      /* istanbul ignore if */
      if (!value === !oldValue) { return }
      vnode = locateNode(vnode);
      var transition$$1 = vnode.data && vnode.data.transition;
      if (transition$$1) {
        vnode.data.show = true;
        if (value) {
          enter(vnode, function () {
            el.style.display = el.__vOriginalDisplay;
          });
        } else {
          leave(vnode, function () {
            el.style.display = 'none';
          });
        }
      } else {
        el.style.display = value ? el.__vOriginalDisplay : 'none';
      }
    },

    unbind: function unbind (
      el,
      binding,
      vnode,
      oldVnode,
      isDestroy
    ) {
      if (!isDestroy) {
        el.style.display = el.__vOriginalDisplay;
      }
    }
  };

  /**
   * 平台指令
   *  - v-model
   *  - v-show
   */
  var platformDirectives = {
    model: directive,
    show: show
  };

  /*  */

  var transitionProps = {
    name: String,
    appear: Boolean,
    css: Boolean,
    mode: String,
    type: String,
    enterClass: String,
    leaveClass: String,
    enterToClass: String,
    leaveToClass: String,
    enterActiveClass: String,
    leaveActiveClass: String,
    appearClass: String,
    appearActiveClass: String,
    appearToClass: String,
    duration: [Number, String, Object]
  };

  /**
   * in case the child is also an abstract component, e.g. <keep-alive>
   * we want to recursively retrieve the real component to be rendered
   * 获取到真实VNode节点，忽略掉transition的抽象节点
   * @param {*} vnode 
   * @returns 
   */
  function getRealChild (vnode) {
    var compOptions = vnode && vnode.componentOptions;
    if (compOptions && compOptions.Ctor.options.abstract) {
      return getRealChild(getFirstComponentChild(compOptions.children))
    } else {
      return vnode
    }
  }

  /**
   * 提取transition组件上的属性和事件，
   * 生成transition组件的VNode.data.transition对象
   * @param {*} comp 
   * @returns 
   */
  function extractTransitionData (comp) {
    var data = {};
    var options = comp.$options;
    // props
    for (var key in options.propsData) {
      // 组件上的prop
      data[key] = comp[key];
    }
    // events.
    // extract listeners and pass them directly to the transition methods
    var listeners = options._parentListeners;
    for (var key$1 in listeners) {
      // 组件上的事件
      data[camelize(key$1)] = listeners[key$1];
    }
    return data
  }

  function placeholder (h, rawChild) {
    if (/\d-keep-alive$/.test(rawChild.tag)) {
      return h('keep-alive', {
        props: rawChild.componentOptions.propsData
      })
    }
  }

  function hasParentTransition (vnode) {
    while ((vnode = vnode.parent)) {
      if (vnode.data.transition) {
        return true
      }
    }
  }

  function isSameChild (child, oldChild) {
    return oldChild.key === child.key && oldChild.tag === child.tag
  }

  var isNotTextNode = function (c) { return c.tag || isAsyncPlaceholder(c); };

  var isVShowDirective = function (d) { return d.name === 'show'; };

  var Transition = {
    name: 'transition',
    props: transitionProps,
    abstract: true,

    render: function render (h) {
      var this$1 = this;

      var children = this.$slots.default;
      if (!children) {
        // 无子节点 不处理
        return
      }

      // filter out text nodes (possible whitespaces)
      children = children.filter(isNotTextNode);
      /* istanbul ignore if */
      if (!children.length) {
        // 过滤掉空白节点后无节点 不处理
        return
      }

      // warn multiple elements
      if (children.length > 1) {
        // 警告 只支持单节点 多个节点可使用transition-group组件
        warn(
          '<transition> can only be used on a single element. Use ' +
          '<transition-group> for lists.',
          this.$parent
        );
      }

      var mode = this.mode;

      // warn invalid mode
      if (mode && mode !== 'in-out' && mode !== 'out-in'
      ) {
        // 警告 只支持in-out和out-in模式
        warn(
          'invalid <transition> mode: ' + mode,
          this.$parent
        );
      }

      var rawChild = children[0];

      // if this is a component root node and the component's
      // parent container node also has transition, skip.
      if (hasParentTransition(this.$vnode)) {
        // transition组件作为组件渲染VNode的根节点，它在父组件的占位符VNode节点$vnode也被
        // 一个transition组件包裹，直接忽略掉此根节点的transition组件，返回此transition的子节点
        return rawChild
      }

      // apply transition data to child
      // use getRealChild() to ignore abstract components e.g. keep-alive
      // 获取到真实VNode节点，忽略掉抽象节点，如transition包裹keep-alive，或transition包裹transition
      var child = getRealChild(rawChild);
      /* istanbul ignore if */
      if (!child) {
        // 抽象节点没有包裹真实节点，返回当前的抽象节点
        return rawChild
      }

      // FIXME：特殊case处理
      if (this._leaving) {
        return placeholder(h, rawChild)
      }

      // ensure a key that is unique to the vnode type and to this transition
      // component instance. This key will be used to remove pending leaving nodes
      // during entering.
      var id = "__transition-" + (this._uid) + "-"; // 组件id
      child.key = child.key == null // 生成子节点的key
        ? child.isComment
          ? id + 'comment'
          : id + child.tag
        : isPrimitive(child.key)
          ? (String(child.key).indexOf(id) === 0 ? child.key : id + child.key)
          : child.key;

      // 扩展transition组件的data到VNode.data.transition
      var data = (child.data || (child.data = {})).transition = extractTransitionData(this);
      var oldRawChild = this._vnode;
      var oldChild = getRealChild(oldRawChild); // 获取组件旧的渲染VNode

      // mark v-show
      // so that the transition module can hand over the control to the directive
      if (child.data.directives && child.data.directives.some(isVShowDirective)) {
        // 处理v-show指令 添加show
        child.data.show = true;
      }

      // FIXME：特殊case处理
      if (
        oldChild &&
        oldChild.data &&
        !isSameChild(child, oldChild) &&
        !isAsyncPlaceholder(oldChild) &&
        // #6687 component root is a comment node
        !(oldChild.componentInstance && oldChild.componentInstance._vnode.isComment)
      ) {
        // replace old child transition data with fresh one
        // important for dynamic transitions!
        var oldData = oldChild.data.transition = extend({}, data);
        // handle transition mode
        if (mode === 'out-in') {
          // return placeholder node and queue update when leave finishes
          this._leaving = true;
          mergeVNodeHook(oldData, 'afterLeave', function () {
            this$1._leaving = false;
            this$1.$forceUpdate();
          });
          return placeholder(h, rawChild)
        } else if (mode === 'in-out') {
          if (isAsyncPlaceholder(child)) {
            return oldRawChild
          }
          var delayedLeave;
          var performLeave = function () { delayedLeave(); };
          mergeVNodeHook(data, 'afterEnter', performLeave);
          mergeVNodeHook(data, 'enterCancelled', performLeave);
          mergeVNodeHook(oldData, 'delayLeave', function (leave) { delayedLeave = leave; });
        }
      }

      return rawChild
    }
  };

  /*  */

  var props = extend({
    tag: String,
    moveClass: String
  }, transitionProps);

  delete props.mode;

  var TransitionGroup = {
    props: props,

    beforeMount: function beforeMount () {
      var this$1 = this;

      var update = this._update;
      this._update = function (vnode, hydrating) {
        var restoreActiveInstance = setActiveInstance(this$1);
        // force removing pass
        this$1.__patch__(
          this$1._vnode,
          this$1.kept,
          false, // hydrating
          true // removeOnly (!important, avoids unnecessary moves)
        );
        this$1._vnode = this$1.kept;
        restoreActiveInstance();
        update.call(this$1, vnode, hydrating);
      };
    },

    render: function render (h) {
      var tag = this.tag || this.$vnode.data.tag || 'span';
      var map = Object.create(null);
      var prevChildren = this.prevChildren = this.children;
      var rawChildren = this.$slots.default || [];
      var children = this.children = [];
      var transitionData = extractTransitionData(this);

      for (var i = 0; i < rawChildren.length; i++) {
        var c = rawChildren[i];
        if (c.tag) {
          if (c.key != null && String(c.key).indexOf('__vlist') !== 0) {
            children.push(c);
            map[c.key] = c
            ;(c.data || (c.data = {})).transition = transitionData;
          } else {
            var opts = c.componentOptions;
            var name = opts ? (opts.Ctor.options.name || opts.tag || '') : c.tag;
            warn(("<transition-group> children must be keyed: <" + name + ">"));
          }
        }
      }

      if (prevChildren) {
        var kept = [];
        var removed = [];
        for (var i$1 = 0; i$1 < prevChildren.length; i$1++) {
          var c$1 = prevChildren[i$1];
          c$1.data.transition = transitionData;
          c$1.data.pos = c$1.elm.getBoundingClientRect();
          if (map[c$1.key]) {
            kept.push(c$1);
          } else {
            removed.push(c$1);
          }
        }
        this.kept = h(tag, null, kept);
        this.removed = removed;
      }

      return h(tag, null, children)
    },

    updated: function updated () {
      var children = this.prevChildren;
      var moveClass = this.moveClass || ((this.name || 'v') + '-move');
      if (!children.length || !this.hasMove(children[0].elm, moveClass)) {
        return
      }

      // we divide the work into three loops to avoid mixing DOM reads and writes
      // in each iteration - which helps prevent layout thrashing.
      children.forEach(callPendingCbs);
      children.forEach(recordPosition);
      children.forEach(applyTranslation);

      // force reflow to put everything in position
      // assign to this to avoid being removed in tree-shaking
      // $flow-disable-line
      this._reflow = document.body.offsetHeight;

      children.forEach(function (c) {
        if (c.data.moved) {
          var el = c.elm;
          var s = el.style;
          addTransitionClass(el, moveClass);
          s.transform = s.WebkitTransform = s.transitionDuration = '';
          el.addEventListener(transitionEndEvent, el._moveCb = function cb (e) {
            if (e && e.target !== el) {
              return
            }
            if (!e || /transform$/.test(e.propertyName)) {
              el.removeEventListener(transitionEndEvent, cb);
              el._moveCb = null;
              removeTransitionClass(el, moveClass);
            }
          });
        }
      });
    },

    methods: {
      hasMove: function hasMove (el, moveClass) {
        /* istanbul ignore if */
        if (!hasTransition) {
          return false
        }
        /* istanbul ignore if */
        if (this._hasMove) {
          return this._hasMove
        }
        // Detect whether an element with the move class applied has
        // CSS transitions. Since the element may be inside an entering
        // transition at this very moment, we make a clone of it and remove
        // all other transition classes applied to ensure only the move class
        // is applied.
        var clone = el.cloneNode();
        if (el._transitionClasses) {
          el._transitionClasses.forEach(function (cls) { removeClass(clone, cls); });
        }
        addClass(clone, moveClass);
        clone.style.display = 'none';
        this.$el.appendChild(clone);
        var info = getTransitionInfo(clone);
        this.$el.removeChild(clone);
        return (this._hasMove = info.hasTransform)
      }
    }
  };

  function callPendingCbs (c) {
    /* istanbul ignore if */
    if (c.elm._moveCb) {
      c.elm._moveCb();
    }
    /* istanbul ignore if */
    if (c.elm._enterCb) {
      c.elm._enterCb();
    }
  }

  function recordPosition (c) {
    c.data.newPos = c.elm.getBoundingClientRect();
  }

  function applyTranslation (c) {
    var oldPos = c.data.pos;
    var newPos = c.data.newPos;
    var dx = oldPos.left - newPos.left;
    var dy = oldPos.top - newPos.top;
    if (dx || dy) {
      c.data.moved = true;
      var s = c.elm.style;
      s.transform = s.WebkitTransform = "translate(" + dx + "px," + dy + "px)";
      s.transitionDuration = '0s';
    }
  }

  var platformComponents = {
    Transition: Transition,
    TransitionGroup: TransitionGroup
  };

  /*  */

  /**
   * 对web平台下Vue进行扩展
   */

  // web平台相关工具函数
  // install platform specific utils
  Vue.config.mustUseProp = mustUseProp; // 必须绑定属性的标签
  Vue.config.isReservedTag = isReservedTag; // 是否是Web端的HTML SVG标签
  Vue.config.isReservedAttr = isReservedAttr; // 是否是style class 属性
  Vue.config.getTagNamespace = getTagNamespace; // 获取命名空间
  Vue.config.isUnknownElement = isUnknownElement; // 是否是未知元素标签

  // web平台指令和组件扩展
  // install platform runtime directives & components
  extend(Vue.options.directives, platformDirectives); // v-model v-show
  extend(Vue.options.components, platformComponents); // transition-group transition

  // 扩展__patch__方法
  // install platform patch function
  Vue.prototype.__patch__ = inBrowser ? patch : noop;

  // public mount method
  // runtime实现，可以在runtime only和runtime+complier复用
  // runtime only会直接调用此方法
  Vue.prototype.$mount = function (
    el,
    hydrating
  ) {
    el = el && inBrowser ? query(el) : undefined;
    // $mount 实际调用 mountComponent
    return mountComponent(this, el, hydrating)
  };

  // devtools global hook
  /* istanbul ignore next */
  if (inBrowser) {
    // 加载devtool
    setTimeout(function () {
      if (config.devtools) {
        if (devtools) {
          devtools.emit('init', Vue);
        } else {
          console[console.info ? 'info' : 'log'](
            'Download the Vue Devtools extension for a better development experience:\n' +
            'https://github.com/vuejs/vue-devtools'
          );
        }
      }
      if (config.productionTip !== false &&
        typeof console !== 'undefined'
      ) {
        // 开发环境提示
        console[console.info ? 'info' : 'log'](
          "You are running Vue in development mode.\n" +
          "Make sure to turn on production mode when deploying for production.\n" +
          "See more tips at https://vuejs.org/guide/deployment.html"
        );
      }
    }, 0);
  }

  /*  */

  // 模板变量分隔符结果
  var defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;
  var regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g;
  // 创建自定义分隔符正则
  var buildRegex = cached(function (delimiters) {
    var open = delimiters[0].replace(regexEscapeRE, '\\$&');
    var close = delimiters[1].replace(regexEscapeRE, '\\$&');
    return new RegExp(open + '((?:.|\\n)+?)' + close, 'g')
  });



  /**
   * 将文本解析成表达式
   *  匹配模板变量分隔符数据
   * @param {*} text 
   * @param {*} delimiters 
   * @returns 
   */
  function parseText (
    text,
    delimiters
  ) {
    var tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE;
    if (!tagRE.test(text)) {
      return
    }

    /**
     * tokens
     *  模板变量：保存 `_s(${exp})` 文本
     *  普通文本：保存 JSON.stringify(tokenValue) 转换的值
     * rawTokens
     *  模板变量：保存 { '@binding': exp }
     *  普通文本：保存 tokenValue 原值
     */
    var tokens = [];
    var rawTokens = []; 
    var lastIndex = tagRE.lastIndex = 0; // 上次匹配到模板变量的索引
    var match, index, tokenValue;
    while ((match = tagRE.exec(text))) {
      index = match.index;
      // push text token
      if (index > lastIndex) {
        // 模板变量间的文本处理
        rawTokens.push(tokenValue = text.slice(lastIndex, index));
        tokens.push(JSON.stringify(tokenValue));
      }
      // tag token
      var exp = parseFilters(match[1].trim()); // 模板变量字符串
      tokens.push(("_s(" + exp + ")"));
      rawTokens.push({ '@binding': exp });
      // 更新索引
      lastIndex = index + match[0].length;
    }

    if (lastIndex < text.length) {
      // 最后一个模板变量后的文本处理
      rawTokens.push(tokenValue = text.slice(lastIndex));
      tokens.push(JSON.stringify(tokenValue));
    }
    return {
      expression: tokens.join('+'), // 加号拼接解析后的文本字符串 "\n "+ _s(item) + ":" + _s(index) + "\n "
      tokens: rawTokens // [ "\n  ", {@binding: 'item'}, ":", {@binding: 'index'}, "\n  " ]
    }
  }

  /*  */

  /**
   * 转换静态class和动态绑定class
   *  1. 静态class，转成成去掉多余空格，并JSON.stringify()处理的字符串，扩展el.staticClass
   *  2. 动态class，转换成parseText()解析后的表达式，扩展el.classBinding
   * @param {*} el 
   * @param {*} options 
   */
  function transformNode (el, options) {
    var warn = options.warn || baseWarn;
    var staticClass = getAndRemoveAttr(el, 'class');
    if (staticClass) {
      // 解析静态class的值
      var res = parseText(staticClass, options.delimiters);
      if (res) {
        // 解析静态class的值 如果使用了动态值的语法 如{{ val }} 报警告错误
        warn(
          "class=\"" + staticClass + "\": " +
          'Interpolation inside attributes has been removed. ' +
          'Use v-bind or the colon shorthand instead. For example, ' +
          'instead of <div class="{{ val }}">, use <div :class="val">.',
          el.rawAttrsMap['class']
        );
      }
    }
    if (staticClass) {
      // 静态class中所有空白符替换成一个空格，并去掉两端空格
      el.staticClass = JSON.stringify(staticClass.replace(/\s+/g, ' ').trim());
    }
    // 动态值表达式  解析动态class
    var classBinding = getBindingAttr(el, 'class', false /* getStatic */);
    if (classBinding) {
      el.classBinding = classBinding;
    }
  }

  function genData (el) {
    var data = '';
    if (el.staticClass) {
      data += "staticClass:" + (el.staticClass) + ",";
    }
    if (el.classBinding) {
      data += "class:" + (el.classBinding) + ",";
    }
    return data
  }

  var klass$1 = {
    staticKeys: ['staticClass'],
    transformNode: transformNode,
    genData: genData
  };

  /*  */

  /**
   * 转换静态style和动态绑定style
   *  1. 静态style，转成成去掉多余空格，并JSON.stringify()处理的字符串，扩展el.staticStyle
   *  2. 动态style，获取到绑定的值的表达式
   * @param {*} el 
   * @param {*} options 
   */
  function transformNode$1 (el, options) {
    var warn = options.warn || baseWarn;
    var staticStyle = getAndRemoveAttr(el, 'style');
    if (staticStyle) {
      /* istanbul ignore if */
      {
        // 解析静态style的值
        var res = parseText(staticStyle, options.delimiters);
        if (res) {
          // 解析静态class的值 如果使用了动态值的语法 如{{ val }} 报警告错误
          warn(
            "style=\"" + staticStyle + "\": " +
            'Interpolation inside attributes has been removed. ' +
            'Use v-bind or the colon shorthand instead. For example, ' +
            'instead of <div style="{{ val }}">, use <div :style="val">.',
            el.rawAttrsMap['style']
          );
        }
      }
      // 解析静态style 并 字符串化处理
      el.staticStyle = JSON.stringify(parseStyleText(staticStyle));
    }
    // 获取style动态属性的表达式
    var styleBinding = getBindingAttr(el, 'style', false /* getStatic */);
    if (styleBinding) {
      el.styleBinding = styleBinding;
    }
  }

  function genData$1 (el) {
    var data = '';
    if (el.staticStyle) {
      data += "staticStyle:" + (el.staticStyle) + ",";
    }
    if (el.styleBinding) {
      data += "style:(" + (el.styleBinding) + "),";
    }
    return data
  }

  var style$1 = {
    staticKeys: ['staticStyle'],
    transformNode: transformNode$1,
    genData: genData$1
  };

  /*  */

  var decoder;

  var he = {
    /**
     * HTML实体字符串解码
     * @param {*} html 
     * @returns 
     */
    decode: function decode (html) {
      decoder = decoder || document.createElement('div');
      decoder.innerHTML = html;
      return decoder.textContent
    }
  };

  /*  */

  /**
   * 一元标签Map
   */
  var isUnaryTag = makeMap(
    'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
    'link,meta,param,source,track,wbr'
  );

  // Elements that you can, intentionally, leave open
  // (and which close themselves)
  /**
   * 允许不写结束标签的非闭合标签 浏览器会自动闭合
   */
  var canBeLeftOpenTag = makeMap(
    'colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source'
  );

  // HTML5 tags https://html.spec.whatwg.org/multipage/indices.html#elements-3
  // Phrasing Content https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
  /**
   * 不能放在p标签中的html标签
   */
  var isNonPhrasingTag = makeMap(
    'address,article,aside,base,blockquote,body,caption,col,colgroup,dd,' +
    'details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,' +
    'h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,' +
    'optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,' +
    'title,tr,track'
  );

  /**
   * Not type-checking this file because it's mostly vendor code.
   */

  // Regular Expressions for parsing tags and attributes
  /**
   * 匹配html属性 拆分如下
   *  1. ^\s* 属性前必须有空白字符
   *  2. ([^\s"'<>\/=]+) 匹配属性 除了 空白、" ' <> / = 外的任意字符 一次或多次
   *  3. (?:xxx) 不捕获此元数据 xxx为 \s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+))
   *  4. \s*(=)\s* 等号前后可以有空格
   *  5. (?:yyy) 不捕获此元数据 yyy为 "([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)
   *  6. "([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+) 捕获属性值的三种情况：
   *      1) "([^"]*)"+ 匹配双引号开头和结尾，中间是除双引号外任意字符的值一次或多次
   *      2) '([^']*)'+ 匹配单引号开头和结尾，中间是除单引号外任意字符的值一次或多次
   *      3) ([^\s"'=<>`]+) 匹配非 空白 ' " = < > 以外的任何值
   *                        即匹配不带单引号或双引号的值一次或多次
   */
  var attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;

  /**
   * 匹配HTMl动态属性 拆分如下：v-hello@[world].hi="good"
   *  1. ^\s* 属性前必须有空白字符
   *  2. ((?:v-[\w-]+:|@|:|#)\[[^=]+?\][^\s"'<>\/=]*) 捕获此元数据
   *     1) (?:v-[\w-]+:|@|:|#) 匹配v- 加 字母数字下划线 加 :|@|:|# 字串 不捕获此元数据
   *     2) \[[^=]+?\] 匹配[]加中间是除=外的一次或多次任意字符内容 这个内容零次或一次
   *     3) [^\s"'<>\/=]* 匹配非 空白 " ' < > / = 外的任意字符 零次或多次
   *  3. (?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))? 同attribute的3、4、5、6
   */
  var dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+?\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;

  /**
   * 标签名匹配:
   *  字母或下划线开头的任意长度子串 加上
   *  零次或多次 杠- 点. 数字0-9 下划线_ 连接的所有字母和unicode字符串
   *  
   *  如果字符串以数字或点. 开头 这部分在匹配时会过滤掉 如 .0abc-def => abc
   */
  var ncname = "[a-zA-Z_][\\-\\.0-9_a-zA-Z" + (unicodeRegExp.source) + "]*";
  // 匹配 0次或一次 命名空间 加 标签名
  var qnameCapture = "((?:" + ncname + "\\:)?" + ncname + ")";
  // 开始标签
  var startTagOpen = new RegExp(("^<" + qnameCapture));
  // 开始标签结束 > 或 /> 可以是一元标签
  var startTagClose = /^\s*(\/?)>/;
  // 结束标签 </...>
  var endTag = new RegExp(("^<\\/" + qnameCapture + "[^>]*>"));
  // doctype匹配 <!DOCTYPE html> [^>] 匹配除了>以外的所有字符
  var doctype = /^<!DOCTYPE [^>]+>/i;
  // #7298: escape - to avoid being passed as HTML comment when inlined in page
  // 注释节点 <!-- 
  var comment = /^<!\--/;
  // 条件注释节点 <![
  var conditionalComment = /^<!\[/;

  // Special Elements (can contain anything)
  var isPlainTextElement = makeMap('script,style,textarea', true);
  var reCache = {};

  var decodingMap = {
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&amp;': '&',
    '&#10;': '\n',
    '&#9;': '\t',
    '&#39;': "'"
  };
  var encodedAttr = /&(?:lt|gt|quot|amp|#39);/g;
  var encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g;

  // #5992
  var isIgnoreNewlineTag = makeMap('pre,textarea', true);
  var shouldIgnoreFirstNewline = function (tag, html) { return tag && isIgnoreNewlineTag(tag) && html[0] === '\n'; };

  /**
   * 解码属性值中的实体符号 
   *  通过decodingMap将实体符号解码
   * @param {*} value 
   * @param {*} shouldDecodeNewlines 
   * @returns 
   */
  function decodeAttr (value, shouldDecodeNewlines) {
    var re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr;
    return value.replace(re, function (match) { return decodingMap[match]; })
  }

  function parseHTML (html, options) {
    // 用户记录非闭合标签的开始标签  目的是维护开始标签和结束标签是一一对应的关系
    var stack = [];
    var expectHTML = options.expectHTML;
    var isUnaryTag$$1 = options.isUnaryTag || no;
    var canBeLeftOpenTag$$1 = options.canBeLeftOpenTag || no;
    var index = 0; // 当前索引位置
    // last 最近在解析的html文本
    // lastTag 最近一个要解析的非闭合标签，last中开头的html就是这个标签中的内容
    var last, lastTag;
    while (html) {
      last = html; // 每次循环开始时的html文本
      // Make sure we're not in a plaintext content element like script/style
      if (!lastTag || !isPlainTextElement(lastTag)) {
        // lastTag不存在 或 非 script,style,textarea节点处理
        // 处理非script,style,textarea的 一元标签 或 非闭合标签
        // script,style,textarea 标签 开始标签部分会命中
        // 例如 style标签 第一次循环命中后进行解析，lastTag为style 且 在isPlainTextElement中
        // 然后第二次循环 lastTag 会命中else部分

        // 文本内容结束索引
        var textEnd = html.indexOf('<'); 
        if (textEnd === 0) {
          // 文本内容结束索引textEnd在首位，当作HTML节点处理

          // Comment:
          // 注释节点 <!-- --> 处理
          if (comment.test(html)) { // <!-- 开头
            var commentEnd = html.indexOf('-->');

            if (commentEnd >= 0) { // --> 结尾
              if (options.shouldKeepComment) {
                // 保留注释节点 创建注释节点AST
                options.comment(html.substring(4, commentEnd), index, index + commentEnd + 3);
              }
              // 前移掉注释节点
              advance(commentEnd + 3);
              continue
            }
          }

          // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
          // 条件注释节点 <![if expression]> HTML <![endif]> 跳过
          if (conditionalComment.test(html)) {
            var conditionalEnd = html.indexOf(']>');

            if (conditionalEnd >= 0) {
              advance(conditionalEnd + 2);
              continue
            }
          }

          // Doctype:
          var doctypeMatch = html.match(doctype);
          if (doctypeMatch) {
            // 前移掉doctype标签
            advance(doctypeMatch[0].length);
            continue
          }

          // End tag:
          var endTagMatch = html.match(endTag);
          if (endTagMatch) {
            var curIndex = index;
            // 前移掉结束标签
            advance(endTagMatch[0].length);
            // 解析结束标签
            parseEndTag(endTagMatch[1], curIndex, index);
            continue
          }

          // Start tag:
          var startTagMatch = parseStartTag(); // 解析开始标签
          if (startTagMatch) {
            // 处理开始标签
            handleStartTag(startTagMatch);
            if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
              advance(1);
            }
            continue
          }
        }

        // 文本处理
        var text = (void 0), rest = (void 0), next = (void 0);
        if (textEnd >= 0) {
          // 文本结束索引位置大于等于零，把<前面的当作文本节点
          // 获取去掉前面的文本节点的html部分
          rest = html.slice(textEnd);

          while (
            !endTag.test(rest) &&
            !startTagOpen.test(rest) &&
            !comment.test(rest) &&
            !conditionalComment.test(rest)
          ) {
            /**
             * 剩余html即rest部分，非HTML标签命中情况：
             *  1. 非结束标签
             *  2. 非开始标签
             *  3. 非注释标签
             *  4. 非条件注释标签
             * 当作是普通文本中的左尖括号
             */
            // < in plain text, be forgiving and treat it as text
            next = rest.indexOf('<', 1); // 查找下一个左尖括号位置
            if (next < 0) { break } // 未找到跳出循环
            // 前移文本结束索引
            textEnd += next;
            rest = html.slice(textEnd); // 移除文本部分，继续循环
          }
          // 截取html字符串中的文本字符串
          text = html.substring(0, textEnd);
        }

        if (textEnd < 0) {
          // 未找到<，说明html或剩余的html都是文本
          text = html;
        }

        if (text) {
          // 前移掉文本
          advance(text.length);
        }

        if (options.chars && text) {
          // 创建文本节点AST
          options.chars(text, index - text.length, index);
        }
      } else {
        // 处理 script,style,textarea 标签

        var endTagLength = 0;
        var stackedTag = lastTag.toLowerCase();
        var reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'));
        var rest$1 = html.replace(reStackedTag, function (all, text, endTag) {
          endTagLength = endTag.length;
          if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
            text = text
              .replace(/<!\--([\s\S]*?)-->/g, '$1') // #7298
              .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1');
          }
          if (shouldIgnoreFirstNewline(stackedTag, text)) {
            text = text.slice(1);
          }
          if (options.chars) {
            options.chars(text);
          }
          return ''
        });
        index += html.length - rest$1.length;
        html = rest$1;
        parseEndTag(stackedTag, index - endTagLength, index);
      }

      if (html === last) {
        // 经过处理html和last保持相等
        // 当作文本节点处理
        options.chars && options.chars(html); // 创建文本节点AST
        if (!stack.length && options.warn) {
          // stack中已没有标签节点 但html中还有文本 说明模板格式不正确
          // template中不能直接有空格 
          options.warn(("Mal-formatted tag at end of template: \"" + html + "\""), { start: index + html.length });
        }
        break
      }
    }

    // Clean up any remaining tags
    parseEndTag();

    /**
     * 记录当前位置html位置索引，前进n提取html字符串
     * @param {*} n 偏移量
     */
    function advance (n) {
      index += n;
      html = html.substring(n);
    }

    /**
     * 解析开始标签
     *  将开始标签解析成一个对象
     *  {
     *    tagName,        // 标签名
     *    attrs: [attr],  // 标签属性数组
     *    start,          // 标签开始位置索引
     *    end,            // 标签结束位置索引
     *    unarySlash      // 一元标签的斜杠(/) 非一元标签空字符串('')
     *   }
     * 
     *   attr标签属性
     *   {}
     * @returns 
     */
    function parseStartTag () {
      // 匹配开始标签
      var start = html.match(startTagOpen);
      if (start) {
        var match = {
          tagName: start[1], // 标签名
          attrs: [], // 标签的属性
          start: index // 标签开始位置索引
        };
        // 前移掉标签
        advance(start[0].length);

        // end 开始标签结束符 attr 当前循环匹配到的属性解析结果
        var end, attr;
        while (!(end = html.match(startTagClose)) && (attr = html.match(dynamicArgAttribute) || html.match(attribute))) {
          // 未匹配到开始标签的结束符 且 匹配到动态属性 或 普通属性 
          // 记录属性开始索引
          attr.start = index;
          // 前移掉属性
          advance(attr[0].length);
          // 记录属性结束索引
          attr.end = index;
          /**
           * attrs中push匹配到的属性attr
           * {
           *   start,
           *   end,
           * }
           */
          match.attrs.push(attr);
        }

        if (end) {
          match.unarySlash = end[1];
          // 前移掉开始标签结尾
          advance(end[0].length);
          // 标签结束位置索引
          match.end = index;
          // 返回解析结果
          return match
        }
      }
    }

    /**
     * 处理开始标签
     * @param {*} match 
     */
    function handleStartTag (match) {
      var tagName = match.tagName;
      var unarySlash = match.unarySlash;

      if (expectHTML) { // web平台expectHTML为真
        if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
          // 上个标签是p标签，即父级是p元素标签，并且当前标签不能放在p标签中
          /**
           * 直接手动触发p标签的闭合处理 
           * 目的是为了和浏览器行为保持一致，将嵌套标签提到同一层级
           * 如：<p>111<div>222</div>333</p>
           *  浏览器会处理成
           *     <p>111</p>
           *     <div>222</div>
           *     333
           *     <p></p>
           *  提前结束了p标签，所以第一行p中只剩下111，然后输出<div>222</div>，
           *  没有p标签包裹，是纯文本333，之后结束的p标签会生成一个新的<p></p>
           * 这和浏览器的标准行为是一致的
           */
          parseEndTag(lastTag);
        }
        if (canBeLeftOpenTag$$1(tagName) && lastTag === tagName) {
          // 允许不写结束标签的非闭合标签 并且此类标签嵌套
          /**
           * 直接手动触发此类标签的闭合处理
           * 目的是为了和浏览器行为保持一致，将嵌套标签提到同一层级
           * 如：<p>444<p>555</p>666</p>
           *  浏览器会处理成
           *     <p>444</p>
           *     <div>555</div>
           *     666
           *     <p></p>
           */
          parseEndTag(tagName);
        }
      }

      // 一元标签标识 平台一元标签或带有斜杠(/)
      var unary = isUnaryTag$$1(tagName) || !!unarySlash;

      var l = match.attrs.length;
      var attrs = new Array(l); // 创建标签中属性个数长度的数组
      for (var i = 0; i < l; i++) {
        // 属性解析结果
        var args = match.attrs[i];
        // 数值的value值
        var value = args[3] || args[4] || args[5] || '';

        var shouldDecodeNewlines = tagName === 'a' && args[1] === 'href'
          ? options.shouldDecodeNewlinesForHref
          : options.shouldDecodeNewlines;

        // 属性解析成 { name, value } 对象
        attrs[i] = {
          name: args[1],
          value: decodeAttr(value, shouldDecodeNewlines) // 解码属性
        };

        if (options.outputSourceRange) {
          // 非生产环境，且 outputSourceRange为 true 保存属性的开始和结束索引
          attrs[i].start = args.start + args[0].match(/^\s*/).length;
          attrs[i].end = args.end;
        }
      }

      if (!unary) { // 非一元标签
        // 将标签入栈存储
        stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs, start: match.start, end: match.end });
        // 解析完的标签记录为最近一个要解析的闭合标签
        lastTag = tagName;
      }

      if (options.start) {
        // 创建开始标签AST
        options.start(tagName, attrs, unary, match.start, match.end);
      }
    }

    /**
     * 解析结束标签
     * @param {*} tagName 
     * @param {*} start 
     * @param {*} end 
     */
    function parseEndTag (tagName, start, end) {
      // pos 结束标签对应的开始标签在stack数组中的索引
      // lowerCasedTagName 小写标签名
      var pos, lowerCasedTagName;
      if (start == null) { start = index; } // 结束标签开始索引
      if (end == null) { end = index; } // 结束标签结束索引

      // Find the closest opened tag of the same type
      if (tagName) {
        // 标签名转小写
        lowerCasedTagName = tagName.toLowerCase();
        // 查找最近的与结束标签相同的开始标签 记录索引pos
        for (pos = stack.length - 1; pos >= 0; pos--) {
          if (stack[pos].lowerCasedTag === lowerCasedTagName) {
            break
          }
        }
      } else {
        // If no tag name is provided, clean shop
        pos = 0;
      }

      if (pos >= 0) {
        // Close all the open elements, up the stack
        for (var i = stack.length - 1; i >= pos; i--) {
          if (i > pos || !tagName &&
            options.warn
          ) {
            /**
             * 没有结束标签警告
             *  1. i > pos              <div><span></div> 
             *  2. tagName 为undefined   <div><span></span> 
             */
            options.warn(
              ("tag <" + (stack[i].tag) + "> has no matching end tag."),
              { start: stack[i].start, end: stack[i].end }
            );
          }

          if (options.end) {
            // 创建结束标签AST
            options.end(stack[i].tag, start, end);
          }
        }

        // Remove the open elements from the stack
        stack.length = pos; // pop掉解析过的标签
        lastTag = pos && stack[pos - 1].tag; // 修改最近一个要处理的标签为前一个
      } else if (lowerCasedTagName === 'br') { 
        // br标签有两种： <br> 或 </br>
        // pos小于0 br标签 如果此时写的是 </br> 命中处理，会创建一个开始的<br>标签
        // br 标签
        if (options.start) {
          options.start(tagName, [], true, start, end);
        }
      } else if (lowerCasedTagName === 'p') {
        // pos小于0，说明p中嵌套了Phrasing标签，
        // 那么p标签会提前闭合处理，此时只剩下结束</p>标签
        // </p> 标签结束处理
        if (options.start) {
          // 创建p开始标签
          options.start(tagName, [], false, start, end);
        }
        if (options.end) {
          // 创建p闭合标签
          options.end(tagName, start, end);
        }
      }
    }
  }

  /*  */

  /**
   * 匹配 @ v-on 开头
   *  用来匹配v-one指令
   */
  var onRE = /^@|^v-on:/;

  /**
   * 匹配 v- @ : . # 开头 
   *  用来匹配绑定属性的特殊开头字符
   */
  var dirRE = /^v-|^@|^:|^#/;

  /**
   * v-for的值匹配 (item, index) in list
   *  1. ([\s\S]*?) 任意空白开始 加 任意非空白字符串 零或一次
   *  2. \s+(?:in|of)\s+ 匹配in | of，前后至少一个空格
   *  3. ([\s\S]*) 匹配 任意空白开始 加 任意非空白字符串
   */
  var forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
  /**
   * v-for的迭代结果逗号后部分匹配 item,key,index
   *  1. ,([^,\}\]]*) 匹配逗号开头 非 , } ] 外的字符零次或多次
   *  2. (?:,([^,\}\]]*))? 匹配逗号开头 非 , } ] 外的字符零次或多次 允许出现零或一次
   */
  var forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
  // 匹配开头或结尾的小括号 (item, index)
  var stripParensRE = /^\(|\)$/g;
  /**
   * 匹配开头结尾是中括号，中间除了换行符外的任何内容 
   *  用来匹配中括号传值的动态参数的 [hello] 
   */
  var dynamicArgRE = /^\[.*\]$/;
  /**
   * 匹配冒号(:)开头的的值 匹配vue中的属性值
   *  用来匹配动态属性名 如 :hello
   */
  var argRE = /:(.*)$/;
  /**
   * 匹配冒号(:)、点(.)、v-bind开头的属性
   *  匹配绑定属性 :hello .hello v-bind:hello
   *  绑定属性可以使用点开头？
   */ 
  var bindRE = /^:|^\.|^v-bind:/;
  /**
   * 匹配属性修饰符 
   *  匹配 .xxx.yyy
   */
  var modifierRE = /\.[^.\]]+(?=[^\]]*$)/g;
  /**
   * 匹配插槽
   *  v-slot v-slot: 或 # 开头
   */
  var slotRE = /^v-slot(:|$)|^#/;
  // 匹配 回车 换行
  var lineBreakRE = /[\r\n]/;
  // 匹配 换页 制表 回车 换行
  var whitespaceRE$1 = /[ \f\t\r\n]+/g;
  // 不合法标签名匹配  空白 " ' < > / =
  var invalidAttributeRE = /[\s"'<>\/=]/;
  // html解码、解码结果缓存
  var decodeHTMLCached = cached(he.decode);

  var emptySlotScopeToken = "_empty_";

  // configurable state
  var warn$2;
  var delimiters;
  var transforms;
  var preTransforms;
  var postTransforms;
  var platformIsPreTag;
  var platformMustUseProp;
  var platformGetTagNamespace;
  var maybeComponent;

  /**
   * 创建AST元素
   *  实际上是创建一个对象
   * @param {*} tag     标签名
   * @param {*} attrs   标签属性
   * @param {*} parent  父AST元素 即 currentParent
   * @returns 
   */
  function createASTElement (
    tag,
    attrs,
    parent
  ) {
    return {
      type: 1, // 1 表示是普通元素的AST元素节点 2 表示是表达式 3 表示是纯文本
      tag: tag, // 标签名
      attrsList: attrs, // 标签属性数组 [ { name, value, ... } ]
      attrsMap: makeAttrsMap(attrs), // 标签属性Map { name1: value1, name2: value2 }
      rawAttrsMap: {}, // 标签属性所有元素的Map映射 非生产环境使用做提示
      parent: parent, // 父AST元素
      children: [] // 子AST元素数组
    }
  }

  /**
   * Convert HTML string to AST.
   * 把解析HTML字符串成AST
   */
  function parse (
    template,
    options
  ) {
    // 编译警告
    warn$2 = options.warn || baseWarn;

    // 1. 从options中解析编译所需的配置、方法
    // 平台预留标签
    platformIsPreTag = options.isPreTag || no;
    // 平台必须使用prop的
    platformMustUseProp = options.mustUseProp || no;
    // 平台获取标签命名空间方法
    platformGetTagNamespace = options.getTagNamespace || no;
    // 预留标签对象
    var isReservedTag = options.isReservedTag || no;
    maybeComponent = function (el) { return !!(
      el.component ||
      el.attrsMap[':is'] ||
      el.attrsMap['v-bind:is'] ||
      !(el.attrsMap.is ? isReservedTag(el.attrsMap.is) : isReservedTag(el.tag))
    ); };

    // 从modules数组中获取指定方法名的方法数组 会在AST创建的不同时机去执行
    transforms = pluckModuleFunction(options.modules, 'transformNode');
    preTransforms = pluckModuleFunction(options.modules, 'preTransformNode');
    postTransforms = pluckModuleFunction(options.modules, 'postTransformNode');

    delimiters = options.delimiters;

    var stack = []; // 非闭合AST元素开始节点栈 目的是维护开始标签和结束标签是一一对应的关系
    var preserveWhitespace = options.preserveWhitespace !== false;
    var whitespaceOption = options.whitespace;
    var root; // AST根节点元素 即 组件的根元素节点
    var currentParent; // 当前AST元素的父AST元素
    var inVPre = false; // v-pre指令标识
    var inPre = false; // pre标签标识
    var warned = false;

    function warnOnce (msg, range) {
      if (!warned) {
        warned = true;
        warn$2(msg, range);
      }
    }

    /**
     * AST元素闭合处理
     *  1. 多个根节点处理
     *  2. 对AST进行树状态管理
     *  3. 各状态清除、重置
     * @param {*} element 
     */
    function closeElement (element) {
      // 移除末尾空格
      trimEndingWhitespace(element);

      if (!inVPre && !element.processed) {
        // 非v-pre 且 未处理的 AST元素节点
        // 处理AST元素attrsList中的值，对AST扩展
        element = processElement(element, options);
      }

      // tree management
      if (!stack.length && element !== root) {
        // allow root elements with v-if, v-else-if and v-else
        // 允许 v-if v-else-if v-else 设置多个根节点 此时 element是其它条件下的根节点
        if (root.if && (element.elseif || element.else)) {
          {
            checkRootConstraints(element);
          }
          // 添加其它情况的节点到根节点的ifConditions数组的元素
          addIfCondition(root, {
            exp: element.elseif,
            block: element
          });
        } else {
          // 根节点只能有一个
          // 当使用v-if判断生成根节点时候，使用v-else-if代替多次使用v-if
          warnOnce(
            "Component template should contain exactly one root element. " +
            "If you are using v-if on multiple elements, " +
            "use v-else-if to chain them instead.",
            { start: element.start }
          );
        }
      }
      if (currentParent && !element.forbidden) {
        // 根AST元素节点存在 且 当前节点是非禁止节点
        if (element.elseif || element.else) {
          // 处理elseif或else情况的AST元素节点
          processIfConditions(element, currentParent);
        } else {
          if (element.slotScope) { // 旧非作用域插槽不走这里
            // 新插槽语法v-slot走这里 是插槽但不是作用域插槽的element.slotScope = "_empty_"
            // scoped slot
            // keep it in the children list so that v-else(-if) conditions can
            // find it as the prev node.
            var name = element.slotTarget || '"default"' // 未命名的slot默认名default
            // 处理非组件的插槽AST元素 组件上直接使用插槽AST元素在processSlotContent()中处理
            // 将AST元素添加到父AST元素的scopedSlots中，以绑定的插槽名name为键
            ;(currentParent.scopedSlots || (currentParent.scopedSlots = {}))[name] = element;
          }
          // 保存当前AST元素到父AST元素的children
          currentParent.children.push(element);
          element.parent = currentParent; // 指定当前元素的父AST元素
        }
      }

      // final children cleanup
      // filter out scoped slots
      // 过滤掉AST的children中是插槽AST元素的节点
      // 上面的slotScope处理已经将此种元素保存到element的scopedSlots中
      element.children = element.children.filter(function (c) { return !(c).slotScope; });
      // remove trailing whitespace node again
      trimEndingWhitespace(element); // 移除末尾空格

      // check pre state
      if (element.pre) {
        // 重置v-pre状态
        inVPre = false;
      }
      if (platformIsPreTag(element.tag)) {
        // 重置pre标签状态
        inPre = false;
      }

      // apply post-transforms
      for (var i = 0; i < postTransforms.length; i++) {
        // 执行modules的postTransformNode
        postTransforms[i](element, options);
      }
    }

    /**
     * 移除当前AST元素的子AST元素数组中的末尾空格AST节点
     * @param {*} el 
     */
    function trimEndingWhitespace (el) {
      // remove trailing whitespace node
      if (!inPre) {
        var lastNode;
        while (
          (lastNode = el.children[el.children.length - 1]) &&
          lastNode.type === 3 &&
          lastNode.text === ' '
        ) {
          el.children.pop();
        }
      }
    }

    /**
     * AST元素根节点约束性检查
     *  1. 不能使用 slot template 作为根AST节点
     *  2. 根节点上不能使用v-for
     * @param {*} el 
     */
    function checkRootConstraints (el) {
      if (el.tag === 'slot' || el.tag === 'template') {
        // 不能使用 slot template 作为根AST节点
        // 因为可能会产生多个节点，而根节点只能有一个
        warnOnce(
          "Cannot use <" + (el.tag) + "> as component root element because it may " +
          'contain multiple nodes.',
          { start: el.start }
        );
      }
      if (el.attrsMap.hasOwnProperty('v-for')) {
        // 根节点上不能使用v-for 因为会产生多个节点，而根节点只能有一个
        warnOnce(
          'Cannot use v-for on stateful component root element because ' +
          'it renders multiple elements.',
          el.rawAttrsMap['v-for']
        );
      }
    }
    
    /**
     * 解析HTML模板
     *  解析HTML模板，主要做两件事情
     *   1. 解析HTML模板
     *   2. 在解析HTML过程中，调用传入的回调函数，进行AST树的生成
     */
    parseHTML(template, {
      warn: warn$2,
      expectHTML: options.expectHTML,
      isUnaryTag: options.isUnaryTag,
      canBeLeftOpenTag: options.canBeLeftOpenTag,
      shouldDecodeNewlines: options.shouldDecodeNewlines,
      shouldDecodeNewlinesForHref: options.shouldDecodeNewlinesForHref,
      shouldKeepComment: options.comments,
      outputSourceRange: options.outputSourceRange,
      /**
       * 创建开始标签节点AST，并对标签进行扩展，再进行AST树管理
       * @param {*} tag   标签名
       * @param {*} attrs 标签属性
       * @param {*} unary 一元标签标志位
       * @param {*} start 标签在HTML字符串中的开始索引
       * @param {*} end   标签在HTML字符串中的结束索引
       */
      start: function start (tag, attrs, unary, start$1, end) {
        // check namespace.
        // inherit parent ns if there is one
        // 获取父AST的命名空间，子AST继承
        var ns = (currentParent && currentParent.ns) || platformGetTagNamespace(tag);

        // handle IE svg bug
        /* istanbul ignore if */
        if (isIE && ns === 'svg') {
          // IE svg标签特殊处理
          attrs = guardIESVGBug(attrs);
        }

        // 创建开始标签的AST元素
        var element = createASTElement(tag, attrs, currentParent);

        /********** 下面逻辑是对AST元素进行扩展 ***************/

        if (ns) {
          // 添加命名空间
          element.ns = ns;
        }

        // 非生产环境扩展
        {
          if (options.outputSourceRange) {
            // 添加 start end rawAttrsMap
            element.start = start$1;
            element.end = end;
            // 创建一个对象，并添加属性 这种方法指的学习
            element.rawAttrsMap = element.attrsList.reduce(function (cumulated, attr) {
              cumulated[attr.name] = attr;
              return cumulated
            }, {});
          }

          attrs.forEach(function (attr) {
            if (invalidAttributeRE.test(attr.name)) {
              // 标签名不合法警告
              warn$2(
                "Invalid dynamic argument expression: attribute names cannot contain " +
                "spaces, quotes, <, >, / or =.",
                {
                  start: attr.start + attr.name.indexOf("["),
                  end: attr.start + attr.name.length
                }
              );
            }
          });
        }

        if (isForbiddenTag(element) && !isServerRendering()) {
          // 被禁止标签 且 非服务端渲染
          element.forbidden = true; // 扩展禁止解析标识
          warn$2(
            'Templates should only be responsible for mapping the state to the ' +
            'UI. Avoid placing tags with side-effects in your templates, such as ' +
            "<" + tag + ">" + ', as they will not be parsed.',
            { start: element.start }
          );
        }

        // apply pre-transforms
        for (var i = 0; i < preTransforms.length; i++) {
          // pre-transforms 有则预转换AST元素
          // Web平台下 只是对v-model进行处理
          element = preTransforms[i](element, options) || element;
        }

        if (!inVPre) {
          // 处理v-pre指令
          processPre(element);
          if (element.pre) {
            // 标识当前AST上有v-pre指令
            inVPre = true;
          }
        }
        if (platformIsPreTag(element.tag)) {
          // 设置 当前元素是pre元素标识
          inPre = true;
        }
        if (inVPre) {
          // FIXME: 处理v-pre标识的的AST元素
          processRawAttrs(element);
        } else if (!element.processed) { // 未处理的AST元素
          // structural directives
          // 处理结构性指令
          processFor(element); // 处理v-for指令
          processIf(element); // 处理v-if指令
          processOnce(element); // 处理v-once指令
        }

        /********** 下面逻辑是对AST树的管理 ***************/

        if (!root) {
          // 没有根节点，将当前AST元素做根节点
          root = element;
          {
            // 检测根节点是否满足约束
            checkRootConstraints(root);
          }
        }

        if (!unary) {
          // 非一元标签
          // 将当前AST元素节点当作下一个AST节点的父节点
          currentParent = element;
          stack.push(element); // 入栈非闭合标签AST元素开始标签节点
        } else {
          // 一元标签 闭合处理
          closeElement(element);
        }
      },
      /**
       * 结束标签节点对应的开始AST元素的stack回溯处理
       *  1. stack栈中移除对应的开始标签
       *  2. 闭合处理
       * @param {*} tag 
       * @param {*} start 
       * @param {*} end 
       */
      end: function end (tag, start, end$1) {
        // 结束标签对应的开始AST元素
        var element = stack[stack.length - 1];
        // pop stack
        stack.length -= 1; // 弹出结束标签对应的开始标签
        currentParent = stack[stack.length - 1]; // 将父AST元素节点改成上一个 即 当前父级的父级
        if (options.outputSourceRange) {
          element.end = end$1;
        }
        // 结束标签对应的开始AST元素的闭合处理
        closeElement(element);
      },
      /**
       * 创建文本节点AST 或 表达式AST
       *  1. 纯文本不能做为一个组件的根节点 与组件根节点同级的文本节点会被忽略
       *  2. 去除文本两端的空格，创建AST
       * @param {*} text 
       * @param {*} start 
       * @param {*} end 
       * @returns 
       */
      chars: function chars (text, start, end) {
        // 根节点的文本处理
        if (!currentParent) {
          // currentParent不为真 即当前节点是根AST元素
          {
            if (text === template) {
              // 警告 一个组件的根节点不能是纯文本
              warnOnce(
                'Component template requires a root element, rather than just text.',
                { start: start }
              );
            } else if ((text = text.trim())) {
              // 警告 与组件根节点同级的文本节点会被忽略
              warnOnce(
                ("text \"" + text + "\" outside root element will be ignored."),
                { start: start }
              );
            }
          }
          return
        }

        // IE textarea placeholder bug
        /* istanbul ignore if */
        if (isIE &&
          currentParent.tag === 'textarea' &&
          currentParent.attrsMap.placeholder === text
        ) {
          // 不处理IE的placeholder文本
          return
        }

        var children = currentParent.children;
        // 对text文本两端空白处理
        if (inPre || text.trim()) {
          // pre标签 或 有文本（去除文本两端空格后）
          // script/style标签直接返回text 
          // 其它标签的文本做解码
          text = isTextTag(currentParent) ? text : decodeHTMLCached(text);
          // 下面都是对text是纯空白的处理
        } else if (!children.length) { // 父AST没有子节点
          // remove the whitespace-only node right after an opening tag
          // 父AST没有子节点，删除所有空格
          text = '';
        } else if (whitespaceOption) {
          // 父AST有子节点 whitespaceOption 空白处理模式为真
          if (whitespaceOption === 'condense') {
            // in condense mode, remove the whitespace node if it contains
            // line break, otherwise condense to a single space
            // condense 压缩模式下，去掉回车符、换行符 其它空白符保留一个空格
            text = lineBreakRE.test(text) ? '' : ' ';
          } else {
            // preserve 保留模式 保留一个空格
            text = ' ';
          }
        } else {
          // 父AST有子节点
          // options.preserveWhitespace为真 保留一个空格
          text = preserveWhitespace ? ' ' : '';
        }
        if (text) { // 处理过两端空白的text
          if (!inPre && whitespaceOption === 'condense') {
            // condense consecutive whitespaces into single space
            // 非pre标签，且 压缩模式，将文本中的所有开白压缩到一个空格
            text = text.replace(whitespaceRE$1, ' ');
          }
          var res; // 文本解析表达式的结果
          var child; // 要创建的文本或表达式AST节点
          if (!inVPre && text !== ' ' && (res = parseText(text, delimiters))) {
            // 非v-pre标签节点 且 解析文本结果是表达式 { expression, tokens  }
            // 创建表达式AST元素节点
            child = {
              type: 2,
              expression: res.expression,
              tokens: res.tokens,
              text: text
            };
          } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
            // 有文本 且 父AST有子AST，且 最后一个子AST不是文本AST元素
            // 创建文本AST元素节点
            child = {
              type: 3,
              text: text
            };
          }
          if (child) {
            if (options.outputSourceRange) {
              child.start = start;
              child.end = end;
            }
            // 将文本或表达式AST push到父AST中
            children.push(child);
          }
        }
      },
      /**
       * 创建注释节点AST
       *  1. 根节点AST的注释节点会被忽略
       *  2. 非根节点，注释AST节点push到父AST元素的children中
       * @param {*} text 
       * @param {*} start 
       * @param {*} end 
       */
      comment: function comment (text, start, end) {
        // adding anything as a sibling to the root node is forbidden
        // comments should still be allowed, but ignored
        if (currentParent) {
          // 非根节点，添加注释AST节点
          var child = {
            type: 3,
            text: text,
            isComment: true
          };
          if (options.outputSourceRange) {
            child.start = start;
            child.end = end;
          }
          // 注释AST节点push到父AST的children中
          currentParent.children.push(child);
        }
      }
    });

    // 返回AST树
    return root
  }

  /**
   * 处理v-pre指令
   *  移除v-pre属性，并给AST元素扩展v-pre标识pre
   * @param {*} el AST元素
   */
  function processPre (el) {
    if (getAndRemoveAttr(el, 'v-pre') != null) {
      el.pre = true;
    }
  }

  function processRawAttrs (el) {
    var list = el.attrsList;
    var len = list.length;
    if (len) {
      var attrs = el.attrs = new Array(len);
      for (var i = 0; i < len; i++) {
        attrs[i] = {
          name: list[i].name,
          value: JSON.stringify(list[i].value)
        };
        if (list[i].start != null) {
          attrs[i].start = list[i].start;
          attrs[i].end = list[i].end;
        }
      }
    } else if (!el.pre) {
      // non root node in pre blocks with no attributes
      el.plain = true;
    }
  }

  /**
   * 处理AST元素节点
   *  处理元素上的属性即attrsList中的值，对AST进行扩展
   * @param {*} element 
   * @param {*} options 
   * @returns 
   */
  function processElement (
    element,
    options
  ) {
    // 处理:key属性
    processKey(element);

    // determine whether this is a plain element after
    // removing structural attributes
    // 在移除结构属性后，判断该AST元素是否是普通的AST元素节点
    // 扩展plain，是否是普通的AST元素节点：没有 key scopedSlots attrsList
    element.plain = (
      !element.key &&
      !element.scopedSlots &&
      !element.attrsList.length
    );

    // FIXME: 处理 ref
    processRef(element);
    // 处理插槽v-slot slot slot-scoped
    processSlotContent(element);
    // 处理插槽标签<slot>
    processSlotOutlet(element);
    // FIXME: 处理 component
    processComponent(element);

    // 执行transforms
    for (var i = 0; i < transforms.length; i++) {
      // Web下处理 静态和动态的class、style
      element = transforms[i](element, options) || element;
    }

    // 处理attrsList中其它没有处理的属性 
    processAttrs(element);
    return element
  }

  /**
   * 处理key属性
   * @param {*} el 
   */
  function processKey (el) {
    // key属性的表达式
    var exp = getBindingAttr(el, 'key');
    if (exp) {
      {
        if (el.tag === 'template') {
          // template上不能设置key属性
          warn$2(
            "<template> cannot be keyed. Place the key on real elements instead.",
            getRawBindingAttr(el, 'key')
          );
        }
        if (el.for) {
          var iterator = el.iterator2 || el.iterator1;
          var parent = el.parent;
          if (iterator && iterator === exp && parent && parent.tag === 'transition-group') {
            // <transition-group>的子AST元素上不能使用v-for生成的index作为key
            warn$2(
              "Do not use v-for index as key on <transition-group> children, " +
              "this is the same as not using keys.",
              getRawBindingAttr(el, 'key'),
              true /* tip */
            );
          }
        }
      }
      // 扩展key属性到AST上
      el.key = exp;
    }
  }

  function processRef (el) {
    var ref = getBindingAttr(el, 'ref');
    if (ref) {
      el.ref = ref;
      el.refInFor = checkInFor(el);
    }
  }

  /**
   * 处理v-for指令
   *  移除v-for
   * @param {*} el 
   */
  function processFor (el) {
    var exp;
    if ((exp = getAndRemoveAttr(el, 'v-for'))) {
      var res = parseFor(exp);
      if (res) {
        // 将v-for结果扩展到AST元素上
        extend(el, res);
      } else {
        // v-for表达式的值不合法警告
        warn$2(
          ("Invalid v-for expression: " + exp),
          el.rawAttrsMap['v-for']
        );
      }
    }
  }


  /**
   * 解析v-for结果：
   *  1. item in list => { for: list, alias: item }
   *  2. (item, index) in list => { for: list, alias: item, iterator1: index } 
   *  3. (item, key, index) in list => { for: list, alias: item, iterator1: key, iterator2: index } 
   * @param {*} exp 
   * @returns 
   */
  function parseFor (exp) {
    // 正则匹配v-for的值
    var inMatch = exp.match(forAliasRE);
    if (!inMatch) { return } // reject 不符合规则

    var res = {};
    // 要遍历的list
    res.for = inMatch[2].trim();
    // 遍历项item 去掉空格和括号 得到迭代结果名alias
    var alias = inMatch[1].trim().replace(stripParensRE, '');
    // 匹配逗号后的部分
    var iteratorMatch = alias.match(forIteratorRE);
    if (iteratorMatch) {
      // 如值item,key,index 有逗号后部分 
      res.alias = alias.replace(forIteratorRE, '').trim(); // item
      res.iterator1 = iteratorMatch[1].trim(); // key
      if (iteratorMatch[2]) {
        res.iterator2 = iteratorMatch[2].trim(); // index
      }
    } else {
      // 没有逗号部分
      res.alias = alias;
    }
    return res
  }

  /**
   * 处理v-if v-else v-else-if的AST元素
   *  1. 在 v-if 的AST元素上扩展ifConditions数组，添加当前AST元素的表达式exp和元素本身el
   *  2. 在 v-else 的AST元素上扩展 else 标识，以便后续processIfConditions处理
   *  3. 在 v-else-if 的AST元素上扩展 elseif 表达式，以便后续processIfConditions处理
   * @param {*} el 
   */
  function processIf (el) {
    var exp = getAndRemoveAttr(el, 'v-if');
    if (exp) {
      // if的表达式exp扩展到AST元素上
      el.if = exp;
      // 将if解析结果扩展到AST元素上，保存在el.ifConditions中
      addIfCondition(el, {
        exp: exp,
        block: el
      });
    } else {
      if (getAndRemoveAttr(el, 'v-else') != null) {
        // 扩展v-else标识符到AST元素上
        el.else = true;
      }
      var elseif = getAndRemoveAttr(el, 'v-else-if');
      if (elseif) {
        // 扩展v-else-if的表达式elseif到AST元素上
        el.elseif = elseif;
      }
    }
  }

  /**
   * 处理 v-else-if v-else 的AST元素
   *  将上述两种AST元素节点添加到上面相邻的兄弟AST元素的ifConditions数组中
   * @param {*} el 
   * @param {*} parent 
   */
  function processIfConditions (el, parent) {
    var prev = findPrevElement(parent.children);
    if (prev && prev.if) {
      // 相邻的上个节点是v-if，扩展v-else-if或v-else到相邻的AST元素的ifConditions数组中
      // v-else 时，el.elseif是undefined，即exp是undefined
      addIfCondition(prev, {
        exp: el.elseif,
        block: el
      });
    } else {
      // 相邻AST元素不是v-if情况下，直接使用v-else-if或v-else 报错提示
      warn$2(
        "v-" + (el.elseif ? ('else-if="' + el.elseif + '"') : 'else') + " " +
        "used on element <" + (el.tag) + "> without corresponding v-if.",
        el.rawAttrsMap[el.elseif ? 'v-else-if' : 'v-else']
      );
    }
  }

  /**
   * 找到相邻的AST元素
   *  函数用来查找v-else-if或v-else的相邻AST元素
   *  v-if和v-else(-if)之间的表达式或文本AST元素节点将被移除（忽略）
   * @param {*} children 
   * @returns 
   */
  function findPrevElement (children) {
    var i = children.length;
    while (i--) {
      if (children[i].type === 1) {
        return children[i]
      } else {
        if (children[i].text !== ' ') {
          warn$2(
            "text \"" + (children[i].text.trim()) + "\" between v-if and v-else(-if) " +
            "will be ignored.",
            children[i]
          );
        }
        // 移除v-if和v-else(-if)之间的表达式或文本AST元素节点
        children.pop();
      }
    }
  }

  /**
   * 将if结果扩展到ifConditions数组中
   *  结果 { exp: string; block: ASTElement }
   * @param {*} el 
   * @param {*} condition 
   */
  function addIfCondition (el, condition) {
    if (!el.ifConditions) {
      el.ifConditions = [];
    }
    el.ifConditions.push(condition);
  }

  /**
   * 处理 v-once
   * @param {*} el 
   */
  function processOnce (el) {
    var once$$1 = getAndRemoveAttr(el, 'v-once');
    if (once$$1 != null) {
      // 扩展once标识符到AST上
      el.once = true;
    }
  }

  /**
   * handle content being passed to a component as slot,
   * e.g. <template slot="xxx">, <div slot-scope="xxx">
   * 处理插槽内容
   *  - slot 具名插槽 旧语法
   *  - slot-scopet 作用域插槽 旧语法
   *  - v-slot 具名插槽和作用域插槽
   * @param {*} el 
   */
  function processSlotContent (el) {
    // 下面是slot-scope作用域插槽处理
    var slotScope;
    if (el.tag === 'template') { // tempalte上作用域插槽
      // scope属性处理
      slotScope = getAndRemoveAttr(el, 'scope');
      /* istanbul ignore if */
      if (slotScope) {
        // 警告 scope已废弃 推荐使用slot-scope
        warn$2(
          "the \"scope\" attribute for scoped slots have been deprecated and " +
          "replaced by \"slot-scope\" since 2.5. The new \"slot-scope\" attribute " +
          "can also be used on plain elements in addition to <template> to " +
          "denote scoped slots.",
          el.rawAttrsMap['scope'],
          true
        );
      }
      // AST元素上扩展插槽作用域slotScope属性
      el.slotScope = slotScope || getAndRemoveAttr(el, 'slot-scope');
    } else if ((slotScope = getAndRemoveAttr(el, 'slot-scope'))) {
      // 非template标签 slot-scope属性处理
      /* istanbul ignore if */
      if (el.attrsMap['v-for']) {
        // 警告 v-for上使用slot-scope
        warn$2(
          "Ambiguous combined usage of slot-scope and v-for on <" + (el.tag) + "> " +
          "(v-for takes higher priority). Use a wrapper <template> for the " +
          "scoped slot to make it clearer.",
          el.rawAttrsMap['slot-scope'],
          true
        );
      }
      // AST元素上扩展插槽作用域slotScope属性 即 插槽prop
      el.slotScope = slotScope;
    }

    // 下面是slot具名插槽处理
    // slot="xxx"
    var slotTarget = getBindingAttr(el, 'slot');
    if (slotTarget) {
      // AST元素上扩展绑定的插槽名slotTarget 默认是default
      el.slotTarget = slotTarget === '""' ? '"default"' : slotTarget;
      // AST元素上扩展是否是动态插槽标识
      el.slotTargetDynamic = !!(el.attrsMap[':slot'] || el.attrsMap['v-bind:slot']);
      // preserve slot as an attribute for native shadow DOM compat
      // only for non-scoped slots.
      if (el.tag !== 'template' && !el.slotScope) {
        // 非template标签 并 没有插槽prop，即非作用域插槽 扩展el.attrs.slot属性，保存对应的具名插槽的名字 如 slot='xxx' el.attrs.slot = 'xxx'
        addAttr(el, 'slot', slotTarget, getRawBindingAttr(el, 'slot'));
      }
    }

    // 下面是v-slot插槽处理
    // 2.6 v-slot syntax
    {
      if (el.tag === 'template') {
        // <template>上使用插槽
        // v-slot on <template>
        // 插槽的绑定值
        var slotBinding = getAndRemoveAttrByRegex(el, slotRE);
        if (slotBinding) {
          {
            if (el.slotTarget || el.slotScope) {
              // 警告 v-slot不能和slot slot-scope混用
              warn$2(
                "Unexpected mixed usage of different slot syntaxes.",
                el
              );
            }
            if (el.parent && !maybeComponent(el.parent)) {
              // 警告 <template v-slot> 只能出现在接收组件内部的根节点上
              /**
               * 如：<template v-slot>只能作为<current-user>的根节点
               * <current-user>
               *   <template v-slot>
               *      hello tom
               *   </template>
               * </current-user>
               */
              warn$2(
                "<template v-slot> can only appear at the root level inside " +
                "the receiving component",
                el
              );
            }
          }
          /**
           * v-slot与scope、slot-scope相比，本质上只是不同的语法糖，最终AST元素上
           * 扩展的属性值相同
           */
          var ref = getSlotName(slotBinding);
          var name = ref.name;
          var dynamic = ref.dynamic;
          el.slotTarget = name;
          el.slotTargetDynamic = dynamic;
          // 插槽prop 赋值插槽作用域 没有作用域时，默认强制赋值为emptySlotScopeToken = "_empty_"
          el.slotScope = slotBinding.value || emptySlotScopeToken; // force it into a scoped slot for perf
        }
      } else {
        // 组件上使用插槽
        // 当被提供的内容只有默认插槽时，组件的标签才可以被当作插槽的模板来使用
        // v-slot on component, denotes default slot
        // 插槽的绑定值
        var slotBinding$1 = getAndRemoveAttrByRegex(el, slotRE);
        if (slotBinding$1) {
          {
            if (!maybeComponent(el)) {
              // 警告 v-slot只能在组件上或template上使用
              warn$2(
                "v-slot can only be used on components or <template>.",
                slotBinding$1
              );
            }
            if (el.slotScope || el.slotTarget) {
              // 警告 v-slot不能和slot slot-scope混用
              warn$2(
                "Unexpected mixed usage of different slot syntaxes.",
                el
              );
            }
            if (el.scopedSlots) {
              // 警告 当有其它具名插槽时，默认插槽也应该使用<template>语法 而不应该直接放在组件上
              // 即 只有默认标签时，v-slot可以放在组件上，下方会自动处理加上template标签
              warn$2(
                "To avoid scope ambiguity, the default slot should also use " +
                "<template> syntax when there are other named slots.",
                slotBinding$1
              );
            }
          }

          /**
           * 非组件使用插槽
           *  在closeElement()中处理，将插槽AST元素添加到父AST元素的scopedSlots中
           * 组件上使用插槽
           *  创建一个template标签的AST元素作为插槽的AST，然后将此AST放在组件AST元素的
           *  作用域插槽el.scopedSlots属性中，以绑定的插槽名name作为键el.scopedSlots[name]，
           *  再将组件的children的父级指向插槽的templateAST标签，并添加插槽AST的
           *  插槽作用域slotScope，最后清除组件AST元素的children
           * 总结：非组件插槽和组件插槽的AST，都会保存在父级AST元素的scopedSlots中；
           *       非组件使用插槽，插槽AST元素保存在父AST的scopedSlots中；
           *       组件使用插槽，插槽AST元素，会先用template的AST元素包裹，然后保存在
           *       组件的scopedSlots中，即以组件为父AST；
           */
          // 组件的children作为组件的插槽节点 所有的插槽节点都保存在el.scopedSlots中
          // add the component's children to its default slot
          var slots = el.scopedSlots || (el.scopedSlots = {});
          var ref$1 = getSlotName(slotBinding$1);
          var name$1 = ref$1.name;
          var dynamic$1 = ref$1.dynamic;
          // 创建template标签的AST元素作为slot的容器
          // v-slot在组件上，会自动创建template标签，本质上还是在template上使用v-slot
          var slotContainer = slots[name$1] = createASTElement('template', [], el);
          slotContainer.slotTarget = name$1;
          slotContainer.slotTargetDynamic = dynamic$1;
          // 取非插槽的AST元素作为slotContainer的children
          slotContainer.children = el.children.filter(function (c) {
            if (!c.slotScope) {
              // 子AST非插槽AST 将组件的children.parent指向slotContainer
              c.parent = slotContainer;
              return true
            }
          });
          // 插槽prop 扩展组件插槽的插槽作用域 没有作用域时，默认强制赋值为emptySlotScopeToken = "_empty_"
          slotContainer.slotScope = slotBinding$1.value || emptySlotScopeToken;
          // remove children as they are returned from scopedSlots now
          el.children = []; // 移除掉组件本来的children，现在在el.scopedSlots[name].children
          // mark el non-plain so data gets generated
          el.plain = false;
        }
      }
    }
  }

  /**
   * 获取v-slot绑定的插槽名和动态插槽标识
   * @param {*} binding 
   * @returns 
   */
  function getSlotName (binding) {
    // 绑定的插槽名
    var name = binding.name.replace(slotRE, '');
    if (!name) {
      if (binding.name[0] !== '#') {
        // 非#语法 默认插槽名为default
        name = 'default';
      } else {
        // 警告 #语法必须写插槽名
        warn$2(
          "v-slot shorthand syntax requires a slot name.",
          binding
        );
      }
    }
    return dynamicArgRE.test(name)
      // dynamic [name] 动态插槽名 去掉中括号
      ? { name: name.slice(1, -1), dynamic: true }
      // static name 静态插槽
      : { name: ("\"" + name + "\""), dynamic: false }
  }

  /**
   * handle <slot/> outlets
   * 处理插槽标签<slot>
   * @param {*} el 
   */
  function processSlotOutlet (el) {
    if (el.tag === 'slot') {
      // 扩展插槽AST元素标签上的name属性
      el.slotName = getBindingAttr(el, 'name');
      if (el.key) {
        // 警告 slot标签上不能使用key
        warn$2(
          "`key` does not work on <slot> because slots are abstract outlets " +
          "and can possibly expand into multiple elements. " +
          "Use the key on a wrapping element instead.",
          getRawBindingAttr(el, 'key')
        );
      }
    }
  }

  function processComponent (el) {
    var binding;
    if ((binding = getBindingAttr(el, 'is'))) {
      el.component = binding;
    }
    if (getAndRemoveAttr(el, 'inline-template') != null) {
      el.inlineTemplate = true;
    }
  }

  /**
   * 处理事件、绑定属性、自定义指令、静态属性
   *  包括：
   *    1. 未处理的动态属性 如： v-on @ v-bind : . v-model 绑定的属性
   *    2. 静态属性 如 hello="world"
   * @param {*} el AST元素
   */
  function processAttrs (el) {
    var list = el.attrsList;

    var i, l, name, rawName, value, modifiers, syncGen, isDynamic;
    for (i = 0, l = list.length; i < l; i++) {
      name = rawName = list[i].name;
      value = list[i].value;
      if (dirRE.test(name)) { // 动态绑定属性处理  v- @ : . # 开头
        // mark element as dynamic 标记动态AST节点标识
        el.hasBindings = true;
        // modifiers 解析修饰符
        modifiers = parseModifiers(name.replace(dirRE, ''));

        // support .foo shorthand syntax for the .prop modifier
        if (modifiers) {
          // 去掉属性修饰符 @click.native.prevent => @click
          name = name.replace(modifierRE, '');
        }

        if (bindRE.test(name)) { // v-bind 处理
          name = name.replace(bindRE, '');
          value = parseFilters(value);
          isDynamic = dynamicArgRE.test(name);
          if (isDynamic) {
            // 动态参数 [hello] 去掉中括号
            name = name.slice(1, -1);
          }
          if (
            value.trim().length === 0
          ) {
            // 警告 绑定值不能为空  如 不允许:hello=""
            warn$2(
              ("The value for a v-bind expression cannot be empty. Found in \"v-bind:" + name + "\"")
            );
          }
          // 处理修饰符
          if (modifiers) {
            if (modifiers.prop && !isDynamic) {
              name = camelize(name);
              if (name === 'innerHtml') { name = 'innerHTML'; }
            }
            if (modifiers.camel && !isDynamic) {
              // camel修饰符
              name = camelize(name);
            }
            if (modifiers.sync) {
              // 处理sync修饰符
              syncGen = genAssignmentCode(value, "$event");
              if (!isDynamic) {
                addHandler(
                  el,
                  ("update:" + (camelize(name))),
                  syncGen,
                  null,
                  false,
                  warn$2,
                  list[i]
                );
                if (hyphenate(name) !== camelize(name)) {
                  addHandler(
                    el,
                    ("update:" + (hyphenate(name))),
                    syncGen,
                    null,
                    false,
                    warn$2,
                    list[i]
                  );
                }
              } else {
                // handler w/ dynamic event name
                addHandler(
                  el,
                  ("\"update:\"+(" + name + ")"),
                  syncGen,
                  null,
                  false,
                  warn$2,
                  list[i],
                  true // dynamic
                );
              }
            }
          }

          if ((modifiers && modifiers.prop) || (
            !el.component && platformMustUseProp(el.tag, el.attrsMap.type, name)
          )) {
            // 有prop修饰符 或 平台上必须将属性绑定到prop
            addProp(el, name, value, list[i], isDynamic);
          } else {
            // 将属性扩展到AST元素上
            addAttr(el, name, value, list[i], isDynamic);
          }
        } else if (onRE.test(name)) { // v-on 事件处理
          // 去掉开头v-on @ 符号 @click => click
          name = name.replace(onRE, '');
          // 动态事件属性
          isDynamic = dynamicArgRE.test(name);
          if (isDynamic) {
            // 去掉动态事件属性的中括号
            name = name.slice(1, -1);
          }
          // 处理事件 在el上扩展events或nativeEvents属性
          addHandler(el, name, value, modifiers, false, warn$2, list[i], isDynamic);
        } else { // normal directives 指令处理 如v-model 或 用户自定义的指令
          // 去掉开头指令符号
          name = name.replace(dirRE, '');

          // parse arg 匹配指令上的参数 v-hello:wrold =>  [':wrold', 'wrold', index: 7, input: 'v-hello:wrold', groups: undefined]
          var argMatch = name.match(argRE);
          var arg = argMatch && argMatch[1];
          isDynamic = false;
          if (arg) {
            name = name.slice(0, -(arg.length + 1));
            if (dynamicArgRE.test(arg)) {
              // 指令参数动态值处理
              arg = arg.slice(1, -1);
              isDynamic = true;
            }
          }
          // AST元素上扩展directives属性
          addDirective(el, name, rawName, value, arg, isDynamic, modifiers, list[i]);
          if (name === 'model') {
            // v-model指令不允许绑定v-for在遍历的值
            checkForAliasModel(el, value);
          }
        }
      } else { // 静态属性处理
        // literal attribute
        {
          // html的静态标签属性中，不能使用{{}}分隔符
          var res = parseText(value, delimiters);
          if (res) {
            warn$2(
              name + "=\"" + value + "\": " +
              'Interpolation inside attributes has been removed. ' +
              'Use v-bind or the colon shorthand instead. For example, ' +
              'instead of <div id="{{ val }}">, use <div :id="val">.',
              list[i]
            );
          }
        }
        // 将静态属性扩展到AST元素的静态属性attrs数组中
        addAttr(el, name, JSON.stringify(value), list[i]);
        // #6887 firefox doesn't update muted state if set via attribute
        // even immediately after element creation
        if (!el.component &&
            name === 'muted' &&
            platformMustUseProp(el.tag, el.attrsMap.type, name)) {
          addProp(el, name, 'true', list[i]);
        }
      }
    }
  }

  function checkInFor (el) {
    var parent = el;
    while (parent) {
      if (parent.for !== undefined) {
        return true
      }
      parent = parent.parent;
    }
    return false
  }

  /**
   * 解析属性修饰符成Map
   *  .hello.world => 
   *  { hello: true, world: true }
   * @param {*} name 
   * @returns 
   */
  function parseModifiers (name) {
    var match = name.match(modifierRE);
    if (match) {
      var ret = {};
      match.forEach(function (m) { ret[m.slice(1)] = true; });
      return ret
    }
  }

  /**
   * 生成标签属性数组的Map
   *  [{ name1, value1, ... }, { name2, value2, ... }] =>
   *  { name1: value1, name2: value2 }
   * @param {*} attrs 
   * @returns 
   */
  function makeAttrsMap (attrs) {
    var map = {};
    for (var i = 0, l = attrs.length; i < l; i++) {
      if (
        map[attrs[i].name] && !isIE && !isEdge
      ) {
        warn$2('duplicate attribute: ' + attrs[i].name, attrs[i]);
      }
      map[attrs[i].name] = attrs[i].value;
    }
    return map
  }

  /**
   * script style当作纯文本标签
   * @param {*} el 
   * @returns 
   */
  // for script (e.g. type="x/template") or style, do not decode content
  function isTextTag (el) {
    return el.tag === 'script' || el.tag === 'style'
  }

  /**
   * 是否是禁止使用的标签
   * 禁止标签：
   *  1. style
   *  2. script 且 无属性type字段或type字段为'text/javascript'
   * @param {*} el 
   * @returns 
   */
  function isForbiddenTag (el) {
    return (
      el.tag === 'style' ||
      (el.tag === 'script' && (
        !el.attrsMap.type ||
        el.attrsMap.type === 'text/javascript'
      ))
    )
  }

  var ieNSBug = /^xmlns:NS\d+/;
  var ieNSPrefix = /^NS\d+:/;

  /* istanbul ignore next */
  function guardIESVGBug (attrs) {
    var res = [];
    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i];
      if (!ieNSBug.test(attr.name)) {
        attr.name = attr.name.replace(ieNSPrefix, '');
        res.push(attr);
      }
    }
    return res
  }

  /**
   * 检查v-for指令的遍历值是否与v-model的绑定值相同
   * 如 v-for ="item in list" v-model的value不能是item 
   * @param {*} el 
   * @param {*} value 
   */
  function checkForAliasModel (el, value) {
    var _el = el;
    while (_el) {
      if (_el.for && _el.alias === value) {
        // 不能绑定v-for的遍历值到v-model上
        warn$2(
          "<" + (el.tag) + " v-model=\"" + value + "\">: " +
          "You are binding v-model directly to a v-for iteration alias. " +
          "This will not be able to modify the v-for source array because " +
          "writing to the alias is like modifying a function local variable. " +
          "Consider using an array of objects and use v-model on an object property instead.",
          el.rawAttrsMap['v-model']
        );
      }
      // 遍历父AST继续查找
      _el = _el.parent;
    }
  }

  /*  */

  /**
   * 转换v-model
   * @param {*} el 
   * @param {*} options 
   * @returns 
   */
  function preTransformNode (el, options) {
    if (el.tag === 'input') {
      var map = el.attrsMap;
      if (!map['v-model']) {
        return
      }

      var typeBinding;
      if (map[':type'] || map['v-bind:type']) {
        typeBinding = getBindingAttr(el, 'type');
      }
      if (!map.type && !typeBinding && map['v-bind']) {
        typeBinding = "(" + (map['v-bind']) + ").type";
      }

      if (typeBinding) {
        var ifCondition = getAndRemoveAttr(el, 'v-if', true);
        var ifConditionExtra = ifCondition ? ("&&(" + ifCondition + ")") : "";
        var hasElse = getAndRemoveAttr(el, 'v-else', true) != null;
        var elseIfCondition = getAndRemoveAttr(el, 'v-else-if', true);
        // 1. checkbox
        var branch0 = cloneASTElement(el);
        // process for on the main node
        processFor(branch0);
        addRawAttr(branch0, 'type', 'checkbox');
        processElement(branch0, options);
        branch0.processed = true; // prevent it from double-processed
        branch0.if = "(" + typeBinding + ")==='checkbox'" + ifConditionExtra;
        addIfCondition(branch0, {
          exp: branch0.if,
          block: branch0
        });
        // 2. add radio else-if condition
        var branch1 = cloneASTElement(el);
        getAndRemoveAttr(branch1, 'v-for', true);
        addRawAttr(branch1, 'type', 'radio');
        processElement(branch1, options);
        addIfCondition(branch0, {
          exp: "(" + typeBinding + ")==='radio'" + ifConditionExtra,
          block: branch1
        });
        // 3. other
        var branch2 = cloneASTElement(el);
        getAndRemoveAttr(branch2, 'v-for', true);
        addRawAttr(branch2, ':type', typeBinding);
        processElement(branch2, options);
        addIfCondition(branch0, {
          exp: ifCondition,
          block: branch2
        });

        if (hasElse) {
          branch0.else = true;
        } else if (elseIfCondition) {
          branch0.elseif = elseIfCondition;
        }

        return branch0
      }
    }
  }

  function cloneASTElement (el) {
    return createASTElement(el.tag, el.attrsList.slice(), el.parent)
  }

  var model$1 = {
    preTransformNode: preTransformNode
  };

  /**
   * Web平台的modules： class style model
   */
  var modules$1 = [
    klass$1,
    style$1,
    model$1
  ];

  /*  */

  function text (el, dir) {
    if (dir.value) {
      addProp(el, 'textContent', ("_s(" + (dir.value) + ")"), dir);
    }
  }

  /*  */

  function html (el, dir) {
    if (dir.value) {
      addProp(el, 'innerHTML', ("_s(" + (dir.value) + ")"), dir);
    }
  }

  /**
   * Web平台相关指令
   *  v-model
   *  v-html
   *  v-on
   */
  var directives$1 = {
    model: model,
    text: text,
    html: html
  };

  /*  */

  /**
   * Web平台编译默认配置 parse生成AST时使用
   */
  var baseOptions = {
    expectHTML: true,
    modules: modules$1,
    directives: directives$1,
    isPreTag: isPreTag,
    isUnaryTag: isUnaryTag,
    mustUseProp: mustUseProp,
    canBeLeftOpenTag: canBeLeftOpenTag,
    isReservedTag: isReservedTag,
    getTagNamespace: getTagNamespace,
    staticKeys: genStaticKeys(modules$1)
  };

  /*  */

  var isStaticKey;
  var isPlatformReservedTag;

  var genStaticKeysCached = cached(genStaticKeys$1);

  /**
   * Goal of the optimizer: walk the generated template AST tree
   * and detect sub-trees that are purely static, i.e. parts of
   * the DOM that never needs to change.
   *
   * Once we detect these sub-trees, we can:
   *
   * 1. Hoist them into constants, so that we no longer need to
   *    create fresh nodes for them on each re-render;
   * 2. Completely skip them in the patching process.
   * 
   * 优化AST树，将其中不会变化的子AST元素标记为static静态的
   * 目的：
   *  1. 提升它们为常量，无需在每次渲染时候重新创建新Node节点
   *  2. 跳过它们patch过程
   * 
   * 因为Vue是数据驱动，是响应式的，但是我们的模板并不是所有数据都是响应式的，
   * 也有很多数据是⾸次渲染后就永远不会变化的，那么这部分数据⽣成的DOM也不会
   * 变化，我们可以在patch的过程跳过对他们的⽐对
   * 
   * optimize要做的就是深度遍历这个AST 树，去检测它的每⼀颗⼦树是不是静态节点，
   * 如果是静态节点则它们⽣成DOM永远不需要改变，这对运⾏时对模板的更新起到极⼤的
   * 优化作⽤
   */
  function optimize (root, options) {
    if (!root) { return }
    // 函数 是否是静态key 
    isStaticKey = genStaticKeysCached(options.staticKeys || '');
    // 函数 是否是平台内置的标签
    isPlatformReservedTag = options.isReservedTag || no;
    // 每个节点都添加static标记 为生成staticRoot做处理
    // first pass: mark all non-static nodes.
    markStatic$1(root);
    // second pass: mark static roots.
    // 每个普通元素节点标记staticRoot，此标识才是之后生成代码过程中，进行判断的依据
    markStaticRoots(root, false);
  }

  /**
   * 生成静态缓存优化要用到的AST元素属性Map
   * @param {*} keys 
   * @returns 
   */
  function genStaticKeys$1 (keys) {
    return makeMap(
      'type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap' +
      (keys ? ',' + keys : '')
    )
  }

  /**
   * 标记静态节点
   *  1. 通过递归的方式，给每一个AST元素添加是否是静态节点static标记
   *  为生成staticRoot标识提供依据
   * @param {*} node 
   * @returns 
   */
  function markStatic$1 (node) {
    // 标记是否是静态AST节点
    node.static = isStatic(node);
    if (node.type === 1) { // 普通元素AST 标记子AST节点
      // do not make component slot content static. this avoids
      // 1. components not able to mutate slot nodes
      // 2. static slot content fails for hot-reloading
      // 不能标记一个组件的插槽子节点是静态的 可避免问题：
      // 1. 组件不能修改插槽节点
      // 2. 静态插槽内容热加载失败
      if (
        !isPlatformReservedTag(node.tag) &&
        node.tag !== 'slot' &&
        node.attrsMap['inline-template'] == null
      ) {
        return
      }

      /**
       * 遍历AST节点的子AST节点，递归执行markStatic，标记静态节点
       * 在递归过程中，⼀旦⼦节点有不是static的情况，则它的⽗节点的static均变成false
       * 而非静态节点的兄弟节点，标记还可能是静态的
       */
      for (var i = 0, l = node.children.length; i < l; i++) {
        var child = node.children[i];
        markStatic$1(child);
        if (!child.static) {
          // 子节点非静态的，父节点也标记成非静态 子节点的兄弟节点可能还是静态的
          node.static = false;
        }
      }

      if (node.ifConditions) {
        /**
         * 因为所有的elseif和else节点都不在children中，如果节点的ifConditions不为空，
         * 则遍历ifConditions拿到所有条件中的block，也就是它们对应的AST节点，递归执
         * ⾏markStatic，标记静态节点 
         */
        for (var i$1 = 1, l$1 = node.ifConditions.length; i$1 < l$1; i$1++) {
          var block = node.ifConditions[i$1].block;
          markStatic$1(block);
          if (!block.static) {
            // 子节点非静态的，父节点也标记成非静态 子节点的兄弟节点可能还是静态的
            node.static = false;
          }
        }
      }
    }
  }

  /**
   * 标记静态根
   *  1. 通过递归的方式，给每一个AST普通元素(type为1)添加是否是静态根节点staticRoot标记
   *  一旦标记为静态根节点，之后代码生成阶段会走不一样的逻辑
   *  此标识才是之后生成代码过程中，进行判断的依据
   * @param {*} node 
   * @param {*} isInFor 
   * @returns 
   */
  function markStaticRoots (node, isInFor) {
    if (node.type === 1) { // 普通元素AST 
      if (node.static || node.once) {
        // 静态节点 或 v-once指令的节点
        // 扩展staticInFor标记 标识是否是v-for生成的静态节点
        node.staticInFor = isInFor;
      }
      // For a node to qualify as a static root, it should have children that
      // are not just static text. Otherwise the cost of hoisting out will
      // outweigh the benefits and it's better off to just always render it fresh.
      if (node.static && node.children.length && !(
        node.children.length === 1 &&
        node.children[0].type === 3
      )) {
        /**
         * 静态根节点需满足
         *  1. 是静态节点
         *  2. 拥有子节点
         *  3. 子节点不能只是一个纯文本节点
         *  如果子节点是纯文本节点，标记成静态根节点，它的成本是大于收益的
         */
        node.staticRoot = true;
        // 将节点置为静态根节点后，结束执行
        return
      } else {
        node.staticRoot = false;
      }

      // 非静态根节点 递归遍历子节点，执行markStaticRoots，标记根静态节点
      if (node.children) {
        for (var i = 0, l = node.children.length; i < l; i++) {
          markStaticRoots(node.children[i], isInFor || !!node.for);
        }
      }

      // 非静态根节点 递归遍历ifConditions，执行markStaticRoots，标记根静态节点
      if (node.ifConditions) {
        for (var i$1 = 1, l$1 = node.ifConditions.length; i$1 < l$1; i$1++) {
          markStaticRoots(node.ifConditions[i$1].block, isInFor);
        }
      }
    }
  }

  /**
   * 是否是静态AST元素节点
   *  1. 表达式AST元素    非静态节点
   *  2. 纯文本AST元素     静态节点
   *  3. 普通AST元素
   *    静态节点的条件：
   *      1. 有pre属性 即使用了v-pre属性
   *    或同时满足
   *      1. 未绑定动态属性 hasBindings !== true
   *      2. 没有v-if 没有v-for
   *      4. 非内置组件标签 slot component
   *      5. 是平台内置的标签，也就是说不是组件的标签
   *      6. 非带有v-for的template标签的直接⼦节点
   *      7. AST节点的所有属性key都是静态属性key Object.keys(node).every(isStaticKey)
   * @param {*} node 
   * @returns 
   */
  function isStatic (node) {
    if (node.type === 2) { // expression
      return false
    }
    if (node.type === 3) { // text
      return true
    }
    return !!(node.pre || (
      !node.hasBindings && // no dynamic bindings
      !node.if && !node.for && // not v-if or v-for or v-else
      !isBuiltInTag(node.tag) && // not a built-in
      isPlatformReservedTag(node.tag) && // not a component
      !isDirectChildOfTemplateFor(node) &&
      Object.keys(node).every(isStaticKey)
    ))
  }

  /**
   * 是否是带有v-for的template标签的直接⼦节点
   * @param {*} node 
   * @returns 
   */
  function isDirectChildOfTemplateFor (node) {
    while (node.parent) {
      node = node.parent;
      if (node.tag !== 'template') {
        return false
      }
      if (node.for) {
        return true
      }
    }
    return false
  }

  /*  */

  /**
   * 匹配箭头或声明函数开头格式
   * 匹配箭头函数格式 如 hello => | (hello, world) =>
   *  1. ^([\w$_]+|\([^)]*?\))\s*=> 捕获(xxx)开头的元数据 xxx匹配两种情况：
   *    1) [\w$_]+ 匹配开头是字母、数字或下划线
   *    2) \([^)]*?\) 匹配开头是小括号、结尾小括号，中间是非 ) 的任意字符串
   *  2. \s*=> 匹配零或任意多个空格 加 箭头 =>
   * 匹配function函数格式 如 function hello ( | function (
   *  1. ^function 匹配 function开头
   *  2. (?:\s+[\w$]+)? 不捕获此元数据 匹配一个或多个空格加字母数字下划线结尾字符串，当作函数名 匹配零次或一次函数名
   *  3. \s*\( 匹配零或任意多个空格 加 (
   */
  var fnExpRE = /^([\w$_]+|\([^)]*?\))\s*=>|^function(?:\s+[\w$]+)?\s*\(/;
  /**
   * 匹配执行函数的括号内容结尾的字符串
   *  - 即匹配以下形式结尾的字符串
   *  - ( 开头 并 ) 结尾，中间是除了 ) 以外任何内容，最后匹配零次或多次分号
   *  - 如 callFn(hello, world); 匹配 '(hello, world);'
   */
  var fnInvokeRE = /\([^)]*?\);*$/;
  /**
   * 匹配访问属性的格式
   *  - 格式如 hello hello.world hello['world'] hello["world"] hello[0] hello[world]
   *  1. ^[A-Za-z_$][\w$]* 匹配字母或下划线开头的字符串
   *  2. (?:xxx)*$ 不捕获元数据xxx 匹配允许xxx出现零或多次的字符串 以此格式结尾
   *  - xxx匹配5种情况：
   *    1) \.[A-Za-z_$][\w$]* 匹配点开头(.)作为连接符，加字母或下划线开头的字符串
   *    2) \['[^']*?'] 匹配中括号开始结束中间是单引号包裹的字符串
   *    3) \["[^"]*?"] 匹配中括号开始结束中间是双引号包裹的字符串
   *    4) \[\d+] 匹配中括号开始结束中间是数字
   *    5) \[[A-Za-z_$][\w$]*] 匹配中括号开始和结束中间是字母或下划线开头的字符串
   */
  var simplePathRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/;

  /**
   * KeyboardEvent.keyCode aliases
   * 键盘码别名
   */
  var keyCodes = {
    esc: 27,
    tab: 9,
    enter: 13,
    space: 32,
    up: 38,
    left: 37,
    right: 39,
    down: 40,
    'delete': [8, 46]
  };

  /**
   * KeyboardEvent.key aliases
   * 键盘键名别名
   */
  var keyNames = {
    // #7880: IE11 and Edge use `Esc` for Escape key name.
    esc: ['Esc', 'Escape'],
    tab: 'Tab',
    enter: 'Enter',
    // #9112: IE11 uses `Spacebar` for Space key name.
    space: [' ', 'Spacebar'],
    // #7806: IE11 uses key names without `Arrow` prefix for arrow keys.
    up: ['Up', 'ArrowUp'],
    left: ['Left', 'ArrowLeft'],
    right: ['Right', 'ArrowRight'],
    down: ['Down', 'ArrowDown'],
    // #9112: IE11 uses `Del` for Delete key name.
    'delete': ['Backspace', 'Delete', 'Del']
  };

  // #4868: modifiers that prevent the execution of the listener
  // need to explicitly return null so that we can determine whether to remove
  // the listener for .once
  var genGuard = function (condition) { return ("if(" + condition + ")return null;"); }; // 根据条件生成if判断

  /**
   * 修饰符对应的code Map
   */
  var modifierCode = {
    stop: '$event.stopPropagation();',
    prevent: '$event.preventDefault();',
    self: genGuard("$event.target !== $event.currentTarget"),
    ctrl: genGuard("!$event.ctrlKey"),
    shift: genGuard("!$event.shiftKey"),
    alt: genGuard("!$event.altKey"),
    meta: genGuard("!$event.metaKey"),
    left: genGuard("'button' in $event && $event.button !== 0"),
    middle: genGuard("'button' in $event && $event.button !== 1"),
    right: genGuard("'button' in $event && $event.button !== 2")
  };

  /**
   * 生成事件的处理code
   * @param {*} events 
   * @param {*} isNative 是否是native修饰符的事件 组件上原生DOM事件加native 自定义事件不加native
   * @returns 
   */
  function genHandlers (
    events,
    isNative
  ) {
    var prefix = isNative ? 'nativeOn:' : 'on:';
    var staticHandlers = "";
    var dynamicHandlers = "";
    for (var name in events) {
      // 生成事件处理函数
      var handlerCode = genHandler(events[name]);
      if (events[name] && events[name].dynamic) {
        // 动态事件字符串 name会作为一个变量
        dynamicHandlers += name + "," + handlerCode + ",";
      } else {
        // 静态事件字符串 name会作为一个字符串
        staticHandlers += "\"" + name + "\":" + handlerCode + ",";
      }
    }

    // 去掉最后的逗号，加上大括号
    staticHandlers = "{" + (staticHandlers.slice(0, -1)) + "}";
    if (dynamicHandlers) {
      // _d()包裹动态事件
      return prefix + "_d(" + staticHandlers + ",[" + (dynamicHandlers.slice(0, -1)) + "])"
    } else {
      // 静态事件 on|nativeOn: { click: [ function1, funciton2 ], change: function3 }
      return prefix + staticHandlers
    }
  }

  /**
   * 根据事件handler生成一个事件处理函数字符串
   * @param {*} handler 
   * @returns 
   */
  function genHandler (handler) {
    if (!handler) {
      // 没有handler
      return 'function(){}'
    }

    if (Array.isArray(handler)) {
      // handler数组格式，递归再执行genHandler
      // 返回数组拼接格式的function字符串
      return ("[" + (handler.map(function (handler) { return genHandler(handler); }).join(',')) + "]")
    }

    // 以下是正则匹配用户传入的方法是哪种格式 支持三种：
    // 1. 访问属性名作方法名 hello | hello.world
    var isMethodPath = simplePathRE.test(handler.value);
    // 2. 函数表达式 () => | function hello ()
    var isFunctionExpression = fnExpRE.test(handler.value);
    // 3. 内联处理器中的方法 去掉结尾括号部分 访问属性名做方法名 hello() | hello.world()
    var isFunctionInvocation = simplePathRE.test(handler.value.replace(fnInvokeRE, ''));

    if (!handler.modifiers) { // 没有还未处理的修饰符
      if (isMethodPath || isFunctionExpression) {
        // 是方法名 或 函数表达式
        return handler.value
      }
      // 内联处理器中的方法 
      // 将事件value包括一层function，并传入$event，这也是为什么模板中能直接使用$event
      return ("function($event){" + (isFunctionInvocation ? ("return " + (handler.value)) : handler.value) + "}") // inline statement
    } else { // 还有未处理修饰符
      var code = ''; // 修饰符生成的code
      var genModifierCode = '';
      var keys = []; // 键盘码修饰符
      for (var key in handler.modifiers) {
        if (modifierCode[key]) {
          // 生成修饰符对应的code
          genModifierCode += modifierCode[key];
          // left/right
          if (keyCodes[key]) {
            keys.push(key); // 键盘码修饰符
          }
        } else if (key === 'exact') { // exact修饰符
          var modifiers = (handler.modifiers);
          // 生成 if ($event.ctrlKey || $event.shiftKey || ...) return null
          genModifierCode += genGuard(
            ['ctrl', 'shift', 'alt', 'meta']
              .filter(function (keyModifier) { return !modifiers[keyModifier]; })
              .map(function (keyModifier) { return ("$event." + keyModifier + "Key"); })
              .join('||')
          );
        } else {
          keys.push(key); // 键盘码修饰符
        }
      }
      if (keys.length) {
        // 过滤键盘码修饰符
        code += genKeyFilter(keys);
      }
      // Make sure modifiers like prevent and stop get executed after key filtering
      if (genModifierCode) {
        // 键盘修饰符后 添加 其它修饰符 保证其它修饰符在键盘修饰符后执行
        code += genModifierCode;
      }

      // 生成事件执行code
      var handlerCode = isMethodPath
        // return hello.apply(null, arguments) 
        ? ("return " + (handler.value) + ".apply(null, arguments)")
        : isFunctionExpression
          // return (() => hello()).apply(null, arguments)
          ? ("return (" + (handler.value) + ").apply(null, arguments)")
          : isFunctionInvocation
            // return hello()
            ? ("return " + (handler.value))
            : handler.value;

      // 返回function包裹，传入$event，函数体种是 修饰符处理code + 事件执行code
      return ("function($event){" + code + handlerCode + "}")
    }
  }

  /**
   * 生成过滤掉无法使用的键盘码修饰符code
   * @param {*} keys 
   * @returns 
   */
  function genKeyFilter (keys) {
    // 返回if判断
    // if(!$event.type.indexOf('key') &&
    //   _k($event.keyCode, key, keyCode, $event.key, keyName) &&
    //   _k($event.keyCode, key, keyCode, $event.key, keyName) && ...) return null 
    return (
      // make sure the key filters only apply to KeyboardEvents
      // #9441: can't use 'keyCode' in $event because Chrome autofill fires fake
      // key events that do not have keyCode property...
      "if(!$event.type.indexOf('key')&&" +
      (keys.map(genFilterCode).join('&&')) + ")return null;"
    )
  }

  /**
   * 生成过滤键盘码的code
   * @param {*} key 
   * @returns 
   */
  function genFilterCode (key) {
    var keyVal = parseInt(key, 10);
    if (keyVal) {
      return ("$event.keyCode!==" + keyVal)
    }
    var keyCode = keyCodes[key]; // 修饰符对应的键盘码
    var keyName = keyNames[key]; // 修饰符对应的键盘按键名
    // 返回 _k($event.keyCode, key, keyCode, $event.key, keyName)
    return (
      "_k($event.keyCode," +
      (JSON.stringify(key)) + "," +
      (JSON.stringify(keyCode)) + "," +
      "$event.key," +
      "" + (JSON.stringify(keyName)) +
      ")"
    )
  }

  /*  */

  function on (el, dir) {
    if (dir.modifiers) {
      warn("v-on without argument does not support modifiers.");
    }
    el.wrapListeners = function (code) { return ("_g(" + code + "," + (dir.value) + ")"); };
  }

  /*  */

  function bind$1 (el, dir) {
    el.wrapData = function (code) {
      return ("_b(" + code + ",'" + (el.tag) + "'," + (dir.value) + "," + (dir.modifiers && dir.modifiers.prop ? 'true' : 'false') + (dir.modifiers && dir.modifiers.sync ? ',true' : '') + ")")
    };
  }

  /*  */

  /**
   * Vue所有平台的基本指令
   *  v-on
   *  v-bind
   *  v-cloak
   */
  var baseDirectives = {
    on: on,
    bind: bind$1,
    cloak: noop
  };

  /*  */





  // 编译过程需要的用的属性和方法
  var CodegenState = function CodegenState (options) {
    this.options = options;
    this.warn = options.warn || baseWarn;
    this.transforms = pluckModuleFunction(options.modules, 'transformCode');
    this.dataGenFns = pluckModuleFunction(options.modules, 'genData'); // web下 style、class获取genData
    // baseDirectives v-on v-bind v-cloak web下的特定指令 v-model v-html v-text
    this.directives = extend(extend({}, baseDirectives), options.directives); 
    var isReservedTag = options.isReservedTag || no;
    this.maybeComponent = function (el) { return !!el.component || !isReservedTag(el.tag); };
    this.onceId = 0;
    this.staticRenderFns = [];
    this.pre = false;
  };



  /**
   * 整个code的生成过程，是递归遍历AST树的过程，对于每一个AST节点，实际上都是一个genNode
   * 的调用。在每个节点中，它实际上在创建它本身和它的子节点code之前，可能会对v-for、v-if
   * 等做一些额外的处理，最终形成我们所需要的代码code
   * 
   * 整个codegen过程是深度遍历AST根据不同条件生成不同代码的过程，我们可以根据具体的case，
   * 走完一条主线即可。通过不同case的学习，不断强化编译过程，而不必纠结于它整体的实现。
   */
  /**
   * 将AST树转换成code字符串
   * @param {*} ast 
   * @param {*} options 
   * @returns 
   */
  function generate (
    ast,
    options
  ) {
    // 编译阶段需要的辅助属性和方法
    var state = new CodegenState(options);
    // fix #11483, Root level <script> tags should not be rendered.
    var code = ast ? (ast.tag === 'script' ? 'null' : genElement(ast, state)) : '_c("div")';
    return {
      render: ("with(this){return " + code + "}"), // 使用with语句包裹code
      staticRenderFns: state.staticRenderFns // 标记为静态根的节点渲染函数
    }
  }

  /**
   * 判断当前AST元素节点的属性执行不同的代码生成函数
   * @param {*} el 
   * @param {*} state 
   * @returns 
   */
  function genElement (el, state) {
    if (el.parent) {
      el.pre = el.pre || el.parent.pre;
    }

    if (el.staticRoot && !el.staticProcessed) {
      // 静态根
      return genStatic(el, state)
    } else if (el.once && !el.onceProcessed) {
      // v-once
      return genOnce(el, state)
    } else if (el.for && !el.forProcessed) {
      // v-for
      return genFor(el, state)
    } else if (el.if && !el.ifProcessed) {
      // v-if 第一次调用时，el.ifProcessed为false
      // genIf再调用genElement，非第一次执行都会走到 else {} 逻辑
      return genIf(el, state)
    } else if (el.tag === 'template' && !el.slotTarget && !state.pre) {
      // template 且 非slot 且 非pre
      return genChildren(el, state) || 'void 0'
    } else if (el.tag === 'slot') {
      // v-slot
      return genSlot(el, state)
    } else {
      // component or element
      // staticRoot、v-once、v-for、v-if 非首次执行 也会命中此逻辑
      var code;
      if (el.component) {
        // 组件标签
        code = genComponent(el.component, el, state);
      } else {
        // 元素标签
        var data;
        if (!el.plain || (el.pre && state.maybeComponent(el))) {
          // 非普通节点元素 或 是v-pre元素且可能是组件元素
          // 生成data
          data = genData$2(el, state);
        }
        // 非内联模板，生成AST子元素code
        var children = el.inlineTemplate ? null : genChildren(el, state, true);

        // 生成code _c(tag, data?, children?)
        // `_c('${el.tag}' ${data ? `, ${data}` : ''} ${ children ? `,${children}` : ''})`
        code = "_c('" + (el.tag) + "'" + (data ? ("," + data) : '') + (children ? ("," + children) : '') + ")";
      }
      // module transforms
      for (var i = 0; i < state.transforms.length; i++) {
        code = state.transforms[i](el, code);
      }
      return code
    }
  }

  // hoist static sub-trees out
  function genStatic (el, state) {
    el.staticProcessed = true;
    // Some elements (templates) need to behave differently inside of a v-pre
    // node.  All pre nodes are static roots, so we can use this as a location to
    // wrap a state change and reset it upon exiting the pre node.
    var originalPreState = state.pre;
    if (el.pre) {
      state.pre = el.pre;
    }
    state.staticRenderFns.push(("with(this){return " + (genElement(el, state)) + "}"));
    state.pre = originalPreState;
    return ("_m(" + (state.staticRenderFns.length - 1) + (el.staticInFor ? ',true' : '') + ")")
  }

  // v-once
  function genOnce (el, state) {
    el.onceProcessed = true;
    if (el.if && !el.ifProcessed) {
      return genIf(el, state)
    } else if (el.staticInFor) {
      var key = '';
      var parent = el.parent;
      while (parent) {
        if (parent.for) {
          key = parent.key;
          break
        }
        parent = parent.parent;
      }
      if (!key) {
        state.warn(
          "v-once can only be used inside v-for that is keyed. ",
          el.rawAttrsMap['v-once']
        );
        return genElement(el, state)
      }
      return ("_o(" + (genElement(el, state)) + "," + (state.onceId++) + "," + key + ")")
    } else {
      return genStatic(el, state)
    }
  }

  /**
   * 调用genIfConditions生成v-if的代码字符串
   *  对genIfConditions做封装，添加ifProcessed状态
   * @param {*} el 
   * @param {*} state 
   * @param {*} altGen 
   * @param {*} altEmpty 
   * @returns 
   */
  function genIf (
    el,
    state,
    altGen,
    altEmpty
  ) {
    // 同一个AST元素，避免递归调用genIf
    el.ifProcessed = true; // avoid recursion
    return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty)
  }

  /**
   * 使用AST元素的ifConditions生成代码字符串
   *  生成三元运算符code
   * @param {*} conditions 
   * @param {*} state 
   * @param {*} altGen slot处理时为genScopedSlot函数
   * @param {*} altEmpty 
   * @returns 
   */
  function genIfConditions (
    conditions,
    state,
    altGen,
    altEmpty
  ) {
    if (!conditions.length) {
      /**
       * ifConditions为空 返回altEmpty 或 创建空节点代码
       * 命中条件 ifConditions中没有v-else
       *  如：conditions = [v-if]，第二次调用genIfConditions
       *  如：conditions = [v-if, v-else-if]，最后一次调用genIfConditions
       */
      return altEmpty || '_e()'
    }

    var condition = conditions.shift();
    if (condition.exp) {
      // v-if 或 v-else-if
      return ("(" + (condition.exp) + ")?" + (genTernaryExp(condition.block)) + ":" + (genIfConditions(conditions, state, altGen, altEmpty)))
    } else {
      // v-else
      return ("" + (genTernaryExp(condition.block)))
    }

    // v-if with v-once should generate code like (a)?_m(0):_m(1)
    // 生成三元表达式code
    function genTernaryExp (el) {
      return altGen
        ? altGen(el, state)
        : el.once
          ? genOnce(el, state)
          // altGen不为真，且非v-once
          : genElement(el, state)
    }
  }

  /**
   * 生成v-for的code
   * @param {*} el 
   * @param {*} state 
   * @param {*} altGen 
   * @param {*} altHelper 
   * @returns 
   */
  function genFor (
    el,
    state,
    altGen,
    altHelper
  ) {
    var exp = el.for;
    var alias = el.alias;
    var iterator1 = el.iterator1 ? ("," + (el.iterator1)) : '';
    var iterator2 = el.iterator2 ? ("," + (el.iterator2)) : '';

    if (state.maybeComponent(el) &&
      el.tag !== 'slot' &&
      el.tag !== 'template' &&
      !el.key
    ) {
      // 是组件 且 非slot 且 非template 且 没有key
      // v-for没有设置key警告
      state.warn(
        "<" + (el.tag) + " v-for=\"" + alias + " in " + exp + "\">: component lists rendered with " +
        "v-for should have explicit keys. " +
        "See https://vuejs.org/guide/list.html#key for more info.",
        el.rawAttrsMap['v-for'],
        true /* tip */
      );
    }

    // AST元素中v-for已处理标识
    el.forProcessed = true; // avoid recursion

    /**
     * (item, key, index) in list  => 
     * { for: list, alias: item, iterator1: key, iterator2: index } 
     * 生成：
     *  _l(list, function (item, key, index) {
     *    return genElement(el, state)
     *  })
     * 执行回调函数会再次调用genElement
     */
    return (altHelper || '_l') + "((" + exp + ")," +
      "function(" + alias + iterator1 + iterator2 + "){" +
        "return " + ((altGen || genElement)(el, state)) +
      '})'
  }

  /**
   * 根据AST元素，生成编译code的data
   *  data是一个JSON字符串，根据不同场景，会有不同的属性
   * @param {*} el 
   * @param {*} state 
   * @returns 
   */
  function genData$2 (el, state) {
    var data = '{';

    // directives first.
    // directives may mutate the el's other properties before they are generated.
    // 优先调用，因为可能会修改AST元素的其它属性
    var dirs = genDirectives(el, state);
    if (dirs) { data += dirs + ','; } // 拼接指令code

    // key
    if (el.key) {
      data += "key:" + (el.key) + ",";
    }
    // ref
    if (el.ref) {
      data += "ref:" + (el.ref) + ",";
    }
    if (el.refInFor) {
      data += "refInFor:true,";
    }
    // pre
    if (el.pre) {
      data += "pre:true,";
    }
    // record original tag name for components using "is" attribute
    if (el.component) {
      data += "tag:\"" + (el.tag) + "\",";
    }
    // module data generation functions
    // Web下 执行style.genData class.genData
    for (var i = 0; i < state.dataGenFns.length; i++) {
      data += state.dataGenFns[i](el);
    }
    // attributes
    if (el.attrs) {
      data += "attrs:" + (genProps(el.attrs)) + ",";
    }
    // DOM props input、select会生成props
    if (el.props) {
      data += "domProps:" + (genProps(el.props)) + ",";
    }
    // 事件处理
    // event handlers
    if (el.events) {
      // 生成事件处理函数
      data += (genHandlers(el.events, false)) + ",";
    }
    // 原生事件处理
    if (el.nativeEvents) {
      // 生成事件处理函数
      data += (genHandlers(el.nativeEvents, true)) + ",";
    }
    // slot target
    // only for non-scoped slots
    // 只有旧的slot="xxx"语法会走到这里，新v-slot语法，如果没有插槽prop，el.slotScope会赋值为__empty__
    if (el.slotTarget && !el.slotScope) {
      // 元素是具名插槽 且 非作用域插槽
      data += "slot:" + (el.slotTarget) + ",";
    }
    // scoped slots
    if (el.scopedSlots) {
      // 元素是插槽AST元素的父级 生成插槽元素的code
      data += (genScopedSlots(el, el.scopedSlots, state)) + ",";
    }

    // component v-model
    // 处理组件v-model
    if (el.model) {
      data += "model:{value:" + (el.model.value) + ",callback:" + (el.model.callback) + ",expression:" + (el.model.expression) + "},";
    }
    // inline-template
    if (el.inlineTemplate) {
      var inlineTemplate = genInlineTemplate(el, state);
      if (inlineTemplate) {
        data += inlineTemplate + ",";
      }
    }
    // 去掉结尾的逗号，并添加结尾大括号
    data = data.replace(/,$/, '') + '}';
    // v-bind dynamic argument wrap
    // v-bind with dynamic arguments must be applied using the same v-bind object
    // merge helper so that class/style/mustUseProp attrs are handled correctly.
    if (el.dynamicAttrs) {
      data = "_b(" + data + ",\"" + (el.tag) + "\"," + (genProps(el.dynamicAttrs)) + ")";
    }
    // v-bind data wrap
    if (el.wrapData) {
      data = el.wrapData(data);
    }
    // v-on data wrap
    if (el.wrapListeners) {
      data = el.wrapListeners(data);
    }
    return data
  }

  /**
   * 根据AST元素，生成指令code
   * @param {*} el 
   * @param {*} state 
   * @returns 
   */
  function genDirectives (el, state) {
    var dirs = el.directives;
    if (!dirs) { return }
    var res = 'directives:[';
    var hasRuntime = false;
    /**
     * dir 当前遍历到的指令
     * needRuntime
     */
    var i, l, dir, needRuntime;
    for (i = 0, l = dirs.length; i < l; i++) {
      dir = dirs[i];
      needRuntime = true;
      // 获取指令对应的handler 如 v-model => state.directives[model]
      var gen = state.directives[dir.name];
      if (gen) {
        // compile-time directive that manipulates AST.
        // returns true if it also needs a runtime counterpart.
        // 执行指令的handler  v-model 就是 model()
        needRuntime = !!gen(el, dir, state.warn);
      }
      if (needRuntime) {
        hasRuntime = true;
        /**
         * 生成运行时需要的代码code
         * {
         *  name: dir.name,
         *  rawName: dir.rawName,
         *  value?: dir.value,
         *  expression?: JSON.stringify(dir.value),
         *  arg?: dir.arg | `"${dir.arg}"`,
         *  modifiers?: ${JSON.stringify(dir.modifiers)}`
         * }
         * 如 v-model生成: 
         * `{name:"model",rawName:"v-model",value:(message),expression:"message"}`
         * 
         */ 
        res += "{name:\"" + (dir.name) + "\",rawName:\"" + (dir.rawName) + "\"" + (dir.value ? (",value:(" + (dir.value) + "),expression:" + (JSON.stringify(dir.value))) : '') + (dir.arg ? (",arg:" + (dir.isDynamicArg ? dir.arg : ("\"" + (dir.arg) + "\""))) : '') + (dir.modifiers ? (",modifiers:" + (JSON.stringify(dir.modifiers))) : '') + "},";
      }
    }
    if (hasRuntime) {
      // 有运行时指令，返回
      return res.slice(0, -1) + ']'
    }
  }

  function genInlineTemplate (el, state) {
    var ast = el.children[0];
    if (el.children.length !== 1 || ast.type !== 1) {
      state.warn(
        'Inline-template components must have exactly one child element.',
        { start: el.start }
      );
    }
    if (ast && ast.type === 1) {
      var inlineRenderFns = generate(ast, state.options);
      return ("inlineTemplate:{render:function(){" + (inlineRenderFns.render) + "},staticRenderFns:[" + (inlineRenderFns.staticRenderFns.map(function (code) { return ("function(){" + code + "}"); }).join(',')) + "]}")
    }
  }

  /**
   * 生成父AST的scopedSlots插槽AST元素的code
   * @param {*} el 插槽AST元素的父级AST元素
   * @param {*} slots 插槽AST元素对象
   * @param {*} state 
   * @returns 
   */
  function genScopedSlots (
    el,
    slots,
    state
  ) {
    // by default scoped slots are considered "stable", this allows child
    // components with only scoped slots to skip forced updates from parent.
    // but in some cases we have to bail-out of this optimization
    // for example if the slot contains dynamic names, has v-if or v-for on them...
    /**
     * 是否要强制更新
     *  父AST元素有v-for 或
     *  插槽元素中有元素是：动态插槽名、或有v-if、或有v-for、或有<slot>标签
     */
    var needsForceUpdate = el.for || Object.keys(slots).some(function (key) {
      var slot = slots[key];
      return (
        slot.slotTargetDynamic ||
        slot.if ||
        slot.for ||
        containsSlotChild(slot) // is passing down slot from parent which may be dynamic
      )
    });

    // #9534: if a component with scoped slots is inside a conditional branch,
    // it's possible for the same component to be reused but with different
    // compiled slot content. To avoid that, we generate a unique key based on
    // the generated code of all the slot contents.
    // 如果一个插槽组件在if条件分支中，则可能重复使用相同的组件但具有不同编译的插槽内容。
    // 为避免这种情况，我们基于所有插槽内容生成的code来生成唯一key
    var needsKey = !!el.if;

    // OR when it is inside another scoped slot or v-for (the reactivity may be
    // disconnected due to the intermediate scope variable)
    // #9438, #9506
    // TODO: this can be further optimized by properly analyzing in-scope bindings
    // and skip force updating ones that do not actually use scope variables.
    // 当插槽组件在另一个插槽中或在v-for中时，判断是否需要强制更新、是否需要key
    if (!needsForceUpdate) {
      var parent = el.parent;
      while (parent) {
        if (
          (parent.slotScope && parent.slotScope !== emptySlotScopeToken) ||
          parent.for
        ) {
          needsForceUpdate = true;
          break
        }
        if (parent.if) {
          needsKey = true;
        }
        parent = parent.parent;
      }
    }

    var generatedSlots = Object.keys(slots)
      .map(function (key) { return genScopedSlot(slots[key], state); })
      .join(',');

    // 返回code _u()函数包裹 _u: resolveScopedSlots
    return ("scopedSlots:_u([" + generatedSlots + "]" + (needsForceUpdate ? ",null,true" : "") + (!needsForceUpdate && needsKey ? (",null,false," + (hash(generatedSlots))) : "") + ")")
  }

  function hash(str) {
    var hash = 5381;
    var i = str.length;
    while(i) {
      hash = (hash * 33) ^ str.charCodeAt(--i);
    }
    return hash >>> 0
  }

  /**
   * 检测AST元素及子AST元素是否包含有slot标签的AST元素
   * @param {*} el 
   * @returns 
   */
  function containsSlotChild (el) {
    if (el.type === 1) {
      if (el.tag === 'slot') {
        return true
      }
      return el.children.some(containsSlotChild)
    }
    return false
  }

  /**
   * 生成插槽AST元素的code
   * @param {*} el 
   * @param {*} state 
   * @returns 
   */
  function genScopedSlot (
    el,
    state
  ) {
    // slot-scope 旧语法
    var isLegacySyntax = el.attrsMap['slot-scope'];

    if (el.if && !el.ifProcessed && !isLegacySyntax) {
      // 有v-if 调用genIf 传入genScopedSlot作为altGen
      return genIf(el, state, genScopedSlot, "null")
    }
    if (el.for && !el.forProcessed) {
      // 有v-for 调用genFor 传入genScopedSlot作为altGen
      return genFor(el, state, genScopedSlot)
    }

    // 插槽prop  没有作用域的插槽 '_empty_' 替换成 '' 有插槽作用域，取插槽字符串值
    var slotScope = el.slotScope === emptySlotScopeToken
      ? ""
      : String(el.slotScope);

    // 生成处理插槽AST的函数code 函数包裹，传入插槽prop，这样插槽中就能访问到作用域插槽中定义的属性prop
    var fn = "function(" + slotScope + "){" +
      "return " + (el.tag === 'template'
        ? el.if && isLegacySyntax
          // v-if 且 旧作用域插槽语法 添加一个三元运算符
          ? ("(" + (el.if) + ")?" + (genChildren(el, state) || 'undefined') + ":undefined")
          // 非v-if 或 新作用域插槽语法
          : genChildren(el, state) || 'undefined'
        // 非tempalte标签的AST
        : genElement(el, state)) + "}";

    // reverse proxy v-slot without scope on this.$slots
    // 添加代理标识proxy 没有插槽prop的插槽AST(具名插槽或默认插槽)会代理到this.$slots上
    var reverseProxy = slotScope ? "" : ",proxy:true"; // 没有插槽prop，添加proxy: true
    // 返回作用域插槽code { key: slotTarget, fn: function(${slotScope}) {...}, proxy?: true  }
    return ("{key:" + (el.slotTarget || "\"default\"") + ",fn:" + fn + reverseProxy + "}")
  }

  /**
   * 生成AST的children的code
   * @param {*} el 
   * @param {*} state 
   * @param {*} checkSkip 
   * @param {*} altGenElement 
   * @param {*} altGenNode 
   * @returns 
   */
  function genChildren (
    el,
    state,
    checkSkip,
    altGenElement,
    altGenNode
  ) {
    var children = el.children;
    if (children.length) {
      var el$1 = children[0];
      // optimize single v-for
      if (children.length === 1 &&
        el$1.for &&
        el$1.tag !== 'template' &&
        el$1.tag !== 'slot'
      ) {
        /**
         * 对v-fo的AST元素优化处理
         * AST满足
         *  只有一个子元素
         *  有v-for属性
         *  不是template标签
         *  不是slot标签
         */  
        var normalizationType = checkSkip
          ? state.maybeComponent(el$1) ? ",1" : ",0"
          : "";
        // 重新调用genElement方法 拼接 normalizationType 返回code
        return ("" + ((altGenElement || genElement)(el$1, state)) + normalizationType)
      }

      // 不满足上面v-for元素条件，创建子元素处理
      // 获取标准化类型
      var normalizationType$1 = checkSkip
        ? getNormalizationType(children, state.maybeComponent)
        : 0;
      var gen = altGenNode || genNode;
      // 创建子元素，返回code
      return ("[" + (children.map(function (c) { return gen(c, state); }).join(',')) + "]" + (normalizationType$1 ? ("," + normalizationType$1) : ''))
    }
  }

  // determine the normalization needed for the children array.
  // 0: no normalization needed
  // 1: simple normalization needed (possible 1-level deep nested array)
  // 2: full normalization needed
  /**
   * 获取对AST的children的标准化类型
   *  - 0 不需要标准化处理
   *  - 1 简单标准化处理
   *  - 2 完全标准化处理
   * 在createElement时用到，src/core/vdom/create-element.js
   * @param {*} children 
   * @param {*} maybeComponent 
   * @returns 
   */
  function getNormalizationType (
    children,
    maybeComponent
  ) {
    var res = 0;
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      if (el.type !== 1) {
        // 跳过表达式AST、文本AST
        continue
      }
      if (needsNormalization(el) ||
          (el.ifConditions && el.ifConditions.some(function (c) { return needsNormalization(c.block); }))) {
        // AST元素的需要标准化处理 或 AST元素的ifConditions中元素需要标准化处理
        res = 2;
        break
      }
      if (maybeComponent(el) ||
          (el.ifConditions && el.ifConditions.some(function (c) { return maybeComponent(c.block); }))) {
        // AST元素是组件 或 AST元素的ifConditions中元素是组件
        res = 1;
      }
    }
    return res
  }

  /**
   * 需要标准化处理
   * @param {*} el 
   * @returns 
   */
  function needsNormalization (el) {
    // AST元素 有v-for属性 或 是template标签元素 或 是slot标签元素
    return el.for !== undefined || el.tag === 'template' || el.tag === 'slot'
  }

  /**
   * 生成AST子元素AST的code
   *  生成code的过程，本质就是调用此函数的过程
   * @param {*} node 
   * @param {*} state 
   * @returns 
   */
  function genNode (node, state) {
    if (node.type === 1) {
      // 普通AST调用genElement
      return genElement(node, state)
    } else if (node.type === 3 && node.isComment) {
      // 纯文本AST元素 且 是注释AST元素 生成注释code
      return genComment(node)
    } else {
      // 表达式AST元素 或 非注释AST文本元素 生成文本code
      return genText(node)
    }
  }

  /**
   * 生成文本VNode
   * @param {*} text 
   * @returns 
   */
  function genText (text) {
    return ("_v(" + (text.type === 2
      // 表达式AST元素
      ? text.expression // no need for () because already wrapped in _s()
      // 文本VNode
      : transformSpecialNewlines(JSON.stringify(text.text))) + ")")
  }

  /**
   * 生成注释code
   * @param {*} comment 
   * @returns 
   */
  function genComment (comment) {
    return ("_e(" + (JSON.stringify(comment.text)) + ")")
  }

  /**
   * 生成插槽<slot>的code
   * @param {*} el 
   * @param {*} state 
   * @returns 
   */
  function genSlot (el, state) {
    var slotName = el.slotName || '"default"'; // 插槽名 默认default
    var children = genChildren(el, state); // 处理插槽节点的默认children内容 <slot>默认内容</slot>

    // 包裹_t()函数 拼接slotName和children参数
    // children是后备内容，即默认会显示的节点
    var res = "_t(" + slotName + (children ? (",function(){return " + children + "}") : '');

    // 拼接slot标签上的属性attrs参数 [{name, value, dynamic}, ...]
    var attrs = el.attrs || el.dynamicAttrs
      ? genProps((el.attrs || []).concat(el.dynamicAttrs || []).map(function (attr) { return ({
          // slot props are camelized
          name: camelize(attr.name), // 转驼峰
          value: attr.value,
          dynamic: attr.dynamic
        }); }))
      : null;
    
    // v-bind绑定对象属性 如 v-bind="bindObj"
    var bind$$1 = el.attrsMap['v-bind'];
    if ((attrs || bind$$1) && !children) {
      // 有属性 没有默认插槽内容
      res += ",null";
    }
    // 拼接attrs参数
    if (attrs) {
      res += "," + attrs;
    }
    if (bind$$1) {
      res += (attrs ? '' : ',null') + "," + bind$$1;
    }
    // _t(slotName, children, attrs, bind)
    return res + ')'
  }

  // componentName is el.component, take it as argument to shun flow's pessimistic refinement
  function genComponent (
    componentName,
    el,
    state
  ) {
    var children = el.inlineTemplate ? null : genChildren(el, state, true);
    return ("_c(" + componentName + "," + (genData$2(el, state)) + (children ? ("," + children) : '') + ")")
  }

  /**
   * 生成绑定属性el.attrs的code
   * @param {*} props 
   * @returns 
   */
  function genProps (props) {
    var staticProps = "";
    var dynamicProps = "";
    for (var i = 0; i < props.length; i++) {
      var prop = props[i];
      // 获取value
      var value = transformSpecialNewlines(prop.value);
      if (prop.dynamic) {
        // 动态属性
        dynamicProps += (prop.name) + "," + value + ",";
      } else {
        // 静态属性
        staticProps += "\"" + (prop.name) + "\":" + value + ",";
      }
    }

    staticProps = "{" + (staticProps.slice(0, -1)) + "}";
    if (dynamicProps) {
      return ("_d(" + staticProps + ",[" + (dynamicProps.slice(0, -1)) + "])")
    } else {
      return staticProps
    }
  }

  // #3895, #4268
  function transformSpecialNewlines (text) {
    return text
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029')
  }

  /*  */



  // these keywords should not appear inside expressions, but operators like
  // typeof, instanceof and in are allowed
  var prohibitedKeywordRE = new RegExp('\\b' + (
    'do,if,for,let,new,try,var,case,else,with,await,break,catch,class,const,' +
    'super,throw,while,yield,delete,export,import,return,switch,default,' +
    'extends,finally,continue,debugger,function,arguments'
  ).split(',').join('\\b|\\b') + '\\b');

  // these unary operators should not be used as property/method names
  var unaryOperatorsRE = new RegExp('\\b' + (
    'delete,typeof,void'
  ).split(',').join('\\s*\\([^\\)]*\\)|\\b') + '\\s*\\([^\\)]*\\)');

  // strip strings in expressions
  var stripStringRE = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*\$\{|\}(?:[^`\\]|\\.)*`|`(?:[^`\\]|\\.)*`/g;

  // detect problematic expressions in a template
  function detectErrors (ast, warn) {
    if (ast) {
      checkNode(ast, warn);
    }
  }

  function checkNode (node, warn) {
    if (node.type === 1) {
      for (var name in node.attrsMap) {
        if (dirRE.test(name)) {
          var value = node.attrsMap[name];
          if (value) {
            var range = node.rawAttrsMap[name];
            if (name === 'v-for') {
              checkFor(node, ("v-for=\"" + value + "\""), warn, range);
            } else if (name === 'v-slot' || name[0] === '#') {
              checkFunctionParameterExpression(value, (name + "=\"" + value + "\""), warn, range);
            } else if (onRE.test(name)) {
              checkEvent(value, (name + "=\"" + value + "\""), warn, range);
            } else {
              checkExpression(value, (name + "=\"" + value + "\""), warn, range);
            }
          }
        }
      }
      if (node.children) {
        for (var i = 0; i < node.children.length; i++) {
          checkNode(node.children[i], warn);
        }
      }
    } else if (node.type === 2) {
      checkExpression(node.expression, node.text, warn, node);
    }
  }

  function checkEvent (exp, text, warn, range) {
    var stripped = exp.replace(stripStringRE, '');
    var keywordMatch = stripped.match(unaryOperatorsRE);
    if (keywordMatch && stripped.charAt(keywordMatch.index - 1) !== '$') {
      warn(
        "avoid using JavaScript unary operator as property name: " +
        "\"" + (keywordMatch[0]) + "\" in expression " + (text.trim()),
        range
      );
    }
    checkExpression(exp, text, warn, range);
  }

  function checkFor (node, text, warn, range) {
    checkExpression(node.for || '', text, warn, range);
    checkIdentifier(node.alias, 'v-for alias', text, warn, range);
    checkIdentifier(node.iterator1, 'v-for iterator', text, warn, range);
    checkIdentifier(node.iterator2, 'v-for iterator', text, warn, range);
  }

  function checkIdentifier (
    ident,
    type,
    text,
    warn,
    range
  ) {
    if (typeof ident === 'string') {
      try {
        new Function(("var " + ident + "=_"));
      } catch (e) {
        warn(("invalid " + type + " \"" + ident + "\" in expression: " + (text.trim())), range);
      }
    }
  }

  function checkExpression (exp, text, warn, range) {
    try {
      new Function(("return " + exp));
    } catch (e) {
      var keywordMatch = exp.replace(stripStringRE, '').match(prohibitedKeywordRE);
      if (keywordMatch) {
        warn(
          "avoid using JavaScript keyword as property name: " +
          "\"" + (keywordMatch[0]) + "\"\n  Raw expression: " + (text.trim()),
          range
        );
      } else {
        warn(
          "invalid expression: " + (e.message) + " in\n\n" +
          "    " + exp + "\n\n" +
          "  Raw expression: " + (text.trim()) + "\n",
          range
        );
      }
    }
  }

  function checkFunctionParameterExpression (exp, text, warn, range) {
    try {
      new Function(exp, '');
    } catch (e) {
      warn(
        "invalid function parameter expression: " + (e.message) + " in\n\n" +
        "    " + exp + "\n\n" +
        "  Raw expression: " + (text.trim()) + "\n",
        range
      );
    }
  }

  /*  */

  var range = 2;

  function generateCodeFrame (
    source,
    start,
    end
  ) {
    if ( start === void 0 ) start = 0;
    if ( end === void 0 ) end = source.length;

    var lines = source.split(/\r?\n/);
    var count = 0;
    var res = [];
    for (var i = 0; i < lines.length; i++) {
      count += lines[i].length + 1;
      if (count >= start) {
        for (var j = i - range; j <= i + range || end > count; j++) {
          if (j < 0 || j >= lines.length) { continue }
          res.push(("" + (j + 1) + (repeat$1(" ", 3 - String(j + 1).length)) + "|  " + (lines[j])));
          var lineLength = lines[j].length;
          if (j === i) {
            // push underline
            var pad = start - (count - lineLength) + 1;
            var length = end > count ? lineLength - pad : end - start;
            res.push("   |  " + repeat$1(" ", pad) + repeat$1("^", length));
          } else if (j > i) {
            if (end > count) {
              var length$1 = Math.min(end - count, lineLength);
              res.push("   |  " + repeat$1("^", length$1));
            }
            count += lineLength + 1;
          }
        }
        break
      }
    }
    return res.join('\n')
  }

  function repeat$1 (str, n) {
    var result = '';
    if (n > 0) {
      while (true) { // eslint-disable-line
        if (n & 1) { result += str; }
        n >>>= 1;
        if (n <= 0) { break }
        str += str;
      }
    }
    return result
  }

  /*  */



  /**
   * 使用Function构造函数，将字符串代码转换成一个函数
   * @param {*} code 
   * @param {*} errors 
   * @returns 
   */
  function createFunction (code, errors) {
    try {
      return new Function(code)
    } catch (err) {
      errors.push({ err: err, code: code });
      return noop
    }
  }

  /**
   * 创建compileToFunctions的工厂函数
   * @param {*} compile 
   * @returns 
   */
  function createCompileToFunctionFn (compile) {
    var cache = Object.create(null);

    /**
     * 返回compileToFunctions，即编译入口函数
     *  $mount中就执行了这个函数 
     * @param {*} template 模板字符串 
     * @param {*} options  编译的options
     * @param {*} vm       要进行模板编译的vm实例
     */
    return function compileToFunctions (
      template,
      options,
      vm
    ) {
      // 浅拷贝options
      options = extend({}, options);
      // 获取定义warn函数
      var warn$$1 = options.warn || warn;
      delete options.warn;

      /* istanbul ignore if */
      {
        // detect possible CSP restriction
        // 探测是否有CSP限制 (Content Security Policy)
        try {
          new Function('return 1');
        } catch (e) {
          if (e.toString().match(/unsafe-eval|CSP/)) {
            warn$$1(
              'It seems you are using the standalone build of Vue.js in an ' +
              'environment with Content Security Policy that prohibits unsafe-eval. ' +
              'The template compiler cannot work in this environment. Consider ' +
              'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
              'templates into render functions.'
            );
          }
        }
      }

      // check cache
      // 对于同样的template而言，多次编译的结果显然是相同的，而编译的过程本身是耗时的，
      // 对同一模板进行缓存，多次编译可以直接从缓存中获取编译结果，这是一个典型的空间换时间的优化手段
      var key = options.delimiters
        // 定义了纯文本插入分隔符，使用分隔符加template 
        ? String(options.delimiters) + template
        : template;
        if (cache[key]) {
        // 编译结果有缓存，直接返回
        return cache[key]
      }

      // compile
      // 执行编译 compile是增强后的baseCompile函数
      var compiled = compile(template, options);

      // check compilation errors/tips
      // 非生产环境 编译错误 或 tips提示处理
      {
        if (compiled.errors && compiled.errors.length) {
          if (options.outputSourceRange) {
            compiled.errors.forEach(function (e) {
              warn$$1(
                "Error compiling template:\n\n" + (e.msg) + "\n\n" +
                generateCodeFrame(template, e.start, e.end),
                vm
              );
            });
          } else {
            warn$$1(
              "Error compiling template:\n\n" + template + "\n\n" +
              compiled.errors.map(function (e) { return ("- " + e); }).join('\n') + '\n',
              vm
            );
          }
        }
        if (compiled.tips && compiled.tips.length) {
          if (options.outputSourceRange) {
            compiled.tips.forEach(function (e) { return tip(e.msg, vm); });
          } else {
            compiled.tips.forEach(function (msg) { return tip(msg, vm); });
          }
        }
      }

      // turn code into functions
      var res = {};
      var fnGenErrors = [];
      // 将编译后的代码字符串转换成一个真正的函数 其实是一个with()语句包裹的代码段
      res.render = createFunction(compiled.render, fnGenErrors);
      res.staticRenderFns = compiled.staticRenderFns.map(function (code) {
        return createFunction(code, fnGenErrors)
      });

      // check function generation errors.
      // this should only happen if there is a bug in the compiler itself.
      // mostly for codegen development use
      // 检查编译生成render函数时，是否有错误
      // 只有在编译器本身中存在错误时，才会发生这种情况
      // 主要用于Codegen开发使用
      /* istanbul ignore if */
      {
        if ((!compiled.errors || !compiled.errors.length) && fnGenErrors.length) {
          warn$$1(
            "Failed to generate render function:\n\n" +
            fnGenErrors.map(function (ref) {
              var err = ref.err;
              var code = ref.code;

              return ((err.toString()) + " in\n\n" + code + "\n");
          }).join('\n'),
            vm
          );
        }
      }

      // 使用模板字符串为key，缓存编译结果
      // 返回 { render, staticRenderFns }
      return (cache[key] = res)
    }
  }

  /*  */

  /**
   * 工厂函数 创建createCompiler方法
   * @param {*} baseCompile
   * @returns 返回createCompiler方法
   */
  function createCompilerCreator (baseCompile) {
    /**
     * createCompiler方法
     * @param {*} baseOptions 编译时默认的options 
     * @returns 返回 { compile, compileToFunctions }
     */
    return function createCompiler (baseOptions) {
      /**
       * compile函数
       *  处理配置options，与baseOptions合并，再执行编译
       * @param {*} template  要编译的模板
       * @param {*} options   编译时，用户传入的options
       * @returns 返回编译结果CompiledResult
       */
      function compile (
        template,
        options
      ) {
        // 创建finalOptions对象 baseOptions为原型
        var finalOptions = Object.create(baseOptions);
        var errors = [];
        var tips = [];
        // 在编译过程中记录errors和tips
        var warn = function (msg, range, tip) {
          (tip ? tips : errors).push(msg);
        };

        // 处理编译时传入的options，合并到finalOptions中
        if (options) {
          if (options.outputSourceRange) {
            // $flow-disable-line
            var leadingSpaceLength = template.match(/^\s*/)[0].length;
            // outputSourceRange为true，扩展warn方法
            warn = function (msg, range, tip) {
              var data = { msg: msg };
              if (range) {
                if (range.start != null) {
                  data.start = range.start + leadingSpaceLength;
                }
                if (range.end != null) {
                  data.end = range.end + leadingSpaceLength;
                }
              }
              (tip ? tips : errors).push(data);
            };
          }
          // merge custom modules
          if (options.modules) {
            finalOptions.modules =
              (baseOptions.modules || []).concat(options.modules);
          }
          // merge custom directives
          if (options.directives) {
            finalOptions.directives = extend(
              Object.create(baseOptions.directives || null),
              options.directives
            );
          }
          // copy other options
          for (var key in options) {
            if (key !== 'modules' && key !== 'directives') {
              finalOptions[key] = options[key];
            }
          }
        }

        finalOptions.warn = warn;

        // 外部传入，真正执行编译的函数
        var compiled = baseCompile(template.trim(), finalOptions);
        {
          detectErrors(compiled.ast, warn);
        }
        compiled.errors = errors;
        compiled.tips = tips;
        return compiled
      }

      return {
        compile: compile,
        compileToFunctions: createCompileToFunctionFn(compile)
      }
    }
  }

  /*  */

  // `createCompilerCreator` allows creating compilers that use alternative
  // parser/optimizer/codegen, e.g the SSR optimizing compiler.
  // Here we just export a default compiler using the default parts.
  /**
   * createCompilerCreator接收编译流程函数，传入一个默认的基础编译流程函数baseCompile
   * createCompilerCreator会对baseCompile函数增强，返回createCompiler函数
   * createCompiler函数在调用时会返回 { compile, compileToFunctions }
   *  1. compile是增强后的baseCompile函数
   *  2. compileToFunctions是createCompileToFunctionFn方法的返回值，
   *     createCompileToFunctionFn是对compile函数的编译的模板做一层缓存增强
   *  3. compileToFunctions中会调用compile
   * compileToFunctions就是编译入口文本，$mount时会调用此函数，然后内部会调用到compile，
   * 之后会调用到这里传入的baseCompile函数，baseCompile才是最终执行编译相关的部分，
   * 其余的部分都是利用闭包，对baseCompile函数进行增强
   * 
   * 为什么要这样设计？
   * 编译入口逻辑之所以这么绕，是因为Vue.js在不同的平台下都会有编译的过程，因此编译过程中
   * 的依赖的配置baseOptions会有所不同。而编译过程会多次执行，但这同一个平台下每一次的编
   * 译过程配置又是相同的，为了不让这些配置在每次编译过程都通过参数传入，Vue.js利用了
   * 函数柯里化的技巧很好的实现了baseOptions的参数保留。
   * 如果不通过柯里化传入，那么每次执行编译，都要传入baseOptions，此时又会因为baseOptions
   * 在多个平台都会不同，无法避免地就要写很多if逻辑判断，编译执行时频繁的，每次执行编译时
   * 都要判断，这显然是不合理的；因为编译总是在同一个环境下进行的，每次都判断相比于只需要
   * 在第一次确认环境时进行判断而言，显然后者更好
   * 同样，Vue.js也是利用函数柯里化技巧把基础的编译过程函数抽出来，
   * 通过createCompilerCreator(baseCompile)的方式把真正编译的过程和其它逻辑如对编译配置
   * 处理、缓存处理等剥离开，我们根据不同的平台，只需要关注核心的编译处理即可。
   * 
   * 虽然看起来会有点绕，但实际上是非常巧妙的，平常的工作中，这个技巧是值得借鉴学习的。
   * 
   * 此外，Vue对目录也根据不同的环境进行了拆分，把共同的部分放在src/complier，平台相关
   * 的部分，放在相应的平台目录下
   */
  var createCompiler = createCompilerCreator(function baseCompile (
    template,
    options
  ) {
    // 解析模板字符串生成AST
    var ast = parse(template.trim(), options);
    // 优化AST
    if (options.optimize !== false) {
      optimize(ast, options);
    }
    // 生成渲染代码的字符串
    var code = generate(ast, options);

    return {
      ast: ast,
      render: code.render,
      staticRenderFns: code.staticRenderFns
    }
  });

  /*  */

  // createCompiler方法 返回 compile和compileToFunctions
  // baseOptions是Web平台编译的默认相关配置
  // 关于baseOptions，在不同的平台下都会有不同的编译的过程，因此编译过程中的依赖的配置
  // baseOptions会有所不同
  var ref$1 = createCompiler(baseOptions);
  var compile = ref$1.compile;
  var compileToFunctions = ref$1.compileToFunctions;

  /*  */

  /**
   * 浏览器编译兼容性处理
   */

  // check whether current browser encodes a char inside attribute values
  // 检查当前浏览器是否对属性值内的字符进行编码
  var div;
  function getShouldDecode (href) {
    div = div || document.createElement('div');
    div.innerHTML = href ? "<a href=\"\n\"/>" : "<div a=\"\n\"/>";
    return div.innerHTML.indexOf('&#10;') > 0
  }

  // #3663: IE encodes newlines inside attribute values while other browsers don't
  // IE 在属性值中换行符(\n)会编码新行，而其他浏览器不这样做
  var shouldDecodeNewlines = inBrowser ? getShouldDecode(false) : false;
  // #6828: chrome encodes content in a[href]
  var shouldDecodeNewlinesForHref = inBrowser ? getShouldDecode(true) : false;

  /*  */

  // 获取id选择符对应的innerHTML
  var idToTemplate = cached(function (id) {
    var el = query(id);
    return el && el.innerHTML
  });

  // 暂存$mount
  var mount = Vue.prototype.$mount;
  // $mount是和编译环境相关的，所以将此方法在这里进行扩展实现
  Vue.prototype.$mount = function (
    el,
    hydrating
  ) {
    // 获取DOM节点
    el = el && query(el);

    /* istanbul ignore if */
    if (el === document.body || el === document.documentElement) {
      /**
       * 节点是body或document节点类型，直接返回节点
       * Vue 不能挂载在body、html这样的根节点上
       * 因为Vue之后在挂载新的根节点时，patch过程会删除掉原来的节点，
       * 而添加上新的节点，所以不能替换掉body或者html节点。
       */
      warn(
        "Do not mount Vue to <html> or <body> - mount to normal elements instead."
      );
      return this
    }

    var options = this.$options;
    // resolve template/el and convert to render function
    /**
     * Vue最终执行的都是render方法
     *  如果没有定义render方法，则会把el或者template字符串转换成render方法
     *  没有render方法时，转换规则如下：
     *    1. 定义了template，template有两种类型：
     *        (1) id字符串 获取此id的后代HTMl字符串作为模板
     *        (2) 原生DOM元素 获取此DOM的后代HTMl字符串作为模板
     *    2. 没有定义template，定义了el，获取el本身HTML字符串作为template
     */
    if (!options.render) {
      var template = options.template;
      if (template) {
        // 定义了template
        if (typeof template === 'string') {
          // 模板字符串(不做处理) 和 id选择符
          if (template.charAt(0) === '#') {
            // template是一个id选择符，获取id的节点DOM
            // 获取此id的后代HTML作为字符串作为模板
            template = idToTemplate(template);
            /* istanbul ignore if */
            if (!template) {
              warn(
                ("Template element not found or is empty: " + (options.template)),
                this
              );
            }
          }
        } else if (template.nodeType) {
          // template是一个原生DOM节点 获取此DOM的后代HTMl字符串作为模板
          template = template.innerHTML;
        } else {
          {
            warn('invalid template option:' + template, this);
          }
          // 不是string也不是原生DOM节点 报警告 并返回本身this
          return this
        }
      } else if (el) {
        // 没有定义template 获取el本身的HTML字符串作为模板
        template = getOuterHTML(el);
      }

      // compileToFunctions 方法 template模板编译 最终生成render函数
      if (template) {
        /* istanbul ignore if */
        if (config.performance && mark) {
          mark('compile');
        }

        // compileToFunctions：把模板template编译生成render以及staticRenderFns
        var ref = compileToFunctions(template, {
          outputSourceRange: "development" !== 'production',
          shouldDecodeNewlines: shouldDecodeNewlines,
          shouldDecodeNewlinesForHref: shouldDecodeNewlinesForHref,
          delimiters: options.delimiters,
          comments: options.comments
        }, this);
        var render = ref.render;
        var staticRenderFns = ref.staticRenderFns;
        // 赋值给options
        options.render = render;
        options.staticRenderFns = staticRenderFns;

        /* istanbul ignore if */
        if (config.performance && mark) {
          mark('compile end');
          measure(("vue " + (this._name) + " compile"), 'compile', 'compile end');
        }
      }
    }

    // 调用原$mount方法
    return mount.call(this, el, hydrating)
  };

  /**
   * Get outerHTML of elements, taking care
   * of SVG elements in IE as well.
   * 获取el的HTML字符串
   */
  function getOuterHTML (el) {
    if (el.outerHTML) {
      return el.outerHTML
    } else {
      var container = document.createElement('div');
      container.appendChild(el.cloneNode(true));
      return container.innerHTML
    }
  }

  Vue.compile = compileToFunctions;

  return Vue;

}));
//# sourceMappingURL=vue.js.map
