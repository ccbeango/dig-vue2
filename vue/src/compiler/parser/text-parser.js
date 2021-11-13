/* @flow */

import { cached } from 'shared/util'
import { parseFilters } from './filter-parser'

// 模板变量分隔符结果
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g
const regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g
// 创建自定义分隔符正则
const buildRegex = cached(delimiters => {
  const open = delimiters[0].replace(regexEscapeRE, '\\$&')
  const close = delimiters[1].replace(regexEscapeRE, '\\$&')
  return new RegExp(open + '((?:.|\\n)+?)' + close, 'g')
})

type TextParseResult = {
  expression: string,
  tokens: Array<string | { '@binding': string }>
}

/**
 * 将文本解析成表达式
 *  匹配模板变量分隔符数据
 * @param {*} text 
 * @param {*} delimiters 
 * @returns 
 */
export function parseText (
  text: string,
  delimiters?: [string, string]
): TextParseResult | void {
  const tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE
  if (!tagRE.test(text)) {
    return
  }

  /**
   * tokens
   *  模板变量：保存 `_s(${exp})` 文本
   *  普通文本：保存 JSON.stringify(tokenValue) 转换的值
   * rawTokens
   *  模板变量：保存 { '@binding': exp }
   *  普通文本：保存 tokenValue 原值
   */
  const tokens = []
  const rawTokens = [] 
  let lastIndex = tagRE.lastIndex = 0 // 上次匹配到模板变量的索引
  let match, index, tokenValue
  while ((match = tagRE.exec(text))) {
    index = match.index
    // push text token
    if (index > lastIndex) {
      // 模板变量间的文本处理
      rawTokens.push(tokenValue = text.slice(lastIndex, index))
      tokens.push(JSON.stringify(tokenValue))
    }
    // tag token
    const exp = parseFilters(match[1].trim()) // 模板变量字符串
    tokens.push(`_s(${exp})`)
    rawTokens.push({ '@binding': exp })
    // 更新索引
    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) {
    // 最后一个模板变量后的文本处理
    rawTokens.push(tokenValue = text.slice(lastIndex))
    tokens.push(JSON.stringify(tokenValue))
  }
  return {
    expression: tokens.join('+'), // 加号拼接解析后的文本字符串 "\n "+ _s(item) + ":" + _s(index) + "\n "
    tokens: rawTokens // [ "\n  ", {@binding: 'item'}, ":", {@binding: 'index'}, "\n  " ]
  }
}
