/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    // mixin 实际是调用 mergeOptions 混入到 构造函数Vue.options 
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
