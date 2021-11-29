/* @flow */

import { isRegExp, remove } from 'shared/util'
import { getFirstComponentChild } from 'core/vdom/helpers/index'

/**
 * 缓存的vm实例数据类型
 */
type CacheEntry = {
  name: ?string;
  tag: ?string;
  componentInstance: Component;
};

type CacheEntryMap = { [key: string]: ?CacheEntry };

/**
 * 获取组件名
 * @param {*} opts 
 * @returns 
 */
function getComponentName (opts: ?VNodeComponentOptions): ?string {
  return opts && (opts.Ctor.options.name || opts.tag)
}

/**
 * 匹配include、exclude的要求格式
 * @param {*} pattern 匹配格式 支持 逗号,隔开的字符串、正则、数组
 * @param {*} name 要匹配的值
 * @returns 是否满足匹配
 */
function matches (pattern: string | RegExp | Array<string>, name: string): boolean {
  if (Array.isArray(pattern)) {
    return pattern.indexOf(name) > -1
  } else if (typeof pattern === 'string') {
    return pattern.split(',').indexOf(name) > -1
  } else if (isRegExp(pattern)) {
    return pattern.test(name)
  }
  /* istanbul ignore next */
  return false
}

/**
 * 遍历逐个删除keep-alive缓存的vm实例
 * @param {*} keepAliveInstance 
 * @param {*} filter 
 */
function pruneCache (keepAliveInstance: any, filter: Function) {
  const { cache, keys, _vnode } = keepAliveInstance
  for (const key in cache) {
    const entry: ?CacheEntry = cache[key]
    if (entry) {
      const name: ?string = entry.name
      if (name && !filter(name)) {
        // 不满足过滤条件 删除keep-alive中的VNode缓存
        pruneCacheEntry(cache, key, keys, _vnode)
      }
    }
  }
}

/**
 * 删除keep-alive中指定key的缓存的vm实例
 * @param {*} cache 
 * @param {*} key 要删除的节点key
 * @param {*} keys 所有缓存的节点key
 * @param {*} current 当前的渲染VNode
 */
function pruneCacheEntry (
  cache: CacheEntryMap,
  key: string,
  keys: Array<string>,
  current?: VNode
) {
  const entry: ?CacheEntry = cache[key]
  if (entry && (!current || entry.tag !== current.tag)) {
    // 当前渲染的节点不存在 或 要删除的缓存节点不是当前的渲染VNode节点 执行实例的$destroy()
    // 即当前渲染VNode节点如果是将要删除的cache的话，不执行destroy函数
    // 因为是正要渲染的，不应该执行销毁，而只是之后清掉缓存即可
    entry.componentInstance.$destroy()
  }
  // 删除key的vm实例缓存 触发垃圾回收
  cache[key] = null
  // keys中删除指定的key
  remove(keys, key)
}

/**
 * include、include匹配格式类型 字符串、正则表达式或数组 
 */
const patternTypes: Array<Function> = [String, RegExp, Array]

/**
 * keep-alive组件是一个抽象组件，它的实现通过自定义render函数并且利用了插槽
 * keep-alive组件的渲染分为首次渲染和缓存渲染，当命中缓存，则不会执行created和mounted
 * 钩子函数，而会执行activated钩子函数。销毁时，不会执行destroy钩子函数，
 * 而执行deactivated钩子函数
 */

