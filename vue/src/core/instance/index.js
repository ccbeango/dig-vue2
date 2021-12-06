import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// Vue构造函数
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    // 警告 Vue是构造函数，应该使用new来调用
    warn('Vue is a constructor and should be called with the `new` keyword')
  }

  // 调用 Vue.prototype._init()
  this._init(options)
}

// 对Vue的prototype原型对象进行扩展，Vue按功能将这些扩展分散到多个模块中进行实现
initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
