/* @flow */

import { warn } from './debug'
import { observe, toggleObserving, shouldObserve } from '../observer/index'
import {
  hasOwn,
  isObject,
  toRawType,
  hyphenate,
  capitalize,
  isPlainObject
} from 'shared/util'

type PropOptions = {
  type: Function | Array<Function> | null,
  default: any,
  required: ?boolean,
  validator: ?Function
};

/**
 * 校验传递的props数据是否满足prop的定义规范
 * @param {*} key 
 * @param {*} propOptions props规范类型
 * @param {*} propsData   props的数据
 * @param {*} vm 
 * @returns 
 */
export function validateProp (
  key: string,
  propOptions: Object,
  propsData: Object,
  vm?: Component
): any {
  const prop = propOptions[key]
  const absent = !hasOwn(propsData, key) // 父组件是否传递了该值
  let value = propsData[key]

  // boolean casting
  // Boolean类型数据处理
  const booleanIndex = getTypeIndex(Boolean, prop.type)
  if (booleanIndex > -1) { // 期望类型包含Boolean类型
    if (absent && !hasOwn(prop, 'default')) {
      // 父组件中没传值 且 props中没设置默认值，value即propsData[key]为false
      value = false
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
      const stringIndex = getTypeIndex(String, prop.type)
      if (stringIndex < 0 || booleanIndex < stringIndex) {
        // prop.type非String类型 或 Boolean类型权重更高 （如is-show中Boolean在String前）
        value = true
      }
    }
  }

  // 默认数据处理
  // check default value
  if (value === undefined) { // 父组件中没有传值
    // 获取prop设置的默认值
    value = getPropDefaultValue(vm, prop, key)

    // since the default value is a fresh copy,
    // make sure to observe it.
    // 获取props设置的默认值时，将它设置程响应式的
    // 因为这个值是一个拷贝，所以要将它变成变成响应式的
    const prevShouldObserve = shouldObserve
    toggleObserving(true)
    observe(value)
    toggleObserving(prevShouldObserve)
  }

  if (
    process.env.NODE_ENV !== 'production' &&
    // skip validation for weex recycle-list child component props
    !(__WEEX__ && isObject(value) && ('@binding' in value))
  ) {
    // 开发环境 且 非weex的@binding下，断言prop
    assertProp(prop, key, value, vm, absent)
  }

  return value
}

/**
 * Get the default value of a prop.
 * 获取prop设置的default值
 */
function getPropDefaultValue (vm: ?Component, prop: PropOptions, key: string): any {
  // no default, return undefined
  if (!hasOwn(prop, 'default')) {
    // 没default返回undefined
    return undefined
  }

  const def = prop.default
  // warn against non-factory defaults for Object & Array
  if (process.env.NODE_ENV !== 'production' && isObject(def)) {
    // 警告 default值如果是对象或数组，必须使用工厂函数
    warn(
      'Invalid default value for prop "' + key + '": ' +
      'Props with type Object/Array must use a factory function ' +
      'to return the default value.',
      vm
    )
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
  prop: PropOptions,
  name: string,
  value: any,
  vm: ?Component,
  absent: boolean
) {
  if (prop.required && absent) {
    // 必须值警告
    warn(
      'Missing required prop: "' + name + '"',
      vm
    )
    return
  }

  if (value == null && !prop.required) {
    // prop非必须且是null 不处理
    return
  }

  let type = prop.type
  let valid = !type || type === true // type不为真或type为true，将valid置为true
  const expectedTypes = []
  if (type) {
    if (!Array.isArray(type)) {
      // type非数组则转数组
      type = [type]
    }
    for (let i = 0; i < type.length && !valid; i++) {
      // 断言value类型，获取断言结果
      const assertedType = assertType(value, type[i], vm)
      expectedTypes.push(assertedType.expectedType || '')
      valid = assertedType.valid
    }
  }

  const haveExpectedTypes = expectedTypes.some(t => t)
  if (!valid && haveExpectedTypes) {
    // value无效 且 有期望类型 
    // 警告value类型无效
    warn(
      getInvalidTypeMessage(name, value, expectedTypes),
      vm
    )
    return
  }

  // 自定义validator 
  const validator = prop.validator
  if (validator) {
    if (!validator(value)) {
      warn(
        'Invalid prop: custom validator check failed for prop "' + name + '".',
        vm
      )
    }
  }
}

const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol|BigInt)$/
/**
 * 断言value类型是否合法
 * @param {*} value 断言值
 * @param {*} type  期望类型
 * @param {*} vm 
 * @returns 断言结果
 */
function assertType (value: any, type: Function, vm: ?Component): {
  valid: boolean;
  expectedType: string;
} {
  let valid
  const expectedType = getType(type)
  if (simpleCheckRE.test(expectedType)) {
    const t = typeof value
    valid = t === expectedType.toLowerCase()
    // for primitive wrapper objects
    if (!valid && t === 'object') {
      valid = value instanceof type
    }
  } else if (expectedType === 'Object') {
    valid = isPlainObject(value)
  } else if (expectedType === 'Array') {
    valid = Array.isArray(value)
  } else {
    try {
      valid = value instanceof type
    } catch (e) {
      warn('Invalid prop type: "' + String(type) + '" is not a constructor', vm);
      valid = false;
    }
  }
  return {
    valid,
    expectedType
  }
}

const functionTypeCheckRE = /^\s*function (\w+)/

/**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 */
function getType (fn) {
  const match = fn && fn.toString().match(functionTypeCheckRE)
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
function getTypeIndex (type, expectedTypes): number {
  if (!Array.isArray(expectedTypes)) {
    return isSameType(expectedTypes, type) ? 0 : -1
  }
  for (let i = 0, len = expectedTypes.length; i < len; i++) {
    if (isSameType(expectedTypes[i], type)) {
      return i
    }
  }
  return -1
}

function getInvalidTypeMessage (name, value, expectedTypes) {
  let message = `Invalid prop: type check failed for prop "${name}".` +
    ` Expected ${expectedTypes.map(capitalize).join(', ')}`
  const expectedType = expectedTypes[0]
  const receivedType = toRawType(value)
  // check if we need to specify expected value
  if (
    expectedTypes.length === 1 &&
    isExplicable(expectedType) &&
    isExplicable(typeof value) &&
    !isBoolean(expectedType, receivedType)
  ) {
    message += ` with value ${styleValue(value, expectedType)}`
  }
  message += `, got ${receivedType} `
  // check if we need to specify received value
  if (isExplicable(receivedType)) {
    message += `with value ${styleValue(value, receivedType)}.`
  }
  return message
}

function styleValue (value, type) {
  if (type === 'String') {
    return `"${value}"`
  } else if (type === 'Number') {
    return `${Number(value)}`
  } else {
    return `${value}`
  }
}

const EXPLICABLE_TYPES = ['string', 'number', 'boolean']
function isExplicable (value) {
  return EXPLICABLE_TYPES.some(elem => value.toLowerCase() === elem)
}

function isBoolean (...args) {
  return args.some(elem => elem.toLowerCase() === 'boolean')
}
