/* @flow */

import { inBrowser } from 'core/util/index'

/**
 * 浏览器编译兼容性处理
 */

// check whether current browser encodes a char inside attribute values
// 检查当前浏览器是否对属性值内的字符进行编码
let div
function getShouldDecode (href: boolean): boolean {
  div = div || document.createElement('div')
  div.innerHTML = href ? `<a href="\n"/>` : `<div a="\n"/>`
  return div.innerHTML.indexOf('&#10;') > 0
}

// #3663: IE encodes newlines inside attribute values while other browsers don't
// IE 在属性值中换行符(\n)会编码新行，而其他浏览器不这样做
export const shouldDecodeNewlines = inBrowser ? getShouldDecode(false) : false
// #6828: chrome encodes content in a[href]
export const shouldDecodeNewlinesForHref = inBrowser ? getShouldDecode(true) : false
