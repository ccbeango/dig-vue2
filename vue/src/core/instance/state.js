/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute,
  invokeWithErrorHandling
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

/**
 * 代理target[sourceKey][key]的访问到target[key]上
 *  为Vue组件构造函数添加的props和data添加代理访问方式
 *  这样可以通过vm.xxx访问到vm._props.xxx或vm._data.xxx
 * @param {*} target 
 * @param {*} sourceKey 
 * @param {*} key 
 */
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

/**
 * Vue会把props、data等变成响应式对象，在创建响应式对象过程中，
 * 发现子属性也为对象则递归把该对象变成响应式的；
 * 这样，整个data无论有多少层嵌套，任何属性都是响应式的，即整个对象是响应式对象
 * @param {*} vm 
 */
export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  // 初始化 props
  if (opts.props) initProps(vm, opts.props)
  // 初始化 methods
  if (opts.methods) initMethods(vm, opts.methods)
  // 初始化 data
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  // 初始化 computed
  if (opts.computed) initComputed(vm, opts.computed)
  // 初始化 watch
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
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
function initProps (vm: Component, propsOptions: Object) {
  // propsData只用于new创建的实例中 作用是创建实例时传递props，为了方便测试。
  const propsData = vm.$options.propsData || {}
  // 定义vm._props
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  // 定义vm.$options._propKeys，用来缓存props中的key
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent // vm.$parent不为真时，vm则是根实例

  // root instance props should be converted
  if (!isRoot) { // vm不是根实例
    // vm不是根实例，对于对象的prop值，子组件的prop值始终指向父组件的prop值，只要父组件的prop值变化，
    // 就会触发子组件的重新渲染，所以这个observe过程是可以省略的
    // vm是根实例，那么这个props需要递归设置程响应式的，也就不命中这里
    toggleObserving(false)
  }

  /**
   * 遍历传入的props，将props中的每一项都定义成响应式的
   */
  for (const key in propsOptions) {
    // 用户传入props的key，存入vm.$options._propKeys
    keys.push(key)
    // 校验传递的props数据是否满足prop的定义规范 并返回满足规范的prop的值value
    const value = validateProp(key, propsOptions, propsData, vm)

    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') { // 非生产环境
      // 将key转换成带连字符号的key  helloWorld => hello-world
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        // 预留属性警告
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }

      // 把每个prop对应的值变成响应式 
      // 非根实例的props时会浅设置响应式的，不递归将每个属性设置成响应式的
      defineReactive(props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          // 非根实例 且 非子组件更新 说明是子组件直接更新的props
          // 直接更新props报错 开发常见错误警告 子组件修改props的警告
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      // 把每个prop对应的值变成响应式
      defineReactive(props, key, value)
    }

    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    // 对于非根实例的子组件而言，prop的代理发生在Vue.extend阶段
    // 这么做的好处是不用为每个组件实例都做一层proxy，是一种优化手段
    if (!(key in vm)) {
      // 没有在extend实例化时添加成静态属性的props[key]，设置vm._props[key]的proxy
      // 代理props
      proxy(vm, `_props`, key)
    }
  }

  toggleObserving(true)
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
function initData (vm: Component) {
  let data = vm.$options.data
  /**
   * data定义
   *  1. data是函数，执行getData()返回data
   *  2. data是对象，获取data对象本身
   *  3. data未定义，设置为空对象
   */
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}

  // [object Object] data为函数返回的值不是普通对象类型时，data默认赋值为空对象
  if (!isPlainObject(data)) {
    data = {}
    // data返回值非普通对象类型，报错提示
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }

  // proxy data on instance
  // 代理实例上的data
  const keys = Object.keys(data)
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  while (i--) {
    /**
     * data中key与props或methods中重名，对应处理，并提示警告
     *  1. 与methods重名，data覆盖methods同名key
     *  2. 与props重名，data丢掉，使用props值
     */
    const key = keys[i]
    // methods重名
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }

    // props重名
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
      // 设置访问器属性
      proxy(vm, `_data`, key)
    }
  }

  // observe data
  observe(data, true /* asRootData */)
}

/**
 * data为函数时，执行data()获取返回值
 * @param {*} data 
 * @param {*} vm 
 * @returns 
 */
