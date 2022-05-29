import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'

// 定义 Vue构造函数上的属性 即 静态属性
initGlobalAPI(Vue)

// 原型上 定义 访问器属性 $isServer
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

// 原型上 定义 访问器属性 $ssrContext
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

// 构造函数上 定义 数据属性 FunctionalRenderContext
// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

Vue.version = '__VERSION__'

export default Vue
