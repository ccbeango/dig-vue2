/* @flow */

/**
 * unicode letters used for parsing html tags, component names and property paths.
 * using https://www.w3.org/TR/html53/semantics-scripting.html#potentialcustomelementname
 * skipping \u10000-\uEFFFF due to it freezing up PhantomJS
 */
export const unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/

/**
 * Check if a string starts with $ or _
 */
export function isReserved (str: string): boolean {
  const c = (str + '').charCodeAt(0)
  return c === 0x24 || c === 0x5F
}

/**
 * Define a property.
 * 在对象上定义一个数据属性
 *  设置是否enumerable，默认false
 */
export function def (obj: Object, key: string, val: any, enumerable?: boolean) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
}

/**
 * Parse simple path.
 */
const bailRE = new RegExp(`[^${unicodeRegExp.source}.$_\\d]`)
export function parsePath (path: string): any {
  if (bailRE.test(path)) {
    return
  }
  // 将字符串分隔 a.b.c => [a, b, c]
  const segments = path.split('.')

  /**
   * 闭包函数
   *   调用时，将segments中的元素作为key，循环遍历访问到最后要获取的值c并返回
   *   1. userWatcher调用此方法，获取getter，执行getter时，obj = vm，最后访问到vm.a.b.c的值
   */
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      // obj = a.b.c -> obj = b.c -> obj = c
      // obj[segments[i]]访问值时，会触发该值的Dep进行依赖收集，完成userWatcher对这个值的订阅
      // 当这个值发生变化，就会触发userWatcer重新计算
      obj = obj[segments[i]]
    }
    // 返回要访问的a.b.c的值
    return obj
  }
}
