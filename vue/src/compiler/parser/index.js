/* @flow */

import he from 'he'
import { parseHTML } from './html-parser'
import { parseText } from './text-parser'
import { parseFilters } from './filter-parser'
import { genAssignmentCode } from '../directives/model'
import { extend, cached, no, camelize, hyphenate } from 'shared/util'
import { isIE, isEdge, isServerRendering } from 'core/util/env'

import {
  addProp,
  addAttr,
  baseWarn,
  addHandler,
  addDirective,
  getBindingAttr,
  getAndRemoveAttr,
  getRawBindingAttr,
  pluckModuleFunction,
  getAndRemoveAttrByRegex
} from '../helpers'

/**
 * 匹配 @ v-on 开头
 *  用来匹配v-one指令
 */
export const onRE = /^@|^v-on:/

/**
 * 匹配 v- @ : . # 开头 
 *  用来匹配绑定属性的特殊开头字符
 */
export const dirRE = process.env.VBIND_PROP_SHORTHAND
  ? /^v-|^@|^:|^\.|^#/
  : /^v-|^@|^:|^#/

/**
 * v-for的值匹配 (item, index) in list
 *  1. ([\s\S]*?) 任意空白开始 加 任意非空白字符串 零或一次
 *  2. \s+(?:in|of)\s+ 匹配in | of，前后至少一个空格
 *  3. ([\s\S]*) 匹配 任意空白开始 加 任意非空白字符串
 */
export const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
/**
 * v-for的迭代结果逗号后部分匹配 item,key,index
 *  1. ,([^,\}\]]*) 匹配逗号开头 非 , } ] 外的字符零次或多次
 *  2. (?:,([^,\}\]]*))? 匹配逗号开头 非 , } ] 外的字符零次或多次 允许出现零或一次
 */
export const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
// 匹配开头或结尾的小括号 (item, index)
const stripParensRE = /^\(|\)$/g
/**
 * 匹配开头结尾是中括号，中间除了换行符外的任何内容 
 *  用来匹配中括号传值的动态参数的 [hello] 
 */
const dynamicArgRE = /^\[.*\]$/
/**
 * 匹配冒号(:)开头的的值 匹配vue中的属性值
 *  用来匹配动态属性名 如 :hello
 */
const argRE = /:(.*)$/
/**
 * 匹配冒号(:)、点(.)、v-bind开头的属性
 *  匹配绑定属性 :hello .hello v-bind:hello
 *  绑定属性可以使用点开头？
 */ 
export const bindRE = /^:|^\.|^v-bind:/
const propBindRE = /^\./
/**
 * 匹配属性修饰符 
 *  匹配 .xxx.yyy
 */
const modifierRE = /\.[^.\]]+(?=[^\]]*$)/g
/**
 * 匹配插槽
 *  v-slot v-slot: 或 # 开头
 */
