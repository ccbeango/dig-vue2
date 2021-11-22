/* @flow */

import {
  warn,
  invokeWithErrorHandling
} from 'core/util/index'
import {
  cached,
  isUndef,
  isTrue,
  isPlainObject
} from 'shared/util'

/**
 * 解析事件名，并缓存结果
 * 确定是否有passive、once、capture事件修饰符，返回解析结果
 */
const normalizeEvent = cached((name: string): {
  name: string,
  once: boolean,
  capture: boolean,
  passive: boolean,
  handler?: Function,
  params?: Array<any>
} => {
  // 解析passive修饰符
  const passive = name.charAt(0) === '&'
  name = passive ? name.slice(1) : name
  // 解析once修饰符
  const once = name.charAt(0) === '~' // Prefixed last, checked first
  name = once ? name.slice(1) : name
  // 解析capture修饰符
  const capture = name.charAt(0) === '!'
  name = capture ? name.slice(1) : name
  return {
    name,
    once,
    capture,
    passive
  }
})

/**
 * 创建一个函数的执行函数
 *  - 创建事件定义的执行函数
 *  - 创建指令hook的执行函数
 * @param {*} fns 要添加的事件函数定义
 * @param {*} vm 
 * @returns 
 */
export function createFnInvoker (fns: Function | Array<Function>, vm: ?Component): Function {
  /**
   * 调用时，执行事件定义函数
   * @returns 
   */
  function invoker () {
    const fns = invoker.fns // fns中获取事件回调函数
    if (Array.isArray(fns)) {
      // 一个事件有多个回调定义
      const cloned = fns.slice()
      for (let i = 0; i < cloned.length; i++) {
        // 依次调用多个回调
        invokeWithErrorHandling(cloned[i], null, arguments, vm, `v-on handler`)
      }
    } else {
      // return handler return value for single handlers
      return invokeWithErrorHandling(fns, null, arguments, vm, `v-on handler`)
    }
  }
  // 添加事件定义实际的执行函数 更新执行事件时，只需要更新此属性即可
  invoker.fns = fns
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
export function updateListeners (
  on: Object,
  oldOn: Object,
  add: Function,
  remove: Function,
  createOnceHandler: Function,
  vm: Component
) {
  /**
   * name 正在处理的事件的事件名
   * def 当前新事件的定义函数
   * cur 当前新事件的定义函数
   * old 当前原事件的定义函数
   * event 解析当前新事件的事件名的结果
   */
  let name, def, cur, old, event
  for (name in on) {
    def = cur = on[name]
    old = oldOn[name]
    // 解析事件修饰符结果
    event = normalizeEvent(name)
    /* istanbul ignore if */
    if (__WEEX__ && isPlainObject(def)) {
      cur = def.handler
      event.params = def.params
    }

    if (isUndef(cur)) {
      // 当前新添加事件没有定义 警告
      process.env.NODE_ENV !== 'production' && warn(
        `Invalid handler for event "${event.name}": got ` + String(cur),
        vm
      )
    } else if (isUndef(old)) {
      // 原事件未定义 即 新添加一个事件
      if (isUndef(cur.fns)) {
        // 替换掉新事件定义函数为新事件执行函数
        cur = on[name] = createFnInvoker(cur, vm)
      }

      if (isTrue(event.once)) {
        // 有once修饰符 替换掉新事件定义对象为新事件once执行函数
        cur = on[name] = createOnceHandler(event.name, cur, event.capture)
      }
      // 添加新事件监听
      add(event.name, cur, event.capture, event.passive, event.params)
    } else if (cur !== old) {
      // 新事件和原事件不相等 即 更新事件 
      old.fns = cur // 只需更新事件执行函数 巧妙
      on[name] = old // 更新到新的事件对象属性上
    }
  }
  // 删除不再用到的旧事件
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name)
      // 移除DOM事件监听
      remove(event.name, oldOn[name], event.capture)
    }
  }
}
