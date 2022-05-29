/* @flow */

import {
  tip,
  toArray,
  hyphenate,
  formatComponentName,
  invokeWithErrorHandling
} from '../util/index'
import { updateListeners } from '../vdom/helpers/index'

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
 * 初始化组件实例的自定义事件
 * @param {*} vm
 */
export function initEvents (vm: Component) {
  vm._events = Object.create(null)
  vm._hasHookEvent = false
  // init parent attached events
  const listeners = vm.$options._parentListeners
  if (listeners) {
    // 更新组件实例的自定义事件
    updateComponentListeners(vm, listeners)
  }
}

let target: any

/**
 * 添加自定义事件监听
 * @param {*} event 
 * @param {*} fn 
 */
function add (event, fn) {
  target.$on(event, fn)
}

/**
 * 移除自定义事件监听
 * @param {*} event 
 * @param {*} fn 
 */
function remove (event, fn) {
  target.$off(event, fn)
}

function createOnceHandler (event, fn) {
  const _target = target
  return function onceHandler () {
    const res = fn.apply(null, arguments)
    if (res !== null) {
      _target.$off(event, onceHandler)
    }
  }
}

/**
 * 更新组件上的自定义事件
 * @param {*} vm 
 * @param {*} listeners 
 * @param {*} oldListeners 
 */
export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  target = vm
  // 调用vdom中定义的事件处理 传入自定义事件的add和remove方法
  updateListeners(listeners, oldListeners || {}, add, remove, createOnceHandler, vm)
  target = undefined
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
export function eventsMixin (Vue: Class<Component>) {
  const hookRE = /^hook:/
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    if (Array.isArray(event)) {
      // event是数组 递归调用本身$on
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
      // 事件中心中添加事件 
      // 每一个事件都会有一个数组对应存储事件回调fn vm._events[click] = [fn1, fn2]
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // FIXME: 跳过 hook:event 事件处理
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }

  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    on.fn = fn
    // once内部对event的回调做了一层闭包处理，执行on之后就会删除对应事件回调fn
    vm.$on(event, on)
    return vm
  }

  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all
    if (!arguments.length) {
      // 调用时不传参数，清空所有事件
      vm._events = Object.create(null)
      return vm
    }
    // array of events
    if (Array.isArray(event)) {
      // 传入事件是数组，递归调用$off
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }

    // specific event
    const cbs = vm._events[event]
    if (!cbs) {
      // 指定的事件不存在 不处理
      return vm
    }
    if (!fn) {
      // 没有fn，移除事件对应的所有回调
      vm._events[event] = null
      return vm
    }
    // specific handler
    // 指定事件名和函数，找到对应的事件回调移除
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }

  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase()
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        // 警告提示 html属性不支持驼峰
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }

    // 获取事件名对应的所有事件，循环执行所有的事件
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      for (let i = 0, l = cbs.length; i < l; i++) {
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    return vm
  }
}