const slotRE = /^v-slot(:|$)|^#/
// 匹配 回车 换行
const lineBreakRE = /[\r\n]/
// 匹配 换页 制表 回车 换行
const whitespaceRE = /[ \f\t\r\n]+/g
// 不合法标签名匹配  空白 " ' < > / =
const invalidAttributeRE = /[\s"'<>\/=]/
// html解码、解码结果缓存
const decodeHTMLCached = cached(he.decode)

export const emptySlotScopeToken = `_empty_`

// configurable state
export let warn: any
let delimiters
let transforms
let preTransforms
let postTransforms
let platformIsPreTag
let platformMustUseProp
let platformGetTagNamespace
let maybeComponent

/**
 * 创建AST元素
 *  实际上是创建一个对象
 * @param {*} tag     标签名
 * @param {*} attrs   标签属性
 * @param {*} parent  父AST元素 即 currentParent
 * @returns 
 */
export function createASTElement (
  tag: string,
  attrs: Array<ASTAttr>,
  parent: ASTElement | void
): ASTElement {
  return {
    type: 1, // 1 表示是普通元素的AST元素节点 2 表示是表达式 3 表示是纯文本
    tag, // 标签名
    attrsList: attrs, // 标签属性数组 [ { name, value, ... } ]
    attrsMap: makeAttrsMap(attrs), // 标签属性Map { name1: value1, name2: value2 }
    rawAttrsMap: {}, // 标签属性所有元素的Map映射 非生产环境使用做提示
    parent, // 父AST元素
    children: [] // 子AST元素数组
  }
}

/**
 * Convert HTML string to AST.
 * 把解析HTML字符串成AST
 */
export function parse (
  template: string,
  options: CompilerOptions
): ASTElement | void {
  // 编译警告
  warn = options.warn || baseWarn

  // 1. 从options中解析编译所需的配置、方法
  // 平台预留标签
  platformIsPreTag = options.isPreTag || no
  // 平台必须使用prop的
  platformMustUseProp = options.mustUseProp || no
  // 平台获取标签命名空间方法
  platformGetTagNamespace = options.getTagNamespace || no
  // 预留标签对象
  const isReservedTag = options.isReservedTag || no
  maybeComponent = (el: ASTElement) => !!(
    el.component ||
    el.attrsMap[':is'] ||
    el.attrsMap['v-bind:is'] ||
    !(el.attrsMap.is ? isReservedTag(el.attrsMap.is) : isReservedTag(el.tag))
  )

  // 从modules数组中获取指定方法名的方法数组 会在AST创建的不同时机去执行
  transforms = pluckModuleFunction(options.modules, 'transformNode')
  preTransforms = pluckModuleFunction(options.modules, 'preTransformNode')
  postTransforms = pluckModuleFunction(options.modules, 'postTransformNode')

  delimiters = options.delimiters

  const stack = [] // 非闭合AST元素开始节点栈 目的是维护开始标签和结束标签是一一对应的关系
  const preserveWhitespace = options.preserveWhitespace !== false
  const whitespaceOption = options.whitespace
  let root // AST根节点元素 即 组件的根元素节点
  let currentParent // 当前AST元素的父AST元素
  let inVPre = false // v-pre指令标识
  let inPre = false // pre标签标识
  let warned = false

  function warnOnce (msg, range) {
    if (!warned) {
      warned = true
      warn(msg, range)
    }
  }

  /**
   * AST元素闭合处理
   *  1. 多个根节点处理
   *  2. 对AST进行树状态管理
   *  3. 各状态清除、重置
   * @param {*} element 
   */
  function closeElement (element) {
    // 移除末尾空格
    trimEndingWhitespace(element)

    if (!inVPre && !element.processed) {
      // 非v-pre 且 未处理的 AST元素节点
      // 处理AST元素attrsList中的值，对AST扩展
      element = processElement(element, options)
    }

    // tree management
    if (!stack.length && element !== root) {
      // allow root elements with v-if, v-else-if and v-else
      // 允许 v-if v-else-if v-else 设置多个根节点 此时 element是其它条件下的根节点
      if (root.if && (element.elseif || element.else)) {
        if (process.env.NODE_ENV !== 'production') {
          checkRootConstraints(element)
        }
        // 添加其它情况的节点到根节点的ifConditions数组的元素
        addIfCondition(root, {
          exp: element.elseif,
          block: element
        })
      } else if (process.env.NODE_ENV !== 'production') {
        // 根节点只能有一个
        // 当使用v-if判断生成根节点时候，使用v-else-if代替多次使用v-if
        warnOnce(
          `Component template should contain exactly one root element. ` +
          `If you are using v-if on multiple elements, ` +
          `use v-else-if to chain them instead.`,
          { start: element.start }
        )
      }
    }
    if (currentParent && !element.forbidden) {
      // 根AST元素节点存在 且 当前节点是非禁止节点
      if (element.elseif || element.else) {
        // 处理elseif或else情况的AST元素节点
        processIfConditions(element, currentParent)
      } else {
        if (element.slotScope) { // 旧非作用域插槽不走这里
          // 新插槽语法v-slot走这里 是插槽但不是作用域插槽的element.slotScope = "_empty_"
          // scoped slot
          // keep it in the children list so that v-else(-if) conditions can
          // find it as the prev node.
          const name = element.slotTarget || '"default"' // 未命名的slot默认名default
          // 处理非组件的插槽AST元素 组件上直接使用插槽AST元素在processSlotContent()中处理
          // 将AST元素添加到父AST元素的scopedSlots中，以绑定的插槽名name为键
          ;(currentParent.scopedSlots || (currentParent.scopedSlots = {}))[name] = element
        }
        // 保存当前AST元素到父AST元素的children
        currentParent.children.push(element)
        element.parent = currentParent // 指定当前元素的父AST元素
      }
    }

    // final children cleanup
    // filter out scoped slots
    // 过滤掉AST的children中是插槽AST元素的节点
    // 上面的slotScope处理已经将此种元素保存到element的scopedSlots中
    element.children = element.children.filter(c => !(c: any).slotScope)
    // remove trailing whitespace node again
    trimEndingWhitespace(element) // 移除末尾空格

    // check pre state
    if (element.pre) {
      // 重置v-pre状态
      inVPre = false
    }
    if (platformIsPreTag(element.tag)) {
      // 重置pre标签状态
      inPre = false
    }

    // apply post-transforms
    for (let i = 0; i < postTransforms.length; i++) {
      // 执行modules的postTransformNode
      postTransforms[i](element, options)
    }
  }

  /**
   * 移除当前AST元素的子AST元素数组中的末尾空格AST节点
   * @param {*} el 
   */
  function trimEndingWhitespace (el) {
    // remove trailing whitespace node
    if (!inPre) {
      let lastNode
      while (
        (lastNode = el.children[el.children.length - 1]) &&
        lastNode.type === 3 &&
        lastNode.text === ' '
      ) {
        el.children.pop()
      }
    }
  }

  /**
   * AST元素根节点约束性检查
   *  1. 不能使用 slot template 作为根AST节点
   *  2. 根节点上不能使用v-for
   * @param {*} el 
   */
  function checkRootConstraints (el) {
    if (el.tag === 'slot' || el.tag === 'template') {
      // 不能使用 slot template 作为根AST节点
      // 因为可能会产生多个节点，而根节点只能有一个
      warnOnce(
        `Cannot use <${el.tag}> as component root element because it may ` +
        'contain multiple nodes.',
        { start: el.start }
      )
    }
    if (el.attrsMap.hasOwnProperty('v-for')) {
      // 根节点上不能使用v-for 因为会产生多个节点，而根节点只能有一个
      warnOnce(
        'Cannot use v-for on stateful component root element because ' +
        'it renders multiple elements.',
        el.rawAttrsMap['v-for']
      )
    }
  }
  
  /**
   * 解析HTML模板
   *  解析HTML模板，主要做两件事情
   *   1. 解析HTML模板
   *   2. 在解析HTML过程中，调用传入的回调函数，进行AST树的生成
   */
  parseHTML(template, {
    warn,
    expectHTML: options.expectHTML,
    isUnaryTag: options.isUnaryTag,
    canBeLeftOpenTag: options.canBeLeftOpenTag,
    shouldDecodeNewlines: options.shouldDecodeNewlines,
    shouldDecodeNewlinesForHref: options.shouldDecodeNewlinesForHref,
    shouldKeepComment: options.comments,
    outputSourceRange: options.outputSourceRange,
    /**
     * 创建开始标签节点AST，并对标签进行扩展，再进行AST树管理
     * @param {*} tag   标签名
     * @param {*} attrs 标签属性
     * @param {*} unary 一元标签标志位
     * @param {*} start 标签在HTML字符串中的开始索引
     * @param {*} end   标签在HTML字符串中的结束索引
     */
    start (tag, attrs, unary, start, end) {
      // check namespace.
      // inherit parent ns if there is one
      // 获取父AST的命名空间，子AST继承
      const ns = (currentParent && currentParent.ns) || platformGetTagNamespace(tag)

      // handle IE svg bug
      /* istanbul ignore if */
      if (isIE && ns === 'svg') {
        // IE svg标签特殊处理
        attrs = guardIESVGBug(attrs)
      }

      // 创建开始标签的AST元素
      let element: ASTElement = createASTElement(tag, attrs, currentParent)

      /********** 下面逻辑是对AST元素进行扩展 ***************/

      if (ns) {
        // 添加命名空间
        element.ns = ns
      }

      // 非生产环境扩展
      if (process.env.NODE_ENV !== 'production') {
        if (options.outputSourceRange) {
          // 添加 start end rawAttrsMap
          element.start = start
          element.end = end
          // 创建一个对象，并添加属性 这种方法指的学习
          element.rawAttrsMap = element.attrsList.reduce((cumulated, attr) => {
            cumulated[attr.name] = attr
            return cumulated
          }, {})
        }

        attrs.forEach(attr => {
          if (invalidAttributeRE.test(attr.name)) {
            // 标签名不合法警告
            warn(
              `Invalid dynamic argument expression: attribute names cannot contain ` +
              `spaces, quotes, <, >, / or =.`,
              {
                start: attr.start + attr.name.indexOf(`[`),
                end: attr.start + attr.name.length
              }
            )
          }
        })
      }

      if (isForbiddenTag(element) && !isServerRendering()) {
        // 被禁止标签 且 非服务端渲染
        element.forbidden = true // 扩展禁止解析标识
        process.env.NODE_ENV !== 'production' && warn(
          'Templates should only be responsible for mapping the state to the ' +
          'UI. Avoid placing tags with side-effects in your templates, such as ' +
          `<${tag}>` + ', as they will not be parsed.',
          { start: element.start }
        )
      }

      // apply pre-transforms
      for (let i = 0; i < preTransforms.length; i++) {
        // pre-transforms 有则预转换AST元素
        // Web平台下 只是对v-model进行处理
        element = preTransforms[i](element, options) || element
      }

      if (!inVPre) {
        // 处理v-pre指令
        processPre(element)
        if (element.pre) {
          // 标识当前AST上有v-pre指令
          inVPre = true
        }
      }
      if (platformIsPreTag(element.tag)) {
        // 设置 当前元素是pre元素标识
        inPre = true
      }
      if (inVPre) {
        // FIXME: 处理v-pre标识的的AST元素
        processRawAttrs(element)
      } else if (!element.processed) { // 未处理的AST元素
        // structural directives
        // 处理结构性指令
        processFor(element) // 处理v-for指令
        processIf(element) // 处理v-if指令
        processOnce(element) // 处理v-once指令
      }

      /********** 下面逻辑是对AST树的管理 ***************/

      if (!root) {
        // 没有根节点，将当前AST元素做根节点
        root = element
        if (process.env.NODE_ENV !== 'production') {
          // 检测根节点是否满足约束
          checkRootConstraints(root)
        }
      }

      if (!unary) {
        // 非一元标签
        // 将当前AST元素节点当作下一个AST节点的父节点
        currentParent = element
        stack.push(element) // 入栈非闭合标签AST元素开始标签节点
      } else {
        // 一元标签 闭合处理
        closeElement(element)
      }
    },
    /**
     * 结束标签节点对应的开始AST元素的stack回溯处理
     *  1. stack栈中移除对应的开始标签
     *  2. 闭合处理
     * @param {*} tag 
     * @param {*} start 
     * @param {*} end 
     */
    end (tag, start, end) {
      // 结束标签对应的开始AST元素
      const element = stack[stack.length - 1]
      // pop stack
      stack.length -= 1 // 弹出结束标签对应的开始标签
      currentParent = stack[stack.length - 1] // 将父AST元素节点改成上一个 即 当前父级的父级
      if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
        element.end = end
      }
      // 结束标签对应的开始AST元素的闭合处理
      closeElement(element)
    },
    /**
     * 创建文本节点AST 或 表达式AST
     *  1. 纯文本不能做为一个组件的根节点 与组件根节点同级的文本节点会被忽略
     *  2. 去除文本两端的空格，创建AST
     * @param {*} text 
     * @param {*} start 
     * @param {*} end 
     * @returns 
     */
    chars (text: string, start: number, end: number) {
      // 根节点的文本处理
      if (!currentParent) {
        // currentParent不为真 即当前节点是根AST元素
        if (process.env.NODE_ENV !== 'production') {
          if (text === template) {
            // 警告 一个组件的根节点不能是纯文本
            warnOnce(
              'Component template requires a root element, rather than just text.',
              { start }
            )
          } else if ((text = text.trim())) {
            // 警告 与组件根节点同级的文本节点会被忽略
            warnOnce(
              `text "${text}" outside root element will be ignored.`,
              { start }
            )
          }
        }
        return
      }

      // IE textarea placeholder bug
      /* istanbul ignore if */
      if (isIE &&
        currentParent.tag === 'textarea' &&
        currentParent.attrsMap.placeholder === text
      ) {
        // 不处理IE的placeholder文本
        return
      }

      const children = currentParent.children
      // 对text文本两端空白处理
      if (inPre || text.trim()) {
        // pre标签 或 有文本（去除文本两端空格后）
        // script/style标签直接返回text 
        // 其它标签的文本做解码
        text = isTextTag(currentParent) ? text : decodeHTMLCached(text)
        // 下面都是对text是纯空白的处理
      } else if (!children.length) { // 父AST没有子节点
        // remove the whitespace-only node right after an opening tag
        // 父AST没有子节点，删除所有空格
        text = ''
      } else if (whitespaceOption) {
        // 父AST有子节点 whitespaceOption 空白处理模式为真
        if (whitespaceOption === 'condense') {
          // in condense mode, remove the whitespace node if it contains
          // line break, otherwise condense to a single space
          // condense 压缩模式下，去掉回车符、换行符 其它空白符保留一个空格
          text = lineBreakRE.test(text) ? '' : ' '
        } else {
          // preserve 保留模式 保留一个空格
          text = ' '
        }
      } else {
        // 父AST有子节点
        // options.preserveWhitespace为真 保留一个空格
        text = preserveWhitespace ? ' ' : ''
      }
      if (text) { // 处理过两端空白的text
        if (!inPre && whitespaceOption === 'condense') {
          // condense consecutive whitespaces into single space
          // 非pre标签，且 压缩模式，将文本中的所有开白压缩到一个空格
          text = text.replace(whitespaceRE, ' ')
        }
        let res // 文本解析表达式的结果
        let child: ?ASTNode // 要创建的文本或表达式AST节点
        if (!inVPre && text !== ' ' && (res = parseText(text, delimiters))) {
          // 非v-pre标签节点 且 解析文本结果是表达式 { expression, tokens  }
          // 创建表达式AST元素节点
          child = {
            type: 2,
            expression: res.expression,
            tokens: res.tokens,
            text
          }
        } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
          // 有文本 且 父AST有子AST，且 最后一个子AST不是文本AST元素
          // 创建文本AST元素节点
          child = {
            type: 3,
            text
          }
        }
        if (child) {
          if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
            child.start = start
            child.end = end
          }
          // 将文本或表达式AST push到父AST中
          children.push(child)
        }
      }
    },
    /**
     * 创建注释节点AST
     *  1. 根节点AST的注释节点会被忽略
     *  2. 非根节点，注释AST节点push到父AST元素的children中
     * @param {*} text 
     * @param {*} start 
     * @param {*} end 
     */
    comment (text: string, start, end) {
      // adding anything as a sibling to the root node is forbidden
      // comments should still be allowed, but ignored
      if (currentParent) {
        // 非根节点，添加注释AST节点
        const child: ASTText = {
          type: 3,
          text,
          isComment: true
        }
        if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
          child.start = start
          child.end = end
        }
        // 注释AST节点push到父AST的children中
        currentParent.children.push(child)
      }
    }
  })

  // 返回AST树
  return root
}

