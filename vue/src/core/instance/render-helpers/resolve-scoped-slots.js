/* @flow */

/**
 * 处理父组件中的插槽AST元素
 * 编译生成AST树中，_u函数，在父组件render生成VNode阶段执行
 * @param {*} fns 
 * @param {*} res 
 * @param {*} hasDynamicKeys 是否有动态插槽
 * @param {*} contentHashKey 插槽唯一key
 * @returns 
 */
export function resolveScopedSlots (
  fns: ScopedSlotsData, // see flow/vnode
  res?: Object,
  // the following are added in 2.6
  hasDynamicKeys?: boolean,
  contentHashKey?: number
): { [key: string]: Function, $stable: boolean } {
  res = res || { $stable: !hasDynamicKeys }
  for (let i = 0; i < fns.length; i++) {
    const slot = fns[i]
    if (Array.isArray(slot)) {
      // 数组递归调用本身
      resolveScopedSlots(slot, res, hasDynamicKeys)
    } else if (slot) {
      // marker for reverse proxying v-slot without scope on this.$slots
      // 反向代理标识 没有插槽prop的插槽AST会被反向代理到$slots上
      if (slot.proxy) {
        slot.fn.proxy = true
      }
      res[slot.key] = slot.fn
    }
  }
  if (contentHashKey) {
    // 添加唯一标识key
    (res: any).$key = contentHashKey
  }
  /**
   * {
   *  [slot.key]: slot.fn, // slot.fn.proxy = true
   *  $key?: contentHashKey,
   *  $stable: !hasDynamicKeys
   * }
   */
  return res
}
