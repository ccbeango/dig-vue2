/* @flow */

import { makeMap, isBuiltInTag, cached, no } from 'shared/util'

let isStaticKey
let isPlatformReservedTag

const genStaticKeysCached = cached(genStaticKeys)

/**
 * Goal of the optimizer: walk the generated template AST tree
 * and detect sub-trees that are purely static, i.e. parts of
 * the DOM that never needs to change.
 *
 * Once we detect these sub-trees, we can:
 *
 * 1. Hoist them into constants, so that we no longer need to
 *    create fresh nodes for them on each re-render;
 * 2. Completely skip them in the patching process.
 * 
 * 优化AST树，将其中不会变化的子AST元素标记为static静态的
 * 目的：
 *  1. 提升它们为常量，无需在每次渲染时候重新创建新Node节点
 *  2. 跳过它们patch过程
 * 
 * 因为Vue是数据驱动，是响应式的，但是我们的模板并不是所有数据都是响应式的，
 * 也有很多数据是⾸次渲染后就永远不会变化的，那么这部分数据⽣成的DOM也不会
 * 变化，我们可以在patch的过程跳过对他们的⽐对
 * 
 * optimize要做的就是深度遍历这个AST 树，去检测它的每⼀颗⼦树是不是静态节点，
 * 如果是静态节点则它们⽣成DOM永远不需要改变，这对运⾏时对模板的更新起到极⼤的
 * 优化作⽤
 */
export function optimize (root: ?ASTElement, options: CompilerOptions) {
  if (!root) return
  // 函数 是否是静态key 
  isStaticKey = genStaticKeysCached(options.staticKeys || '')
  // 函数 是否是平台内置的标签
  isPlatformReservedTag = options.isReservedTag || no
  // 每个节点都添加static标记 为生成staticRoot做处理
  // first pass: mark all non-static nodes.
  markStatic(root)
  // second pass: mark static roots.
  // 每个普通元素节点标记staticRoot，此标识才是之后生成代码过程中，进行判断的依据
  markStaticRoots(root, false)
}

/**
 * 生成静态缓存优化要用到的AST元素属性Map
 * @param {*} keys 
 * @returns 
 */
function genStaticKeys (keys: string): Function {
  return makeMap(
    'type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap' +
    (keys ? ',' + keys : '')
  )
}

/**
 * 标记静态节点
 *  1. 通过递归的方式，给每一个AST元素添加是否是静态节点static标记
 *  为生成staticRoot标识提供依据
 * @param {*} node 
 * @returns 
 */
function markStatic (node: ASTNode) {
  // 标记是否是静态AST节点
  node.static = isStatic(node)
  if (node.type === 1) { // 普通元素AST 标记子AST节点
    // do not make component slot content static. this avoids
    // 1. components not able to mutate slot nodes
    // 2. static slot content fails for hot-reloading
    // 不能标记一个组件的插槽子节点是静态的 可避免问题：
    // 1. 组件不能修改插槽节点
    // 2. 静态插槽内容热加载失败
    if (
      !isPlatformReservedTag(node.tag) &&
      node.tag !== 'slot' &&
      node.attrsMap['inline-template'] == null
    ) {
      return
    }

    /**
     * 遍历AST节点的子AST节点，递归执行markStatic，标记静态节点
     * 在递归过程中，⼀旦⼦节点有不是static的情况，则它的⽗节点的static均变成false
     * 而非静态节点的兄弟节点，标记还可能是静态的
     */
    for (let i = 0, l = node.children.length; i < l; i++) {
      const child = node.children[i]
      markStatic(child)
      if (!child.static) {
        // 子节点非静态的，父节点也标记成非静态 子节点的兄弟节点可能还是静态的
        node.static = false
      }
    }

    if (node.ifConditions) {
      /**
       * 因为所有的elseif和else节点都不在children中，如果节点的ifConditions不为空，
       * 则遍历ifConditions拿到所有条件中的block，也就是它们对应的AST节点，递归执
       * ⾏markStatic，标记静态节点 
       */
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        const block = node.ifConditions[i].block
        markStatic(block)
        if (!block.static) {
          // 子节点非静态的，父节点也标记成非静态 子节点的兄弟节点可能还是静态的
          node.static = false
        }
      }
    }
  }
}

/**
 * 标记静态根
 *  1. 通过递归的方式，给每一个AST普通元素(type为1)添加是否是静态根节点staticRoot标记
 *  一旦标记为静态根节点，之后代码生成阶段会走不一样的逻辑
 *  此标识才是之后生成代码过程中，进行判断的依据
 * @param {*} node 
 * @param {*} isInFor 
 * @returns 
 */
function markStaticRoots (node: ASTNode, isInFor: boolean) {
  if (node.type === 1) { // 普通元素AST 
    if (node.static || node.once) {
      // 静态节点 或 v-once指令的节点
      // 扩展staticInFor标记 标识是否是v-for生成的静态节点
      node.staticInFor = isInFor
    }
    // For a node to qualify as a static root, it should have children that
    // are not just static text. Otherwise the cost of hoisting out will
    // outweigh the benefits and it's better off to just always render it fresh.
    if (node.static && node.children.length && !(
      node.children.length === 1 &&
      node.children[0].type === 3
    )) {
      /**
       * 静态根节点需满足
       *  1. 是静态节点
       *  2. 拥有子节点
       *  3. 子节点不能只是一个纯文本节点
       *  如果子节点是纯文本节点，标记成静态根节点，它的成本是大于收益的
       */
      node.staticRoot = true
      // 将节点置为静态根节点后，结束执行
      return
    } else {
      node.staticRoot = false
    }

    // 非静态根节点 递归遍历子节点，执行markStaticRoots，标记根静态节点
    if (node.children) {
      for (let i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i], isInFor || !!node.for)
      }
    }

    // 非静态根节点 递归遍历ifConditions，执行markStaticRoots，标记根静态节点
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        markStaticRoots(node.ifConditions[i].block, isInFor)
      }
    }
  }
}

/**
 * 是否是静态AST元素节点
 *  1. 表达式AST元素    非静态节点
 *  2. 纯文本AST元素     静态节点
 *  3. 普通AST元素
 *    静态节点的条件：
 *      1. 有pre属性 即使用了v-pre属性
 *    或同时满足
 *      1. 未绑定动态属性 hasBindings !== true
 *      2. 没有v-if 没有v-for
 *      4. 非内置组件标签 slot component
 *      5. 是平台内置的标签，也就是说不是组件的标签
 *      6. 非带有v-for的template标签的直接⼦节点
 *      7. AST节点的所有属性key都是静态属性key Object.keys(node).every(isStaticKey)
 * @param {*} node 
 * @returns 
 */
function isStatic (node: ASTNode): boolean {
  if (node.type === 2) { // expression
    return false
  }
  if (node.type === 3) { // text
    return true
  }
  return !!(node.pre || (
    !node.hasBindings && // no dynamic bindings
    !node.if && !node.for && // not v-if or v-for or v-else
    !isBuiltInTag(node.tag) && // not a built-in
    isPlatformReservedTag(node.tag) && // not a component
    !isDirectChildOfTemplateFor(node) &&
    Object.keys(node).every(isStaticKey)
  ))
}

/**
 * 是否是带有v-for的template标签的直接⼦节点
 * @param {*} node 
 * @returns 
 */
function isDirectChildOfTemplateFor (node: ASTElement): boolean {
  while (node.parent) {
    node = node.parent
    if (node.tag !== 'template') {
      return false
    }
    if (node.for) {
      return true
    }
  }
  return false
}
