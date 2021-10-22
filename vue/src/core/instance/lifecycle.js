/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import { mark, measure } from '../util/perf'
import { createEmptyVNode } from '../vdom/vnode'
import { updateComponentListeners } from './events'
import { resolveSlots } from './render-helpers/resolve-slots'
import { toggleObserving } from '../observer/index'
import { pushTarget, popTarget } from '../observer/dep'

import {
  warn,
  noop,
  remove,
  emptyObject,
  validateProp,
  invokeWithErrorHandling
} from '../util/index'

export let activeInstance: any = null
export let isUpdatingChildComponent: boolean = false

// 设置当前的 activeInstance
export function setActiveInstance(vm: Component) {
  const prevActiveInstance = activeInstance
  activeInstance = vm

  // 闭包执行 恢复之前的activeInstance
  // 这样prevActiveInstance和activeInstance就是父子关系
  return () => {
    activeInstance = prevActiveInstance
  }
}

export function initLifecycle (vm: Component) {
  const options = vm.$options

  // locate first non-abstract parent
  // parent 是 activeInstance
  // 当前的vm实例要挂载到parent上
  // parent就是当前VNode节点、当前vm实例的父级vm实例
  let parent = options.parent
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }

    // 将当前vm实例添加到parent的$children中
    // 建立实例间实际的父子级关系
    parent.$children.push(vm)
  }

  // 当前父级vm
  vm.$parent = parent
  // $root
  vm.$root = parent ? parent.$root : vm

  // 当前vm实例的$children
  vm.$children = []
  // 当前vm实例的$refs
  vm.$refs = {}

  // vm实例其它内置属性
  vm._watcher = null
  vm._inactive = null
  vm._directInactive = false
  vm._isMounted = false
  vm._isDestroyed = false
  vm._isBeingDestroyed = false
}

/**
 * 混入lifecycle相关属性和方法
 *  属性：
 *  方法：
 *    Vue.prototype._update()
 *    Vue.prototype.$forceUpdate()
 *    Vue.prototype.$destroy()
 */
export function lifecycleMixin (Vue: Class<Component>) {
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
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this
    // 数据更新时使用的变量
    const prevEl = vm.$el
    const prevVnode = vm._vnode
    // 把当前的 vm 赋值给 activeInstance 即保存当前的activeInstance 
    // 为了保证 子组件new Sub()时，能获取到它的父级vm实例，确保在initLifecycle时，建立父子关系
    // 这样子组件再去创建孙子组件时，孙子组件就能获取到它的父vm实例
    const restoreActiveInstance = setActiveInstance(vm)

    // vm._vnode 渲染vnode
    vm._vnode = vnode // _vnode 是当前的渲染vnode
    // 实例上 vm.$vnode 占位符vnode
    // vm.$vnode 和 vm._vnode 是父子关系 （vm.$vnode是父） 
    // 代码表达就是 vm._vnode.parent === vm.$vnode  在render.js中赋值

    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    // _update()方法的核心是调用__patch__()方法
    if (!prevVnode) {
      // initial render
      // 首次渲染 子组件的vm.$el是undefined
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
    } else {
      // updates
      // 数据更新
      vm.$el = vm.__patch__(prevVnode, vnode)
    }

    // 恢复activeInstance为当前实例
    restoreActiveInstance()

    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  }

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
    const vm: Component = this
    if (vm._watcher) {
      vm._watcher.update()
    }
  }

  Vue.prototype.$destroy = function () {
    const vm: Component = this
    if (vm._isBeingDestroyed) {
      return
    }
    /**
     * 生命周期函数 beforeDestroy
     *  执行时机：
     *  执行顺序：先父后子
     */
    callHook(vm, 'beforeDestroy')
    vm._isBeingDestroyed = true
    // remove self from parent
    // 从parent的$children中删掉自身
    const parent = vm.$parent
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm)
    }

    // teardown watchers
    // 删除watcher
    if (vm._watcher) {
      vm._watcher.teardown()
    }
    let i = vm._watchers.length
    while (i--) {
      vm._watchers[i].teardown()
    }

    // remove reference from data ob
    // frozen object may not have observer.
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--
    }
    // call the last hook...
    vm._isDestroyed = true
    /**
     * 执行组件销毁 会触发递归执行销毁
     */
    // invoke destroy hooks on current rendered tree
    vm.__patch__(vm._vnode, null)
    /**
     * 生命周期函数 destroyed
     *  执行时机
     *  执行顺序：先子后父
     */
    // fire destroyed hook
    callHook(vm, 'destroyed')

    // turn off all instance listeners.
    vm.$off()
    // remove __vue__ reference
    if (vm.$el) {
      vm.$el.__vue__ = null
    }
    // release circular reference (#6759)
    if (vm.$vnode) {
      vm.$vnode.parent = null
    }
  }
}