/**
 * 处理v-pre指令
 *  移除v-pre属性，并给AST元素扩展v-pre标识pre
 * @param {*} el AST元素
 */
function processPre (el) {
  if (getAndRemoveAttr(el, 'v-pre') != null) {
    el.pre = true
  }
}

function processRawAttrs (el) {
  const list = el.attrsList
  const len = list.length
  if (len) {
    const attrs: Array<ASTAttr> = el.attrs = new Array(len)
    for (let i = 0; i < len; i++) {
      attrs[i] = {
        name: list[i].name,
        value: JSON.stringify(list[i].value)
      }
      if (list[i].start != null) {
        attrs[i].start = list[i].start
        attrs[i].end = list[i].end
      }
    }
  } else if (!el.pre) {
    // non root node in pre blocks with no attributes
    el.plain = true
  }
}

/**
 * 处理AST元素节点
 *  处理元素上的属性即attrsList中的值，对AST进行扩展
 * @param {*} element 
 * @param {*} options 
 * @returns 
 */
export function processElement (
  element: ASTElement,
  options: CompilerOptions
) {
  // 处理:key属性
  processKey(element)

  // determine whether this is a plain element after
  // removing structural attributes
  // 在移除结构属性后，判断该AST元素是否是普通的AST元素节点
  // 扩展plain，是否是普通的AST元素节点：没有 key scopedSlots attrsList
  element.plain = (
    !element.key &&
    !element.scopedSlots &&
    !element.attrsList.length
  )

  // FIXME: 处理 ref
  processRef(element)
  // 处理插槽v-slot slot slot-scoped
  processSlotContent(element)
  // 处理插槽标签<slot>
  processSlotOutlet(element)
  // FIXME: 处理 component
  processComponent(element)

  // 执行transforms
  for (let i = 0; i < transforms.length; i++) {
    // Web下处理 静态和动态的class、style
    element = transforms[i](element, options) || element
  }

  // 处理attrsList中其它没有处理的属性 
  processAttrs(element)
  return element
}

