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
 * Vue实例属性扩展 即静态属性和方法
 */

export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 定义 访问器属性 config
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
  Vue.observable = <>(obj: T): T => {
    observe(obj)
    return obj
  }

  /**
   * 全局的Vue.options
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

  // 内置组件 添加到options.components
  extend(Vue.options.components, builtInComponents)
  
  // API Vue.use
  initUse(Vue)
  // API Vue.mixin
  initMixin(Vue)
  // Vue.extend
  initExtend(Vue)
  // Vue.component Vue.filter Vue.directive
  initAssetRegisters(Vue)
}