// mountComponent 方法会完成整个DOM渲染工作
export function mountComponent (
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  // $el Vue实例使用的根DOM元素
  vm.$el = el
  // render不存在 命中处理
  if (!vm.$options.render) {
    // render不存在，创建空的VNode
    vm.$options.render = createEmptyVNode
    // 警告提示
    if (process.env.NODE_ENV !== 'production') {
      /* istanbul ignore if */
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el || el) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        )
      }
    }
  }

  /**
   * 生命周期函数 beforeMount
   *  执行时机 $mount执行时，DOM挂载之前
   *  执行顺序 先父后子
   */
  callHook(vm, 'beforeMount')

  let updateComponent
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    updateComponent = () => {
      const name = vm._name
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`

      mark(startTag)
      const vnode = vm._render()
      mark(endTag)
      measure(`vue ${name} render`, startTag, endTag)

      mark(startTag)
      vm._update(vnode, hydrating)
      mark(endTag)
      measure(`vue ${name} patch`, startTag, endTag)
    }
  } else {
    // 渲染Watcher会在实例化时和更新时执行DOM渲染
    updateComponent = () => {
      // 先 vm._render() 生成虚拟Node
      // 虚拟Node其实是vm._render()内部调用createElement()方法的返回值vnode
      // vm._update() 更新DOM
      vm._update(vm._render(), hydrating)
    }
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  // 实例化渲染Watcher
  // 观察者模式
  // Watcher 在这里起到两个作用：
  //    一个是初始化的时候会执行回调函数updateComponent
  //    另一个是当 vm 实例中的监测的数据发生变化的时候执行回调函数updateComponent
  new Watcher(vm, updateComponent, noop, {
    before () {
      if (vm._isMounted && !vm._isDestroyed) {
        /**
         * 生命周期函数 beforeUpdate
         * 执行时机：flushSchedulerQueue执行每个queue中的watcher时
         * 执行顺序：
         */
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true /* isRenderWatcher */)
  hydrating = false

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  // vm.$vnode表示Vue实例的占位符VNode，它为Null则表示当前是根Vue的实例
  if (vm.$vnode == null) {
    // vm._isMounted为true，表示这个实例已经挂载了
    vm._isMounted = true
    // 同时执行 mounted 钩子函数
    // Hook mounted
    /**
     * 生命周期函数 mounted 
     * 调用时机1 用户外部调用new Vue()
     *  执行时机：用户外部new Vue()调用$mount挂载根节点 DOM挂载之后
     *  执行顺序：先子后父 最后执行 在 调用时机2 中全部执行完之后执行
     */
    callHook(vm, 'mounted')
  }
  return vm
}

export function updateChildComponent (
  vm: Component,
  propsData: ?Object,
  listeners: ?Object,
  parentVnode: MountedComponentVNode,
  renderChildren: ?Array<VNode>
) {
  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = true
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren.

  // check if there are dynamic scopedSlots (hand-written or compiled but with
  // dynamic slot names). Static scoped slots compiled from template has the
  // "$stable" marker.
  const newScopedSlots = parentVnode.data.scopedSlots
  const oldScopedSlots = vm.$scopedSlots
  const hasDynamicScopedSlot = !!(
    (newScopedSlots && !newScopedSlots.$stable) ||
    (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
    (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key) ||
    (!newScopedSlots && vm.$scopedSlots.$key)
  )

  // Any static slot children from the parent may have changed during parent's
  // update. Dynamic scoped slots may also have changed. In such cases, a forced
  // update is necessary to ensure correctness.
  const needsForceUpdate = !!(
    renderChildren ||               // has new static slots
    vm.$options._renderChildren ||  // has old static slots
    hasDynamicScopedSlot
  )

  vm.$options._parentVnode = parentVnode
  vm.$vnode = parentVnode // update vm's placeholder node without re-render

  if (vm._vnode) { // update child tree's parent
    vm._vnode.parent = parentVnode
  }
  vm.$options._renderChildren = renderChildren

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  vm.$attrs = parentVnode.data.attrs || emptyObject
  vm.$listeners = listeners || emptyObject

  // update props
  if (propsData && vm.$options.props) {
    toggleObserving(false)
    const props = vm._props
    const propKeys = vm.$options._propKeys || []
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i]
      const propOptions: any = vm.$options.props // wtf flow?
      props[key] = validateProp(key, propOptions, propsData, vm)
    }
    toggleObserving(true)
    // keep a copy of raw propsData
    vm.$options.propsData = propsData
  }

  // update listeners
  listeners = listeners || emptyObject
  const oldListeners = vm.$options._parentListeners
  vm.$options._parentListeners = listeners
  updateComponentListeners(vm, listeners, oldListeners)

  // resolve slots + force update if has children
  if (needsForceUpdate) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    vm.$forceUpdate()
  }

  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = false
  }
}

function isInInactiveTree (vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true
  }
  return false
}

export function activateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = false
    if (isInInactiveTree(vm)) {
      return
    }
  } else if (vm._directInactive) {
    return
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false
    for (let i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i])
    }
    callHook(vm, 'activated')
  }
}

export function deactivateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = true
    if (isInInactiveTree(vm)) {
      return
    }
  }
  if (!vm._inactive) {
    vm._inactive = true
    for (let i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i])
    }
    callHook(vm, 'deactivated')
  }
}

/**
 * 执行组件生命周期函数
 * @param {*} vm    组件实例
 * @param {*} hook  生命周期函数字符串
 */
export function callHook (vm: Component, hook: string) {
  // #7573 disable dep collection when invoking lifecycle hooks
  pushTarget()
  // 获取对应的生命周期 是一个数组 （mergeOptions中处理的）
  const handlers = vm.$options[hook]
  const info = `${hook} hook`
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      // 执行生命周期函数
      invokeWithErrorHandling(handlers[i], vm, null, vm, info)
    }
  }
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook)
  }
  popTarget()
}
