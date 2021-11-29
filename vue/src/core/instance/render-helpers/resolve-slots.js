/* @flow */

import type VNode from 'core/vdom/vnode'

/**
 * Runtime helper for resolving raw children VNodes into a slot object.
 */
/**
 * 生成$slot的值
 * 
 * 
 * 执行时机
 *  1. 首次渲染initRender 
 *  2. 默认插槽和旧语法的具名插槽，在父组件内容变化更新子组插槽时updateChildComponent
 * 
 * 父组件未使用插槽语法，父组件的children都会被认为是默认插槽元素，添加到$slots.default数组中
 * 
 * 将组件VNode的children当作插槽VNode节点，生成$slot对象
 * {
 *  defalut: [vnode, vnode],
 *  [name]: [vnode, vnode]
 * }
 * 数组中每个元素就是父元素节点渲染的子VNode
 * 
 * 首次渲染：
 *  1. 旧语法slot="xxx"中：此函数会保存具名插槽和默认插槽
 *  2. 新语法v-slot语法中：此函数只会存储没有写插槽名的默认插槽，即未写v-slot:default的默认插槽
 *     如 未写任何参数的默认插槽 '<p>{{msg}}</p>' 会保存再这里
 *     这种写法 '<template v-slot:default><p>{{msg}}</p></template>' 则也不会保存在$slot中
 *     具名插槽、默认插槽都会保存在$scopedSlots中
 *     其它的具名插槽会在normalizeScopedSlots()处理插槽节点时，给$slots代理
 * @param {*} children 父VNode的children
 * @param {*} context 父VNode的上下文父 即父组件的vm实例
 * @returns 
 */
export function resolveSlots (
  children: ?Array<VNode>,
  context: ?Component
): { [key: string]: Array<VNode> } {
  if (!children || !children.length) {
    return {}
  }
  const slots = {}
  for (let i = 0, l = children.length; i < l; i++) {
    const child = children[i]
    const data = child.data
    // remove slot attribute if the node is resolved as a Vue slot node
    if (data && data.attrs && data.attrs.slot) {
      // 插槽名称slot存在，移除掉此属性 旧插槽语法slot="xxx"中存在此属性
      delete data.attrs.slot
    }

    // named slots should only be respected if the vnode was rendered in the
    // same context.
    if ((child.context === context || child.fnContext === context) &&
      data && data.slot != null
    ) {
      // 旧语法 具名插槽 
      const name = data.slot
      const slot = (slots[name] || (slots[name] = []))
      if (child.tag === 'template') {
        // template上插槽，存储节点的children
        slot.push.apply(slot, child.children || [])
      } else {
        // 非template上插槽 存储节点
        slot.push(child)
      }
    } else {
      // 旧语法 默认插槽 和 新语法不写v-slot的默认插槽 节点存入slots.default数组中 
      (slots.default || (slots.default = [])).push(child)
    }
  }

  // ignore slots that contains only whitespace
  for (const name in slots) {
    // 删除掉插槽空白节点
    if (slots[name].every(isWhitespace)) {
      delete slots[name]
    }
  }
  return slots
}

/**
 * 空白节点
 *  - 注释节点 且 非异步组件
 *  - 空文本节点
 * @param {*} node 
 * @returns 
 */
function isWhitespace (node: VNode): boolean {
  return (node.isComment && !node.asyncFactory) || node.text === ' '
}