/**
 * 处理key属性
 * @param {*} el 
 */
function processKey (el) {
  // key属性的表达式
  const exp = getBindingAttr(el, 'key')
  if (exp) {
    if (process.env.NODE_ENV !== 'production') {
      if (el.tag === 'template') {
        // template上不能设置key属性
        warn(
          `<template> cannot be keyed. Place the key on real elements instead.`,
          getRawBindingAttr(el, 'key')
        )
      }
      if (el.for) {
        const iterator = el.iterator2 || el.iterator1
        const parent = el.parent
        if (iterator && iterator === exp && parent && parent.tag === 'transition-group') {
          // <transition-group>的子AST元素上不能使用v-for生成的index作为key
          warn(
            `Do not use v-for index as key on <transition-group> children, ` +
            `this is the same as not using keys.`,
            getRawBindingAttr(el, 'key'),
            true /* tip */
          )
        }
      }
    }
    // 扩展key属性到AST上
    el.key = exp
  }
}

function processRef (el) {
  const ref = getBindingAttr(el, 'ref')
  if (ref) {
    el.ref = ref
    el.refInFor = checkInFor(el)
  }
}

/**
 * 处理v-for指令
 *  移除v-for
 * @param {*} el 
 */
export function processFor (el: ASTElement) {
  let exp
  if ((exp = getAndRemoveAttr(el, 'v-for'))) {
    const res = parseFor(exp)
    if (res) {
      // 将v-for结果扩展到AST元素上
      extend(el, res)
    } else if (process.env.NODE_ENV !== 'production') {
      // v-for表达式的值不合法警告
      warn(
        `Invalid v-for expression: ${exp}`,
        el.rawAttrsMap['v-for']
      )
    }
  }
}

