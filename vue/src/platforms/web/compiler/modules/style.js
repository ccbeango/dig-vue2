/* @flow */

import { parseText } from 'compiler/parser/text-parser'
import { parseStyleText } from 'web/util/style'
import {
  getAndRemoveAttr,
  getBindingAttr,
  baseWarn
} from 'compiler/helpers'

/**
 * 转换静态style和动态绑定style
 *  1. 静态style，转成成去掉多余空格，并JSON.stringify()处理的字符串，扩展el.staticStyle
 *  2. 动态style，获取到绑定的值的表达式
 * @param {*} el 
 * @param {*} options 
 */
function transformNode (el: ASTElement, options: CompilerOptions) {
  const warn = options.warn || baseWarn
  const staticStyle = getAndRemoveAttr(el, 'style')
  if (staticStyle) {
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production') {
      // 解析静态style的值
      const res = parseText(staticStyle, options.delimiters)
      if (res) {
        // 解析静态class的值 如果使用了动态值的语法 如{{ val }} 报警告错误
        warn(
          `style="${staticStyle}": ` +
          'Interpolation inside attributes has been removed. ' +
          'Use v-bind or the colon shorthand instead. For example, ' +
          'instead of <div style="{{ val }}">, use <div :style="val">.',
          el.rawAttrsMap['style']
        )
      }
    }
    // 解析静态style 并 字符串化处理
    el.staticStyle = JSON.stringify(parseStyleText(staticStyle))
  }
  // 获取style动态属性的表达式
  const styleBinding = getBindingAttr(el, 'style', false /* getStatic */)
  if (styleBinding) {
    el.styleBinding = styleBinding
  }
}

function genData (el: ASTElement): string {
  let data = ''
  if (el.staticStyle) {
    data += `staticStyle:${el.staticStyle},`
  }
  if (el.styleBinding) {
    data += `style:(${el.styleBinding}),`
  }
  return data
}

export default {
  staticKeys: ['staticStyle'],
  transformNode,
  genData
}
