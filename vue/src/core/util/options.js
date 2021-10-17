/* @flow */

import config from '../config'
import { warn } from './debug'
import { set } from '../observer/index'
import { unicodeRegExp } from './lang'
import { nativeWatch, hasSymbol } from './env'

import {
  ASSET_TYPES,
  LIFECYCLE_HOOKS
} from 'shared/constants'

import {
  extend,
  hasOwn,
  camelize,
  toRawType,
  capitalize,
  isBuiltInTag,
  isPlainObject
} from 'shared/util'

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 */
// 合并策略 optionMergeStrategies用户可配置
const strats = config.optionMergeStrategies

/**
 * Options with restrictions
 */
if (process.env.NODE_ENV !== 'production') {
  /**
   * el propsData 默认合并策略
   */
  strats.el = strats.propsData = function (parent, child, vm, key) {
    if (!vm) {
      warn(
        `option "${key}" can only be used during instance ` +
        'creation with the `new` keyword.'
      )
    }
    return defaultStrat(parent, child)
  }
}

/**
 * Helper that recursively merges two data objects together.
 * 合并两个对象 递归合并from到to中
 *   to中的每一项都设置成observed，可观察的
 *   如果to.key是一个对象，就递归调用本身mergeData，保证每个key都是可观察的
 */
function mergeData (to: Object, from: ?Object): Object {
  if (!from) return to
  let key, toVal, fromVal

  // 获取from的所有key数组
  const keys = hasSymbol
    ? Reflect.ownKeys(from)
    : Object.keys(from)

  for (let i = 0; i < keys.length; i++) {
    key = keys[i]

    // in case the object is already observed...
    // 跳过已观察key
    if (key === '__ob__') continue
    
    toVal = to[key]
    fromVal = from[key]

    if (!hasOwn(to, key)) {
      // to中没有此key，添加key监听
      set(to, key, fromVal)
    } else if (
      toVal !== fromVal &&
      isPlainObject(toVal) &&
      isPlainObject(fromVal)
    ) {
      // to中有此key
      // 且 to和from中此key的val不相等
      // 且 to和from中此key的val都是普通对象
      // 递归调用
      mergeData(toVal, fromVal)
    }
  }

  // 返回合并结果
  return to
}

/**
 * Data
 *  data、provide合并策略
 *  合并对象或函数 返回
 */
export function mergeDataOrFn (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  if (!vm) {
    /**
     * vm不为真
     *    childVal不为真，返回parentVal
     *    parentVal不为真，返回childVal
     *    parentVal和childVal都为真
     *      使用mergeData合并，childVal为to，parentVal为from
     */

    // in a Vue.extend merge, both should be functions
    // childVal不为真，返回parentVal
    if (!childVal) {
      return parentVal
    }
    // parentVal不为真，返回childVal
    if (!parentVal) {
      return childVal
    }

    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    // parentVal和childVal都为真
    return function mergedDataFn () {
      // 使用mergeData合并，childVal为to，parentVal为from
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this, this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
      )
    }
  } else {
    // vm为真
    return function mergedInstanceDataFn () {
      // instance merge
      const instanceData = typeof childVal === 'function'
        ? childVal.call(vm, vm)
        : childVal
      const defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm, vm)
        : parentVal
      if (instanceData) {
        return mergeData(instanceData, defaultData)
      } else {
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
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  if (!vm) {
    if (childVal && typeof childVal !== 'function') {
      // 开发中常见错误 data需要是一个函数 否则会提示警告 
      process.env.NODE_ENV !== 'production' && warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.',
        vm
      )

      return parentVal
    }
    return mergeDataOrFn(parentVal, childVal)
  }

  return mergeDataOrFn(parentVal, childVal, vm)
}

/**
 * Hooks and props are merged as arrays.
 * 生命周期钩子函数合并策略
 *  将各个生命周期的钩子函数合并成数组
 */
