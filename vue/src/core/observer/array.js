/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 * 对Array原型上的几个API进行增强
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 * 使用继承，对Array原型上的一些方法(methodsToPatch)重写
 * 执行时可将元素变成响应式的，并派发更新
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  def(arrayMethods, method, function mutator (...args) {
    // 执行原数组API方法
    const result = original.apply(this, args)
    // 增强处理
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        // 获取新增的元素
        inserted = args
        break
      case 'splice':
        // 获取新增的元素
        inserted = args.slice(2)
        break
    }
    // 将新增元素设置成响应式元素
    if (inserted) ob.observeArray(inserted)
    // notify change
    // 手动派发更新
    ob.dep.notify()
    return result
  })
})
