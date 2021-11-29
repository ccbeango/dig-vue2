/* @flow */

import { isDef } from 'shared/util'
import { isAsyncPlaceholder } from './is-async-placeholder'

/**
 * 获取数组VNode元素中第一个组件VNode或异步组件占位符VNode
 * @param {*} children 
 * @returns 
 */
export function getFirstComponentChild (children: ?Array<VNode>): ?VNode {
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const c = children[i]
      if (isDef(c) && (isDef(c.componentOptions) || isAsyncPlaceholder(c))) {
        return c
      }
    }
  }
}