function mergeHook (
  parentVal: ?Array<Function>,
  childVal: ?Function | ?Array<Function>
): ?Array<Function> {
  const res = childVal
    ? parentVal
      // childVal、parentVal都为真，合并数组
      ? parentVal.concat(childVal)
      // childVal为真，parentVal不为真，使用childVal当作数组
      : Array.isArray(childVal)
        ? childVal
        : [childVal]
    // childVal不为真，使用parentVal数组
    : parentVal
  return res
    ? dedupeHooks(res)
    : res
}

function dedupeHooks (hooks) {
  const res = []
  for (let i = 0; i < hooks.length; i++) {
    if (res.indexOf(hooks[i]) === -1) {
      res.push(hooks[i])
    }
  }
  return res
}

LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 *  资源component、directive、filter合并策略
 *    使用parentVal作为原型，将parentVal、childVal合并成一个新对象
 *     childVal会覆盖parentVal上相同的值
 */
function mergeAssets (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): Object {
  // 将parentVal、childVal合并成一个新对象
  const res = Object.create(parentVal || null)
  if (childVal) {
    // childVal需要是一个对象类型
    process.env.NODE_ENV !== 'production' && assertObjectType(key, childVal, vm)
    // childVal会覆盖parentVal上相同的值
    return extend(res, childVal)
  } else {
    return res
  }
}

ASSET_TYPES.forEach(function (type) {
  strats[type + 's'] = mergeAssets
})

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
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  // work around Firefox's Object.prototype.watch...
  if (parentVal === nativeWatch) parentVal = undefined
  if (childVal === nativeWatch) childVal = undefined

  // parentVal和childVal都不为真 或 只有一个为真
  /* istanbul ignore if */
  if (!childVal) return Object.create(parentVal || null)
  if (process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm)
  }
  if (!parentVal) return childVal

  // parentVal和childVal都为真
  // 相同的key合并成[parent, child]数组
  const ret = {}
  extend(ret, parentVal)
  for (const key in childVal) {
    let parent = ret[key]
    const child = childVal[key]
    if (parent && !Array.isArray(parent)) {
      parent = [parent]
    }
    ret[key] = parent
      // 相同的key合并成[parent, child]数组
      ? parent.concat(child)
      // parent没有，将child作为数组合并上
      : Array.isArray(child) ? child : [child]
  }
  return ret
}

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
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  if (childVal && process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm)
  }
  // parentVal不为真，使用childVal
  if (!parentVal) return childVal

  // parentVal和childVal为真，合并后返回；
  const ret = Object.create(null)
  extend(ret, parentVal)
  //  childVal会覆盖parentVal相同的key
  if (childVal) extend(ret, childVal)
  return ret
}

/**
 * provide合并策略
 */
strats.provide = mergeDataOrFn

/**
 * Default strategy.
 * 默认合并策略
 *  childVal不是undefined，使用childVal
 *  否则使用parentVal
 */
const defaultStrat = function (parentVal: any, childVal: any): any {
  return childVal === undefined
    ? parentVal
    : childVal
}

/**
 * Validate component names
 *  检查所有组件名是否有效
 */
function checkComponents (options: Object) {
  for (const key in options.components) {
    validateComponentName(key)
  }
}

/**
 * 验证组件名是否有效
 * @param {*} name 
 */
