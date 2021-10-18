/* @flow */

import {
  warn,
  once,
  isDef,
  isUndef,
  isTrue,
  isObject,
  hasSymbol,
  isPromise,
  remove
} from 'core/util/index'

import { createEmptyVNode } from 'core/vdom/vnode'
import { currentRenderingInstance } from 'core/instance/render'

/**
 * 返回组件构造器
 * @param {*} comp 
 * @param {*} base 
 * @returns 
 */
function ensureCtor (comp: any, base) {
  if (
    comp.__esModule ||
    (hasSymbol && comp[Symbol.toStringTag] === 'Module')
  ) {
    comp = comp.default
  }

  return isObject(comp)
    // 如果comp是普通对象，将对象转成组件构造器 
    ? base.extend(comp)
    // 直接返回组件构造器
    : comp
}

/**
 * 创建一个VNode注释节点占位符
 * 但节点保存了异步组件的所有信息
 * @param {*} factory 
 * @param {*} data 
 * @param {*} context 
 * @param {*} children 
 * @param {*} tag 
 * @returns 
 */
export function createAsyncPlaceholder (
  factory: Function,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag: ?string
): VNode {
  const node = createEmptyVNode()
  node.asyncFactory = factory
  node.asyncMeta = { data, context, children, tag }
  return node
}

/**
 * 处理工厂函数的异步组件
 *    1. 普通工厂函数
 *    2. Promise工厂函数
 *    3. 高级异步函数
 *  普通工厂函数：
 *    1. 首先工厂函数会加载异步组件，这个过程从头到尾同步执行的 第一次执行返回undefined
 *    2. 加载完成后，用户调用resolve或reject异步再继续执行
 *  Promise工厂函数：
 *    1. 首先工厂函数会加载异步组件，同步执行 第一次执行返回undefined
 *    2. Promise.then(resolve, reject) 异步执行resolve或reject 再继续执行
 *  高级异步函数：
 *    
 * 
 * 异步组件实现的本质是 2 次渲染，
 * 除了 0 delay 的高级异步组件第一次直接渲染成 loading 组件外，
 * 其它都是第一次渲染生成一个注释节点，当异步获取组件成功后，
 * 再通过 forceRender 强制重新渲染，这样就能正确渲染出我们异步加载的组件了。
 *    
 * @param {*} factory  工厂函数
 * @param {*} baseCtor Vue基类构造函数
 * @returns 
 */
