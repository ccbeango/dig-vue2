/* @flow */

import { _Set as Set, isObject } from '../util/index'
import type { SimpleSet } from '../util/index'
import VNode from '../vdom/vnode'

const seenObjects = new Set()

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 * 对一个响应式对象进行深层遍历访问，访问过程会触发对象中每个属性的getter，进而每个
 * 属性的Dep会进行依赖收集，每个属性的Dep中都会添加此对象的userWatcher到subs中，即
 * userWatcher实现了对此对象的每个属性都进行订阅
 * 
 * traverse后，再修改此对象内部任何一个值，都会触发相应属性值的Dep派发更新，触发Dep.subs中的
 * 所有Watcher，那么就也会调用到userWatcher的回调函数了
 * 
 * 这个函数实现还有一个小的优化，遍历过程中会把子响应式对象通过它们的dep.id记录到
 * seenObjects，避免以后重复访问
 */
export function traverse (val: any) {
  _traverse(val, seenObjects)
  seenObjects.clear()
}

function _traverse (val: any, seen: SimpleSet) {
  let i, keys
  const isA = Array.isArray(val)
  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    /**
     * Reject
     *  1. val不是数组或对象
     *  2. 或 val是被冻结的
     *  3. 或 val是VNode实例
     */
    return
  }

  if (val.__ob__) {
    // val已是响应式对象
    const depId = val.__ob__.dep.id
    if (seen.has(depId)) {
      // 已经traverse过，结束，避免重复traverse访问，重复依赖收集
      return
    }
    // 记录dep.ip
    seen.add(depId)
  }

  // 递归遍历 保证对val中每个值都访问到，触发每个值的依赖数据Dep进行依赖收集
  if (isA) {
    // val是数组
    i = val.length
    while (i--) _traverse(val[i], seen) // 递归traverse
  } else {
    // val是对象
    keys = Object.keys(val)
    i = keys.length
    while (i--) _traverse(val[keys[i]], seen) // 递归traverse
  }
}
