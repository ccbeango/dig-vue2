/* @flow */

import { genHandlers } from './events'
import baseDirectives from '../directives/index'
import { camelize, no, extend } from 'shared/util'
import { baseWarn, pluckModuleFunction } from '../helpers'
import { emptySlotScopeToken } from '../parser/index'

type TransformFunction = (el: ASTElement, code: string) => string;
type DataGenFunction = (el: ASTElement) => string;
type DirectiveFunction = (el: ASTElement, dir: ASTDirective, warn: Function) => boolean;

// 编译过程需要的用的属性和方法
export class CodegenState {
  options: CompilerOptions;
  warn: Function;
  transforms: Array<TransformFunction>;
  dataGenFns: Array<DataGenFunction>;
  directives: { [key: string]: DirectiveFunction };
  maybeComponent: (el: ASTElement) => boolean;
  onceId: number;
  staticRenderFns: Array<string>;
  pre: boolean;

  constructor (options: CompilerOptions) {
    this.options = options
    this.warn = options.warn || baseWarn
    this.transforms = pluckModuleFunction(options.modules, 'transformCode')
    this.dataGenFns = pluckModuleFunction(options.modules, 'genData') // web下 style、class获取genData
    this.directives = extend(extend({}, baseDirectives), options.directives)
    const isReservedTag = options.isReservedTag || no
    this.maybeComponent = (el: ASTElement) => !!el.component || !isReservedTag(el.tag)
    this.onceId = 0
    this.staticRenderFns = []
    this.pre = false
  }
}

export type CodegenResult = {
  render: string,
  staticRenderFns: Array<string>
};

/**
 * 整个code的生成过程，是递归遍历AST树的过程，对于每一个AST节点，实际上都是一个genNode
 * 的调用。在每个节点中，它实际上在创建它本身和它的子节点code之前，可能会对v-for、v-if
 * 等做一些额外的处理，最终形成我们所需要的代码code
 * 
 * 整个codegen过程是深度遍历AST根据不同条件生成不同代码的过程，我们可以根据具体的case，
 * 走完一条主线即可。通过不同case的学习，不断强化编译过程，而不必纠结于它整体的实现。
 */
/**
 * 将AST树转换成code字符串
 * @param {*} ast 
 * @param {*} options 
 * @returns 
 */
export function generate (
  ast: ASTElement | void,
  options: CompilerOptions
): CodegenResult {
  // 编译阶段需要的辅助属性和方法
  const state = new CodegenState(options)
  // fix #11483, Root level <script> tags should not be rendered.
  const code = ast ? (ast.tag === 'script' ? 'null' : genElement(ast, state)) : '_c("div")'
  return {
    render: `with(this){return ${code}}`, // 使用with语句包裹code
    staticRenderFns: state.staticRenderFns // 标记为静态根的节点渲染函数
  }
}

/**
 * 判断当前AST元素节点的属性执行不同的代码生成函数
 * @param {*} el 
 * @param {*} state 
 * @returns 
 */
export function genElement (el: ASTElement, state: CodegenState): string {
  if (el.parent) {
    el.pre = el.pre || el.parent.pre
  }

  if (el.staticRoot && !el.staticProcessed) {
    // 静态根
    return genStatic(el, state)
  } else if (el.once && !el.onceProcessed) {
    // v-once
    return genOnce(el, state)
  } else if (el.for && !el.forProcessed) {
    // v-for
    return genFor(el, state)
  } else if (el.if && !el.ifProcessed) {
    // v-if 第一次调用时，el.ifProcessed为false
    // genIf再调用genElement，非第一次执行都会走到 else {} 逻辑
    return genIf(el, state)
  } else if (el.tag === 'template' && !el.slotTarget && !state.pre) {
    // template 且 非slot 且 非pre
    return genChildren(el, state) || 'void 0'
  } else if (el.tag === 'slot') {
    // v-slot
    return genSlot(el, state)
  } else {
    // component or element
    // staticRoot、v-once、v-for、v-if 非首次执行 也会命中此逻辑
    let code
    if (el.component) {
      // 组件标签
      code = genComponent(el.component, el, state)
    } else {
      // 元素标签
      let data
      if (!el.plain || (el.pre && state.maybeComponent(el))) {
        // 非普通节点元素 或 是v-pre元素且可能是组件元素
        // 生成data
        data = genData(el, state)
      }
      // 非内联模板，生成AST子元素code
      const children = el.inlineTemplate ? null : genChildren(el, state, true)

      // 生成code _c(tag, data?, children?)
      // `_c('${el.tag}' ${data ? `, ${data}` : ''} ${ children ? `,${children}` : ''})`
      code = `_c('${el.tag}'${
        data ? `,${data}` : '' // data
      }${
        children ? `,${children}` : '' // children
      })`
    }
    // module transforms
    for (let i = 0; i < state.transforms.length; i++) {
      code = state.transforms[i](el, code)
    }
    return code
  }
}

