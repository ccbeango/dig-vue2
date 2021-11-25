/* @flow */

import { def } from 'core/util/lang'
import { normalizeChildren } from 'core/vdom/helpers/normalize-children'
import { emptyObject } from 'shared/util'
import { isAsyncPlaceholder } from './is-async-placeholder'

/**
 * 标准化父节点中的插槽VNode
 * 在执行_render()时，会先执行此函数
 * 赋值$scopedSlots，给$slots添加反向代理
 * 将$slots中原本添加上的插槽也在$scopedSlots中添加代理
 * @param {*} slots vnode.data.scopedSlots 插槽AST数据
 * @param {*} normalSlots $slots中的默认插槽
 * @param {*} prevSlots $scopedSlots中的原有插槽
 * @returns 
 */
export function normalizeScopedSlots (
  slots: { [key: string]: Function } | void,
  normalSlots: { [key: string]: Array<VNode> },
  prevSlots?: { [key: string]: Function } | void
): any {
  let res
  const hasNormalSlots = Object.keys(normalSlots).length > 0 // $slots中是否有插槽
  const isStable = slots ? !!slots.$stable : !hasNormalSlots // 是否是不变的插槽AST数据
  const key = slots && slots.$key // 唯一标识key
  if (!slots) {
    // 没有要添加的插槽AST 初始化成空对象
    res = {}
  } else if (slots._normalized) {
    // fast path 1: child component re-render only, parent did not change
    // 已被normalizeScopedSlots处理过的插槽AST数据，会将生成的VNode结果保存在_normalized中
    // 直接返回已标准化过的插槽结果
    return slots._normalized
  } else if (
    isStable &&
    prevSlots &&
    prevSlots !== emptyObject &&
    key === prevSlots.$key &&
    !hasNormalSlots &&
    !prevSlots.$hasNormal
  ) {
    // fast path 2: stable scoped slots w/ no normal slots to proxy,
    // only need to normalize once
    // 是不变的插槽，并且已标准化生成过插槽，插槽内容没变过($key相等)，并且没有要代理的$slots插槽
    // 上次生成的插槽中也没有要代理的$slots插槽 只需要标准化处理一次 返回上次标准化插槽的结果
    return prevSlots
  } else {
    res = {}
    for (const key in slots) {
      if (slots[key] && key[0] !== '$') {
        res[key] = normalizeScopedSlot(normalSlots, key, slots[key])
      }
    }
  }

  // expose normal slots on scopedSlots
  for (const key in normalSlots) {
    if (!(key in res)) {
      // 将$scopedSlots中没有，$slots中有的插槽，代理到$scopedSlots上
      res[key] = proxyNormalSlot(normalSlots, key)
    }
  }
  // avoriaz seems to mock a non-extensible $scopedSlots object
  // and when that is passed down this would cause an error
  if (slots && Object.isExtensible(slots)) {
    // 保存已标准化处理过的插槽VNode
    (slots: any)._normalized = res
  }
  // 扩展$stable $key $hasNormal字段
  def(res, '$stable', isStable)
  def(res, '$key', key)
  def(res, '$hasNormal', hasNormalSlots)

  /**
   * {
   *  [slotName1]: normalized1 () {...},
   *  [slotName2]: normalized2 () {...},
   *  $stable: Boolean, 是否是不变的插槽 即 非动态插槽
   *  $hasNormal: Boolean,  是否有默认插槽
   *  $key: String | Undefined, 插槽唯一key
   * }
   */
  return res
}

/**
 * 标准化插槽 返回标准化后的插槽函数
 * @param {*} normalSlots 
 * @param {*} key 
 * @param {*} fn 
 * @returns 
 */
function normalizeScopedSlot(normalSlots, key, fn) {
  // 标准化插槽函数 真正执行插槽函数fn，生成VNode 
  const normalized = function () {
    // 执行插槽处理函数，生成VNode 使用arguments对象传入执行此插槽函数的插槽prop
    let res = arguments.length ? fn.apply(null, arguments) : fn({}) // 没有参数，默认传空对象
    res = res && typeof res === 'object' && !Array.isArray(res)
      ? [res] // single vnode
      // 标准化数组插槽VNode
      : normalizeChildren(res)
    let vnode: ?VNode = res && res[0]
    // 返回生成的VNode
    return res && (
      !vnode ||
      (res.length === 1 && vnode.isComment && !isAsyncPlaceholder(vnode)) // #9658, #10391
    ) ? undefined
      : res
  }
  // this is a slot using the new v-slot syntax without scope. although it is
  // compiled as a scoped slot, render fn users would expect it to be present
  // on this.$slots because the usage is semantically a normal slot.
  if (fn.proxy) {
    // 将$scopedSlots中的非作用域插槽，同步添加到$slots中
    Object.defineProperty(normalSlots, key, {
      get: normalized,
      enumerable: true,
      configurable: true
    })
  }
  return normalized
}

/**
 * 代理$slots中的插槽
 *  默认插槽以及旧语法添加的具名插槽，都会调用此方法添加$slots的代理
 *  当renderSlot执行时，这些插槽就会在父组件中渲染
 *  而新语法添加的非默认插槽，以及旧语法的作用域插槽，都会在子插槽组件执行阶段渲染
 * @param {*} slots $slots
 * @param {*} key 要代理的插槽名
 * @returns 
 */
function proxyNormalSlot(slots, key) {
  return () => slots[key]
}
