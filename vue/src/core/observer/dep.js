/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * 作用：建立数据和Watcher之间的桥梁
 *  收集对数据Dep有依赖的Watcher
 */
export default class Dep {
  static target: ?Watcher; // 同一时间全局唯一Watcher 
  id: number; // 自身uid
  subs: Array<Watcher>; // 订阅数据变化的所有Watcher

  constructor () {
    this.id = uid++
    this.subs = []
  }

  // 将Watcher添加为数据的订阅者
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  // 移除指定的Watcher
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  // 记录数据和Watcher之间的依赖关系
  depend () {
    if (Dep.target) {
      // 调用Watcher.addDep(this)
      Dep.target.addDep(this)
    }
  }

  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
// 在同一时间的全局唯一Watcher，因为在同一时间只能有一个全局的Watcher被计算
// 利用栈的数据结构，保证Dep.target就是当前正在计算的Watcher
Dep.target = null
const targetStack = []

/**
 * 将当前的Watcher push到targetStack中，记录所有的Watcher
 * 并将Dep.target赋值为当前正在计算的Watcher
 * @param {*} target 
 */
export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

/**
 * pop掉当前的Watcher
 * 将Dep.target恢复为上次正在计算的Watcher 
 */
export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