// hoist static sub-trees out
function genStatic (el: ASTElement, state: CodegenState): string {
  el.staticProcessed = true
  // Some elements (templates) need to behave differently inside of a v-pre
  // node.  All pre nodes are static roots, so we can use this as a location to
  // wrap a state change and reset it upon exiting the pre node.
  const originalPreState = state.pre
  if (el.pre) {
    state.pre = el.pre
  }
  state.staticRenderFns.push(`with(this){return ${genElement(el, state)}}`)
  state.pre = originalPreState
  return `_m(${
    state.staticRenderFns.length - 1
  }${
    el.staticInFor ? ',true' : ''
  })`
}

// v-once
function genOnce (el: ASTElement, state: CodegenState): string {
  el.onceProcessed = true
  if (el.if && !el.ifProcessed) {
    return genIf(el, state)
  } else if (el.staticInFor) {
    let key = ''
    let parent = el.parent
    while (parent) {
      if (parent.for) {
        key = parent.key
        break
      }
      parent = parent.parent
    }
    if (!key) {
      process.env.NODE_ENV !== 'production' && state.warn(
        `v-once can only be used inside v-for that is keyed. `,
        el.rawAttrsMap['v-once']
      )
      return genElement(el, state)
    }
    return `_o(${genElement(el, state)},${state.onceId++},${key})`
  } else {
    return genStatic(el, state)
  }
}

/**
 * 调用genIfConditions生成v-if的代码字符串
 *  对genIfConditions做封装，添加ifProcessed状态
 * @param {*} el 
 * @param {*} state 
 * @param {*} altGen 
 * @param {*} altEmpty 
 * @returns 
 */
export function genIf (
  el: any,
  state: CodegenState,
  altGen?: Function,
  altEmpty?: string
): string {
  // 同一个AST元素，避免递归调用genIf
  el.ifProcessed = true // avoid recursion
  return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty)
}

/**
 * 使用AST元素的ifConditions生成代码字符串
 *  生成三元运算符code
 * @param {*} conditions 
 * @param {*} state 
 * @param {*} altGen 
 * @param {*} altEmpty 
 * @returns 
 */
function genIfConditions (
  conditions: ASTIfConditions,
  state: CodegenState,
  altGen?: Function,
  altEmpty?: string
): string {
  if (!conditions.length) {
    /**
     * ifConditions为空 返回altEmpty 或 创建空节点代码
     * 命中条件 ifConditions中没有v-else
     *  如：conditions = [v-if]，第二次调用genIfConditions
     *  如：conditions = [v-if, v-else-if]，最后一次调用genIfConditions
     */
    return altEmpty || '_e()'
  }

  const condition = conditions.shift()
  if (condition.exp) {
    // v-if 或 v-else-if
    return `(${condition.exp})?${
      genTernaryExp(condition.block)
    }:${
      // 生成三元运算符，再调用genIfConditions
      genIfConditions(conditions, state, altGen, altEmpty)
    }`
  } else {
    // v-else
    return `${genTernaryExp(condition.block)}`
  }

  // v-if with v-once should generate code like (a)?_m(0):_m(1)
  // 生成三元表达式code
  function genTernaryExp (el) {
    return altGen
      ? altGen(el, state)
      : el.once
        ? genOnce(el, state)
        // altGen不为真，且非v-once
        : genElement(el, state)
  }
}

