/* @flow */

import { parseText } from 'compiler/parser/text-parser'
import {
  getAndRemoveAttr,
  getBindingAttr,
  baseWarn
} from 'compiler/helpers'

/**
 * 转换静态class和动态绑定class
 *  1. 静态class，转成成去掉多余空格，并JSON.stringify()处理的字符串，扩展el.staticClass
 *  2. 动态class，转换成parseText()解析后的表达式，扩展el.classBinding
 * @param {*} el 
 * @param {*} options 
 */
function transformNode (el: ASTElement, options: CompilerOptions) {
  const warn = options.warn || baseWarn
  const staticClass = getAndRemoveAttr(el, 'class')
  if (process.env.NODE_ENV !== 'production' && staticClass) {
    // 解析静态class的值
    const res = parseText(staticClass, options.delimiters)
    if (res) {
      // 解析静态class的值 如果使用了动态值的语法 如{{ val }} 报警告错误
      warn(
        `class="${staticClass}": ` +
        'Interpolation inside attributes has been removed. ' +
        'Use v-bind or the colon shorthand instead. For example, ' +
        'instead of <div class="{{ val }}">, use <div :class="val">.',
        el.rawAttrsMap['class']
      )
    }
  }
  if (staticClass) {
    // 静态class中所有空白符替换成一个空格，并去掉两端空格
    el.staticClass = JSON.stringify(staticClass.replace(/\s+/g, ' ').trim())
  }
  // 动态值表达式  解析动态class
  const classBinding = getBindingAttr(el, 'class', false /* getStatic */)
  if (classBinding) {
    el.classBinding = classBinding
  }
}

function genData (el: ASTElement): string {
  let data = ''
  if (el.staticClass) {
    data += `staticClass:${el.staticClass},`
  }
  if (el.classBinding) {
    data += `class:${el.classBinding},`
  }
  return data
}

export default {
  staticKeys: ['staticClass'],
  transformNode,
  genData
}
