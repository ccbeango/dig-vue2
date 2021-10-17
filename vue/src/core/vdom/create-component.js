/* @flow */

import VNode from './vnode'
import { resolveConstructorOptions } from 'core/instance/init'
import { queueActivatedComponent } from 'core/observer/scheduler'
import { createFunctionalComponent } from './create-functional-component'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject
} from '../util/index'

import {
  resolveAsyncComponent,
  createAsyncPlaceholder,
  extractPropsFromVNodeData
} from './helpers/index'

import {
  callHook,
  activeInstance,
  updateChildComponent,
  activateChildComponent,
  deactivateChildComponent
} from '../instance/lifecycle'

import {
  isRecyclableComponent,
  renderRecyclableComponentTemplate
} from 'weex/runtime/recycle-list/render-component-template'

// Vue.js 使用的 Virtual DOM 参考的是开源库 snabbdom，它的一个特点是
// 在 VNode 的 patch 流程中对外暴露了各种时机的钩子函数，方便我们做一些额外的事情，
// Vue.js 也是充分利用这一点，在初始化一个 Component 类型的 VNode的过程中实现了几个钩子函数

// componentVNodeHooks就是初始化一个 Component 类型的 VNode 中默认的几个钩子函数
// patch阶段 组件会执行这些默认钩子函数
// inline hooks to be invoked on component VNodes during patch
const componentVNodeHooks = {
  init (vnode: VNodeWithData, hydrating: boolean): ?boolean {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // keep-alive组件处理
      // kept-alive components, treat as a patch
      const mountedNode: any = vnode // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode)
    } else {
      // 组件处理 返回子组件实例
      const child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      )
      // 挂载组件实例 再走 mount -> mountComponent -> _render -> _update -> patch
      // 组件实例化 非ssr 参数1 el是 undefined  即 child.$mount(undefined, false)
      child.$mount(hydrating ? vnode.elm : undefined, hydrating)
    }
  },

  prepatch (oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
    const options = vnode.componentOptions
    const child = vnode.componentInstance = oldVnode.componentInstance
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    )
  },

  insert (vnode: MountedComponentVNode) {
    const { context, componentInstance } = vnode
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true
      callHook(componentInstance, 'mounted')
    }
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.
        queueActivatedComponent(componentInstance)
      } else {
        activateChildComponent(componentInstance, true /* direct */)
      }
    }
  },

  destroy (vnode: MountedComponentVNode) {
    const { componentInstance } = vnode
    if (!componentInstance._isDestroyed) {
      if (!vnode.data.keepAlive) {
        componentInstance.$destroy()
      } else {
        deactivateChildComponent(componentInstance, true /* direct */)
      }
    }
  }
}

const hooksToMerge = Object.keys(componentVNodeHooks)

/**
 * 创建组件VNode
 * @param {*} Ctor 要扩展的组件VNode
 * @param {*} data 组件的VNodeData
 * @param {*} context 创建组件的上下文
 * @param {*} children Ctor的子节点
 * @param {*} tag 节点标签名
 * @returns 组件VNode
 */
