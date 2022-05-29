/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

/**
 * Vue构造函数上定义属性和方法
 * 即 Vue的全局API
 */

export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      // 警告 不要直接替换掉Vue.config的定义
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 定义 全局配置的访问器属性 Vue.config
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  // 定义util工具函数 不推荐外部使用
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }

  /**
   * 全局的Vue.options 即 构造函数的默认选项初始化
   * Vue.options = {
   *  _base: Vue,  // 指向Vue基类构造函数本身
   *  components: {},
   *  directives: {},
   *  filters: {},
   * }
   * 还包括用户调用 Vue.mixin() 时，混入的options
   */
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  // _base就是Vue构造函数 用于vdom/create-component/createComponent
  // 目的是扩展普通对象组件，让它们具有Vue构造函数上定义的属性
  Vue.options._base = Vue

  // 扩展内置组件到 options.components
  extend(Vue.options.components, builtInComponents)

  initUse(Vue) // Vue.use
  initMixin(Vue) // Vue.mixin
  initExtend(Vue) // Vue.extend
  initAssetRegisters(Vue) // Vue.component Vue.filter Vue.directive
}
