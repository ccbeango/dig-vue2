/* @flow */

import { inBrowser, isIE9 } from 'core/util/index'
import { addClass, removeClass } from './class-util'
import { remove, extend, cached } from 'shared/util'

/**
 * 解析transition的数据
 *  对象上扩展css过渡类
 * @param {*} def 
 * @returns 
 */
export function resolveTransition (def?: string | Object): ?Object {
  if (!def) { // 未定义
    return
  }
  /* istanbul ignore else */
  if (typeof def === 'object') {
    const res = {}
    if (def.css !== false) {
      // 扩展css的所有默认的过渡类名到res上
      extend(res, autoCssTransition(def.name || 'v'))
    }
    // 扩展定义的trasition对象到res上
    // def扩展在过渡类名之后，是因为过渡类名用户可以自定义，覆盖掉默认的过渡类名
    extend(res, def)
    return res
  } else if (typeof def === 'string') {
    // def是字符串，直接返回扩展的css过度类对象
    return autoCssTransition(def)
  }
}

// traisition需要的css缓存对象
const autoCssTransition: (name: string) => Object = cached(name => {
  return {
    enterClass: `${name}-enter`,
    enterToClass: `${name}-enter-to`,
    enterActiveClass: `${name}-enter-active`,
    leaveClass: `${name}-leave`,
    leaveToClass: `${name}-leave-to`,
    leaveActiveClass: `${name}-leave-active`
  }
})

export const hasTransition = inBrowser && !isIE9
const TRANSITION = 'transition'
const ANIMATION = 'animation'

// Transition property/event sniffing
export let transitionProp = 'transition'
export let transitionEndEvent = 'transitionend'
export let animationProp = 'animation'
export let animationEndEvent = 'animationend'
if (hasTransition) {
  /* istanbul ignore if */
  if (window.ontransitionend === undefined &&
    window.onwebkittransitionend !== undefined
  ) {
    transitionProp = 'WebkitTransition'
    transitionEndEvent = 'webkitTransitionEnd'
  }
  if (window.onanimationend === undefined &&
    window.onwebkitanimationend !== undefined
  ) {
    animationProp = 'WebkitAnimation'
    animationEndEvent = 'webkitAnimationEnd'
  }
}

// binding to window is necessary to make hot reload work in IE in strict mode
const raf = inBrowser
  ? window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : setTimeout
  : /* istanbul ignore next */ fn => fn()
/**
 * requestAnimationFrame封装
 * @param {*} fn 
 */
export function nextFrame (fn: Function) {
  raf(() => {
    raf(fn)
  })
}

/**
 * 元素节点添加过渡的class
 * @param {*} el 
 * @param {*} cls 
 */
export function addTransitionClass (el: any, cls: string) {
  const transitionClasses = el._transitionClasses || (el._transitionClasses = [])
  if (transitionClasses.indexOf(cls) < 0) {
    transitionClasses.push(cls)
    addClass(el, cls)
  }
}

export function removeTransitionClass (el: any, cls: string) {
  if (el._transitionClasses) {
    remove(el._transitionClasses, cls)
  }
  removeClass(el, cls)
}

/**
 * 根据过渡或动画结束事件执行_enterCb回调
 * @param {*} el 
 * @param {*} expectedType 
 * @param {*} cb 
 * @returns 
 */
export function whenTransitionEnds (
  el: Element,
  expectedType: ?string,
  cb: Function
) {
  const { type, timeout, propCount } = getTransitionInfo(el, expectedType)
  if (!type) return cb()
  const event: string = type === TRANSITION ? transitionEndEvent : animationEndEvent
  let ended = 0
  const end = () => {
    el.removeEventListener(event, onEnd)
    cb()
  }
  const onEnd = e => {
    if (e.target === el) {
      if (++ended >= propCount) {
        end()
      }
    }
  }
  setTimeout(() => {
    if (ended < propCount) {
      end()
    }
  }, timeout + 1)
  // 监听transitionend或animationend，根据动画结束事件，执行_enterCb回调
  el.addEventListener(event, onEnd)
}

const transformRE = /\b(transform|all)(,|$)/

export function getTransitionInfo (el: Element, expectedType?: ?string): {
  type: ?string;
  propCount: number;
  timeout: number;
  hasTransform: boolean;
} {
  const styles: any = window.getComputedStyle(el)
  // JSDOM may return undefined for transition properties
  const transitionDelays: Array<string> = (styles[transitionProp + 'Delay'] || '').split(', ')
  const transitionDurations: Array<string> = (styles[transitionProp + 'Duration'] || '').split(', ')
  const transitionTimeout: number = getTimeout(transitionDelays, transitionDurations)
  const animationDelays: Array<string> = (styles[animationProp + 'Delay'] || '').split(', ')
  const animationDurations: Array<string> = (styles[animationProp + 'Duration'] || '').split(', ')
  const animationTimeout: number = getTimeout(animationDelays, animationDurations)

  let type: ?string
  let timeout = 0
  let propCount = 0
  /* istanbul ignore if */
  if (expectedType === TRANSITION) {
    if (transitionTimeout > 0) {
      type = TRANSITION
      timeout = transitionTimeout
      propCount = transitionDurations.length
    }
  } else if (expectedType === ANIMATION) {
    if (animationTimeout > 0) {
      type = ANIMATION
      timeout = animationTimeout
      propCount = animationDurations.length
    }
  } else {
    timeout = Math.max(transitionTimeout, animationTimeout)
    type = timeout > 0
      ? transitionTimeout > animationTimeout
        ? TRANSITION
        : ANIMATION
      : null
    propCount = type
      ? type === TRANSITION
        ? transitionDurations.length
        : animationDurations.length
      : 0
  }
  const hasTransform: boolean =
    type === TRANSITION &&
    transformRE.test(styles[transitionProp + 'Property'])
  return {
    type,
    timeout,
    propCount,
    hasTransform
  }
}

function getTimeout (delays: Array<string>, durations: Array<string>): number {
  /* istanbul ignore next */
  while (delays.length < durations.length) {
    delays = delays.concat(delays)
  }

  return Math.max.apply(null, durations.map((d, i) => {
    return toMs(d) + toMs(delays[i])
  }))
}

// Old versions of Chromium (below 61.0.3163.100) formats floating pointer numbers
// in a locale-dependent way, using a comma instead of a dot.
// If comma is not replaced with a dot, the input will be rounded down (i.e. acting
// as a floor function) causing unexpected behaviors
function toMs (s: string): number {
  return Number(s.slice(0, -1).replace(',', '.')) * 1000
}
