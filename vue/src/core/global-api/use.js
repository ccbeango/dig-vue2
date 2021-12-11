/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  // 向Vue._installedPlugins中添加插件
  Vue.use = function (plugin: Function | Object) {
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    if (installedPlugins.indexOf(plugin) > -1) {
      // 已添加过
      return this
    }

    // additional parameters
    const args = toArray(arguments, 1)
    args.unshift(this) // 第一个参数是Vue本身
    if (typeof plugin.install === 'function') {
      // 执行插件的install方法
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      // plugin是一个函数，当作install方法执行
      plugin.apply(null, args)
    }
    installedPlugins.push(plugin)
    return this
  }
}
