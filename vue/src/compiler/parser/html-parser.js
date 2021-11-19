/**
 * Not type-checking this file because it's mostly vendor code.
 */

/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson (MPL-1.1 OR Apache-2.0 OR GPL-2.0-or-later)
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

import { makeMap, no } from 'shared/util'
import { isNonPhrasingTag } from 'web/compiler/util'
import { unicodeRegExp } from 'core/util/lang'

// Regular Expressions for parsing tags and attributes
/**
 * 匹配html属性 拆分如下
 *  1. ^\s* 属性前必须有空白字符
 *  2. ([^\s"'<>\/=]+) 匹配属性 除了 空白、" ' <> / = 外的任意字符 一次或多次
 *  3. (?:xxx) 不捕获此元数据 xxx为 \s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+))
 *  4. \s*(=)\s* 等号前后可以有空格
 *  5. (?:yyy) 不捕获此元数据 yyy为 "([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)
 *  6. "([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+) 捕获属性值的三种情况：
 *      1) "([^"]*)"+ 匹配双引号开头和结尾，中间是除双引号外任意字符的值一次或多次
 *      2) '([^']*)'+ 匹配单引号开头和结尾，中间是除单引号外任意字符的值一次或多次
 *      3) ([^\s"'=<>`]+) 匹配非 空白 ' " = < > 以外的任何值
 *                        即匹配不带单引号或双引号的值一次或多次
 */
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/

/**
 * 匹配HTMl动态属性 拆分如下：v-hello@[world].hi="good"
 *  1. ^\s* 属性前必须有空白字符
 *  2. ((?:v-[\w-]+:|@|:|#)\[[^=]+?\][^\s"'<>\/=]*) 捕获此元数据
 *     1) (?:v-[\w-]+:|@|:|#) 匹配v- 加 字母数字下划线 加 :|@|:|# 字串 不捕获此元数据
 *     2) \[[^=]+?\] 匹配[]加中间是除=外的一次或多次任意字符内容 这个内容零次或一次
 *     3) [^\s"'<>\/=]* 匹配非 空白 " ' < > / = 外的任意字符 零次或多次
 *  3. (?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))? 同attribute的3、4、5、6
 */
const dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+?\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/

