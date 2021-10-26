/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true // 是否需要observe标识

/**
 * 切换是否需要observe
 * @param {*} value 
 */
export function toggleObserving (value: boolean) {
  shouldObserve = value
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
export class Observer {
  value: any; // Object类型
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value // observe的值
    this.dep = new Dep() // 用于对自己的value进行依赖收集
    this.vmCount = 0
    // 在value上定义不可枚举的数据属性__ob__ 存储自己的Observer
    def(value, '__ob__', this)

    if (Array.isArray(value)) {
      // 数组value添加数组增强方法
      if (hasProto) {
        // 实例上能使用 __proto__ 访问原型
        // 将增强array对象作为value原型
        protoAugment(value, arrayMethods)
      } else {
        // 实例上不能使用 __proto__ 访问原型
        // 将增强后的Array的所有方法复制到value上
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 遍历数组再调用observe()方法
      // 目的是将data中设置成深层响应式的对象
      this.observeArray(value)
    } else {
      // value是Object 每项都设置访问器属性
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   * 将obj的每一项都设置成响应式的
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
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
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    // reject:  value不是对象 或 value是VNode实例
    return
  }

  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    // value已经有Observer实例
    ob = value.__ob__
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
    ob = new Observer(value)
  }

  if (asRootData && ob) {
    // value是根层级的 组件调用iniState()时asRootData为true
    // 统计observer作为vm.$data的数量
    ob.vmCount++
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
 * @param {*} customSetter 
 * @param {*} shallow 
 * @returns 
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 实例化dep 创建数据key的依赖收集实例Dep
  // 关注该数据key的Watcher会订阅此Dep
  // Dep.subs中是订阅了此数据的Watcher
  const dep = new Dep()

  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    // 特性configurable为false的属性不设置
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    // 没getter或有setter，调用时只传了两个参数
    // 没传第三个参数val，获取val
    val = obj[key]
  }

  // childObserver  递归调用observe()
  let childOb = !shallow && observe(val)

  // 定义key为访问器属性
  Object.defineProperty(obj, key, { // 依赖收集
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 执行原key的getter
      const value = getter ? getter.call(obj) : val

      // 依赖收集处理
      if (Dep.target) { // 当前key有Watcher
        /**
         * 调用dep的append()
         *  会调用Watcher.addDep()
         */
        dep.depend()

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
          childOb.dep.depend()
          // val是个数组，那么就通过dependArray把数组每个元素也去做依赖收集
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }

      // 返回访问值
      return value
    },
    // 当我们修改数据的时候，触发setter，可以对相关的依赖派发更新
    set: function reactiveSetter (newVal) { // 派发更新
      // 执行原key的getter得到旧value
      const value = getter ? getter.call(obj) : val

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
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        // 非生产环境执行 执行自定义Setter
        customSetter()
      }

      // #7981: for accessor properties without setter
      // reject：没有setter
      if (getter && !setter) return

      if (setter) {
        // 执行原key的setter
        setter.call(obj, newVal)
      } else {
        // 原key是数据属性 直接赋值
        val = newVal
      }

      // childObserver 新值也变成响应式的
      childOb = !shallow && observe(newVal)
      // 派发更新 通知所有的订阅者Watcher
      dep.notify()
    }
  })
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
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    // 非生产环境 要设置的target未定义或是基本数据类型警告
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 数组set过程 target是数组 且 索引有效
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    // 调用增强数组API
    target.splice(key, 1, val)
    return val
  }

  // key本身就存在于对象上 且 不是原型上的
  if (key in target && !(key in Object.prototype)) {
    // 直接设置值，即可触发更新，因为该值已经是响应式的
    target[key] = val
    return val
  }

  /**
   * key不存在于target上 或 key是原型上的 执行下面逻辑
   */

  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    // target是Vue实例
    // 或 target是响应式对象，且target是一个$data 不做处理 警告提示
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }

  if (!ob) {
    // target本身不是响应式对象
    // targt是普通对象，做最基本的赋值处理
    target[key] = val
    return val
  }

  // 将key属性定义为响应式对象target上的响应式属性
  defineReactive(ob.value, key, val)
  // 手动派发更新 刚设置成响应式属性，无法直接触发setter
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 * 在数组或对象上删除一个属性 并 派发更新
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    // 非生产环境 要删除的target未定义或是基本数据类型警告
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    // 数组set过程 target是数组 且 索引有效
    target.splice(key, 1)
    return
  }

  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    // target是Vue实例
    // 或 target是响应式对象，且 target是一个$data 不做处理 警告提示
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }

  if (!hasOwn(target, key)) {
    // key不是target的自有属性，不做处理
    return
  }

  // 删除key属性
  delete target[key]
  if (!ob) {
    // target不是响应式的 直接返回
    return
  }
  // target是响应式的 手动派发更新 
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
