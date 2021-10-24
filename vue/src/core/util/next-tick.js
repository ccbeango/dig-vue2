/* @flow */
/* globals MutationObserver */

import { noop } from 'shared/util'
import { handleError } from './error'
import { isIE, isIOS, isNative } from './env'

/**
 * nextTick利用JS的事件循环来完成
 * 
 * ECMAScript规范中规定task分为两大类，分别是macro task和micro task，
 * 并且每个macro task结束后，都要清空所有的micro task
 * 
 * 在浏览器环境中：
 *    常见的macro task有 setTimeout、MessageChannel、postMessage、setImmediate
 *    常见的micro task有 MutationObsever、Promise.then
 */

export let isUsingMicroTask = false // 是否使用微任务标识

const callbacks = []
let pending = false

/**
 * 执行一个微任务中的所有异步回调
 */
function flushCallbacks () {
  pending = false
  const copies = callbacks.slice(0)
  // 清空当前的callbacks队列
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

// Here we have async deferring wrappers using microtasks.
// In 2.5 we used (macro) tasks (in combination with microtasks).
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// So we now use microtasks everywhere, again.
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
/**
 * 2.5中使用宏任务结合微任务，但导致了一些不易察觉的问题，
 * 如重绘、事件中无法避免的奇怪问题
 * 因此2.6中全都使用微任务。这个折衷的主要缺点是，某些场景下微任务权重太高，
 * 会在两个顺序事件之间触发，或甚至在一个事件的冒泡中触发
 */
let timerFunc

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
/* istanbul ignore next, $flow-disable-line */
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  // 优先使用Promise作为微任务
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    // In problematic UIWebViews, Promise.then doesn't completely break, but
    // it can get stuck in a weird state where callbacks are pushed into the
    // microtask queue but the queue isn't being flushed, until the browser
    // needs to do some other work, e.g. handle a timer. Therefore we can
    // "force" the microtask queue to be flushed by adding an empty timer.
    // 通过setTimeout(noop)强制flush微任务队列，避免IOS的一些bug问题
    // 原理：ECMAScript规范中规定task分为两大类，分别是macro task和micro task，
    // 并且每个macro task结束后，都要清空所有的micro task
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  // Use MutationObserver where native Promise is not available,
  // e.g. PhantomJS, iOS7, Android 4.4
  // (#6466 MutationObserver is unreliable in IE11)
  /**
   * Promise不可用 且 MutationObserver可用 且 非IE11 (IE11的MutationObserver不可靠)
   * 使用MutationObserver作为微任务
   */
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  // observe textNode上的characterData，即字符数据变化
  observer.observe(textNode, {
    characterData: true
  })
  /**
   * timerFunc执行，textNode节点的字符数据变化，
   * 会触发MutationObserver的回调flushCallbacks异步执行
   */
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // Fallback to setImmediate.
  // Technically it leverages the (macro) task queue,
  // but it is still a better choice than setTimeout.
  // setImmediate利用的是红任务队列，在check阶段执行
  // 比使用setTimeout好的原因是，会在同一事件循环tick中执行
  // setTimeout要等到下一次tick才能执行
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  // Fallback to setTimeout.
  // 其他都不可用，使用setTimeout做微任务
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

/**
 * 利用事件循环，使用微任务实现异步执行
 * nextTick有两种使用方法：
 *  1. 回调函数形式
 *  2. Promise形式
 * @param {*} cb 
 * @param {*} ctx 
 * @returns 
 */
export function nextTick (cb?: Function, ctx?: Object) {
  let _resolve
  // 将要执行的回调函数放入回调队列
  callbacks.push(() => {
    if (cb) {
      // 异步回调形式的执行
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      // Promise形式的执行
      _resolve(ctx)
    }
  })

  if (!pending) {
    // 一次事件循环中即一个Tick中，可能会有多个微任务timerFunc()执行，
    // 但同一时间进来的要执行的cb要放入同一个callbacks队列，
    // 保证同一时间进来的cb放入同一个微任务中去执行，提升性能
    pending = true
    // 异步执行
    timerFunc()
  }

  // $flow-disable-line
  if (!cb && typeof Promise !== 'undefined') {
    // nextTick().then() 形式调用 返回一个Promise
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