/**
 * 标签名匹配:
 *  字母或下划线开头的任意长度子串 加上
 *  零次或多次 杠- 点. 数字0-9 下划线_ 连接的所有字母和unicode字符串
 *  
 *  如果字符串以数字或点. 开头 这部分在匹配时会过滤掉 如 .0abc-def => abc
 */
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`
// 匹配 0次或一次 命名空间 加 标签名
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
// 开始标签
const startTagOpen = new RegExp(`^<${qnameCapture}`)
// 开始标签结束 > 或 /> 可以是一元标签
const startTagClose = /^\s*(\/?)>/
// 结束标签 </...>
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
// doctype匹配 <!DOCTYPE html> [^>] 匹配除了>以外的所有字符
const doctype = /^<!DOCTYPE [^>]+>/i
// #7298: escape - to avoid being passed as HTML comment when inlined in page
// 注释节点 <!-- 
const comment = /^<!\--/
// 条件注释节点 <![
const conditionalComment = /^<!\[/

// Special Elements (can contain anything)
export const isPlainTextElement = makeMap('script,style,textarea', true)
const reCache = {}

const decodingMap = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&amp;': '&',
  '&#10;': '\n',
  '&#9;': '\t',
  '&#39;': "'"
}
const encodedAttr = /&(?:lt|gt|quot|amp|#39);/g
const encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g

// #5992
const isIgnoreNewlineTag = makeMap('pre,textarea', true)
const shouldIgnoreFirstNewline = (tag, html) => tag && isIgnoreNewlineTag(tag) && html[0] === '\n'

/**
 * 解码属性值中的实体符号 
 *  通过decodingMap将实体符号解码
 * @param {*} value 
 * @param {*} shouldDecodeNewlines 
 * @returns 
 */
function decodeAttr (value, shouldDecodeNewlines) {
  const re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr
  return value.replace(re, match => decodingMap[match])
}

export function parseHTML (html, options) {
  // 用户记录非闭合标签的开始标签  目的是维护开始标签和结束标签是一一对应的关系
  const stack = []
  const expectHTML = options.expectHTML
  const isUnaryTag = options.isUnaryTag || no
  const canBeLeftOpenTag = options.canBeLeftOpenTag || no
  let index = 0 // 当前索引位置
  // last 最近在解析的html文本
  // lastTag 最近一个要解析的非闭合标签，last中开头的html就是这个标签中的内容
  let last, lastTag
  while (html) {
    last = html // 每次循环开始时的html文本
    // Make sure we're not in a plaintext content element like script/style
    if (!lastTag || !isPlainTextElement(lastTag)) {
      // lastTag不存在 或 非 script,style,textarea节点处理
      // 处理非script,style,textarea的 一元标签 或 非闭合标签
      // script,style,textarea 标签 开始标签部分会命中
      // 例如 style标签 第一次循环命中后进行解析，lastTag为style 且 在isPlainTextElement中
      // 然后第二次循环 lastTag 会命中else部分

      // 文本内容结束索引
      let textEnd = html.indexOf('<') 
      if (textEnd === 0) {
        // 文本内容结束索引textEnd在首位，当作HTML节点处理

        // Comment:
        // 注释节点 <!-- --> 处理
        if (comment.test(html)) { // <!-- 开头
          const commentEnd = html.indexOf('-->')

          if (commentEnd >= 0) { // --> 结尾
            if (options.shouldKeepComment) {
              // 保留注释节点 创建注释节点AST
              options.comment(html.substring(4, commentEnd), index, index + commentEnd + 3)
            }
            // 前移掉注释节点
            advance(commentEnd + 3)
            continue
          }
        }

        // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
        // 条件注释节点 <![if expression]> HTML <![endif]> 跳过
        if (conditionalComment.test(html)) {
          const conditionalEnd = html.indexOf(']>')

          if (conditionalEnd >= 0) {
            advance(conditionalEnd + 2)
            continue
          }
        }

        // Doctype:
        const doctypeMatch = html.match(doctype)
        if (doctypeMatch) {
          // 前移掉doctype标签
          advance(doctypeMatch[0].length)
          continue
        }

        // End tag:
        const endTagMatch = html.match(endTag)
        if (endTagMatch) {
          const curIndex = index
          // 前移掉结束标签
          advance(endTagMatch[0].length)
          // 解析结束标签
          parseEndTag(endTagMatch[1], curIndex, index)
          continue
        }

        // Start tag:
        const startTagMatch = parseStartTag() // 解析开始标签
        if (startTagMatch) {
          // 处理开始标签
          handleStartTag(startTagMatch)
          if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
            advance(1)
          }
          continue
        }
      }

      // 文本处理
      let text, rest, next
      if (textEnd >= 0) {
        // 文本结束索引位置大于等于零，把<前面的当作文本节点
        // 获取去掉前面的文本节点的html部分
        rest = html.slice(textEnd)

        while (
          !endTag.test(rest) &&
          !startTagOpen.test(rest) &&
          !comment.test(rest) &&
          !conditionalComment.test(rest)
        ) {
          /**
           * 剩余html即rest部分，非HTML标签命中情况：
           *  1. 非结束标签
           *  2. 非开始标签
           *  3. 非注释标签
           *  4. 非条件注释标签
           * 当作是普通文本中的左尖括号
           */
          // < in plain text, be forgiving and treat it as text
          next = rest.indexOf('<', 1) // 查找下一个左尖括号位置
          if (next < 0) break // 未找到跳出循环
          // 前移文本结束索引
          textEnd += next
          rest = html.slice(textEnd) // 移除文本部分，继续循环
        }
        // 截取html字符串中的文本字符串
        text = html.substring(0, textEnd)
      }

      if (textEnd < 0) {
        // 未找到<，说明html或剩余的html都是文本
        text = html
      }

      if (text) {
        // 前移掉文本
        advance(text.length)
      }

      if (options.chars && text) {
        // 创建文本节点AST
        options.chars(text, index - text.length, index)
      }
    } else {
      // 处理 script,style,textarea 标签

      let endTagLength = 0
      const stackedTag = lastTag.toLowerCase()
      const reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'))
      const rest = html.replace(reStackedTag, function (all, text, endTag) {
        endTagLength = endTag.length
        if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
          text = text
            .replace(/<!\--([\s\S]*?)-->/g, '$1') // #7298
            .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
        }
        if (shouldIgnoreFirstNewline(stackedTag, text)) {
          text = text.slice(1)
        }
        if (options.chars) {
          options.chars(text)
        }
        return ''
      })
      index += html.length - rest.length
      html = rest
      parseEndTag(stackedTag, index - endTagLength, index)
    }

    if (html === last) {
      // 经过处理html和last保持相等
      // 当作文本节点处理
      options.chars && options.chars(html) // 创建文本节点AST
      if (process.env.NODE_ENV !== 'production' && !stack.length && options.warn) {
        // stack中已没有标签节点 但html中还有文本 说明模板格式不正确
        // template中不能直接有空格 
        options.warn(`Mal-formatted tag at end of template: "${html}"`, { start: index + html.length })
      }
      break
    }
  }

  // Clean up any remaining tags
  parseEndTag()

  /**
   * 记录当前位置html位置索引，前进n提取html字符串
   * @param {*} n 偏移量
   */
  function advance (n) {
    index += n
    html = html.substring(n)
  }

  /**
   * 解析开始标签
   *  将开始标签解析成一个对象
   *  {
   *    tagName,        // 标签名
   *    attrs: [attr],  // 标签属性数组
   *    start,          // 标签开始位置索引
   *    end,            // 标签结束位置索引
   *    unarySlash      // 一元标签的斜杠(/) 非一元标签空字符串('')
   *   }
   * 
   *   attr标签属性
   *   {}
   * @returns 
   */
  function parseStartTag () {
    // 匹配开始标签
    const start = html.match(startTagOpen)
    if (start) {
      const match = {
        tagName: start[1], // 标签名
        attrs: [], // 标签的属性
        start: index // 标签开始位置索引
      }
      // 前移掉标签
      advance(start[0].length)

      // end 开始标签结束符 attr 当前循环匹配到的属性解析结果
      let end, attr
      while (!(end = html.match(startTagClose)) && (attr = html.match(dynamicArgAttribute) || html.match(attribute))) {
        // 未匹配到开始标签的结束符 且 匹配到动态属性 或 普通属性 
        // 记录属性开始索引
        attr.start = index
        // 前移掉属性
        advance(attr[0].length)
        // 记录属性结束索引
        attr.end = index
        /**
         * attrs中push匹配到的属性attr
         * {
         *   start,
         *   end,
         * }
         */
        match.attrs.push(attr)
      }

      if (end) {
        match.unarySlash = end[1]
        // 前移掉开始标签结尾
        advance(end[0].length)
        // 标签结束位置索引
        match.end = index
        // 返回解析结果
        return match
      }
    }
  }

  /**
   * 处理开始标签
   * @param {*} match 
   */
  function handleStartTag (match) {
    const tagName = match.tagName
    const unarySlash = match.unarySlash

    if (expectHTML) { // web平台expectHTML为真
      if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
        // 上个标签是p标签，即父级是p元素标签，并且当前标签不能放在p标签中
        /**
         * 直接手动触发p标签的闭合处理 
         * 目的是为了和浏览器行为保持一致，将嵌套标签提到同一层级
         * 如：<p>111<div>222</div>333</p>
         *  浏览器会处理成
         *     <p>111</p>
         *     <div>222</div>
         *     333
         *     <p></p>
         *  提前结束了p标签，所以第一行p中只剩下111，然后输出<div>222</div>，
         *  没有p标签包裹，是纯文本333，之后结束的p标签会生成一个新的<p></p>
         * 这和浏览器的标准行为是一致的
         */
        parseEndTag(lastTag)
      }
      if (canBeLeftOpenTag(tagName) && lastTag === tagName) {
        // 允许不写结束标签的非闭合标签 并且此类标签嵌套
        /**
         * 直接手动触发此类标签的闭合处理
         * 目的是为了和浏览器行为保持一致，将嵌套标签提到同一层级
         * 如：<p>444<p>555</p>666</p>
         *  浏览器会处理成
         *     <p>444</p>
         *     <div>555</div>
         *     666
         *     <p></p>
         */
        parseEndTag(tagName)
      }
    }

    // 一元标签标识 平台一元标签或带有斜杠(/)
    const unary = isUnaryTag(tagName) || !!unarySlash

    const l = match.attrs.length
    const attrs = new Array(l) // 创建标签中属性个数长度的数组
    for (let i = 0; i < l; i++) {
      // 属性解析结果
      const args = match.attrs[i]
      // 数值的value值
      const value = args[3] || args[4] || args[5] || ''

      const shouldDecodeNewlines = tagName === 'a' && args[1] === 'href'
        ? options.shouldDecodeNewlinesForHref
        : options.shouldDecodeNewlines

      // 属性解析成 { name, value } 对象
      attrs[i] = {
        name: args[1],
        value: decodeAttr(value, shouldDecodeNewlines) // 解码属性
      }

      if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
        // 非生产环境，且 outputSourceRange为 true 保存属性的开始和结束索引
        attrs[i].start = args.start + args[0].match(/^\s*/).length
        attrs[i].end = args.end
      }
    }

    if (!unary) { // 非一元标签
      // 将标签入栈存储
      stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs, start: match.start, end: match.end })
      // 解析完的标签记录为最近一个要解析的闭合标签
      lastTag = tagName
    }

    if (options.start) {
      // 创建开始标签AST
      options.start(tagName, attrs, unary, match.start, match.end)
    }
  }

  /**
   * 解析结束标签
   * @param {*} tagName 
   * @param {*} start 
   * @param {*} end 
   */
  function parseEndTag (tagName, start, end) {
    // pos 结束标签对应的开始标签在stack数组中的索引
    // lowerCasedTagName 小写标签名
    let pos, lowerCasedTagName
    if (start == null) start = index // 结束标签开始索引
    if (end == null) end = index // 结束标签结束索引

    // Find the closest opened tag of the same type
    if (tagName) {
      // 标签名转小写
      lowerCasedTagName = tagName.toLowerCase()
      // 查找最近的与结束标签相同的开始标签 记录索引pos
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break
        }
      }
    } else {
      // If no tag name is provided, clean shop
      pos = 0
    }

    if (pos >= 0) {
      // Close all the open elements, up the stack
      for (let i = stack.length - 1; i >= pos; i--) {
        if (process.env.NODE_ENV !== 'production' &&
          (i > pos || !tagName) &&
          options.warn
        ) {
          /**
           * 没有结束标签警告
           *  1. i > pos              <div><span></div> 
           *  2. tagName 为undefined   <div><span></span> 
           */
          options.warn(
            `tag <${stack[i].tag}> has no matching end tag.`,
            { start: stack[i].start, end: stack[i].end }
          )
        }

        if (options.end) {
          // 创建结束标签AST
          options.end(stack[i].tag, start, end)
        }
      }

      // Remove the open elements from the stack
      stack.length = pos // pop掉解析过的标签
      lastTag = pos && stack[pos - 1].tag // 修改最近一个要处理的标签为前一个
    } else if (lowerCasedTagName === 'br') { 
      // br标签有两种： <br> 或 </br>
      // pos小于0 br标签 如果此时写的是 </br> 命中处理，会创建一个开始的<br>标签
      // br 标签
      if (options.start) {
        options.start(tagName, [], true, start, end)
      }
    } else if (lowerCasedTagName === 'p') {
      // pos小于0，说明p中嵌套了Phrasing标签，
      // 那么p标签会提前闭合处理，此时只剩下结束</p>标签
      // </p> 标签结束处理
      if (options.start) {
        // 创建p开始标签
        options.start(tagName, [], false, start, end)
      }
      if (options.end) {
        // 创建p闭合标签
        options.end(tagName, start, end)
      }
    }
  }
}
