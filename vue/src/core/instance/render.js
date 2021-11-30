/* @flow */

import {
  warn,
  nextTick,
  emptyObject,
  handleError,
  defineReactive
} from '../util/index'

import { createElement } from '../vdom/create-element'
import { installRenderHelpers } from './render-helpers/index'
import { resolveSlots } from './render-helpers/resolve-slots'
import { normalizeScopedSlots } from '../vdom/helpers/normalize-scoped-slots'
import VNode, { createEmptyVNode } from '../vdom/vnode'

import { isUpdatingChildComponent } from './lifecycle'

export function initRender (vm: Component) {
  vm._vnode = null // the root of the child tree
  vm._staticTrees = null // v-once cached trees
  const options = vm.$options
  // 占位符VNode
  const parentVnode = vm.$vnode = options._parentVnode // the placeholder node in parent tree
  const renderContext = parentVnode && parentVnode.context // 父级vm实例
  // $slots表示 具名插槽、默认插槽
  vm.$slots = resolveSlots(options._renderChildren, renderContext)
  // $scopedSlots 表示 旧语法的作用域插槽 和 新语法的所有插槽
  vm.$scopedSlots = emptyObject
  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // internal version is used by render functions compiled from templates
  // 被template编译成的render()函数使用来创建vnode的方法
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
  // normalization is always applied for the public version, used in
  // user-written render functions.
  // 手写render()函数创建vnode方法
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)

  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated
  const parentData = parentVnode && parentVnode.data

  /* istanbul ignore else */
  if (process.env.NODE_ENV !== 'production') {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$attrs is readonly.`, vm)
    }, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$listeners is readonly.`, vm)
    }, true)
  } else {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, null, true)
  }
}

export let currentRenderingInstance: Component | null = null

// for testing only
export function setCurrentRenderingInstance (vm: Component) {
  currentRenderingInstance = vm
}

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
export function renderMixin (Vue: Class<Component>) {
  // install runtime convenience helpers
  // 原型上添加生成render函数所需要的方法
  installRenderHelpers(Vue.prototype)

  // $nextTick
  Vue.prototype.$nextTick = function (fn: Function) {
    return nextTick(fn, this)
  }


  // vm.$vnode（_parentVnode） 意思就是未经过 _render 函数处理的 vnode， vm._vnode 是经过 render处理过的，为什么文章中说的它们是一种父子关系呢？ vue 为什么要在2处进行引用 _parentVnode 呢？
  // 举个例子，在父组件的 template 中有一个组件标签 <child></child>。
  // child 的模板比如说是 <div class=child>xxxx</div>。
  // 那么在父组件中，child 就是一个组件 vnode，它会在 patch 过程中执行 child 组件的初始化，同时把这个 vnode 作为参数传入，子组件初始化的时候这个 vnode 就是_parentVnode，那么子组件经过 _render 渲染生成的 vnode 是 vm._vnode，_vnode 你可以理解为组件的渲染 root vnode，而 $vnode 就是 _parentVnode，是这个组件在父组件中的占位组件 vnode，所以说是父子关系也不为过。

  // vm._render最终是通过执行createElement()方法并返回的是渲染vnode，它是一个虚拟Node
  // render执行，最终会替换掉原来的节点，这也是为什么根节点不能为html或body节点
  Vue.prototype._render = function (): VNode {
    const vm: Component = this
    const { render, _parentVnode } = vm.$options

    if (_parentVnode) {
      // $scopedSlots 处理父组件占位符VNode节点中的插槽元素
      vm.$scopedSlots = normalizeScopedSlots(
        _parentVnode.data.scopedSlots,
        vm.$slots,
        vm.$scopedSlots
      )
    }

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    // $vnode 当前的VNode 即 当前的组件占位符VNode
    vm.$vnode = _parentVnode

    // render self
    let vnode
    try {
      // There's no need to maintain a stack because all render fns are called
      // separately from one another. Nested component's render fns are called
      // when parent component is patched.
      currentRenderingInstance = vm // 当前渲染实例vm
      /**
       * 调用render()
       * vm._renderProxy 生产环境就是vm本身 开发环境是Proxy代理
       * vm.$createElement render内部使用来创建当前的渲染vnode
       * vnode是当前的渲染vnode
       * 
       * 在执行render()函数过程中，就会访会触发在模板中的所有getter数据，
       * 此时就是访问的响应式getter，这样实际上已经完成了一个依赖收集的过程
       */
      vnode = render.call(vm._renderProxy, vm.$createElement)
    } catch (e) {
      // 触发错误钩子函数
      handleError(e, vm, `render`)
      // return error render result,
      // or previous vnode to prevent render error causing blank component
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production' && vm.$options.renderError) {
        try {
          // 开发环境触发定义的 renderError() 赋值vnode
          vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
        } catch (e) {
          // 触发错误钩子函数
          handleError(e, vm, `renderError`)
          // 赋值vnode
          vnode = vm._vnode
        }
      } else {
        // 生产环境报错，直接赋值vnode
        vnode = vm._vnode
      }
    } finally {
      currentRenderingInstance = null
    }

    // if the returned array contains only a single node, allow it
    if (Array.isArray(vnode) && vnode.length === 1) {
      vnode = vnode[0]
    }
    // return empty vnode in case the render function errored out
    // 不允许多个根节点
    if (!(vnode instanceof VNode)) {
      if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
        warn(
          'Multiple root nodes returned from render function. Render function ' +
          'should return a single root node.',
          vm
        )
      }
      // 多个根节点，将vnode赋值为空vnode
      vnode = createEmptyVNode()
    }
    // set parent
    // 当前组件渲染VNode的parent 指向 组件占位符VNode
    // 只有VNode作为一个组件的根节点，才会有parent指向它再父组件中的占位符VNode
    vnode.parent = _parentVnode
    // render执行完返回的是渲染VNode
    return vnode
  }
}