/**
 * 生成v-for的code
 * @param {*} el 
 * @param {*} state 
 * @param {*} altGen 
 * @param {*} altHelper 
 * @returns 
 */
export function genFor (
  el: any,
  state: CodegenState,
  altGen?: Function,
  altHelper?: string
): string {
  const exp = el.for
  const alias = el.alias
  const iterator1 = el.iterator1 ? `,${el.iterator1}` : ''
  const iterator2 = el.iterator2 ? `,${el.iterator2}` : ''

  if (process.env.NODE_ENV !== 'production' &&
    state.maybeComponent(el) &&
    el.tag !== 'slot' &&
    el.tag !== 'template' &&
    !el.key
  ) {
    // 是组件 且 非slot 且 非template 且 没有key
    // v-for没有设置key警告
    state.warn(
      `<${el.tag} v-for="${alias} in ${exp}">: component lists rendered with ` +
      `v-for should have explicit keys. ` +
      `See https://vuejs.org/guide/list.html#key for more info.`,
      el.rawAttrsMap['v-for'],
      true /* tip */
    )
  }

  // AST元素中v-for已处理标识
  el.forProcessed = true // avoid recursion

  /**
   * (item, key, index) in list  => 
   * { for: list, alias: item, iterator1: key, iterator2: index } 
   * 生成：
   *  _l(list, function (item, key, index) {
   *    return genElement(el, state)
   *  })
   * 执行回调函数会再次调用genElement
   */
  return `${altHelper || '_l'}((${exp}),` +
    `function(${alias}${iterator1}${iterator2}){` +
      `return ${(altGen || genElement)(el, state)}` +
    '})'
}

/**
 * 根据AST元素，生成编译code的data
 *  data是一个JSON字符串，根据不同场景，会有不同的属性
 * @param {*} el 
 * @param {*} state 
 * @returns 
 */
export function genData (el: ASTElement, state: CodegenState): string {
  let data = '{'

  // directives first.
  // directives may mutate the el's other properties before they are generated.
  const dirs = genDirectives(el, state) // 指令data字符串
  if (dirs) data += dirs + ','

  // key
  if (el.key) {
    data += `key:${el.key},`
  }
  // ref
  if (el.ref) {
    data += `ref:${el.ref},`
  }
  if (el.refInFor) {
    data += `refInFor:true,`
  }
  // pre
  if (el.pre) {
    data += `pre:true,`
  }
  // record original tag name for components using "is" attribute
  if (el.component) {
    data += `tag:"${el.tag}",`
  }
  // module data generation functions
  // Web下 执行style.genData class.genData
  for (let i = 0; i < state.dataGenFns.length; i++) {
    data += state.dataGenFns[i](el)
  }
  // attributes
  if (el.attrs) {
    data += `attrs:${genProps(el.attrs)},`
  }
  // DOM props
  if (el.props) {
    data += `domProps:${genProps(el.props)},`
  }
  // 事件处理
  // event handlers
  if (el.events) {
    // 生成事件处理函数
    data += `${genHandlers(el.events, false)},`
  }
  // 原生事件处理
  if (el.nativeEvents) {
    // 生成事件处理函数
    data += `${genHandlers(el.nativeEvents, true)},`
  }
  // slot target
  // only for non-scoped slots
  if (el.slotTarget && !el.slotScope) {
    data += `slot:${el.slotTarget},`
  }
  // scoped slots
  if (el.scopedSlots) {
    data += `${genScopedSlots(el, el.scopedSlots, state)},`
  }
  // component v-model
  if (el.model) {
    data += `model:{value:${
      el.model.value
    },callback:${
      el.model.callback
    },expression:${
      el.model.expression
    }},`
  }
  // inline-template
  if (el.inlineTemplate) {
    const inlineTemplate = genInlineTemplate(el, state)
    if (inlineTemplate) {
      data += `${inlineTemplate},`
    }
  }
  // 去掉结尾的逗号，并添加结尾大括号
  data = data.replace(/,$/, '') + '}'
  // v-bind dynamic argument wrap
  // v-bind with dynamic arguments must be applied using the same v-bind object
  // merge helper so that class/style/mustUseProp attrs are handled correctly.
  if (el.dynamicAttrs) {
    data = `_b(${data},"${el.tag}",${genProps(el.dynamicAttrs)})`
  }
  // v-bind data wrap
  if (el.wrapData) {
    data = el.wrapData(data)
  }
  // v-on data wrap
  if (el.wrapListeners) {
    data = el.wrapListeners(data)
  }
  return data
}

