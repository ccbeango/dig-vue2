/* @flow */

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools,
  inBrowser,
  isIE
} from '../util/index'

export const MAX_UPDATE_COUNT = 100

const queue: Array<Watcher> = [] // 待更新的Watcher数组
const activatedChildren: Array<Component> = [] // keep-alive使用
let has: { [key: number]: ?true } = {} // 记录queue中的Watcher.id，避免Watcher重复添加
let circular: { [key: number]: number } = {} // Watcher的循环更新次数计数
let waiting = false // 是否在执行nextTick，保证只执行一次
let flushing = false // 是否在flushing阶段
let index = 0 // 当前正执行的Watcher的queue索引

/**
 * Reset the scheduler's state.
 * flushSchedulerQueue执行结束，重置上方定义的scheduler状态
 */
function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

// Async edge case #6566 requires saving the timestamp when event listeners are
// attached. However, calling performance.now() has a perf overhead especially
// if the page has thousands of event listeners. Instead, we take a timestamp
// every time the scheduler flushes and use that for all event listeners
// attached during that flush.
export let currentFlushTimestamp = 0

// Async edge case fix requires storing an event listener's attach timestamp.
let getNow: () => number = Date.now

// Determine what event timestamp the browser is using. Annoyingly, the
// timestamp can either be hi-res (relative to page load) or low-res
// (relative to UNIX epoch), so in order to compare time we have to use the
// same timestamp type when saving the flush timestamp.
// All IE versions use low-res event timestamps, and have problematic clock
// implementations (#9632)
if (inBrowser && !isIE) {
  const performance = window.performance
  if (
    performance &&
    typeof performance.now === 'function' &&
    getNow() > document.createEvent('Event').timeStamp
  ) {
    // if the event timestamp, although evaluated AFTER the Date.now(), is
    // smaller than it, it means the event is using a hi-res timestamp,
    // and we need to use the hi-res version for event listener timestamps as
    // well.
    getNow = () => performance.now()
  }
}

/**
 * Flush both queues and run the watchers.
 * 清空要更新的Watcher队列，同时执行队列中的所有Watcher
 */
function flushSchedulerQueue () {
  currentFlushTimestamp = getNow()
  flushing = true // flushing阶段开始
  let watcher, id

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  /**
   * Watcher队列从小到达排序
   * 原因：
   *    1.组件的更新由⽗到⼦；因为⽗组件的创建过程是先于⼦的，所以Watcher的创建
   *      也是先⽗后⼦，执⾏顺序也应该保持先⽗后⼦
   *    2.用户的自定义watcher要优先于渲染watcher执⾏；因为用户自定义Watcher是在
   *      渲染Watcher之前创建的
   *    3.如果⼀个组件在⽗组件的Watcher执⾏期间被销毁，那么它对应的Watcher执⾏都可以
   *      被跳过，所以⽗组件的Watcher应该先执⾏。
   */
  queue.sort((a, b) => a.id - b.id)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  // 在遍历的时候每次都会对queue.length求值，因为在watcher.run()时，即flushing阶段，
  // 很可能用户会再次添加新的Watcher，这样会再次执行到queueWatcher()方法
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    if (watcher.before) {
      // 渲染Watcher中有before就执行 beforeUpdate钩子在这里调用执行
      watcher.before()
    }

    id = watcher.id
    // 将执行的Watcher的id记录置为null
    has[id] = null
    
    // 重新执行Watcher Watcher是渲染Watcher或userWatcher
    watcher.run()

    // in dev build, check and stop circular updates.
    // 无线循环Watcher检测和终止
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      // Watcher的循环更新次数+1
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        // Watcher的循环更新次数大于最大更新数，警告并结束循环
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  const activatedQueue = activatedChildren.slice()
  // 已经执行过更新的Watcher队列
  const updatedQueue = queue.slice()
  // 重置scheduler状态 
  resetSchedulerState() // flushing阶段结束

  // call component updated and activated hooks
  callActivatedHooks(activatedQueue)
  /**
   * 生命周期函数 updated
   *  执行时机：queue中的每个watcher都执行后
   *  执行顺序：先父后子
   */
  callUpdatedHooks(updatedQueue)

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

/**
 * 已经执行过更新的Watcher队列，
 * 执行所有Watcher.vm实例的updated生命周期函数 
 */
function callUpdatedHooks (queue) {
  let i = queue.length
  // 遍历queue中所有Watcher
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
      // 命中：watcher是渲染watcher，且已挂载，且未销毁
      // 生命周期函数 updated
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent (vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 * 派发更新时要更新的Watcher队列
 *  好处：非flushing阶段，同一个Watcher在一次tick可能会触发多次更新，但更新只执行一次更新
 *  实现：同一个Watcher在一个tick中的多个数据更新并不会每次数据改变都触发
 *        watcher的回调，⽽是把这些Watcher先添加到⼀个队列queue⾥，
 *        并且同一个Watcher在未flushing阶段只会添加一次到queue队列中，
 *        然后在nextTick中执⾏flushSchedulerQueue()
 *        保证一个tick中虽然触发多次更新，但实际会将多次更新合并成一次执行
 */
export function queueWatcher (watcher: Watcher) {
  const id = watcher.id
  if (has[id] == null) { // 未添加的Watcher
    /**
     * has对象保存Watcher的id，保证同一个Watcher只会添加一次
     * 保证同一个Watcher在一次tick中只执行一次更新
     */
    has[id] = true

    if (!flushing) {
      // 非flushing阶段 将Watcher推入queue
      queue.push(watcher)
    } else {
      // flushing阶段 将Watcher根据它的id插入到queue队列
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      let i = queue.length - 1 // 初始化插入queue的索引
      while (i > index && queue[i].id > watcher.id) {
        // 待插入Watcher索引i大于当前正执行的Watcher索引index
        // 并且待插入Watcher.id大于当前队列中Watcher.id
        // 目的是获取queue中未执行的后一段队列，
        // 确定插入id正好大于前一个id，小于后一个id的索引位置
        i--
      }
      // 将Watcher根据索引位置插入Watcher队列
      queue.splice(i + 1, 0, watcher)
    }

    // queue the flush
    if (!waiting) {
      // waiting 保证对nextTick(flushSchedulerQueue)只调用一次
      waiting = true

      if (process.env.NODE_ENV !== 'production' && !config.async) {
        // 非生产环境且非异步
        flushSchedulerQueue()
        return
      }
      // 异步执行 下一个tick执行flushSchedulerQueue
      nextTick(flushSchedulerQueue)
    }
  }
}