export function getData (data: Function, vm: Component): any {
  // #7573 disable dep collection when invoking data getters
  pushTarget()
  try {
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

/**
 * computedWatcher的Options
 */
const computedWatcherOptions = { lazy: true }
/**
 * 初始化计算属性
 * @param {*} vm 
 * @param {*} computed 
 */
function initComputed (vm: Component, computed: Object) {
  // 创建保存computedWatcher的空对象
  // $flow-disable-line
  const watchers = vm._computedWatchers = Object.create(null)
  
  // computed properties are just getters during SSR
  const isSSR = isServerRendering() // 是否是ssr渲染

  for (const key in computed) {
    const userDef = computed[key]
    // 获取用户定义的计算属性的getter
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      // 计算属性未定义getter警告
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
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
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      // 组件定义中的计算属性已经在初始化时添加到了原型中，这边只需要定义实例化时的计算属性
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      // data props methods中与计算属性中定义相同的key，提示警告
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      } else if (vm.$options.methods && key in vm.$options.methods) {
        warn(`The computed property "${key}" is already defined as a method.`, vm)
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
export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering()

  if (typeof userDef === 'function') {
    // 定义getter 默认函数作为getter
    sharedPropertyDefinition.get = shouldCache
      // 非服务端渲染
      ? createComputedGetter(key)
      // 服务端渲染
      : createGetterInvoker(userDef)
    // 定义setter
    sharedPropertyDefinition.set = noop
  } else {
    // 计算属性定义getter和setter

    // 设置getter
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        // 非服务端渲染 且 需cache 
        ? createComputedGetter(key)
        // 服务端渲染 或 无需cache
        : createGetterInvoker(userDef.get)
      : noop
    
    // 设置setter
    sharedPropertyDefinition.set = userDef.set || noop
  }

  // 访问器属性 无setter警告
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }

  // 代理计算属性 保证计算属性vm.computed.xxx可以通过vm.xxx访问到
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

/**
 * 非服务端渲染的计算属性getter生成器
 * @param {*} key 
 * @returns 
 */
function createComputedGetter (key) {
  // 返回计算属性的getter
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        // dirty为true，表示computedWatcher需要求值
        // 当一次渲染中多次访问同一个计算属性，除第一次访问外，访问dirty都是false，避免重复计算
        // computedWatcher会触发它关注的数据属性key的Dep进行依赖收集
        // 达到computedWatcher订阅关注的数据属性key的Dep
        // Dep是key的依赖收集实例 Dep.subs = [ fullName的computedWatcher ]
        watcher.evaluate()
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
        watcher.depend()
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
function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof methods[key] !== 'function') {
        // 非函数定义警告
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      if (props && hasOwn(props, key)) {
        // 该key在props中已存在警告
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      if ((key in vm) && isReserved(key)) {
        // 该key是预留的Vue实例key警告
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    /**
     * 将methds中的方法添加到vm实例上
     *  1. method[key]不是函数赋值为空操作noop
     *  2. method[key]是函数，method[key].bind(vm) 绑定函数this为vm实例
     */
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}

/**
 * 初始化 watch
 * @param {*} vm 
 * @param {*} watch 
 */
function initWatch (vm: Component, watch: Object) {
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
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      // watch的回调是一个回调数组
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
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
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  if (isPlainObject(handler)) {
    // handler是对象
    options = handler
    handler = handler.handler
  }
  
  if (typeof handler === 'string') {
    // handler是字符串
    // 此时handler已经经过代理，是vm实例上的一个属性，handler定义在methods中
    handler = vm[handler]
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
export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  // 定义$data和$props 返回的是构造函数上定义的_data和_props
  const dataDef = {}
  dataDef.get = function () { return this._data }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  // $data和$props 开发环境设置setter方法，以便提示警告
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  // 设置响应式 $set和$delete方法
  Vue.prototype.$set = set
  Vue.prototype.$delete = del

  // 设置 $watch方法
  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this
    if (isPlainObject(cb)) {
      // cb是对象，直接调用$watch会命中
      // createWatcher会重新调用$watch，将cb处理成一个普通函数
      return createWatcher(vm, expOrFn, cb, options)
    }

    options = options || {}
    options.user = true

    /**
     * 创建userWatcher
     * 并对侦听的属性收集依赖，让这些属性的Dep.subs中有userWatcher，
     * 以便这些监听的属性发生变更的时候，能触发用户定义的回调执行
     */
    const watcher = new Watcher(vm, expOrFn, cb, options)

    if (options.immediate) {
      // 立即执行userWatcher的用户定义handler一次
      const info = `callback for immediate watcher "${watcher.expression}"`
      // 此时将正在计算的Watcher Dep.target设置成undefined，
      // immediate为true，立即计算时，正在计算的渲染Watcher不关注此属性
      pushTarget()
      invokeWithErrorHandling(cb, vm, [watcher.value], vm, info)
      popTarget()
    }

    // 返回销毁userWatcher的函数
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}
