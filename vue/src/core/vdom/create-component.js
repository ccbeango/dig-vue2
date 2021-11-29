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
      /**
       * keep-alive包裹的子组件处理
       * 当keep-alive的子组件非第一次执行时，命中这里的逻辑
       * 
       * 需要注意，这里处理的VNode节点是keep-alive包裹的子组件，而不是keep-alive组件本身
       * keep-alive组件渲染返回的渲染VNode是它的子节点，并不是keep-alive渲染VNode本身，
       * 它本身是并不会生成渲染VNode的，这也就是为什么它是抽象节点，不是生成实际的DOM
       * 
       * keep-alive组件首次渲染：第一次执行时，keep-alive组件会执行else中的逻辑，
       * 创建keep-alive实例child，然后执行keep-alive组件的$mount，在执行到keep-alive
       * 组件的render时，keep-alive组件渲染返回的渲染VNode是它的子节点，并不是
       * keep-alive渲染VNode本身。
       * 
       * 那么它的子组件VNode第一次patch也会同样命中else中的逻辑，作为一个普通的组件
       * 进行mount、render、patch，之后在挂载完毕之后，keep-alive组件的mounted执行，
       * 在keep-alive中缓存已经插入到DOM的子组件vm实例。
       * keep-alive下的子组件在第一次挂载时，都会执行上述逻辑。
       * 
       * keep-alive组件再次更新执行时，执行patchVNode，会执行prepatch，这时会执行
       * updateChildComponent，命中needsForceUpdate，再次resolveSlots生成keep-alive子组件的默认插槽$slots.default内容，
       * 然后执行keep-alive组件的$forceUpdate，重新执行到keep-alive组件的render，
       * 此时返回了子组件的VNode，子组件VNode再执行patch过程，执行到patch下的createComponent
       * 那么就会命中这里的逻辑
       */
      // kept-alive components, treat as a patch
      const mountedNode: any = vnode // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode) // 直接执行prepatch
    } else {
      /**
       * 创建组件占位符节点的组件实例
       *  形成关系如下：
       *    组件占位符VNode.componentInstance._vnode 可以找到组件的渲染VNode
       *    组件的渲染VNode.parent可以找到组件占位符VNode
       *    组件实例componentInstance即vm.$vnode可以找到组件占位符VNode
       *    可表示为：
       *      组件占位符VNode.componentInstance._vnode = 组件渲染VNode
       *      组件占位符VNode.componentInstance.$vnode = 组件占位符VNode 即 vm.$vnode = 组件占位符VNode
       *      组件渲染VNode.parent = 组件占位符VNode
       */
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
    // 新的组件占位符VNode节点的options
    const options = vnode.componentOptions
    // 获取旧组件占位符VNode的渲染vm实例componentInstance
    // child就是在父组件(App)页面中的子组件(HelloWorld)占位符VNode的对应的实现实例
    const child = vnode.componentInstance = oldVnode.componentInstance
    // 更新父组件中子组件占位符对应的组件实例
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
      // 未mounted组件进行mounted
      componentInstance._isMounted = true
      /**
       * 生命周期函数 mounted
       *  调用时机2
       *  执行时机：所有VNode节点真正被插入到DOM中之后
       *  执行顺序：先子后父 
       *  因为patch过程，先插入子vnode再插入父vnode
       */
      callHook(componentInstance, 'mounted')
    }

    // FIXME: 跳过keepAlive组件处理
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.
        // 更新时，先将实例放到队列中，patch结束后再执行
        queueActivatedComponent(componentInstance)
      } else {
        // 挂载时
        // 执行keep-alive组件的生命周期activated
        activateChildComponent(componentInstance, true /* direct */)
      }
    }
  },

  destroy (vnode: MountedComponentVNode) {
    const { componentInstance } = vnode
    if (!componentInstance._isDestroyed) {
      if (!vnode.data.keepAlive) {
        // 非keep-alive的子组件，执行vm.$destroy()
        componentInstance.$destroy()
      } else {
        // 非keep-alive的子组件，执行deactivated生命周期函数
        deactivateChildComponent(componentInstance, true /* direct */)
      }
    }
  }
}

const hooksToMerge = Object.keys(componentVNodeHooks)

