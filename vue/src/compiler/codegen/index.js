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
    // baseDirectives v-on v-bind v-cloak web下的特定指令 v-model v-html v-text
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
 * @param {*} altGen slot处理时为genScopedSlot函数
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
  // 优先调用，因为可能会修改AST元素的其它属性
  const dirs = genDirectives(el, state)
  if (dirs) data += dirs + ',' // 拼接指令code

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
  // DOM props input、select会生成props
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
  // 只有旧的slot="xxx"语法会走到这里，新v-slot语法，如果没有插槽prop，el.slotScope会赋值为__empty__
  if (el.slotTarget && !el.slotScope) {
    // 元素是具名插槽 且 非作用域插槽
    data += `slot:${el.slotTarget},`
  }
  // scoped slots
  if (el.scopedSlots) {
    // 元素是插槽AST元素的父级 生成插槽元素的code
    data += `${genScopedSlots(el, el.scopedSlots, state)},`
  }

  // component v-model
  // 处理组件v-model
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

/**
 * 根据AST元素，生成指令code
 * @param {*} el 
 * @param {*} state 
 * @returns 
 */
function genDirectives (el: ASTElement, state: CodegenState): string | void {
  const dirs = el.directives
  if (!dirs) return
  let res = 'directives:['
  let hasRuntime = false
  /**
   * dir 当前遍历到的指令
   * needRuntime
   */
  let i, l, dir, needRuntime
  for (i = 0, l = dirs.length; i < l; i++) {
    dir = dirs[i]
    needRuntime = true
    // 获取指令对应的handler 如 v-model => state.directives[model]
    const gen: DirectiveFunction = state.directives[dir.name]
    if (gen) {
      // compile-time directive that manipulates AST.
      // returns true if it also needs a runtime counterpart.
      // 执行指令的handler  v-model 就是 model()
      needRuntime = !!gen(el, dir, state.warn)
    }
    if (needRuntime) {
      hasRuntime = true
      /**
       * 生成运行时需要的代码code
       * {
       *  name: dir.name,
       *  rawName: dir.rawName,
       *  value?: dir.value,
       *  expression?: JSON.stringify(dir.value),
       *  arg?: dir.arg | `"${dir.arg}"`,
       *  modifiers?: ${JSON.stringify(dir.modifiers)}`
       * }
       * 如 v-model生成: 
       * `{name:"model",rawName:"v-model",value:(message),expression:"message"}`
       * 
       */ 
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
    // 有运行时指令，返回
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

/**
 * 生成父AST的scopedSlots插槽AST元素的code
 * @param {*} el 插槽AST元素的父级AST元素
 * @param {*} slots 插槽AST元素对象
 * @param {*} state 
 * @returns 
 */
function genScopedSlots (
  el: ASTElement,
  slots: { [key: string]: ASTElement },
  state: CodegenState
): string {
  // by default scoped slots are considered "stable", this allows child
  // components with only scoped slots to skip forced updates from parent.
  // but in some cases we have to bail-out of this optimization
  // for example if the slot contains dynamic names, has v-if or v-for on them...
  /**
   * 是否要强制更新
   *  父AST元素有v-for 或
   *  插槽元素中有元素是：动态插槽名、或有v-if、或有v-for、或有<slot>标签
   */
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
  // 如果一个插槽组件在if条件分支中，则可能重复使用相同的组件但具有不同编译的插槽内容。
  // 为避免这种情况，我们基于所有插槽内容生成的code来生成唯一key
  let needsKey = !!el.if

  // OR when it is inside another scoped slot or v-for (the reactivity may be
  // disconnected due to the intermediate scope variable)
  // #9438, #9506
  // TODO: this can be further optimized by properly analyzing in-scope bindings
  // and skip force updating ones that do not actually use scope variables.
  // 当插槽组件在另一个插槽中或在v-for中时，判断是否需要强制更新、是否需要key
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

  // 返回code _u()函数包裹 _u: resolveScopedSlots
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

/**
 * 检测AST元素及子AST元素是否包含有slot标签的AST元素
 * @param {*} el 
 * @returns 
 */
function containsSlotChild (el: ASTNode): boolean {
  if (el.type === 1) {
    if (el.tag === 'slot') {
      return true
    }
    return el.children.some(containsSlotChild)
  }
  return false
}

/**
 * 生成插槽AST元素的code
 * @param {*} el 
 * @param {*} state 
 * @returns 
 */
function genScopedSlot (
  el: ASTElement,
  state: CodegenState
): string {
  // slot-scope 旧语法
  const isLegacySyntax = el.attrsMap['slot-scope']

  if (el.if && !el.ifProcessed && !isLegacySyntax) {
    // 有v-if 调用genIf 传入genScopedSlot作为altGen
    return genIf(el, state, genScopedSlot, `null`)
  }
  if (el.for && !el.forProcessed) {
    // 有v-for 调用genFor 传入genScopedSlot作为altGen
    return genFor(el, state, genScopedSlot)
  }

  // 插槽prop  没有作用域的插槽 '_empty_' 替换成 '' 有插槽作用域，取插槽字符串值
  const slotScope = el.slotScope === emptySlotScopeToken
    ? ``
    : String(el.slotScope)

  // 生成处理插槽AST的函数code 函数包裹，传入插槽prop，这样插槽中就能访问到作用域插槽中定义的属性prop
  const fn = `function(${slotScope}){` +
    `return ${el.tag === 'template'
      ? el.if && isLegacySyntax
        // v-if 且 旧作用域插槽语法 添加一个三元运算符
        ? `(${el.if})?${genChildren(el, state) || 'undefined'}:undefined`
        // 非v-if 或 新作用域插槽语法
        : genChildren(el, state) || 'undefined'
      // 非tempalte标签的AST
      : genElement(el, state)
    }}`

  // reverse proxy v-slot without scope on this.$slots
  // 添加代理标识proxy 没有插槽prop的插槽AST(具名插槽或默认插槽)会代理到this.$slots上
  const reverseProxy = slotScope ? `` : `,proxy:true` // 没有插槽prop，添加proxy: true
  // 返回作用域插槽code { key: slotTarget, fn: function(${slotScope}) {...}, proxy?: true  }
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

/**
 * 生成插槽<slot>的code
 * @param {*} el 
 * @param {*} state 
 * @returns 
 */
function genSlot (el: ASTElement, state: CodegenState): string {
  const slotName = el.slotName || '"default"' // 插槽名 默认default
  const children = genChildren(el, state) // 处理插槽节点的默认children内容 <slot>默认内容</slot>

  // 包裹_t()函数 拼接slotName和children参数
  // children是后备内容，即默认会显示的节点
  let res = `_t(${slotName}${children ? `,function(){return ${children}}` : ''}`

  // 拼接slot标签上的属性attrs参数 [{name, value, dynamic}, ...]
  const attrs = el.attrs || el.dynamicAttrs
    ? genProps((el.attrs || []).concat(el.dynamicAttrs || []).map(attr => ({
        // slot props are camelized
        name: camelize(attr.name), // 转驼峰
        value: attr.value,
        dynamic: attr.dynamic
      })))
    : null
  
  // v-bind绑定对象属性 如 v-bind="bindObj"
  const bind = el.attrsMap['v-bind']
  if ((attrs || bind) && !children) {
    // 有属性 没有默认插槽内容
    res += `,null`
  }
  // 拼接attrs参数
  if (attrs) {
    res += `,${attrs}`
  }
  if (bind) {
    res += `${attrs ? '' : ',null'},${bind}`
  }
  // _t(slotName, children, attrs, bind)
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
