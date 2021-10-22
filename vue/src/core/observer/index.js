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
 * 这样保证无论obj的结构多复杂，它的所有子属性也能变成响应式的对象，
 * 这样访问或修改obj中一个嵌套较深的属性，也能触发getter和setter
 */
export class Observer {
  value: any; // Object类型
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    // 在value上定义不可枚举的数据属性__ob__ 存储自己的Observer
    def(value, '__ob__', this)

    if (Array.isArray(value)) {
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
 * 将一个对象实例创建成一个observer对象实例(响应式对象)，并返回该对象
 * 如果这个对象已经是observer对象，就直接返回
 * 
 * 给非VNode的对象类型数据添加一个Observer，如果已经添加过则直接返回，
 * 否则在满足一定条件下去实例化一个Observer对象实例
 * @param {*} value       要创建成observer的对象
 * @param {*} asRootData  对象是否是根层级的 组件初始化时initState调用为 true
 * @returns 
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    // reject:  value是对象 或 value是VNode实例
    return
  }

  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    // value已经是observer实例
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    /**
     * 将value设置为observer实例
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
  return ob
}

/**
 * Define a reactive property on an Object.
 * 通过将对象上的属性设置成访问器属性，
 * 将对象上的属性定义成响应式的
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

  // 递归调用 observe()
  let childOb = !shallow && observe(val)

  // 定义key为访问器属性
  Object.defineProperty(obj, key, { // 依赖收集
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 执行原key的getter
      const value = getter ? getter.call(obj) : val

      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
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

      childOb = !shallow && observe(newVal)

      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
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
