/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

/**
 * 混入init相关原型方法
 *  Vue.prototype._init()
 */
export function initMixin (Vue: Class<Component>) {
  // 使用new调用Vue构造函数时，执行Vue.prototype._init()方法
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    vm._isVue = true

    // 将用户传入的options最终merge到$options上

    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      // 内部自调用 new Sub()的 merge options 
      // 自调用生成的options再做合并
      initInternalComponent(vm, options)
    } else {
      // 用户主动调用 new Vue()的merge options
      // 把Vue构造函数vm.constructor的options和用户传入的options做一层合并，到vm.$options上
      vm.$options = mergeOptions(
        // 返回 Vue.options
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }

    // 初始化 _renderProxy
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      // 生产环境下 _renderProxy是vm组件(this)本身
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    // 初始化 生命周期
    initLifecycle(vm)
    // 初始化 事件
    initEvents(vm)
    // 初始化 render
    initRender(vm)
    /**
     * 生命周期函数 beforeCreate 
     *  执行时机：initLifecycle、initEvents、initRender之后
     *  执行顺序：先父后子
     *  此时获取不到 data props method watch等数据
     */
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    // 初始化 data
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    /**
     * 生命周期函数 created
     *  执行时机：initInjections、initState、initProvide之后
     *  执行顺序：先父后子
     */
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    // 有el 调用$mount进行挂载
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

/**
 * 初始化组件的$options属性
 * @param {*} vm 
 * @param {*} options 
 */
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  // 将组件的options作为原型赋值给组件实例的$options
  const opts = vm.$options = Object.create(vm.constructor.options)

  /**
   * 下面对组件实例的vm.$options做进一步扩展 
   */
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  // vm是当前组件实例  options._parentVnode是当前组件的VNode  options.parent 是当前组件VNode的父级组件实例
  opts.parent = options.parent // 当前组件VNode的父级vm实例 子级最终要插入到父级上 确定层级关系
  opts._parentVnode = parentVnode // 当前组件VNode 占位符VNode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData // 组件的propsData
  opts._parentListeners = vnodeComponentOptions.listeners // 在组件VNode占位符上的自定义事件，传到了组件的渲染VNode上
  opts._renderChildren = vnodeComponentOptions.children // 组件VNode的children
  opts._componentTag = vnodeComponentOptions.tag // 组件占位符VNode的tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

// 处理构造函数的options 并返回
export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options // Vue构造函数默认option
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