export function createComponent (
  Ctor: Class<Component> | Function | Object | void,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag?: string
): VNode | Array<VNode> | void {
  if (isUndef(Ctor)) {
    return
  }

  //  Vue基类构造函数 _base指向Vue基类构造函数 见global-api/index
  const baseCtor = context.$options._base

  // plain options object: turn it into a constructor
  if (isObject(Ctor)) {
    // Ctor如果是对象，使用extend将其转换成一个构造函数
    Ctor = baseCtor.extend(Ctor)
  }

  // if at this stage it's not a constructor or an async component factory,
  // reject.
  if (typeof Ctor !== 'function') {
    // 不是 构造函数 或 异步组件
    if (process.env.NODE_ENV !== 'production') {
      // 无效组件定义警告
      warn(`Invalid Component definition: ${String(Ctor)}`, context)
    }
    return
  }

  // async component
  // FIXME: 跳过 异步组件处理
  let asyncFactory
  if (isUndef(Ctor.cid)) {
    asyncFactory = Ctor
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor)
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
      return createAsyncPlaceholder(
        asyncFactory,
        data,
        context,
        children,
        tag
      )
    }
  }

  data = data || {}

  // resolve constructor options in case global mixins are applied after
  // component constructor creation
  // FIXME: 跳过 options再处理
  // 而mixins在组件构造函数之后被应用 全局的mixins可能会影响options
  resolveConstructorOptions(Ctor)

  // transform component v-model data into props & events
  // FIXME: 跳过 v-model 转成成 props 和 events
  if (isDef(data.model)) {
    transformModel(Ctor.options, data)
  }

  // extract props
  // FIXME: 跳过 VNodeData中提取props
  const propsData = extractPropsFromVNodeData(data, Ctor, tag)

  // functional component
  // FIXME: 跳过 函数式组件处理
  if (isTrue(Ctor.options.functional)) {
    return createFunctionalComponent(Ctor, propsData, data, context, children)
  }

  // FIXME: 跳过 自定义事件处理
  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners
  const listeners = data.on
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
  data.on = data.nativeOn

  // FIXME: 跳过 抽象组件处理
  if (isTrue(Ctor.options.abstract)) {
    // abstract components do not keep anything
    // other than props & listeners & slot

    // work around flow
    const slot = data.slot
    data = {}
    if (slot) {
      data.slot = slot
    }
  }

  // install component management hooks onto the placeholder node
  // 安装组件默认钩子函数到对应VNode上
  // 本质是把 componentVNodeHooks 的钩子函数合并到 data.hook 中
  // 在VNode执行patch的过程中执行相关的钩子函数
  installComponentHooks(data)

  // return a placeholder vnode
  const name = Ctor.options.name || tag
  // 创建组件VNode
  // 注意： 与普通元素VNode节点不同的是，
  //        组件VNode的children（参数3）为undefined 这在patch阶段遍历时会很有用
  //        children放在了 componentOptions（参数7）中
  //        该参数中也包含了其它有用数据 Ctor 实例化使用 children 在插槽的时候会用到
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data, undefined, undefined, undefined, context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  )

  // Weex specific: invoke recycle-list optimized @render function for
  // extracting cell-slot template.
  // https://github.com/Hanks10100/weex-native-directive/tree/master/component
  /* istanbul ignore if */
  if (__WEEX__ && isRecyclableComponent(vnode)) {
    return renderRecyclableComponentTemplate(vnode)
  }

  return vnode
}

/**
 * 创建组件VNode节点的组件实例
 * @param {*} vnode  挂载的组件VNode
 * @param {*} parent 当前激活的vm实例 
 * @returns 
 */
export function createComponentInstanceForVnode (
  // we know it's MountedComponentVNode but flow doesn't
  vnode: any,
  // activeInstance in lifecycle state
  parent: any
): Component {
  // 内部调用组件的options
  const options: InternalComponentOptions = {
    _isComponent: true, // 标识为组件
    _parentVnode: vnode, // 组件VNode 可以理解成占位符VNode
    parent
  }

  // check inline-template render functions
  // FIXME: 跳过
  const inlineTemplate = vnode.data.inlineTemplate
  if (isDef(inlineTemplate)) {
    options.render = inlineTemplate.render
    options.staticRenderFns = inlineTemplate.staticRenderFns
  }

  // 执行组件VNode节点的组件构造函数 new Sub() 构造函数会执行 _init() 方法
  return new vnode.componentOptions.Ctor(options)
}

/**
 * 安装组件钩子到VNode节点的VNodeData上
 *  merge默认的钩子函数componentVNodeHooks到VNodeData上
 * @param {*} data 
 */
function installComponentHooks (data: VNodeData) {
  const hooks = data.hook || (data.hook = {})
  // hooksToMerge = [ 'init', 'prepatch', 'insert', 'destroy' ]
  for (let i = 0; i < hooksToMerge.length; i++) {
    const key = hooksToMerge[i]
    const existing = hooks[key]
    const toMerge = componentVNodeHooks[key]
    // 命中条件：
    //    已存在的hooks中的钩子函数existing() 和 要添加的toMerge() 不相等
    // 且 existing._merged为true
    if (existing !== toMerge && !(existing && existing._merged)) {
      // 如果某个时机的钩子已经存在data.hook中，那么通过执行mergeHook函数做合并
      // 合并时 默认toMerge在前
      hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge
    }
  }
}

/**
 * 合并两个钩子
 * @param {*} f1 
 * @param {*} f2 
 * @returns
 */
function mergeHook (f1: any, f2: any): Function {
  // 合并后的钩子 调用时顺序执行两个合并的钩子函数f1 f2
  const merged = (a, b) => {
    // flow complains about extra args which is why we use any
    f1(a, b)
    f2(a, b)
  }
  merged._merged = true
  return merged
}

// transform component v-model info (value and callback) into
// prop and event handler respectively.
function transformModel (options, data: any) {
  const prop = (options.model && options.model.prop) || 'value'
  const event = (options.model && options.model.event) || 'input'
  ;(data.attrs || (data.attrs = {}))[prop] = data.model.value
  const on = data.on || (data.on = {})
  const existing = on[event]
  const callback = data.model.callback
  if (isDef(existing)) {
    if (
      Array.isArray(existing)
        ? existing.indexOf(callback) === -1
        : existing !== callback
    ) {
      on[event] = [callback].concat(existing)
    }
  } else {
    on[event] = callback
  }
}