type ForParseResult = {
  for: string;
  alias: string;
  iterator1?: string;
  iterator2?: string;
};
/**
 * 解析v-for结果：
 *  1. item in list => { for: list, alias: item }
 *  2. (item, index) in list => { for: list, alias: item, iterator1: index } 
 *  3. (item, key, index) in list => { for: list, alias: item, iterator1: key, iterator2: index } 
 * @param {*} exp 
 * @returns 
 */
export function parseFor (exp: string): ?ForParseResult {
  // 正则匹配v-for的值
  const inMatch = exp.match(forAliasRE)
  if (!inMatch) return // reject 不符合规则

  const res = {}
  // 要遍历的list
  res.for = inMatch[2].trim()
  // 遍历项item 去掉空格和括号 得到迭代结果名alias
  const alias = inMatch[1].trim().replace(stripParensRE, '')
  // 匹配逗号后的部分
  const iteratorMatch = alias.match(forIteratorRE)
  if (iteratorMatch) {
    // 如值item,key,index 有逗号后部分 
    res.alias = alias.replace(forIteratorRE, '').trim() // item
    res.iterator1 = iteratorMatch[1].trim() // key
    if (iteratorMatch[2]) {
      res.iterator2 = iteratorMatch[2].trim() // index
    }
  } else {
    // 没有逗号部分
    res.alias = alias
  }
  return res
}

/**
 * 处理v-if v-else v-else-if的AST元素
 *  1. 在 v-if 的AST元素上扩展ifConditions数组，添加当前AST元素的表达式exp和元素本身el
 *  2. 在 v-else 的AST元素上扩展 else 标识，以便后续processIfConditions处理
 *  3. 在 v-else-if 的AST元素上扩展 elseif 表达式，以便后续processIfConditions处理
 * @param {*} el 
 */
function processIf (el) {
  const exp = getAndRemoveAttr(el, 'v-if')
  if (exp) {
    // if的表达式exp扩展到AST元素上
    el.if = exp
    // 将if解析结果扩展到AST元素上，保存在el.ifConditions中
    addIfCondition(el, {
      exp: exp,
      block: el
    })
  } else {
    if (getAndRemoveAttr(el, 'v-else') != null) {
      // 扩展v-else标识符到AST元素上
      el.else = true
    }
    const elseif = getAndRemoveAttr(el, 'v-else-if')
    if (elseif) {
      // 扩展v-else-if的表达式elseif到AST元素上
      el.elseif = elseif
    }
  }
}

/**
 * 处理 v-else-if v-else 的AST元素
 *  将上述两种AST元素节点添加到上面相邻的兄弟AST元素的ifConditions数组中
 * @param {*} el 
 * @param {*} parent 
 */
function processIfConditions (el, parent) {
  const prev = findPrevElement(parent.children)
  if (prev && prev.if) {
    // 相邻的上个节点是v-if，扩展v-else-if或v-else到相邻的AST元素的ifConditions数组中
    // v-else 时，el.elseif是undefined，即exp是undefined
    addIfCondition(prev, {
      exp: el.elseif,
      block: el
    })
  } else if (process.env.NODE_ENV !== 'production') {
    // 相邻AST元素不是v-if情况下，直接使用v-else-if或v-else 报错提示
    warn(
      `v-${el.elseif ? ('else-if="' + el.elseif + '"') : 'else'} ` +
      `used on element <${el.tag}> without corresponding v-if.`,
      el.rawAttrsMap[el.elseif ? 'v-else-if' : 'v-else']
    )
  }
}

/**
 * 找到相邻的AST元素
 *  函数用来查找v-else-if或v-else的相邻AST元素
 *  v-if和v-else(-if)之间的表达式或文本AST元素节点将被移除（忽略）
 * @param {*} children 
 * @returns 
 */
function findPrevElement (children: Array<any>): ASTElement | void {
  let i = children.length
  while (i--) {
    if (children[i].type === 1) {
      return children[i]
    } else {
      if (process.env.NODE_ENV !== 'production' && children[i].text !== ' ') {
        warn(
          `text "${children[i].text.trim()}" between v-if and v-else(-if) ` +
          `will be ignored.`,
          children[i]
        )
      }
      // 移除v-if和v-else(-if)之间的表达式或文本AST元素节点
      children.pop()
    }
  }
}

/**
 * 将if结果扩展到ifConditions数组中
 *  结果 { exp: string; block: ASTElement }
 * @param {*} el 
 * @param {*} condition 
 */
export function addIfCondition (el: ASTElement, condition: ASTIfCondition) {
  if (!el.ifConditions) {
    el.ifConditions = []
  }
  el.ifConditions.push(condition)
}

/**
 * 处理 v-once
 * @param {*} el 
 */
function processOnce (el) {
  const once = getAndRemoveAttr(el, 'v-once')
  if (once != null) {
    // 扩展once标识符到AST上
    el.once = true
  }
}

/**
 * handle content being passed to a component as slot,
 * e.g. <template slot="xxx">, <div slot-scope="xxx">
 * 处理插槽内容
 *  - slot 具名插槽 旧语法
 *  - slot-scopet 作用域插槽 旧语法
 *  - v-slot 具名插槽和作用域插槽
 * @param {*} el 
 */