/**
 * 创建组件占位符VNode
 * @param {*} Ctor 要创建组件VNode的组件、对象或函数异步组件
 * @param {*} data 组件VNode的VNodeData
 * @param {*} context 创建组件的上下文组件实例
 * @param {*} children Ctor的子节点
 * @param {*} tag 节点标签名
 * @returns 组件占位符VNode
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
  // 全局注册组件和局部注册组件会跳过这里 因为在注册组件时，已经执行了Vue.extend()
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
  // 异步组件处理
  let asyncFactory
  if (isUndef(Ctor.cid)) { // 异步组件是一个工厂函数 没有cid属性
    // 如果是第一次执行 resolveAsyncComponent，
    // 除非使用高级异步组件 0 delay 去创建了一个 loading 组件，
    // 否则返回是 undefiend，接着通过createAsyncPlaceholder创建一个注释节点作为占位符
    asyncFactory = Ctor
    // 处理工厂函数的异步组件 工厂函数会去加载这个异步组件
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor)
    // 异步组件第一次执行返回的Ctor为undefined
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
      // 异步组件第一次执行，是同步执行的，会执行到这里，返回一个注释占位符VNode节点，最终在DOM中渲染成一个注释节点
      // 创建一个异步组件的注释VNode占位符 但把asyncFactory和asyncMeta赋值给当前VNode
      // resolveAsyncComponent再调用resolve，会forceRender，就会第二次执行
      return createAsyncPlaceholder(
        asyncFactory,
        data,
        context,
        children,
        tag
      )
    }

    // 第二次执行的异步组件走下面的逻辑，和同步组件相同
  }

  data = data || {}

  // resolve constructor options in case global mixins are applied after
  // component constructor creation
  // FIXME: 跳过 options再处理
  // 而mixins在组件构造函数之后被应用 全局的mixins可能会影响options
  resolveConstructorOptions(Ctor)

  // transform component v-model data into props & events
  // 组件v-model 转成 props 和 events
  if (isDef(data.model)) {
    transformModel(Ctor.options, data)
  }

  // extract props
  // FIXME: 跳过 从VNodeData中获取要创建的组件占位符VNode的props
  const propsData = extractPropsFromVNodeData(data, Ctor, tag)

  // functional component
  // FIXME: 跳过 函数式组件处理
  if (isTrue(Ctor.options.functional)) {
    return createFunctionalComponent(Ctor, propsData, data, context, children)
  }

  // 自定义事件处理 将自定义事件的data.on赋值给listeners，
  // 因为这些会被当作子组件事件，而不是原生DOM事件
  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners
  const listeners = data.on // 子组件事件
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
  /**
   * 组件上的nativeOn赋值给on，当前组件即父组件的patch过程中就会被当作原生事件来处理，
   * 对于自定义事件，则把listeners作为vnode的componentOptions传入，它是在子组件初始
   * 化阶段中处理的，所以它的处理环境是子组件，是被当作子组件事件，而不是原生DOM事件
   * 
   * 这就是为什么组件上使用native修饰符可以使用原生DOM事件，即组件上事件使用native修饰符
   * 对应的是DOM事件的原因，当然这也是为什么只有组件有自定义事件和原生DOM事件
   */
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

  /**
   * 组件占位符VNode
   * 注意：
   *    与普通元素VNode节点不同的是，组件VNode的children（参数3）为undefined，
   *    因为组件VNode只是用作占位符，而不会生成真正的DOM节点，所以把组件占位符
   *    的children放在componentOptions（参数7）中
   *    这在patch阶段遍历时，patchVNode中会很有用
   * 该参数中也包含了其它有用数据 Ctor 实例化使用 children 在插槽的时候会用到
   * listeners 组件的自定义事件
   */
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
 * @param {*} vnode  已挂载的组件占位符VNode
 * @param {*} parent 当前激活的vm实例 即 当前VNode节点的父vm实例
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
  // FIXME: 跳过 内联模板处理
  const inlineTemplate = vnode.data.inlineTemplate
  if (isDef(inlineTemplate)) {
    options.render = inlineTemplate.render
    options.staticRenderFns = inlineTemplate.staticRenderFns
  }

  /**
   * 执行组件VNode节点的组件构造函数 new Sub() 构造函数会执行 _init() 方法
   * 实例化组件占位符VNode成组件实例
   */
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
/**
 * 将组件v-model转成prop和event
 *  data.attrs[prop] = data.model.value 
 *  data.on[event] = data.model.callback
 * @param {*} options 
 * @param {*} data 
 */
function transformModel (options, data: any) {
  // prop默认value 可自定义
  const prop = (options.model && options.model.prop) || 'value'
  // event默认input 可自定义
  const event = (options.model && options.model.event) || 'input'
  // data.attrs[prop] = data.model.value
  ;(data.attrs || (data.attrs = {}))[prop] = data.model.value

  // 添加事件
  const on = data.on || (data.on = {})
  const existing = on[event]
  const callback = data.model.callback
  if (isDef(existing)) {
    // 该类型事件已存在
    if (
      Array.isArray(existing)
        ? existing.indexOf(callback) === -1
        : existing !== callback
    ) {
      // 将事件放在事件队列第一个
      on[event] = [callback].concat(existing)
    }
  } else {
    // 事件不存在，直接添加事件
    on[event] = callback
  }
}
