/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   *  初始化3个全局函数
   *    Vue.component()
   *    Vue.directive()
   *    Vue.filter()
   * 调用方法时，其实是向Vue.options[components|directives|filters]中添加定义或获取定义
   */
  ASSET_TYPES.forEach(type => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        // 只传id 直接返回该id的对应的asset
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }

        // 全局同步组件
        if (type === 'component' && isPlainObject(definition)) {
          // 有name，使用name作为组件名，否则使用id作为组件名
          definition.name = definition.name || id
          // 使用definition作为options 调用Vue.extend生成注册组件构造函数
          definition = this.options._base.extend(definition)
        }

        // 全局指令
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }

        /**
         * 对全局Vue.options进行扩展
         *  filter 直接赋值
         *  异步组件 直接赋值
         */
        this.options[type + 's'][id] = definition
        // 返回调用asset函数后的definition
        return definition
      }
    }
  })
}