function genDirectives (el: ASTElement, state: CodegenState): string | void {
  const dirs = el.directives
  if (!dirs) return
  let res = 'directives:['
  let hasRuntime = false
  let i, l, dir, needRuntime
  for (i = 0, l = dirs.length; i < l; i++) {
    dir = dirs[i]
    needRuntime = true
    const gen: DirectiveFunction = state.directives[dir.name]
    if (gen) {
      // compile-time directive that manipulates AST.
      // returns true if it also needs a runtime counterpart.
      needRuntime = !!gen(el, dir, state.warn)
    }
    if (needRuntime) {
      hasRuntime = true
      res += `{name:"${dir.name}",rawName:"${dir.rawName}"${
        dir.value ? `,value:(${dir.value}),expression:${JSON.stringify(dir.value)}` : ''
      }${
        dir.arg ? `,arg:${dir.isDynamicArg ? dir.arg : `"${dir.arg}"`}` : ''
      }${
        dir.modifiers ? `,modifiers:${JSON.stringify(dir.modifiers)}` : ''
      }},`
    }
  }
  if (hasRuntime) {
    return res.slice(0, -1) + ']'
  }
}

function genInlineTemplate (el: ASTElement, state: CodegenState): ?string {
  const ast = el.children[0]
  if (process.env.NODE_ENV !== 'production' && (
    el.children.length !== 1 || ast.type !== 1
  )) {
    state.warn(
      'Inline-template components must have exactly one child element.',
      { start: el.start }
    )
  }
  if (ast && ast.type === 1) {
    const inlineRenderFns = generate(ast, state.options)
    return `inlineTemplate:{render:function(){${
      inlineRenderFns.render
    }},staticRenderFns:[${
      inlineRenderFns.staticRenderFns.map(code => `function(){${code}}`).join(',')
    }]}`
  }
}

function genScopedSlots (
  el: ASTElement,
  slots: { [key: string]: ASTElement },
  state: CodegenState
): string {
  // by default scoped slots are considered "stable", this allows child
  // components with only scoped slots to skip forced updates from parent.
  // but in some cases we have to bail-out of this optimization
  // for example if the slot contains dynamic names, has v-if or v-for on them...
  let needsForceUpdate = el.for || Object.keys(slots).some(key => {
    const slot = slots[key]
    return (
      slot.slotTargetDynamic ||
      slot.if ||
      slot.for ||
      containsSlotChild(slot) // is passing down slot from parent which may be dynamic
    )
  })

  // #9534: if a component with scoped slots is inside a conditional branch,
  // it's possible for the same component to be reused but with different
  // compiled slot content. To avoid that, we generate a unique key based on
  // the generated code of all the slot contents.
  let needsKey = !!el.if

  // OR when it is inside another scoped slot or v-for (the reactivity may be
  // disconnected due to the intermediate scope variable)
  // #9438, #9506
  // TODO: this can be further optimized by properly analyzing in-scope bindings
  // and skip force updating ones that do not actually use scope variables.
  if (!needsForceUpdate) {
    let parent = el.parent
    while (parent) {
      if (
        (parent.slotScope && parent.slotScope !== emptySlotScopeToken) ||
        parent.for
      ) {
        needsForceUpdate = true
        break
      }
      if (parent.if) {
        needsKey = true
      }
      parent = parent.parent
    }
  }

  const generatedSlots = Object.keys(slots)
    .map(key => genScopedSlot(slots[key], state))
    .join(',')

  return `scopedSlots:_u([${generatedSlots}]${
    needsForceUpdate ? `,null,true` : ``
  }${
    !needsForceUpdate && needsKey ? `,null,false,${hash(generatedSlots)}` : ``
  })`
}