export default {
  name: 'keep-alive',
  abstract: true,

  props: {
    // 只有名称匹配的组件会被缓存
    include: patternTypes, 
    // 任何名称匹配的组件都不会被缓存
    exclude: patternTypes,
    /**
     * 最多可以缓存多少组件实例。一旦这个数字达到了，在新实例被创建之前，已缓存组件中
     * 最久没有被访问的实例会被销毁掉。
     * 因为我们是缓存的vnode对象，它也会持有DOM，当我们缓存很多的时候，会比较占用内存，
     * 所以该配置允许我们指定缓存大小
     */
    max: [String, Number] // 最多可以缓存多少组件实例
  },

  methods: {
    /**
     * 缓存vm实例
     */
    cacheVNode() {
      const { cache, keys, vnodeToCache, keyToCache } = this
      if (vnodeToCache) {
        const { tag, componentInstance, componentOptions } = vnodeToCache
        // 缓存实例
        cache[keyToCache] = {
          name: getComponentName(componentOptions),
          tag,
          componentInstance,
        }
        // 记录缓存key
        keys.push(keyToCache)
        // prune oldest entry
        if (this.max && keys.length > parseInt(this.max)) {
          // 缓存vm数超过最大缓存数，删除最久没使用到的vm实例
          pruneCacheEntry(cache, keys[0], keys, this._vnode)
        }
        this.vnodeToCache = null // 清除已缓存vm实例的VNode
      }
    }
  },

  created () {
    // 用来缓存已经创建过的VNode实例vm
    this.cache = Object.create(null)
    this.keys = [] // 保存缓存vm实例对应的key值
  },

  destroyed () {
    // keep-alive销毁 清掉所有缓存
    for (const key in this.cache) {
      pruneCacheEntry(this.cache, key, this.keys)
    }
  },

  mounted () {
    // 挂载后缓存渲染VNode对应的实例 因为子组件先挂载，这里能够拿到子组件的vm实例
    this.cacheVNode()
    // 侦听include
    this.$watch('include', val => {
      // 只保留符合include的cache缓存
      pruneCache(this, name => matches(val, name))
    })
    // 侦听exclude
    this.$watch('exclude', val => {
      // 过滤掉符合exclude的cache缓存
      pruneCache(this, name => !matches(val, name))
    })
  },

  updated () {
    // 更新后缓存渲染VNode对应的实例
    this.cacheVNode()
  },

  render () {
    // 获取keep-alive组件下的插槽元素
    const slot = this.$slots.default
    // 找到第一个子组件节点
    const vnode: VNode = getFirstComponentChild(slot)
    const componentOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions
    if (componentOptions) {
      // check pattern
      const name: ?string = getComponentName(componentOptions)
      const { include, exclude } = this
      if (
        // not included
        (include && (!name || !matches(include, name))) ||
        // excluded
        (exclude && name && matches(exclude, name))
      ) {
        // 直接返回 不匹配include和匹配exclude规则的VNode
        return vnode
      }

      const { cache, keys } = this
      // 缓存key
      const key: ?string = vnode.key == null
        // same constructor may get registered as different local components
        // so cid alone is not enough (#3269)
        // 没有key，通过组件cid加组件tag生成key
        ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
        : vnode.key
      if (cache[key]) {
        /**
         * keep-alive组件更新时，执行patchVNode，会执行prepatch，这时会执行updateChildComponent，
         * 命中needsForceUpdate，再次resolveSlots生成keep-alive子组件的默认插槽$slots.default内容，然后执行keep-alive组件的$forceUpdate，
         * 重新执行到keep-alive组件的render，那么就会执行到这里；之后会再执行子组件的patch，命中子组件init的keep-alive子组件处理逻辑
         */
        // 实例已缓存 直接将渲染的VNode的实例vm指向缓存中的实例VNode
        vnode.componentInstance = cache[key].componentInstance
        // LRU策略 保证当前访问的实例是最新的活跃
        // make current key freshest
        remove(keys, key)
        keys.push(key)
      } else {
        // 实例未缓存 先暂存VNode和key render后再mounted或updated时再缓存
        // delay setting the cache until update
        this.vnodeToCache = vnode
        this.keyToCache = key
      }
      // 子组件节点添加keepAlive标识
      vnode.data.keepAlive = true
    }

    /**
     * $mount挂载keep-alive节点，执行render时，keep-alive组件渲染返回的渲染VNode是它的
     * 子节点，并不是keep-alive组件本身
     */
    return vnode || (slot && slot[0])
  }
}