function processSlotContent (el) {
  // 下面是slot-scope作用域插槽处理
  let slotScope
  if (el.tag === 'template') { // tempalte上作用域插槽
    // scope属性处理
    slotScope = getAndRemoveAttr(el, 'scope')
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && slotScope) {
      // 警告 scope已废弃 推荐使用slot-scope
      warn(
        `the "scope" attribute for scoped slots have been deprecated and ` +
        `replaced by "slot-scope" since 2.5. The new "slot-scope" attribute ` +
        `can also be used on plain elements in addition to <template> to ` +
        `denote scoped slots.`,
        el.rawAttrsMap['scope'],
        true
      )
    }
    // AST元素上扩展插槽作用域slotScope属性
    el.slotScope = slotScope || getAndRemoveAttr(el, 'slot-scope')
  } else if ((slotScope = getAndRemoveAttr(el, 'slot-scope'))) {
    // 非template标签 slot-scope属性处理
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && el.attrsMap['v-for']) {
      // 警告 v-for上使用slot-scope
      warn(
        `Ambiguous combined usage of slot-scope and v-for on <${el.tag}> ` +
        `(v-for takes higher priority). Use a wrapper <template> for the ` +
        `scoped slot to make it clearer.`,
        el.rawAttrsMap['slot-scope'],
        true
      )
    }
    // AST元素上扩展插槽作用域slotScope属性 即 插槽prop
    el.slotScope = slotScope
  }

  // 下面是slot具名插槽处理
  // slot="xxx"
  const slotTarget = getBindingAttr(el, 'slot')
  if (slotTarget) {
    // AST元素上扩展绑定的插槽名slotTarget 默认是default
    el.slotTarget = slotTarget === '""' ? '"default"' : slotTarget
    // AST元素上扩展是否是动态插槽标识
    el.slotTargetDynamic = !!(el.attrsMap[':slot'] || el.attrsMap['v-bind:slot'])
    // preserve slot as an attribute for native shadow DOM compat
    // only for non-scoped slots.
    if (el.tag !== 'template' && !el.slotScope) {
      // 非template标签 并 没有插槽prop，即非作用域插槽 扩展el.attrs.slot属性，保存对应的具名插槽的名字 如 slot='xxx' el.attrs.slot = 'xxx'
      addAttr(el, 'slot', slotTarget, getRawBindingAttr(el, 'slot'))
    }
  }

  // 下面是v-slot插槽处理
  // 2.6 v-slot syntax
  if (process.env.NEW_SLOT_SYNTAX) {
    if (el.tag === 'template') {
      // <template>上使用插槽
      // v-slot on <template>
      // 插槽的绑定值
      const slotBinding = getAndRemoveAttrByRegex(el, slotRE)
      if (slotBinding) {
        if (process.env.NODE_ENV !== 'production') {
          if (el.slotTarget || el.slotScope) {
            // 警告 v-slot不能和slot slot-scope混用
            warn(
              `Unexpected mixed usage of different slot syntaxes.`,
              el
            )
          }
          if (el.parent && !maybeComponent(el.parent)) {
            // 警告 <template v-slot> 只能出现在接收组件内部的根节点上
            /**
             * 如：<template v-slot>只能作为<current-user>的根节点
             * <current-user>
             *   <template v-slot>
             *      hello tom
             *   </template>
             * </current-user>
             */
            warn(
              `<template v-slot> can only appear at the root level inside ` +
              `the receiving component`,
              el
            )
          }
        }
        /**
         * v-slot与scope、slot-scope相比，本质上只是不同的语法糖，最终AST元素上
         * 扩展的属性值相同
         */
        const { name, dynamic } = getSlotName(slotBinding)
        el.slotTarget = name
        el.slotTargetDynamic = dynamic
        // 插槽prop 赋值插槽作用域 没有作用域时，默认强制赋值为emptySlotScopeToken = "_empty_"
        el.slotScope = slotBinding.value || emptySlotScopeToken // force it into a scoped slot for perf
      }
    } else {
      // 组件上使用插槽
      // 当被提供的内容只有默认插槽时，组件的标签才可以被当作插槽的模板来使用
      // v-slot on component, denotes default slot
      // 插槽的绑定值
      const slotBinding = getAndRemoveAttrByRegex(el, slotRE)
      if (slotBinding) {
        if (process.env.NODE_ENV !== 'production') {
          if (!maybeComponent(el)) {
            // 警告 v-slot只能在组件上或template上使用
            warn(
              `v-slot can only be used on components or <template>.`,
              slotBinding
            )
          }
          if (el.slotScope || el.slotTarget) {
            // 警告 v-slot不能和slot slot-scope混用
            warn(
              `Unexpected mixed usage of different slot syntaxes.`,
              el
            )
          }
          if (el.scopedSlots) {
            // 警告 当有其它具名插槽时，默认插槽也应该使用<template>语法 而不应该直接放在组件上
            // 即 只有默认标签时，v-slot可以放在组件上，下方会自动处理加上template标签
            warn(
              `To avoid scope ambiguity, the default slot should also use ` +
              `<template> syntax when there are other named slots.`,
              slotBinding
            )
          }
        }

        /**
         * 非组件使用插槽
         *  在closeElement()中处理，将插槽AST元素添加到父AST元素的scopedSlots中
         * 组件上使用插槽
         *  创建一个template标签的AST元素作为插槽的AST，然后将此AST放在组件AST元素的
         *  作用域插槽el.scopedSlots属性中，以绑定的插槽名name作为键el.scopedSlots[name]，
         *  再将组件的children的父级指向插槽的templateAST标签，并添加插槽AST的
         *  插槽作用域slotScope，最后清除组件AST元素的children
         * 总结：非组件插槽和组件插槽的AST，都会保存在父级AST元素的scopedSlots中；
         *       非组件使用插槽，插槽AST元素保存在父AST的scopedSlots中；
         *       组件使用插槽，插槽AST元素，会先用template的AST元素包裹，然后保存在
         *       组件的scopedSlots中，即以组件为父AST；
         */
        // 组件的children作为组件的插槽节点 所有的插槽节点都保存在el.scopedSlots中
        // add the component's children to its default slot
        const slots = el.scopedSlots || (el.scopedSlots = {})
        const { name, dynamic } = getSlotName(slotBinding)
        // 创建template标签的AST元素作为slot的容器
        // v-slot在组件上，会自动创建template标签，本质上还是在template上使用v-slot
        const slotContainer = slots[name] = createASTElement('template', [], el)
        slotContainer.slotTarget = name
        slotContainer.slotTargetDynamic = dynamic
        // 取非插槽的AST元素作为slotContainer的children
        slotContainer.children = el.children.filter((c: any) => {
          if (!c.slotScope) {
            // 子AST非插槽AST 将组件的children.parent指向slotContainer
            c.parent = slotContainer
            return true
          }
        })
        // 插槽prop 扩展组件插槽的插槽作用域 没有作用域时，默认强制赋值为emptySlotScopeToken = "_empty_"
        slotContainer.slotScope = slotBinding.value || emptySlotScopeToken
        // remove children as they are returned from scopedSlots now
        el.children = [] // 移除掉组件本来的children，现在在el.scopedSlots[name].children
        // mark el non-plain so data gets generated
        el.plain = false
      }
    }
  }
}

