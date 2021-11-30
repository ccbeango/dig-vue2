/* @flow */

// Provides transition support for a single element/component.
// supports transition mode (out-in / in-out)

import { warn } from 'core/util/index'
import { camelize, extend, isPrimitive } from 'shared/util'
import {
  mergeVNodeHook,
  isAsyncPlaceholder,
  getFirstComponentChild
} from 'core/vdom/helpers/index'

export const transitionProps = {
  name: String,
  appear: Boolean,
  css: Boolean,
  mode: String,
  type: String,
  enterClass: String,
  leaveClass: String,
  enterToClass: String,
  leaveToClass: String,
  enterActiveClass: String,
  leaveActiveClass: String,
  appearClass: String,
  appearActiveClass: String,
  appearToClass: String,
  duration: [Number, String, Object]
}

/**
 * in case the child is also an abstract component, e.g. <keep-alive>
 * we want to recursively retrieve the real component to be rendered
 * 获取到真实VNode节点，忽略掉transition的抽象节点
 * @param {*} vnode 
 * @returns 
 */
function getRealChild (vnode: ?VNode): ?VNode {
  const compOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions
  if (compOptions && compOptions.Ctor.options.abstract) {
    return getRealChild(getFirstComponentChild(compOptions.children))
  } else {
    return vnode
  }
}

/**
 * 提取transition组件上的属性和事件，
 * 生成transition组件的VNode.data.transition对象
 * @param {*} comp 
 * @returns 
 */
export function extractTransitionData (comp: Component): Object {
  const data = {}
  const options: ComponentOptions = comp.$options
  // props
  for (const key in options.propsData) {
    // 组件上的prop
    data[key] = comp[key]
  }
  // events.
  // extract listeners and pass them directly to the transition methods
  const listeners: ?Object = options._parentListeners
  for (const key in listeners) {
    // 组件上的事件
    data[camelize(key)] = listeners[key]
  }
  return data
}

function placeholder (h: Function, rawChild: VNode): ?VNode {
  if (/\d-keep-alive$/.test(rawChild.tag)) {
    return h('keep-alive', {
      props: rawChild.componentOptions.propsData
    })
  }
}

function hasParentTransition (vnode: VNode): ?boolean {
  while ((vnode = vnode.parent)) {
    if (vnode.data.transition) {
      return true
    }
  }
}

function isSameChild (child: VNode, oldChild: VNode): boolean {
  return oldChild.key === child.key && oldChild.tag === child.tag
}

const isNotTextNode = (c: VNode) => c.tag || isAsyncPlaceholder(c)

const isVShowDirective = d => d.name === 'show'

export default {
  name: 'transition',
  props: transitionProps,
  abstract: true,

  render (h: Function) {
    let children: any = this.$slots.default
    if (!children) {
      // 无子节点 不处理
      return
    }

    // filter out text nodes (possible whitespaces)
    children = children.filter(isNotTextNode)
    /* istanbul ignore if */
    if (!children.length) {
      // 过滤掉空白节点后无节点 不处理
      return
    }

    // warn multiple elements
    if (process.env.NODE_ENV !== 'production' && children.length > 1) {
      // 警告 只支持单节点 多个节点可使用transition-group组件
      warn(
        '<transition> can only be used on a single element. Use ' +
        '<transition-group> for lists.',
        this.$parent
      )
    }

    const mode: string = this.mode

    // warn invalid mode
    if (process.env.NODE_ENV !== 'production' &&
      mode && mode !== 'in-out' && mode !== 'out-in'
    ) {
      // 警告 只支持in-out和out-in模式
      warn(
        'invalid <transition> mode: ' + mode,
        this.$parent
      )
    }

    const rawChild: VNode = children[0]

    // if this is a component root node and the component's
    // parent container node also has transition, skip.
    if (hasParentTransition(this.$vnode)) {
      // transition组件作为组件渲染VNode的根节点，它在父组件的占位符VNode节点$vnode也被
      // 一个transition组件包裹，直接忽略掉此根节点的transition组件，返回此transition的子节点
      return rawChild
    }

    // apply transition data to child
    // use getRealChild() to ignore abstract components e.g. keep-alive
    // 获取到真实VNode节点，忽略掉抽象节点，如transition包裹keep-alive，或transition包裹transition
    const child: ?VNode = getRealChild(rawChild)
    /* istanbul ignore if */
    if (!child) {
      // 抽象节点没有包裹真实节点，返回当前的抽象节点
      return rawChild
    }

    // FIXME：特殊case处理
    if (this._leaving) {
      return placeholder(h, rawChild)
    }

    // ensure a key that is unique to the vnode type and to this transition
    // component instance. This key will be used to remove pending leaving nodes
    // during entering.
    const id: string = `__transition-${this._uid}-` // 组件id
    child.key = child.key == null // 生成子节点的key
      ? child.isComment
        ? id + 'comment'
        : id + child.tag
      : isPrimitive(child.key)
        ? (String(child.key).indexOf(id) === 0 ? child.key : id + child.key)
        : child.key

    // 扩展transition组件的data到VNode.data.transition
    const data: Object = (child.data || (child.data = {})).transition = extractTransitionData(this)
    const oldRawChild: VNode = this._vnode
    const oldChild: VNode = getRealChild(oldRawChild) // 获取组件旧的渲染VNode

    // mark v-show
    // so that the transition module can hand over the control to the directive
    if (child.data.directives && child.data.directives.some(isVShowDirective)) {
      // 处理v-show指令 添加show
      child.data.show = true
    }

    // FIXME：特殊case处理
    if (
      oldChild &&
      oldChild.data &&
      !isSameChild(child, oldChild) &&
      !isAsyncPlaceholder(oldChild) &&
      // #6687 component root is a comment node
      !(oldChild.componentInstance && oldChild.componentInstance._vnode.isComment)
    ) {
      // replace old child transition data with fresh one
      // important for dynamic transitions!
      const oldData: Object = oldChild.data.transition = extend({}, data)
      // handle transition mode
      if (mode === 'out-in') {
        // return placeholder node and queue update when leave finishes
        this._leaving = true
        mergeVNodeHook(oldData, 'afterLeave', () => {
          this._leaving = false
          this.$forceUpdate()
        })
        return placeholder(h, rawChild)
      } else if (mode === 'in-out') {
        if (isAsyncPlaceholder(child)) {
          return oldRawChild
        }
        let delayedLeave
        const performLeave = () => { delayedLeave() }
        mergeVNodeHook(data, 'afterEnter', performLeave)
        mergeVNodeHook(data, 'enterCancelled', performLeave)
        mergeVNodeHook(oldData, 'delayLeave', leave => { delayedLeave = leave })
      }
    }

    return rawChild
  }
}
