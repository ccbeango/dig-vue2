/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  invokeWithErrorHandling,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  /**
   * Watcher构造函数
   * @param {*} vm        vm实例
   * @param {*} expOrFn   getter的表达式
   * @param {*} cb        watcher回调
   * @param {*} options      
   * @param {*} isRenderWatcher 是否是渲染Watcher
   * 
   * options: { deep, user, lazy, sync, before }
   *    前四个参数默认false   before Watcher执行前的回调函数
   */
  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm

    if (isRenderWatcher) {
      // _watcher是监听vm上数据变化然后重新渲染的，所以它是一个渲染相关的watcher
      // 当前watcher实例是 渲染watcher，将此watcher添加到vm实例的_watcher上
      vm._watcher = this
    }
    // 将当前watcher添加到vm实例的_watchers数组中
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }

    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    
    /**
     * Watcher和Dep之间的关系：
     *  1. Watcher会订阅自己关注的依赖数据Dep，数据变化时，Dep会通知Watcer；
     *     这个订阅关系存储在Dep.subs中
     *  2. 一个Watcher会关注多个依赖数据Dep，因为一个vm实例中会有很多用户的数据；
     *     一个Dep中也会有多个订阅Watcher，因为一个数据可能有多个Watcher关注
     * 
     * Dep相关属性
     *  1. this.deps和this.newDeps表示Watcher实例持有的Dep实例的数组
     *  2. this.depIds和this.newDepIds分别代表this.deps和this.newDeps的id Set
     */
    this.deps = [] // 旧的Dep实例的数组
    this.newDeps = [] // 新的Dep实例的数组
    this.depIds = new Set() // 旧的Dep的id Set
    this.newDepIds = new Set() // 新的Dep的id Set

    // 非production环境 expOrFn转成字符串
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      // expOrFn是函数，将它赋值给getter
      this.getter = expOrFn
    } else {
      // 解析expOrFn，赋值给getter
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }

    this.value = this.lazy // 计算属性Watcher，lazy为true
      ? undefined
      // 非lazy下调用this.get() 对Watcher求值
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   * 依赖收集
   */
  get () {
    // 将当前的渲染Watcher，作为当前正在计算的Watcher 
    pushTarget(this)

    let value
    const vm = this.vm
    try {
      /**
       * 执行getter
       *  1. 渲染Watcher $mount()时就是mountComponent()中的updateComponent()，
       *     进行DOM渲染，并完成当前vm的数据依赖收集
       *  2. 用户自定义Watcher
       */
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        // 递归去访问 value，触发它所有子项的 getter
        traverse(value)
      }
      // 当前vm的数据依赖收集已经完成，那么对应的渲染Dep.target也需要改变
      // 所以pop掉当前的Watcher，恢复上次正在计算的Watcher 
      popTarget()
      // 清除一些依赖收集
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   * 依赖收集 每次渲染都添加一次新的newDepIds、newDeps
   * 将Watcher的依赖数据Dep记录到Watcher中
   * 将依赖此Dep数据的Watcher添加到此Dep的subs中
   */
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      // 新的newDepIds中没有这个dep的id
      // 记录此依赖数据Dep的id
      this.newDepIds.add(id)
      // 记录此依赖数据Dep到Watcher的新依赖newDeps中
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        // 新的newDepIds中没有dep.id 旧的depIds中也没有这个dep的id
        // 表示对于此依赖数据Dep这是一个新的订阅Watcher
        // 将新的订阅Watcher push到此依赖数据Dep的subs中
        // 这时，这个Watcher也会是这个数据的订阅者
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   * 清除一些不再关注的数据依赖收集
   * 
   * 当我们满足某种条件的时候渲染a的时候，会访问到a中的数据，这时候我们对a使用的数据添
   * 加了getter，做了依赖收集，那么当我们去修改a的数据的时候，理应通知到这些订阅者。那么如
   * 果我们一旦改变了条件渲染了b模板，又会对b使用的数据添加了getter，如果我们没有依赖移
   * 除的过程，那么这时候我去修改a模板的数据，会通知a数据的订阅的回调，这显然是有浪费的。
   * 
   * 因此Vue设计了在每次添加完新的订阅，会移除掉旧的订阅，这样就保证了在我们刚才的场景中，
   * 如果渲染b模板的时候去修改a模板的数据，a数据订阅回调已经被移除了，所以不会有任何浪费
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        // 移除newDepIds中没有记录的dep的Watcher
        // 即移除新的Watcher中不再关注的依赖数据Dep
        // 也就是在Dep中删除此Watcher的订阅
        dep.removeSub(this)
      }
    }

    /**
     * 结束后，清空旧数据，新数据当作旧数据保存
     */
    // 将新的newDepIds作为旧的depIds保存
    // 清空旧的depIds Set，作为newDepIds的新Set
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    // 将新的newDeps作为旧的deps保存
    // 清空旧的deps数组，作为新的newDeps的数组
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      // lazy
      this.dirty = true
    } else if (this.sync) {
      // 同步Watcher使用
      this.run()
    } else {
      // 渲染Watcher
      // 一般的组件数据更新都走到这里
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      /**
       * 对Watcher进行重新求值
       *  1. 渲染Watcher会重新渲染
       */
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        /**
         * 1. 新值和旧值不相等 (用户自定义Watcher)
         * 2. 或 新值是对象
         * 3. 或 deep为真
         */
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          // UserWatcher 用户自定义Watcher，执行回调并处理错误
          const info = `callback for watcher "${this.expression}"`
          invokeWithErrorHandling(this.cb, this.vm, [value, oldValue], this.vm, info)
        } else {
          // 执行渲染Watcher的回调 noop()
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
