/* @flow */

/**
 * 是否是异步组件占位符VNode节点
 * @param {*} node 
 * @returns 
 */
export function isAsyncPlaceholder (node: VNode): boolean {
  return node.isComment && node.asyncFactory
}
