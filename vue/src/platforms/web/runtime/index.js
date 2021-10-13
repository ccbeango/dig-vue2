/* @flow */

import Vue from 'core/index'
import config from 'core/config'
import { extend, noop } from 'shared/util'
import { mountComponent } from 'core/instance/lifecycle'
import { devtools, inBrowser } from 'core/util/index'

import {
  query,
  mustUseProp,
  isReservedTag,
  isReservedAttr,
  getTagNamespace,
  isUnknownElement
} from 'web/util/index'

import { patch } from './patch'
import platformDirectives from './directives/index'
import platformComponents from './components/index'

/**
 * 对web runtime进行扩展
 */

// web平台相关工具函数
// install platform specific utils
Vue.config.mustUseProp = mustUseProp // 必须绑定属性的标签
Vue.config.isReservedTag = isReservedTag // 是否是Web端的HTML SVG标签
Vue.config.isReservedAttr = isReservedAttr // 是否是style class 属性
Vue.config.getTagNamespace = getTagNamespace // 获取命名空间
Vue.config.isUnknownElement = isUnknownElement // 是否是未知元素标签

// web平台指令和组件扩展
// install platform runtime directives & components
extend(Vue.options.directives, platformDirectives) // v-model v-show
extend(Vue.options.components, platformComponents) // transition-group transition

// 初始化__patch__方法
// install platform patch function
Vue.prototype.__patch__ = inBrowser ? patch : noop

// public mount method
// runtime实现，可以在runtime only和runtime+complier复用
// runtime only会直接调用此方法
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  // $mount 实际调用 mountComponent
  return mountComponent(this, el, hydrating)
}

// web平台 devtool的加载
// devtools global hook
/* istanbul ignore next */
if (inBrowser) {
  setTimeout(() => {
    if (config.devtools) {
      if (devtools) {
        devtools.emit('init', Vue)
      } else if (
        process.env.NODE_ENV !== 'production' &&
        process.env.NODE_ENV !== 'test'
      ) {
        console[console.info ? 'info' : 'log'](
          'Download the Vue Devtools extension for a better development experience:\n' +
          'https://github.com/vuejs/vue-devtools'
        )
      }
    }
    if (process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test' &&
      config.productionTip !== false &&
      typeof console !== 'undefined'
    ) {
      console[console.info ? 'info' : 'log'](
        `You are running Vue in development mode.\n` +
        `Make sure to turn on production mode when deploying for production.\n` +
        `See more tips at https://vuejs.org/guide/deployment.html`
      )
    }
  }, 0)
}

export default Vue
