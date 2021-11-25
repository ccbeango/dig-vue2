/* @flow */

import { extend, warn, isObject } from 'core/util/index'

/**
 * Runtime helper for rendering <slot>
 * 将<slot>节点渲染成对应的插槽节点
 * 
 * 执行时机是当前的子组件，在子组件作用域中，调用scopedSlotFn()来创建父组件中的VNode，
 * 这时父组件中就能访问到子组件作用域中的数据，这就是作用域插槽能访问子组件数据的根本原因。
 * 所以插槽元素，它的本质上并不是在父组件编译和render阶段生成，它会把它延迟，作为一个函数
 * 保留下来。真正生成VNode的时机，是延迟到子组件的创建过程中再去执行。因为子组件的创建过程
 * 中它的上下文肯定是子组件的vm实例，所以说它就可以在子组件执行过程中访问到子组件这个对象，
 * 而这个插槽prop，是在编译阶段构造出的对象传入的，这时就可以访问到子组件中的数据。
 * 如果子组件中的数据是字符串，就可以直接访问到此字符串；如果子组件的数据是一个变量，因为当前
 * 的上下文环境是子组件，就可以访问到子组件中定义的这个变量
 * 
 * 对于默认插槽和旧语法的具名插槽，那么scopedSlotFn执行都会代理到$slots上
 * 
 * 所以，对于旧语法的默认插槽和作用域插槽，它们的渲染作用域都是父组件；
 * 而新语法的插槽，除默认插槽的渲染作用域是父级外，其它的渲染时机都是子插槽组件
 * @param {*} name 插槽名
 * @param {*} fallbackRender 默认插槽内容渲染函数
 * @param {*} props slot标签上的属性 如 hello="world" :hello="world" v-bind:hello="world"
 * @param {*} bindObject slot标签上v-bind绑定的对象属性  v-bind="hello" hello: { foo: 'foo', bar: 'bar' }
 * @returns 
 */
export function renderSlot (
  name: string,
  fallbackRender: ?((() => Array<VNode>) | Array<VNode>),
  props: ?Object,
  bindObject: ?Object
): ?Array<VNode> {
  const scopedSlotFn = this.$scopedSlots[name]
  let nodes
  if (scopedSlotFn) {
    // scoped slot
    props = props || {}
    if (bindObject) { // v-bind绑定对象属性
      if (process.env.NODE_ENV !== 'production' && !isObject(bindObject)) {
        // 警告 v-bind必须绑定对象值
        warn('slot v-bind without argument expects an Object', this)
      }
      // 合并绑定的对象属性到props上
      props = extend(extend({}, bindObject), props)
    }

    nodes =
      // 调用插槽函数 传入插槽prop
      scopedSlotFn(props) ||
      // 插槽函数返回值false 执行默认插槽函数
      (typeof fallbackRender === 'function' ? fallbackRender() : fallbackRender)
  } else {
    // scopedSlotFn不为真
    nodes =
      this.$slots[name] ||
      // 用户未传插槽内容 调用默认插槽内容函数
      (typeof fallbackRender === 'function' ? fallbackRender() : fallbackRender)
  }

  // 绑定的插槽名
  const target = props && props.slot
  if (target) {
    return this.$createElement('template', { slot: target }, nodes)
  } else {
    return nodes
  }
}