/**
 * 获取v-slot绑定的插槽名和动态插槽标识
 * @param {*} binding 
 * @returns 
 */
function getSlotName (binding) {
  // 绑定的插槽名
  let name = binding.name.replace(slotRE, '')
  if (!name) {
    if (binding.name[0] !== '#') {
      // 非#语法 默认插槽名为default
      name = 'default'
    } else if (process.env.NODE_ENV !== 'production') {
      // 警告 #语法必须写插槽名
      warn(
        `v-slot shorthand syntax requires a slot name.`,
        binding
      )
    }
  }
  return dynamicArgRE.test(name)
    // dynamic [name] 动态插槽名 去掉中括号
    ? { name: name.slice(1, -1), dynamic: true }
    // static name 静态插槽
    : { name: `"${name}"`, dynamic: false }
}

/**
 * handle <slot/> outlets
 * 处理插槽标签<slot>
 * @param {*} el 
 */
function processSlotOutlet (el) {
  if (el.tag === 'slot') {
    // 扩展插槽AST元素标签上的name属性
    el.slotName = getBindingAttr(el, 'name')
    if (process.env.NODE_ENV !== 'production' && el.key) {
      // 警告 slot标签上不能使用key
      warn(
        `\`key\` does not work on <slot> because slots are abstract outlets ` +
        `and can possibly expand into multiple elements. ` +
        `Use the key on a wrapping element instead.`,
        getRawBindingAttr(el, 'key')
      )
    }
  }
}

function processComponent (el) {
  let binding
  if ((binding = getBindingAttr(el, 'is'))) {
    el.component = binding
  }
  if (getAndRemoveAttr(el, 'inline-template') != null) {
    el.inlineTemplate = true
  }
}

/**
 * 处理事件、绑定属性、自定义指令、静态属性
 *  包括：
 *    1. 未处理的动态属性 如： v-on @ v-bind : . v-model 绑定的属性
 *    2. 静态属性 如 hello="world"
 * @param {*} el AST元素
 */