export function resolveAsyncComponent (
  factory: Function,
  baseCtor: Class<Component>
): Class<Component> | void {
  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    // 高级异步函数：有error返回factory.errorComp
    // forceRender() 再次执行到 resolveAsyncComponent
    // 返回 factory.errorComp，直接渲染 error 组件
    return factory.errorComp
  }

  if (isDef(factory.resolved)) {
    // 异步组件 第二次执行命中这里 返回保存的组件
    // forceRender() 再次执行到 resolveAsyncComponent
    return factory.resolved
  }

  // 当前渲染的vm实例
  const owner = currentRenderingInstance

  if (owner && isDef(factory.owners) && factory.owners.indexOf(owner) === -1) {
    // already pending
    factory.owners.push(owner)
  }

  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    // 异步组件加载中
    // forceRender() 再次执行到 resolveAsyncComponent 返回 loadingComp
    return factory.loadingComp
  }

  if (owner && !isDef(factory.owners)) {
    const owners = factory.owners = [owner]
    let sync = true
    let timerLoading = null
    let timerTimeout = null

    ;(owner: any).$on('hook:destroyed', () => remove(owners, owner))

    /**
     * 强制执行render
     * @param {*} renderCompleted 
     */
    const forceRender = (renderCompleted: boolean) => {
      for (let i = 0, l = owners.length; i < l; i++) {
        // 执行每个vm实例的$forceUpdate
        // $forceUpdate强制执行渲染watcher的update 执行 vm._update(vm._render(), hydrating)
        // render过程中会再次执行 render下的 createComponent
        (owners[i]: any).$forceUpdate()
      }

      // 渲染完成 清空定时loading
      if (renderCompleted) {
        owners.length = 0
        if (timerLoading !== null) {
          clearTimeout(timerLoading)
          timerLoading = null
        }
        if (timerTimeout !== null) {
          clearTimeout(timerTimeout)
          timerTimeout = null
        }
      }
    }

    /**
     * res 是用户传入的组件定义对象 或 组件构造器
     */
    const resolve = once((res: Object | Class<Component>) => {
      // cache resolved 保存异步组件构造函数
      factory.resolved = ensureCtor(res, baseCtor)

      // invoke callbacks only if this is not a synchronous resolve
      // (async resolves are shimmed as synchronous during SSR)
      if (!sync) {
        // 异步组件 执行forceRender
        // 之所以这么做是因为Vue通常是数据驱动视图重新渲染，
        // 但是在整个异步组件加载过程中是没有数据发生变化的，
        // 所以通过执行 $forceUpdate 可以强制组件重新渲染一次
        forceRender(true)
      } else {
        owners.length = 0
      }
    })

    const reject = once(reason => {
      process.env.NODE_ENV !== 'production' && warn(
        `Failed to resolve async component: ${String(factory)}` +
        (reason ? `\nReason: ${reason}` : '')
      )
      if (isDef(factory.errorComp)) {
        // 定义了errorComp，渲染errorComp组件
        factory.error = true
        // 执行 forceRender() 再次执行到 resolveAsyncComponent
        forceRender(true)
      }
    })

    /**
     * 异步组件中 resolve reject 在此传入
     * 普通工厂函数：res是undefined
     * Promise工厂函数：res是一个Promsie对象
     * 高级工厂函数：res是用户定义的对象
     */
    const res = factory(resolve, reject)

    if (isObject(res)) {
      if (isPromise(res)) { // Promise工厂函数
        // () => Promise
        if (isUndef(factory.resolved)) {
          // 执行Promise工厂函数then 当异步组件加载成功后，执行resolve，失败执行reject
          res.then(resolve, reject)
        }
      } else if (isPromise(res.component)) { // 高级工厂函数
        // 执行Promise工厂函数then 当异步组件加载成功后，执行resolve，失败执行reject
        res.component.then(resolve, reject)

        // 异步组件加载是一个异步过程，接着又同步执行了下面逻辑
        if (isDef(res.error)) {
          // 转化error时的errorComp构造函数
          factory.errorComp = ensureCtor(res.error, baseCtor)
        }

        if (isDef(res.loading)) {
          // 转化loading时的loadingComp构造函数
          factory.loadingComp = ensureCtor(res.loading, baseCtor)

          // 如果设置了res.delay且为 0，则设置factory.loading = true
          if (res.delay === 0) {
            // 展示加载时组件的延时时间为0 直接将loading置为true 返回loading组件
            factory.loading = true
          } else {
            // 否则延时 delay 的时间执行
            timerLoading = setTimeout(() => {
              timerLoading = null
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                // 执行异步时，仍没有resolved 且 factory.error未定义
                factory.loading = true
                // 执行forceRender
                forceRender(false)
              }
            }, res.delay || 200)
          }
        }

        if (isDef(res.timeout)) {
          // 如果配置了timeout，则在res.timout时间后，如果组件没有成功加载，执行reject
          timerTimeout = setTimeout(() => {
            timerTimeout = null
            // 异步组件加载超时 即如果到了timeout仍未resolved，执行reject
            if (isUndef(factory.resolved)) {
              reject(
                process.env.NODE_ENV !== 'production'
                  ? `timeout (${res.timeout}ms)`
                  : null
              )
            }
          }, res.timeout)
        }
      }
    }

    sync = false
    /**
     * 1.普通工厂异步组件函数  首次执行
     * 2.Promise工厂函数      首次执行
     *   factory.loading是undefined，返回factory.resolved也是undefined，即返回undefined
     * 3.高级异步函数组件： 首次执行
     *   delay为0 直接返回loadingComp组件
     *   delay不为0，factory.loading是undefined，返回factory.resolved也是undefined，即返回undefined
     */
    // return in case resolved synchronously
    return factory.loading
      // 返回loadingComp组件
      ? factory.loadingComp
      : factory.resolved
  }
}