function hash(str) {
  let hash = 5381
  let i = str.length
  while(i) {
    hash = (hash * 33) ^ str.charCodeAt(--i)
  }
  return hash >>> 0
}

function containsSlotChild (el: ASTNode): boolean {
  if (el.type === 1) {
    if (el.tag === 'slot') {
      return true
    }
    return el.children.some(containsSlotChild)
  }
  return false
}

function genScopedSlot (
  el: ASTElement,
  state: CodegenState
): string {
  const isLegacySyntax = el.attrsMap['slot-scope']
  if (el.if && !el.ifProcessed && !isLegacySyntax) {
    return genIf(el, state, genScopedSlot, `null`)
  }
  if (el.for && !el.forProcessed) {
    return genFor(el, state, genScopedSlot)
  }
  const slotScope = el.slotScope === emptySlotScopeToken
    ? ``
    : String(el.slotScope)
  const fn = `function(${slotScope}){` +
    `return ${el.tag === 'template'
      ? el.if && isLegacySyntax
        ? `(${el.if})?${genChildren(el, state) || 'undefined'}:undefined`
        : genChildren(el, state) || 'undefined'
      : genElement(el, state)
    }}`
  // reverse proxy v-slot without scope on this.$slots
  const reverseProxy = slotScope ? `` : `,proxy:true`
  return `{key:${el.slotTarget || `"default"`},fn:${fn}${reverseProxy}}`
}

/**
 * 生成AST的children的code
 * @param {*} el 
 * @param {*} state 
 * @param {*} checkSkip 
 * @param {*} altGenElement 
 * @param {*} altGenNode 
 * @returns 
 */
export function genChildren (
  el: ASTElement,
  state: CodegenState,
  checkSkip?: boolean,
  altGenElement?: Function,
  altGenNode?: Function
): string | void {
  const children = el.children
  if (children.length) {
    const el: any = children[0]
    // optimize single v-for
    if (children.length === 1 &&
      el.for &&
      el.tag !== 'template' &&
      el.tag !== 'slot'
    ) {
      /**
       * 对v-fo的AST元素优化处理
       * AST满足
       *  只有一个子元素
       *  有v-for属性
       *  不是template标签
       *  不是slot标签
       */  
      const normalizationType = checkSkip
        ? state.maybeComponent(el) ? `,1` : `,0`
        : ``
      // 重新调用genElement方法 拼接 normalizationType 返回code
      return `${(altGenElement || genElement)(el, state)}${normalizationType}`
    }

    // 不满足上面v-for元素条件，创建子元素处理
    // 获取标准化类型
    const normalizationType = checkSkip
      ? getNormalizationType(children, state.maybeComponent)
      : 0
    const gen = altGenNode || genNode
    // 创建子元素，返回code
    return `[${children.map(c => gen(c, state)).join(',')}]${
      normalizationType ? `,${normalizationType}` : ''
    }`
  }
}

// determine the normalization needed for the children array.
// 0: no normalization needed
// 1: simple normalization needed (possible 1-level deep nested array)
// 2: full normalization needed
/**
 * 获取对AST的children的标准化类型
 *  - 0 不需要标准化处理
 *  - 1 简单标准化处理
 *  - 2 完全标准化处理
 * 在createElement时用到，src/core/vdom/create-element.js
 * @param {*} children 
 * @param {*} maybeComponent 
 * @returns 
 */
function getNormalizationType (
  children: Array<ASTNode>,
  maybeComponent: (el: ASTElement) => boolean
): number {
  let res = 0
  for (let i = 0; i < children.length; i++) {
    const el: ASTNode = children[i]
    if (el.type !== 1) {
      // 跳过表达式AST、文本AST
      continue
    }
    if (needsNormalization(el) ||
        (el.ifConditions && el.ifConditions.some(c => needsNormalization(c.block)))) {
      // AST元素的需要标准化处理 或 AST元素的ifConditions中元素需要标准化处理
      res = 2
      break
    }
    if (maybeComponent(el) ||
        (el.ifConditions && el.ifConditions.some(c => maybeComponent(c.block)))) {
      // AST元素是组件 或 AST元素的ifConditions中元素是组件
      res = 1
    }
  }
  return res
}