export function validateComponentName (name: string) {
  // 标签名需符合h5规范
  if (!new RegExp(`^[a-zA-Z][\\-\\.0-9_${unicodeRegExp.source}]*$`).test(name)) {
    warn(
      'Invalid component name: "' + name + '". Component names ' +
      'should conform to valid custom element name in html5 specification.'
    )
  }

  // 1. 不允许使用Vue内置标签 slot,component
  // 2. 不允许使用HTML标签
  if (isBuiltInTag(name) || config.isReservedTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component ' +
      'id: ' + name
    )
  }
}

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 */
function normalizeProps (options: Object, vm: ?Component) {
  const props = options.props
  if (!props) return
  const res = {}
  let i, val, name
  if (Array.isArray(props)) {
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        name = camelize(val)
        res[name] = { type: null }
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.')
      }
    }
  } else if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "props": expected an Array or an Object, ` +
      `but got ${toRawType(props)}.`,
      vm
    )
  }
  options.props = res
}

/**
 * Normalize all injections into Object-based format
 */
function normalizeInject (options: Object, vm: ?Component) {
  const inject = options.inject
  if (!inject) return
  const normalized = options.inject = {}
  if (Array.isArray(inject)) {
    for (let i = 0; i < inject.length; i++) {
      normalized[inject[i]] = { from: inject[i] }
    }
  } else if (isPlainObject(inject)) {
    for (const key in inject) {
      const val = inject[key]
      normalized[key] = isPlainObject(val)
        ? extend({ from: key }, val)
        : { from: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "inject": expected an Array or an Object, ` +
      `but got ${toRawType(inject)}.`,
      vm
    )
  }
}

/**
 * Normalize raw function directives into object format.
 */
function normalizeDirectives (options: Object) {
  const dirs = options.directives
  if (dirs) {
    for (const key in dirs) {
      const def = dirs[key]
      if (typeof def === 'function') {
        dirs[key] = { bind: def, update: def }
      }
    }
  }
}

// 断言value是否是普通对象
function assertObjectType (name: string, value: any, vm: ?Component) {
  if (!isPlainObject(value)) {
    warn(
      `Invalid value for option "${name}": expected an Object, ` +
      `but got ${toRawType(value)}.`,
      vm
    )
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 * 根据不同的合并策略，合并options
 * @param {*} parent options
 * @param {*} child  options
 * @param {*} vm     当前vm实例
 * @returns 
 */
export function mergeOptions (
  parent: Object,
  child: Object,
  vm?: Component
): Object {
  if (process.env.NODE_ENV !== 'production') {
    // 检测组件名是否有效
    checkComponents(child)
  }

  if (typeof child === 'function') {
    child = child.options
  }

  // 标准化props
  normalizeProps(child, vm)
  // 标准化inject
  normalizeInject(child, vm)
  // 标准化directive
  normalizeDirectives(child)

  // Apply extends and mixins on the child options,
  // but only if it is a raw options object that isn't
  // the result of another mergeOptions call.
  // Only merged options has the _base property.
  if (!child._base) { // 实例化的Vue组件
    // 递归 合并实例化组件的extends
    if (child.extends) {
      parent = mergeOptions(parent, child.extends, vm)
    }
    // 递归 合并实例化组件的mixins
    if (child.mixins) {
      for (let i = 0, l = child.mixins.length; i < l; i++) {
        parent = mergeOptions(parent, child.mixins[i], vm)
      }
    }
  }

  /**
   * 根据不同的合并策略，对options进行合并处理
   */
  const options = {}
  let key
  // 合并parent上的key
  for (key in parent) {
    mergeField(key)
  }
  // 合并child上有的而parent上没有的key
  for (key in child) {
    if (!hasOwn(parent, key)) {
      mergeField(key)
    }
  }
  function mergeField (key) {
    const strat = strats[key] || defaultStrat
    // 执行相应的合并策略
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 * resolve资源 component、directive、filter 并返回找到的asset
 */
export function resolveAsset (
  options: Object,
  type: string,
  id: string,
  warnMissing?: boolean
): any {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return
  }
  const assets = options[type]
  // check local registration variations first
  // hello-wrold
  if (hasOwn(assets, id)) return assets[id]
  // 转驼峰 hello-wrold => helloWorld
  const camelizedId = camelize(id)
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]
  // 首字母转大写 helloWorld => HelloWorld
  const PascalCaseId = capitalize(camelizedId)
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]
  
  // fallback to prototype chain
  // 原型链中获取
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}