function processAttrs (el) {
  const list = el.attrsList

  let i, l, name, rawName, value, modifiers, syncGen, isDynamic
  for (i = 0, l = list.length; i < l; i++) {
    name = rawName = list[i].name
    value = list[i].value
    if (dirRE.test(name)) { // 动态绑定属性处理  v- @ : . # 开头
      // mark element as dynamic 标记动态AST节点标识
      el.hasBindings = true
      // modifiers 解析修饰符
      modifiers = parseModifiers(name.replace(dirRE, ''))

      // support .foo shorthand syntax for the .prop modifier
      if (process.env.VBIND_PROP_SHORTHAND && propBindRE.test(name)) {
        (modifiers || (modifiers = {})).prop = true
        name = `.` + name.slice(1).replace(modifierRE, '')
      } else if (modifiers) {
        // 去掉属性修饰符 @click.native.prevent => @click
        name = name.replace(modifierRE, '')
      }

      if (bindRE.test(name)) { // v-bind 处理
        name = name.replace(bindRE, '')
        value = parseFilters(value)
        isDynamic = dynamicArgRE.test(name)
        if (isDynamic) {
          // 动态参数 [hello] 去掉中括号
          name = name.slice(1, -1)
        }
        if (
          process.env.NODE_ENV !== 'production' &&
          value.trim().length === 0
        ) {
          // 警告 绑定值不能为空  如 不允许:hello=""
          warn(
            `The value for a v-bind expression cannot be empty. Found in "v-bind:${name}"`
          )
        }
        // 处理修饰符
        if (modifiers) {
          if (modifiers.prop && !isDynamic) {
            name = camelize(name)
            if (name === 'innerHtml') name = 'innerHTML'
          }
          if (modifiers.camel && !isDynamic) {
            // camel修饰符
            name = camelize(name)
          }
          if (modifiers.sync) {
            // 处理sync修饰符
            syncGen = genAssignmentCode(value, `$event`)
            if (!isDynamic) {
              addHandler(
                el,
                `update:${camelize(name)}`,
                syncGen,
                null,
                false,
                warn,
                list[i]
              )
              if (hyphenate(name) !== camelize(name)) {
                addHandler(
                  el,
                  `update:${hyphenate(name)}`,
                  syncGen,
                  null,
                  false,
                  warn,
                  list[i]
                )
              }
            } else {
              // handler w/ dynamic event name
              addHandler(
                el,
                `"update:"+(${name})`,
                syncGen,
                null,
                false,
                warn,
                list[i],
                true // dynamic
              )
            }
          }
        }

        if ((modifiers && modifiers.prop) || (
          !el.component && platformMustUseProp(el.tag, el.attrsMap.type, name)
        )) {
          // 有prop修饰符 或 平台上必须将属性绑定到prop
          addProp(el, name, value, list[i], isDynamic)
        } else {
          // 将属性扩展到AST元素上
          addAttr(el, name, value, list[i], isDynamic)
        }
      } else if (onRE.test(name)) { // v-on 事件处理
        // 去掉开头v-on @ 符号 @click => click
        name = name.replace(onRE, '')
        // 动态事件属性
        isDynamic = dynamicArgRE.test(name)
        if (isDynamic) {
          // 去掉动态事件属性的中括号
          name = name.slice(1, -1)
        }
        // 处理事件 在el上扩展events或nativeEvents属性
        addHandler(el, name, value, modifiers, false, warn, list[i], isDynamic)
      } else { // normal directives 指令处理 如v-model 或 用户自定义的指令
        // 去掉开头指令符号
        name = name.replace(dirRE, '')

        // parse arg 匹配指令上的参数 v-hello:wrold =>  [':wrold', 'wrold', index: 7, input: 'v-hello:wrold', groups: undefined]
        const argMatch = name.match(argRE)
        let arg = argMatch && argMatch[1]
        isDynamic = false
        if (arg) {
          name = name.slice(0, -(arg.length + 1))
          if (dynamicArgRE.test(arg)) {
            // 指令参数动态值处理
            arg = arg.slice(1, -1)
            isDynamic = true
          }
        }
        // AST元素上扩展directives属性
        addDirective(el, name, rawName, value, arg, isDynamic, modifiers, list[i])
        if (process.env.NODE_ENV !== 'production' && name === 'model') {
          // v-model指令不允许绑定v-for在遍历的值
          checkForAliasModel(el, value)
        }
      }
    } else { // 静态属性处理
      // literal attribute
      if (process.env.NODE_ENV !== 'production') {
        // html的静态标签属性中，不能使用{{}}分隔符
        const res = parseText(value, delimiters)
        if (res) {
          warn(
            `${name}="${value}": ` +
            'Interpolation inside attributes has been removed. ' +
            'Use v-bind or the colon shorthand instead. For example, ' +
            'instead of <div id="{{ val }}">, use <div :id="val">.',
            list[i]
          )
        }
      }
      // 将静态属性扩展到AST元素的静态属性attrs数组中
      addAttr(el, name, JSON.stringify(value), list[i])
      // #6887 firefox doesn't update muted state if set via attribute
      // even immediately after element creation
      if (!el.component &&
          name === 'muted' &&
          platformMustUseProp(el.tag, el.attrsMap.type, name)) {
        addProp(el, name, 'true', list[i])
      }
    }
  }
}

function checkInFor (el: ASTElement): boolean {
  let parent = el
  while (parent) {
    if (parent.for !== undefined) {
      return true
    }
    parent = parent.parent
  }
  return false
}

/**
 * 解析属性修饰符成Map
 *  .hello.world => 
 *  { hello: true, world: true }
 * @param {*} name 
 * @returns 
 */
function parseModifiers (name: string): Object | void {
  const match = name.match(modifierRE)
  if (match) {
    const ret = {}
    match.forEach(m => { ret[m.slice(1)] = true })
    return ret
  }
}

/**
 * 生成标签属性数组的Map
 *  [{ name1, value1, ... }, { name2, value2, ... }] =>
 *  { name1: value1, name2: value2 }
 * @param {*} attrs 
 * @returns 
 */
function makeAttrsMap (attrs: Array<Object>): Object {
  const map = {}
  for (let i = 0, l = attrs.length; i < l; i++) {
    if (
      process.env.NODE_ENV !== 'production' &&
      map[attrs[i].name] && !isIE && !isEdge
    ) {
      warn('duplicate attribute: ' + attrs[i].name, attrs[i])
    }
    map[attrs[i].name] = attrs[i].value
  }
  return map
}

/**
 * script style当作纯文本标签
 * @param {*} el 
 * @returns 
 */
// for script (e.g. type="x/template") or style, do not decode content
function isTextTag (el): boolean {
  return el.tag === 'script' || el.tag === 'style'
}

/**
 * 是否是禁止使用的标签
 * 禁止标签：
 *  1. style
 *  2. script 且 无属性type字段或type字段为'text/javascript'
 * @param {*} el 
 * @returns 
 */
function isForbiddenTag (el): boolean {
  return (
    el.tag === 'style' ||
    (el.tag === 'script' && (
      !el.attrsMap.type ||
      el.attrsMap.type === 'text/javascript'
    ))
  )
}

const ieNSBug = /^xmlns:NS\d+/
const ieNSPrefix = /^NS\d+:/

/* istanbul ignore next */
function guardIESVGBug (attrs) {
  const res = []
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i]
    if (!ieNSBug.test(attr.name)) {
      attr.name = attr.name.replace(ieNSPrefix, '')
      res.push(attr)
    }
  }
  return res
}

/**
 * 检查v-for指令的遍历值是否与v-model的绑定值相同
 * 如 v-for ="item in list" v-model的value不能是item 
 * @param {*} el 
 * @param {*} value 
 */
function checkForAliasModel (el, value) {
  let _el = el
  while (_el) {
    if (_el.for && _el.alias === value) {
      // 不能绑定v-for的遍历值到v-model上
      warn(
        `<${el.tag} v-model="${value}">: ` +
        `You are binding v-model directly to a v-for iteration alias. ` +
        `This will not be able to modify the v-for source array because ` +
        `writing to the alias is like modifying a function local variable. ` +
        `Consider using an array of objects and use v-model on an object property instead.`,
        el.rawAttrsMap['v-model']
      )
    }
    // 遍历父AST继续查找
    _el = _el.parent
  }
}
