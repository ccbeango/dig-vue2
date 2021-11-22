/* @flow */

import VNode from '../vnode'
import { createFnInvoker } from './update-listeners'
import { remove, isDef, isUndef, isTrue } from 'shared/util'

/**
 * VNode节点上存储钩子函数
 * vnode.data.hook[hookKey] = [hook1, hook2]
 *  - 存储指令定义的钩子函数
 * @param {*} def VNode
 * @param {*} hookKey 
 * @param {*} hook handler
 */
export function mergeVNodeHook (def: Object, hookKey: string, hook: Function) {
  if (def instanceof VNode) {
    // VNode.data没有定义hook，初始化 此时def是data中的指令的hook对象
    def = def.data.hook || (def.data.hook = {})
  }
  let invoker
  const oldHook = def[hookKey]

  /**
   * 对指令的hook包裹，确保只执行一次
   */
  function wrappedHook () {
    hook.apply(this, arguments)
    // important: remove merged hook to ensure it's called only once
    // and prevent memory leak
    remove(invoker.fns, wrappedHook)
  }

  if (isUndef(oldHook)) {
    // 指令hook不存在，创建它的执行钩子函数
    // no existing hook
    invoker = createFnInvoker([wrappedHook])
  } else {
    // 更新已存在的hook
    /* istanbul ignore if */
    if (isDef(oldHook.fns) && isTrue(oldHook.merged)) {
      // 已经执行过mergeVNodeHook合并的hook hook是数组
      // already a merged invoker
      invoker = oldHook
      invoker.fns.push(wrappedHook) // push新的hook即可
    } else {
      // existing plain hook
      // 第一次执行，并且def.data.hook在第一次执行时候旧已经有定义，那么将已有的和
      // 新的wrappedHook合并起来
      invoker = createFnInvoker([oldHook, wrappedHook])
    }
  }
  // 添加merged标识
  invoker.merged = true
  def[hookKey] = invoker
}
