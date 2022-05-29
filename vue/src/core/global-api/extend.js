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
   * 通过继承 创建构造函数的子构造函数 并返回创建子组件构造函数
   */
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    const Super = this
    const SuperId = Super.cid
    // _Ctor 添加_Ctor属性，做缓存优化
    // _Ctor的值是{ cid: VueComponent }的map映射
    // 好处：当多个父组件都使用同一个组件，即多处使用时，同一个组件extend初始化逻辑只会执行一次
    // 因为同一个组件第二次执行extend时，它的options上会有_Ctor属性
    // 并且保存了组件的实例对象，以SuperId为键在_Ctor对象上
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    const name = extendOptions.name || Super.options.name
    // 验证标签名是否有效
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name)
    }

    // 创建子Vue构造函数 即 创建子组件构造函数
    // 寄生式组合继承 使用父类原型Super.prototype作为Sub的原型
    const Sub = function VueComponent (options) {
      // 实例化Sub的时候，就会执行this._init逻辑，再次走到Vue实例的初始化逻辑
      this._init(options)
    }
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub

    // 接下来再对子组件构造函数进行扩展
    // 在子组件构造函数上添加属性和方法 这些属性和方法就会是这个子组件独有的

    // 生成cid
    Sub.cid = cid++
    // 合并生成options 
    // 父构造函数的默认options使用基类Vue.options 和
    // 用户想要创建子类构造函数（子组件）传入的options（extendOptions） 进行合并
    // 此时，用户在extendOptions传入的components、directive、filter都会是局部的，
    // 也就是只有这个子组件构造函数上才会有这些属性
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    // super指向父类Super构造函数
    Sub['super'] = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    // 创建子类构造函数时，props和computed，定义到原型上实现共享，这样可以避免每次实例化时都对props中的每个key进行proxy代理设置
    if (Sub.options.props) {
      initProps(Sub)
    }
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    // 添加全局Super上的实例（静态）方法到Sub上 让各个组件中有这些全局静态方法
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    // 将全局Super上的component、directive、filter方法添加到Sub上
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
    Sub.superOptions = Super.options // 保存父Vue的options 更新检测使用
    Sub.extendOptions = extendOptions // 保存创建子组件构造函数的extendOptions
    Sub.sealedOptions = extend({}, Sub.options) // 扩展完成的子Vue.options 做初始状态的封存

    // cache constructor
    // 缓存 cid: Sub 的map映射
    cachedCtors[SuperId] = Sub
    return Sub
  }
}

/**
 * 初始化props
 *  为props中的每一项的访问方式添加代理 详见proxy()方法
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