/**
 * 需要标准化处理
 * @param {*} el 
 * @returns 
 */
function needsNormalization (el: ASTElement): boolean {
  // AST元素 有v-for属性 或 是template标签元素 或 是slot标签元素
  return el.for !== undefined || el.tag === 'template' || el.tag === 'slot'
}

/**
 * 生成AST子元素AST的code
 *  生成code的过程，本质就是调用此函数的过程
 * @param {*} node 
 * @param {*} state 
 * @returns 
 */
function genNode (node: ASTNode, state: CodegenState): string {
  if (node.type === 1) {
    // 普通AST调用genElement
    return genElement(node, state)
  } else if (node.type === 3 && node.isComment) {
    // 纯文本AST元素 且 是注释AST元素 生成注释code
    return genComment(node)
  } else {
    // 表达式AST元素 或 非注释AST文本元素 生成文本code
    return genText(node)
  }
}

/**
 * 生成文本VNode
 * @param {*} text 
 * @returns 
 */
export function genText (text: ASTText | ASTExpression): string {
  return `_v(${text.type === 2
    // 表达式AST元素
    ? text.expression // no need for () because already wrapped in _s()
    // 文本VNode
    : transformSpecialNewlines(JSON.stringify(text.text))
  })`
}

/**
 * 生成注释code
 * @param {*} comment 
 * @returns 
 */
export function genComment (comment: ASTText): string {
  return `_e(${JSON.stringify(comment.text)})`
}

function genSlot (el: ASTElement, state: CodegenState): string {
  const slotName = el.slotName || '"default"'
  const children = genChildren(el, state)
  let res = `_t(${slotName}${children ? `,function(){return ${children}}` : ''}`
  const attrs = el.attrs || el.dynamicAttrs
    ? genProps((el.attrs || []).concat(el.dynamicAttrs || []).map(attr => ({
        // slot props are camelized
        name: camelize(attr.name),
        value: attr.value,
        dynamic: attr.dynamic
      })))
    : null
  const bind = el.attrsMap['v-bind']
  if ((attrs || bind) && !children) {
    res += `,null`
  }
  if (attrs) {
    res += `,${attrs}`
  }
  if (bind) {
    res += `${attrs ? '' : ',null'},${bind}`
  }
  return res + ')'
}

// componentName is el.component, take it as argument to shun flow's pessimistic refinement
function genComponent (
  componentName: string,
  el: ASTElement,
  state: CodegenState
): string {
  const children = el.inlineTemplate ? null : genChildren(el, state, true)
  return `_c(${componentName},${genData(el, state)}${
    children ? `,${children}` : ''
  })`
}

/**
 * 生成绑定属性el.attrs的code
 * @param {*} props 
 * @returns 
 */
function genProps (props: Array<ASTAttr>): string {
  let staticProps = ``
  let dynamicProps = ``
  for (let i = 0; i < props.length; i++) {
    const prop = props[i]
    // 获取value
    const value = __WEEX__
      ? generateValue(prop.value)
      : transformSpecialNewlines(prop.value)
    if (prop.dynamic) {
      // 动态属性
      dynamicProps += `${prop.name},${value},`
    } else {
      // 静态属性
      staticProps += `"${prop.name}":${value},`
    }
  }

  staticProps = `{${staticProps.slice(0, -1)}}`
  if (dynamicProps) {
    return `_d(${staticProps},[${dynamicProps.slice(0, -1)}])`
  } else {
    return staticProps
  }
}

/**
 * weex处理生成value
 * @param {*} value 
 * @returns 
 */
/* istanbul ignore next */
function generateValue (value) {
  if (typeof value === 'string') {
    return transformSpecialNewlines(value)
  }
  return JSON.stringify(value)
}

// #3895, #4268
function transformSpecialNewlines (text: string): string {
  return text
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
