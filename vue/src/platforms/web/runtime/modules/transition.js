/* @flow */

import { inBrowser, isIE9, warn } from 'core/util/index'
import { mergeVNodeHook } from 'core/vdom/helpers/index'
import { activeInstance } from 'core/instance/lifecycle'

import {
  once,
  isDef,
  isUndef,
  isObject,
  toNumber
} from 'shared/util'

import {
  nextFrame,
  resolveTransition,
  whenTransitionEnds,
  addTransitionClass,
  removeTransitionClass
} from '../transition-util'

export function enter (vnode: VNodeWithData, toggleDisplay: ?() => void) {
  const el: any = vnode.elm

  // FIXME： 跳过 leave回调执行 执行leave钩子时，又执行了enter处理逻辑
  // leave执行需要时间，还未执行完的时候，又执行了enter，就会命中这里
  // call leave callback now
  if (isDef(el._leaveCb)) {
    el._leaveCb.cancelled = true
    el._leaveCb()
  }

  // 解析transition的数据
  const data = resolveTransition(vnode.data.transition)
  if (isUndef(data)) {
    // vnode.data.transition未定义 即不是transition组件 不处理
    return
  }

  /* istanbul ignore if */
  if (isDef(el._enterCb) || el.nodeType !== 1) {
    // enter还未执行结束又执行 或 不是HTML元素节点 不处理
    return
  }

  // transition所有的属性
  const {
    css,
    type,
    enterClass,
    enterToClass,
    enterActiveClass,
    appearClass,
    appearToClass,
    appearActiveClass,
    beforeEnter,
    enter,
    afterEnter,
    enterCancelled,
    beforeAppear,
    appear,
    afterAppear,
    appearCancelled,
    duration
  } = data

  // activeInstance will always be the <transition> component managing this
  // transition. One edge case to check is when the <transition> is placed
  // as the root node of a child component. In that case we need to check
  // <transition>'s parent for appear check.
  /**
   * 边界情况处理：当<transition>作为子组件的根节点，那么我们需要检查它的父组件作为appear的检查
   * 这个时候<transition>组件已经是根节点了，那么为了判断<transition>组件是否已挂载
   * _isMounted应该由父节点来决定
   */
  let context = activeInstance // transition渲染的上下文vm实例
  let transitionNode = activeInstance.$vnode // transition组件的占位符VNode
  while (transitionNode && transitionNode.parent) {
    // transitionNode.parent为真，说明<transition>是一个组件的根节点
    context = transitionNode.context
    transitionNode = transitionNode.parent
  }
  // isAppear表示当前上下文实例还没有mounted，即第一次出现的时机
  const isAppear = !context._isMounted || !vnode.isRootInsert // 未挂载 或 不是根插入节点
  if (isAppear && !appear && appear !== '') {
    // 如果是第一次渲染，并且<transition>组件没有配置appear的话，直接返回
    return
  }

  // 获取过渡类名处理
  const startClass = isAppear && appearClass
    ? appearClass
    : enterClass
  const activeClass = isAppear && appearActiveClass
    ? appearActiveClass
    : enterActiveClass
  const toClass = isAppear && appearToClass
    ? appearToClass
    : enterToClass

  // 获取钩子函数处理
  const beforeEnterHook = isAppear
    ? (beforeAppear || beforeEnter)
    : beforeEnter
  const enterHook = isAppear
    ? (typeof appear === 'function' ? appear : enter)
    : enter
  const afterEnterHook = isAppear
    ? (afterAppear || afterEnter)
    : afterEnter
  const enterCancelledHook = isAppear
    ? (appearCancelled || enterCancelled)
    : enterCancelled

  // 正常情况下，结束是根据transition自身的transitionend事件决定的 也可指定过渡结束时间
  // 显性过渡持续时间处理 number | { enter: number, leave: number }
  const explicitEnterDuration: any = toNumber(
    isObject(duration)
      ? duration.enter
      : duration
  )

  if (process.env.NODE_ENV !== 'production' && explicitEnterDuration != null) {
    checkDuration(explicitEnterDuration, 'enter', vnode)
  }

  // 使用css
  const expectsCSS = css !== false && !isIE9 // css为true 且 非IE9
  const userWantsControl = getHookArgumentsLength(enterHook) // 用户是否想要控制

  // 定义_enterCb回调
  const cb = el._enterCb = once(() => {
    if (expectsCSS) {
      removeTransitionClass(el, toClass) // 移除toClass
      removeTransitionClass(el, activeClass) // 移除activeClass
    }
    if (cb.cancelled) {
      if (expectsCSS) {
        removeTransitionClass(el, startClass) // 移除startClass
      }
      enterCancelledHook && enterCancelledHook(el)
    } else {
      // cancelled
      afterEnterHook && afterEnterHook(el)
    }
    el._enterCb = null
  })

  if (!vnode.data.show) {
    // remove pending leave element on enter by injecting an insert hook
    // 在vnode.data.hook.insert中插入钩子 
    mergeVNodeHook(vnode, 'insert', () => {
      const parent = el.parentNode
      const pendingNode = parent && parent._pending && parent._pending[vnode.key]
      if (pendingNode &&
        pendingNode.tag === vnode.tag &&
        pendingNode.elm._leaveCb
      ) {
        /**
         * parentNode是pending状态，执行leave回调
         */
        pendingNode.elm._leaveCb()
      }
      // 执行enterHook
      enterHook && enterHook(el, cb)
    })
  }

  // start enter transition
  beforeEnterHook && beforeEnterHook(el) // 执行beforeEnter钩子

  if (expectsCSS) {
    // 添加startClass、activeClass
    addTransitionClass(el, startClass)
    addTransitionClass(el, activeClass)
    // 下一帧开始执行动画
    nextFrame(() => {
      // 重绘屏幕前调用此回调函数
      // 移除startClass
      removeTransitionClass(el, startClass)
      if (!cb.cancelled) {
        // enter的回调cb没有被取消cancelled，添加toClass
        addTransitionClass(el, toClass)
        if (!userWantsControl) { // 不是用户想要控制
          if (isValidDuration(explicitEnterDuration)) {
            // 定义了显性过渡持续时间 使用setTimeout执行
            setTimeout(cb, explicitEnterDuration)
          } else {
            // 
            whenTransitionEnds(el, type, cb)
          }
        }
      }
    })
  }

  if (vnode.data.show) {
    toggleDisplay && toggleDisplay()
    enterHook && enterHook(el, cb)
  }

  if (!expectsCSS && !userWantsControl) {
    cb()
  }
}

