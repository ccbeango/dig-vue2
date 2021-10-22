/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   */
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    const Super = this
    const SuperId = Super.cid
    // _Ctor 添加_Ctor属性，做缓存优化
    // _Ctor的值是{ cid: VueComponent }的map映射
    // 好处：当多个父组件都使用同一个组件，即多处使用时，同一个组件extend初始化逻辑只会执行一次
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    const name = extendOptions.name || Super.options.name
    // 验证标签名是否有效
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name)
    }

    // 寄生式组合继承 使用父类原型Super.prototype作为Sub的原型
    const Sub = function VueComponent (options) {
      // 实例化Sub的时候，就会执行this._init逻辑，再次走到Vue实例的初始化逻辑
      this._init(options)
    }
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub

    // 接下来再对Sub进行扩展

    // 生成cid
    Sub.cid = cid++
    // 合并生成options 
    // 组件的默认options使用基类Vue.options 和 用户传入的options合并
    // 用户在extendOptions传入的components、directive、filter都会是局部的
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    // super指向父类Super构造函数
    Sub['super'] = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    // 调用extend时传入的props
    // 这样可以避免每次实例化时都对props中的每个key进行proxy代理设置
    if (Sub.options.props) {
      // 为每一个props的值添加代理
      initProps(Sub)
    }
    if (Sub.options.computed) {
      // 初始化computed
      // 将computed的每一项(key)添加到Sub.prototype[key]上
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    // 添加全局Super上的实例（静态）方法到Sub上 让各个组件中有这些全局静态方法
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    // 将全局Super上的component、directive、filter添加到Sub上
    // Sub.component
    // Sub.directive
    // Sub.filter
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })

    // enable recursive self-lookup
    // 允许自查找 添加自身到components中
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options // 保存Super的options 更新检测使用
    Sub.extendOptions = extendOptions // 保存扩展的原对象
    Sub.sealedOptions = extend({}, Sub.options) // 保存sealedOptions 浅拷贝Sub.options

    // cache constructor
    // 缓存 cid: Sub 的map映射
    cachedCtors[SuperId] = Sub
    return Sub
  }
}

/**
 * 初始化props
 *  为props中的每一项添加代理 详见proxy()方法
 * @param {*} Comp 
 */
function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}

/**
 * 初始化计算属性
 *  为computed中的每一项设置计算属性并进行代理设置 详见defineComputed()方法
 * @param {*} Comp 
 */
function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