export function leave (vnode: VNodeWithData, rm: Function) {
  const el: any = vnode.elm

  // call enter callback now
  if (isDef(el._enterCb)) {
    el._enterCb.cancelled = true
    el._enterCb()
  }

  const data = resolveTransition(vnode.data.transition)
  if (isUndef(data) || el.nodeType !== 1) {
    return rm()
  }

  /* istanbul ignore if */
  if (isDef(el._leaveCb)) {
    return
  }

  const {
    css,
    type,
    leaveClass,
    leaveToClass,
    leaveActiveClass,
    beforeLeave,
    leave,
    afterLeave,
    leaveCancelled,
    delayLeave,
    duration
  } = data

  const expectsCSS = css !== false && !isIE9
  const userWantsControl = getHookArgumentsLength(leave)

  const explicitLeaveDuration: any = toNumber(
    isObject(duration)
      ? duration.leave
      : duration
  )

  if (process.env.NODE_ENV !== 'production' && isDef(explicitLeaveDuration)) {
    checkDuration(explicitLeaveDuration, 'leave', vnode)
  }

  const cb = el._leaveCb = once(() => {
    if (el.parentNode && el.parentNode._pending) {
      el.parentNode._pending[vnode.key] = null
    }
    if (expectsCSS) {
      removeTransitionClass(el, leaveToClass)
      removeTransitionClass(el, leaveActiveClass)
    }
    if (cb.cancelled) {
      if (expectsCSS) {
        removeTransitionClass(el, leaveClass)
      }
      leaveCancelled && leaveCancelled(el)
    } else {
      rm()
      afterLeave && afterLeave(el)
    }
    el._leaveCb = null
  })

  if (delayLeave) {
    delayLeave(performLeave)
  } else {
    performLeave()
  }

  function performLeave () {
    // the delayed leave may have already been cancelled
    if (cb.cancelled) {
      return
    }
    // record leaving element
    if (!vnode.data.show && el.parentNode) {
      (el.parentNode._pending || (el.parentNode._pending = {}))[(vnode.key: any)] = vnode
    }
    beforeLeave && beforeLeave(el)
    if (expectsCSS) {
      addTransitionClass(el, leaveClass)
      addTransitionClass(el, leaveActiveClass)
      nextFrame(() => {
        removeTransitionClass(el, leaveClass)
        if (!cb.cancelled) {
          addTransitionClass(el, leaveToClass)
          if (!userWantsControl) {
            if (isValidDuration(explicitLeaveDuration)) {
              setTimeout(cb, explicitLeaveDuration)
            } else {
              whenTransitionEnds(el, type, cb)
            }
          }
        }
      })
    }
    leave && leave(el, cb)
    if (!expectsCSS && !userWantsControl) {
      cb()
    }
  }
}

// only used in dev mode
function checkDuration (val, name, vnode) {
  if (typeof val !== 'number') {
    warn(
      `<transition> explicit ${name} duration is not a valid number - ` +
      `got ${JSON.stringify(val)}.`,
      vnode.context
    )
  } else if (isNaN(val)) {
    warn(
      `<transition> explicit ${name} duration is NaN - ` +
      'the duration expression might be incorrect.',
      vnode.context
    )
  }
}

function isValidDuration (val) {
  return typeof val === 'number' && !isNaN(val)
}

/**
 * Normalize a transition hook's argument length. The hook may be:
 * - a merged hook (invoker) with the original in .fns
 * - a wrapped component method (check ._length)
 * - a plain function (.length)
 */
function getHookArgumentsLength (fn: Function): boolean {
  if (isUndef(fn)) {
    return false
  }
  const invokerFns = fn.fns
  if (isDef(invokerFns)) {
    // invoker处理函数递归调用getHookArgumentsLength
    // invoker
    return getHookArgumentsLength(
      Array.isArray(invokerFns)
        ? invokerFns[0]
        : invokerFns
    )
  } else {
    // 函数参数个数大于1 说明用户想控制
    return (fn._length || fn.length) > 1
  }
}

/**
 * create activate钩子时执行
 * @param {*} _ 
 * @param {*} vnode 
 */
function _enter (_: any, vnode: VNodeWithData) {
  if (vnode.data.show !== true) {
    enter(vnode)
  }
}

/**
 * transiton组件钩子函数
 */
export default inBrowser ? {
  create: _enter,
  activate: _enter,
  remove (vnode: VNode, rm: Function) {
    /* istanbul ignore else */
    if (vnode.data.show !== true) {
      leave(vnode, rm)
    } else {
      rm()
    }
  }
} : {}
