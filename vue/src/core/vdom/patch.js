/**
 * Virtual DOM patching algorithm based on Snabbdom by
 * Simon Friis Vindum (@paldepind)
 * Licensed under the MIT License
 * https://github.com/paldepind/snabbdom/blob/master/LICENSE
 *
 * modified by Evan You (@yyx990803)
 *
 * Not type-checking this because this file is perf-critical and the cost
 * of making flow understand it is not worth it.
 */

import VNode, { cloneVNode } from './vnode'
import config from '../config'
import { SSR_ATTR } from 'shared/constants'
import { registerRef } from './modules/ref'
import { traverse } from '../observer/traverse'
import { activeInstance } from '../instance/lifecycle'
import { isTextInputType } from 'web/util/element'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  makeMap,
  isRegExp,
  isPrimitive
} from '../util/index'

export const emptyNode = new VNode('', {}, [])

const hooks = ['create', 'activate', 'update', 'remove', 'destroy']

/**
 * 判断两个VNode节点是否相同
 * 条件：
 *  1. 两个VNode的key相等，如都是undefined、v-for中的key
 *  2. 并且 是相同的异步VNode，或 同步节点asyncFactory为undefined
 *  3. 并且 都是同步节点
 *            tag相同、都是注释或非注释节点、都定义了data、相同的input节点类型
 *          或都是异步节点：
 *            节点a是异步占位符节点、且 b异步节点无报错
 * @param {*} a 
 * @param {*} b 
 * @returns 
 */
function sameVnode (a, b) {
  return (
    a.key === b.key &&
    a.asyncFactory === b.asyncFactory && (
      (
        a.tag === b.tag &&
        a.isComment === b.isComment &&
        isDef(a.data) === isDef(b.data) &&
        sameInputType(a, b)
      ) || (
        isTrue(a.isAsyncPlaceholder) &&
        isUndef(b.asyncFactory.error)
      )
    )
  )
}

function sameInputType (a, b) {
  if (a.tag !== 'input') return true
  let i
  const typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type
  const typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type
  return typeA === typeB || isTextInputType(typeA) && isTextInputType(typeB)
}

/**
 * 为VNode的列表创建一个key的映射集合
 * @param {*} children 
 * @param {*} beginIdx 
 * @param {*} endIdx 
 * @returns 
 */
function createKeyToOldIdx (children, beginIdx, endIdx) {
  let i, key
  const map = {}
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key
    if (isDef(key)) map[key] = i
  }
  return map
}

// 返回patch方法
// 利用闭包，把差异化参数提前固化，这样不用每次调用patch的时候都传递nodeOps和modules
export function createPatchFunction (backend) {
  let i, j
  const cbs = {}

  const { modules, nodeOps } = backend

  // 初始化钩子函数对象
  // cbs中每个属性都是一个需要执行的钩子函数数组
  //  {
  //    create: [updateAttrs(), updateClass(), updateDOMListeners(), updateDOMProps(), updateStyle(), _enter(), create(), updateDirectives()],
  //    activate: [_enter()],
  //    update: [updateAttrs(), updateClass(), updateDOMListeners(), updateDOMProps(), updateStyle(), update(), updateDirectives()]
  //    remove: [remove$$1()],
  //    destroy: [destroy(), unbindDirectives()]
  //  }
  // 在patch()函数的执行过程中，会执行各个阶段的钩子
  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = []
    for (j = 0; j < modules.length; ++j) {
      if (isDef(modules[j][hooks[i]])) {
        cbs[hooks[i]].push(modules[j][hooks[i]])
      }
    }
  }

  /**
   * 创建没有内容的对应渲染VNode节点
   *  如创建一个没有内容的div标签VNode节点
   * @param {*} elm DOM节点
   * @returns VNode节点
   */
  function emptyNodeAt (elm) {
    return new VNode(nodeOps.tagName(elm).toLowerCase(), {}, [], undefined, elm)
  }

  /**
   * 创建移除真实DOM节点的回调执行
   * ，移除DOM节点
   * @param {*} childElm  DOM节点
   * @param {*} listeners cbs.remove队列
   * @returns 
   */
  function createRmCb (childElm, listeners) {
    function remove () {
      if (--remove.listeners === 0) {
        removeNode(childElm)
      }
    }
    remove.listeners = listeners
    return remove
  }

  /**
   * 移除DOM节点
   * @param {*} el 要移除的DOM节点 
   */
  function removeNode (el) {
    const parent = nodeOps.parentNode(el)
    // element may have already been removed due to v-html / v-text
    if (isDef(parent)) {
      nodeOps.removeChild(parent, el)
    }
  }

  /**
   * 是否是未知VNode
   * @param {*} vnode
   * @param {*} inVPre 
   * @returns 
   */
  function isUnknownElement (vnode, inVPre) {
    return (
      !inVPre &&
      !vnode.ns &&
      !(
        // 配置的忽略节点
        config.ignoredElements.length &&
        config.ignoredElements.some(ignore => {
          return isRegExp(ignore)
            ? ignore.test(vnode.tag)
            : ignore === vnode.tag
        })
      ) &&
      config.isUnknownElement(vnode.tag)
    )
  }

  let creatingElmInVPre = 0

  /**
   * 将VNode挂载到真实DOM上
   * @param {渲染VNode|占位符VNode} vnode 渲染VNode是普通HTML标签的VNode | 占位符VNode是组件标签的VNode
   * @param {*} insertedVnodeQueue  已插入到真实DOM的VNode节点队列，用于执行插入DOM节点后的操作
   * @param {*} parentElm           父DOM节点
   * @param {*} refElm              参照DOM节点
   * @param {*} nested              transition enter使用参数
   * @param {*} ownerArray          递归创建节点时的children
   * @param {*} index               当前节点的索引
   * @returns 
   */
  function createElm (
    vnode,
    insertedVnodeQueue,
    parentElm,
    refElm,
    nested,
    ownerArray,
    index
  ) {
    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // FIXME: 跳过
      // This vnode was used in a previous render!
      // now it's used as a new node, overwriting its elm would cause
      // potential patch errors down the road when it's used as an insertion
      // reference node. Instead, we clone the node on-demand before creating
      // associated DOM element for it.
      vnode = ownerArray[index] = cloneVNode(vnode)
    }

    vnode.isRootInsert = !nested // for transition enter check
    // 创建组件渲染VNode节点
    // 判断VNode节点的是否是组件占位符VNode
    // 如果是组件VNode 就创建组件VNode节点的渲染VNode
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return
    }

    // 如果不是占位符VNode而是渲染VNode 执行下面逻辑

    const data = vnode.data
    const children = vnode.children
    const tag = vnode.tag
    if (isDef(tag)) { // 有标签
      if (process.env.NODE_ENV !== 'production') {
        // 未知节点
        if (data && data.pre) {
          creatingElmInVPre++
        }
        // 开发中常见 组件未全局注册或局部注册 未知标签警告提示
        if (isUnknownElement(vnode, creatingElmInVPre)) {
          warn(
            'Unknown custom element: <' + tag + '> - did you ' +
            'register the component correctly? For recursive components, ' +
            'make sure to provide the "name" option.',
            vnode.context
          )
        }
      }

      vnode.elm = vnode.ns
        // 有namespace创建namespace的元素 
        ? nodeOps.createElementNS(vnode.ns, tag)
        // 创建元素
        : nodeOps.createElement(tag, vnode)
      setScope(vnode)

      /* istanbul ignore if */
      if (__WEEX__) {
        // FIXME: 跳过 WEEX处理
        // in Weex, the default insertion order is parent-first.
        // List items can be optimized to use children-first insertion
        // with append="tree".
        const appendAsTree = isDef(data) && isTrue(data.appendAsTree)
        if (!appendAsTree) {
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue)
          }
          insert(parentElm, vnode.elm, refElm)
        }
        createChildren(vnode, children, insertedVnodeQueue)
        if (appendAsTree) {
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue)
          }
          insert(parentElm, vnode.elm, refElm)
        }
      } else {
        // 创建子节点 该方法会递归调用 createElm
        // 所以会先插入子节点，再插入父节点
        createChildren(vnode, children, insertedVnodeQueue)
        if (isDef(data)) {
          // 执行 create 钩子函数
          // 每插入一个节点
          invokeCreateHooks(vnode, insertedVnodeQueue)
        }
        // 插入节点
        insert(parentElm, vnode.elm, refElm)
      }

      if (process.env.NODE_ENV !== 'production' && data && data.pre) {
        creatingElmInVPre--
      }
    } else if (isTrue(vnode.isComment)) { // 注释节点
      // 创建注释节点
      vnode.elm = nodeOps.createComment(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    } else { // 文本节点
      // 创建文本节点
      vnode.elm = nodeOps.createTextNode(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    }
  }

  /**
   * 创建组件占位符VNode节点的实例组件
   *  1. vnode如果是组件占位符VNode节点，那么创建组件实例，保存到vnode.componentInstance上，
   *     并调用组件实例的$mount方法，挂载到，返回true
   *  2. vnode不是组件VNode节点，而是真实的HTML渲染VNode节点，不做处理并返回undefined
   * @param {*} vnode 
   * @param {*} insertedVnodeQueue 
   * @param {*} parentElm 
   * @param {*} refElm 
   * @returns 
   */
  function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    let i = vnode.data
    if (isDef(i)) { // vnode.data定义
      // 是否是keep-alive的子组件 keep-alive重新渲染子组件会直接拿到componentInstance
      const isReactivated = isDef(vnode.componentInstance) && i.keepAlive

      // i中有hook说明是 组件的 hook中有init钩子函数  vnode.data.hook.init
      if (isDef(i = i.hook) && isDef(i = i.init)) {
        // vdom/create-component下的componentVNodeHooks.init
        // 执行init()钩子函数 实际上会递归地执行
        // 因为在执行组件的createComponent时
        // 实际上会执行 子组件的创建 -> render -> update -> patch
        // patch过程中如果又遇到组件，就会又执行孙子组件的createComponent
        // 递归执行，最终完成整个patch过程
        // 所以子组件会先父组件执行init()后的逻辑，进行insert，之后执行父组件的insert
        // 最终完成整个patch过程
        i(vnode, false /* hydrating */)
      }

      // after calling the init hook, if the vnode is a child component
      // it should've created a child instance and mounted it. the child
      // component also has set the placeholder vnode's elm.
      // in that case we can just return the element and be done.
      // init后，vnode是一个已经挂载了componentInstance的组件的占位符VNode
      if (isDef(vnode.componentInstance)) {
        initComponent(vnode, insertedVnodeQueue)
        // 组件在这里插入真实DOM节点 整个插入顺序是先子后父 原因在 hook.init() 执行
        insert(parentElm, vnode.elm, refElm)

        if (isTrue(isReactivated)) {
          // keep-alive包裹的子组件处理
          reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm)
        }
        return true
      }
    }
  }

  // 初始化组件
  function initComponent (vnode, insertedVnodeQueue) {
    if (isDef(vnode.data.pendingInsert)) {
      // 首次初始化的VNode队列 插入VNode到insertedVnodeQueue中
      insertedVnodeQueue.push.apply(insertedVnodeQueue, vnode.data.pendingInsert)
      vnode.data.pendingInsert = null
    }

    // 将VNode上的componentInstance的真实DOM $el 赋值给elm
    vnode.elm = vnode.componentInstance.$el

    if (isPatchable(vnode)) {
      // 插入VNode到insertedVnodeQueue中
      invokeCreateHooks(vnode, insertedVnodeQueue)
      setScope(vnode)
    } else {
      // empty component root.
      // skip all element-related modules except for ref (#3455)
      registerRef(vnode)
      // make sure to invoke the insert hook
      // 插入VNode到insertedVnodeQueue中
      insertedVnodeQueue.push(vnode)
    }
  }

  /**
   * keepa-alive子组件处理
   * @param {*} vnode 
   * @param {*} insertedVnodeQueue 
   * @param {*} parentElm 
   * @param {*} refElm 
   */
  function reactivateComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    let i
    // hack for #4339: a reactivated component with inner transition
    // does not trigger because the inner node's created hooks are not called
    // again. It's not ideal to involve module-specific logic in here but
    // there doesn't seem to be a better way to do it.
    // keep-alive组件中有transition组件中问题处理
    let innerNode = vnode
    while (innerNode.componentInstance) {
      innerNode = innerNode.componentInstance._vnode
      if (isDef(i = innerNode.data) && isDef(i = i.transition)) {
        for (i = 0; i < cbs.activate.length; ++i) {
          // 执行transition组件的activate钩子函数
          cbs.activate[i](emptyNode, innerNode)
        }
        insertedVnodeQueue.push(innerNode)
        break
      }
    }

    // 手动插入keep-alive的子组件DOM节点 上面已经插入一次，又执行一次？好像多余了
    // unlike a newly created component,
    // a reactivated keep-alive component doesn't insert itself
    insert(parentElm, vnode.elm, refElm)
  }

  // 插入节点
  function insert (parent, elm, ref) {
    if (isDef(parent)) {
      if (isDef(ref)) {
        // 有参考节点,且有相同的父级节点 插入节点
        if (nodeOps.parentNode(ref) === parent) {
          nodeOps.insertBefore(parent, elm, ref)
        }
      } else {
        // 没有参照节点,appendChild添加到末尾
        nodeOps.appendChild(parent, elm)
      }
    }
  }

  // 创建真实DOM子节点 先创建子节点，再创建父节点
  function createChildren (vnode, children, insertedVnodeQueue) {
    if (Array.isArray(children)) {
      if (process.env.NODE_ENV !== 'production') {
        // 子节点重复key校验
        checkDuplicateKeys(children)
      }
      // 遍历子虚拟节点，递归调用createElm，这是一种常用的深度优先的遍历算法
      // 并将当前vnode.elm作为父节点
      for (let i = 0; i < children.length; ++i) {
        createElm(children[i], insertedVnodeQueue, vnode.elm, null, true, children, i)
      }
    } else if (isPrimitive(vnode.text)) {
      // vnode.text 普通值 直接添加为子节点
      nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)))
    }
  }

  // 判断当前vnode是否可挂载，循环遍历，获取该节点是否有可挂载的真实渲染VNode节点
  function isPatchable (vnode) {
    // vnode是渲染VNode节点，但是此渲染VNode节点，可能还是一个组件占位符VNode节点，
    // 出现此种情况是，定义一个组件实现的根节点，引用了另一个组件，即一个组件的根节点是另一个组件
    // 循环找到它的真正渲染VNode即可挂载VNode 渲染VNode其实也就是组件的根的VNode
    while (vnode.componentInstance) { // vnode.componentInstance为真，说明此节点是组件占位符VNode，
      // 找到当前占位符VNode节点的子渲染VNode节点 循环执行，直至找到真正的渲染VNode
      vnode = vnode.componentInstance._vnode
    }
    return isDef(vnode.tag)
  }

  /**
   * 执行create钩子函数 包括系统的和用户自定义的
   * 调用时机：节点创建阶段调用的钩子
   *  1. 创建一个真实的DOM节点时 createElm() 
   *  2. 创建组件 initComponent()
   * @param {*} vnode 
   * @param {*} insertedVnodeQueue 
   */
  function invokeCreateHooks (vnode, insertedVnodeQueue) {
    // 执行 cbs.create 队列
    for (let i = 0; i < cbs.create.length; ++i) {
      cbs.create[i](emptyNode, vnode)
    }
    i = vnode.data.hook // Reuse variable
    if (isDef(i)) {
      // 执行节点自定义create方法 此时没有旧节点，传空VNode节点作为旧节点
      if (isDef(i.create)) i.create(emptyNode, vnode)
      // 将插入的节点VNode，加入insertedVnodeQueue
      // 目的是patch过程中插入vnode节点完毕之后，执行insert钩子
      if (isDef(i.insert)) insertedVnodeQueue.push(vnode)
    }
  }

  // set scope id attribute for scoped CSS.
  // this is implemented as a special case to avoid the overhead
  // of going through the normal attribute patching process.
  // 为作用域CSS设置作用域 id 属性。 
  // 这是作为一种特殊情况来实现的，以避免通过正常属性patching过程的开销。
  // FIXME: 跳过
  function setScope (vnode) {
    let i
    if (isDef(i = vnode.fnScopeId)) {
      nodeOps.setStyleScope(vnode.elm, i)
    } else {
      let ancestor = vnode
      while (ancestor) {
        if (isDef(i = ancestor.context) && isDef(i = i.$options._scopeId)) {
          nodeOps.setStyleScope(vnode.elm, i)
        }
        ancestor = ancestor.parent
      }
    }
    // for slot content they should also get the scopeId from the host instance.
    if (isDef(i = activeInstance) &&
      i !== vnode.context &&
      i !== vnode.fnContext &&
      isDef(i = i.$options._scopeId)
    ) {
      nodeOps.setStyleScope(vnode.elm, i)
    }
  }

  /**
   * 创建VNode对应的DOM节点
   *  内部循环调用createElm()方法
   * @param {*} parentElm 
   * @param {*} refElm 
   * @param {*} vnodes 
   * @param {*} startIdx 
   * @param {*} endIdx 
   * @param {*} insertedVnodeQueue 
   */
  function addVnodes (parentElm, refElm, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      createElm(vnodes[startIdx], insertedVnodeQueue, parentElm, refElm, false, vnodes, startIdx)
    }
  }

  /**
   * 执行destory钩子 包括系统的和用户自定义的
   * @param {*} vnode 
   */
  function invokeDestroyHook (vnode) {
    let i, j
    const data = vnode.data
    if (isDef(data)) {
      // 执行destroy钩子函数
      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode)
      // 执行 cbs.destroy 队列
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode)
    }

    if (isDef(i = vnode.children)) {
      // 有子节点，遍历-递归 destroy子节点
      for (j = 0; j < vnode.children.length; ++j) {
        invokeDestroyHook(vnode.children[j])
      }
    }
  }

  /**
   * 移除VNode节点
   * 遍历待删除的VNode节点，并进行删除
   * @param {*} vnodes 
   * @param {*} startIdx 
   * @param {*} endIdx 
   */
  function removeVnodes (vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx]
      if (isDef(ch)) {
        if (isDef(ch.tag)) {
          removeAndInvokeRemoveHook(ch)
          // 执行destory钩子
          invokeDestroyHook(ch)
        } else { // Text node
          // 移除文本DOM节点
          removeNode(ch.elm)
        }
      }
    }
  }

  /**
   * 从DOM中移除节点 并执行remove钩子函数
   * @param {*} vnode 
   * @param {*} rm 
   */
  function removeAndInvokeRemoveHook (vnode, rm) {
    if (isDef(rm) || isDef(vnode.data)) {
      let i
      const listeners = cbs.remove.length + 1
      if (isDef(rm)) {
        // we have a recursively passed down rm callback
        // increase the listeners count
        rm.listeners += listeners
      } else {
        // directly removing
        rm = createRmCb(vnode.elm, listeners)
      }

      // 子节点挂载的组件占位符VNode，获取此VNode的实例的渲染VNode，并递归调用removeAndInvokeRemoveHook  统计listeners的数量统计会递增
      // recursively invoke hooks on child component root node
      if (isDef(i = vnode.componentInstance) && isDef(i = i._vnode) && isDef(i.data)) {
        removeAndInvokeRemoveHook(i, rm)
      }

      // 执行 cbs.remove 队列
      for (i = 0; i < cbs.remove.length; ++i) {
        cbs.remove[i](vnode, rm)
      }

      if (isDef(i = vnode.data.hook) && isDef(i = i.remove)) {
        // 移除的节点是组件占位符节点 有定义remove钩子，执行节点的remove钩子
        i(vnode, rm)
      } else {
        // 没有hook或没有hook.remove 手动直接remove
        rm()
      }
    } else {
      // 节点上没有VNodeData数据 直接移除
      removeNode(vnode.elm)
    }
  }

  /**
   * 新旧节点相同的diff算法
   * @param {*} parentElm           父DOM节点
   * @param {*} oldCh               旧子VNode数组
   * @param {*} newCh               新子VNode数组
   * @param {*} insertedVnodeQueue  已插入到DOM中的VNode节点队列
   * @param {*} removeOnly          
   */
  function updateChildren (parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
    let oldStartIdx = 0 // 旧VNode数组开始索引
    let newStartIdx = 0 // 新VNode数组开始索引
    let oldEndIdx = oldCh.length - 1 // 旧VNode数组结束索引
    let oldStartVnode = oldCh[0] // 旧VNode数组第一个元素
    let oldEndVnode = oldCh[oldEndIdx] // 旧VNode数组最后一个元素
    let newEndIdx = newCh.length - 1 // 新VNode数组结束索引
    let newStartVnode = newCh[0] // 新VNode数组第一个元素
    let newEndVnode = newCh[newEndIdx] // 新VNode数组最后一个元素

    let oldKeyToIdx, idxInOld, vnodeToMove, refElm

    // removeOnly is a special flag used only by <transition-group>
    // to ensure removed elements stay in correct relative positions
    // during leaving transitions
    const canMove = !removeOnly

    if (process.env.NODE_ENV !== 'production') {
      // 检查新的children是否有相同key
      checkDuplicateKeys(newCh)
    }

    // oldStartIdx、newStartIdx不断变大，oldEndIdx、newEndIdx不断变小
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        // oldStartVnode已经被移除
        oldStartVnode = oldCh[++oldStartIdx] // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        // oldEndVnode已经被移除
        oldEndVnode = oldCh[--oldEndIdx]
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        // 新旧开始位置更新节点相同 只是更新
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        // 新旧结束节点位置相同 只是更新
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        // 旧节点开始位置等于新节点结束位置
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        // 旧节点结束位置等于新节点开始位置
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]
      } else {
        // 新旧节点的key不相等：1. 新旧节点有一个没定义key；2.新旧节点定义的key不相同

        // 创建旧VNode数组的key到索引位置的映射  { key1: 0, key2: 1, ... }
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)

        // 新VNode数组元素在旧VNode数组中的位置索引
        idxInOld = isDef(newStartVnode.key)
          ? oldKeyToIdx[newStartVnode.key]
          : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx)

        if (isUndef(idxInOld)) { // New element
          // idxInOld未定义，说明是一个新VNode元素，当作新DOM节点处理
          createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
        } else {
          // 新节点在旧节点中做了插入操作
          vnodeToMove = oldCh[idxInOld]
          if (sameVnode(vnodeToMove, newStartVnode)) {
            // 新旧节点相同 做了节点移动到中间位置的操作
            patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
            oldCh[idxInOld] = undefined
            canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm)
          } else {
            // same key but different element. treat as new element
            // 新旧节点key相同但是是不同的DOM元素，当作新DOM节点处理
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
          }
        }
        newStartVnode = newCh[++newStartIdx]
      }
    }

    if (oldStartIdx > oldEndIdx) {
      // 还有剩余的节点，再做插入
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
      // 剩下的要插入的节点，从newStartIdx到newEndIdx
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
    } else if (newStartIdx > newEndIdx) {
      // 
      removeVnodes(oldCh, oldStartIdx, oldEndIdx)
    }
  }

  // 重复key校验
  function checkDuplicateKeys (children) {
    const seenKeys = {}
    for (let i = 0; i < children.length; i++) {
      const vnode = children[i]
      const key = vnode.key
      if (isDef(key)) {
        if (seenKeys[key]) {
          // 开发常见的警告 重复key
          warn(
            `Duplicate keys detected: '${key}'. This may cause an update error.`,
            vnode.context
          )
        } else {
          seenKeys[key] = true
        }
      }
    }
  }

  function findIdxInOld (node, oldCh, start, end) {
    for (let i = start; i < end; i++) {
      const c = oldCh[i]
      if (isDef(c) && sameVnode(node, c)) return i
    }
  }

  /**
   * 把新的VNode节点patch到旧的VNode节点上
   *    1. 执行prepatch钩子函数
   *    2. 执行update钩子函数
   *    3. 执行patch过程
   * @param {*} oldVnode 
   * @param {*} vnode 
   * @param {*} insertedVnodeQueue 
   * @param {*} ownerArray 
   * @param {*} index 
   * @param {*} removeOnly 
   * @returns 
   */
  function patchVnode (
    oldVnode,
    vnode,
    insertedVnodeQueue,
    ownerArray,
    index,
    removeOnly
  ) {
    if (oldVnode === vnode) {
      // reject 新旧节点相同
      return
    }

    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // clone reused vnode
      // 浅拷贝VNode节点
      vnode = ownerArray[index] = cloneVNode(vnode)
    }
    // 旧的真实DOM节点赋值给新的vnode的elm
    const elm = vnode.elm = oldVnode.elm // 旧的真实DOM节点

    // FIXME: 跳过 异步组件处理
    if (isTrue(oldVnode.isAsyncPlaceholder)) {
      if (isDef(vnode.asyncFactory.resolved)) {
        hydrate(oldVnode.elm, vnode, insertedVnodeQueue)
      } else {
        vnode.isAsyncPlaceholder = true
      }
      return
    }

    // reuse element for static trees.
    // note we only do this if the vnode is cloned -
    // if the new node is not cloned it means the render functions have been
    // reset by the hot-reload-api and we need to do a proper re-render.
    // FIXME： 跳过 编译过程中处理
    if (isTrue(vnode.isStatic) &&
      isTrue(oldVnode.isStatic) &&
      vnode.key === oldVnode.key &&
      (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
    ) {
      vnode.componentInstance = oldVnode.componentInstance
      return
    }

    let i
    const data = vnode.data
    if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
      // 1. 执行prepatch钩子函数
      // 当更新的VNode是一个组件占位符VNode，执行组件prepatch钩子
      // prepatch会拿到新的组件占位符VNode配置，再通过旧的组件占位符VNode访问到
      // 此VNode占位符的组件实例，然后去更新此组件实例
      i(oldVnode, vnode)
    }

    /**
     * 获取新旧VNode节点的children
     *    如果有children说明该VNode节点是渲染VNode节点，不是组件占位符节点
     *    在生成组件VNode占位符时，children是undefined，详见create-component.js/createcomponent()
     */
    const oldCh = oldVnode.children
    const ch = vnode.children

    if (isDef(data) && isPatchable(vnode)) {
      // 2. 执行update钩子函数
      // 当前VNode定义了data，且是可patch的
      // 执行 cbs.update 队列
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode)
      // data中定义了hook.update钩子，执行update钩子
      if (isDef(i = data.hook) && isDef(i = i.update)) i(oldVnode, vnode)
    }

    // 3. 执行patch过程
    if (isUndef(vnode.text)) { // 新VNode不是文本节点
      if (isDef(oldCh) && isDef(ch)) {
        /**
         * 新旧VNode的children都存在，且不相同
         *  执行updateChildren() diff算法更新
         */
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
      } else if (isDef(ch)) {
        /**
         * 只有新VNode的children，旧的不存，表示旧节点不需要了
         *  此时若旧VNode是一个文本节点，DOM操作将节点置为空字符串
         *  然后创建新VNode的children的VNode节点 将新VNode的children批量插入到新VNode节点elm下
         */
        if (process.env.NODE_ENV !== 'production') {
          // 检查新的children是否有相同key
          checkDuplicateKeys(ch)
        }
        // 老的节点是文本节点，DOM操作将节点置为空字符串
        if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
        // 创建新VNode的children的VNode节点，内部循环调用createElm()
        // 将新VNode的children批量插入到新节点elm下
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        // 只有旧VNode的children存在，表示更新的是空节点
        // 将旧的节点通过removeVnodes全部清除
        removeVnodes(oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {
        /**
         * 只有旧VNode有文本text，清除其节点文本内容
         * DOM操作将旧VNode节点置为空字符串
         */
        nodeOps.setTextContent(elm, '')
      }
    } else if (oldVnode.text !== vnode.text) {
      // 最内层的文本节点
      // 新VNode是文本节点，且新旧VNode文本节点不相等，将DOM的text文本更新
      nodeOps.setTextContent(elm, vnode.text)
    }

    if (isDef(data)) {
      // 执行postpatch钩子 它是组件⾃定义的钩⼦函数，有则执⾏
      if (isDef(i = data.hook) && isDef(i = i.postpatch)) i(oldVnode, vnode)
    }
  }

  /**
   * 执行insert钩子函数
   * @param {*} vnode   当前VNode渲染节点
   * @param {*} queue   按顺序插入的VNode队列
   * @param {*} initial 首次渲染或ssr渲染标识
   */
  function invokeInsertHook (vnode, queue, initial) {
    // delay insert hooks for component root nodes, invoke them after the
    // element is really inserted
    if (isTrue(initial) && isDef(vnode.parent)) {
      // 首次渲染，将VNode放入pendingInsert
      vnode.parent.data.pendingInsert = queue
    } else {
      // 遍历执行每个组件占位符VNode节点的insert钩子函数
      for (let i = 0; i < queue.length; ++i) {
        // vnode.data.hook.insert(vnode)
        queue[i].data.hook.insert(queue[i])
      }
    }
  }

  let hydrationBailed = false
  // list of modules that can skip create hook during hydration because they
  // are already rendered on the client or has no need for initialization
  // Note: style is excluded because it relies on initial clone for future
  // deep updates (#7063).
  const isRenderedModule = makeMap('attrs,class,staticClass,staticStyle,key')

  // Note: this is a browser-only function so we can assume elms are DOM nodes.
  function hydrate (elm, vnode, insertedVnodeQueue, inVPre) {
    let i
    const { tag, data, children } = vnode
    inVPre = inVPre || (data && data.pre)
    vnode.elm = elm

    if (isTrue(vnode.isComment) && isDef(vnode.asyncFactory)) {
      vnode.isAsyncPlaceholder = true
      return true
    }
    // assert node match
    if (process.env.NODE_ENV !== 'production') {
      if (!assertNodeMatch(elm, vnode, inVPre)) {
        return false
      }
    }
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.init)) i(vnode, true /* hydrating */)
      if (isDef(i = vnode.componentInstance)) {
        // child component. it should have hydrated its own tree.
        initComponent(vnode, insertedVnodeQueue)
        return true
      }
    }
    if (isDef(tag)) {
      if (isDef(children)) {
        // empty element, allow client to pick up and populate children
        if (!elm.hasChildNodes()) {
          createChildren(vnode, children, insertedVnodeQueue)
        } else {
          // v-html and domProps: innerHTML
          if (isDef(i = data) && isDef(i = i.domProps) && isDef(i = i.innerHTML)) {
            if (i !== elm.innerHTML) {
              /* istanbul ignore if */
              if (process.env.NODE_ENV !== 'production' &&
                typeof console !== 'undefined' &&
                !hydrationBailed
              ) {
                hydrationBailed = true
                console.warn('Parent: ', elm)
                console.warn('server innerHTML: ', i)
                console.warn('client innerHTML: ', elm.innerHTML)
              }
              return false
            }
          } else {
            // iterate and compare children lists
            let childrenMatch = true
            let childNode = elm.firstChild
            for (let i = 0; i < children.length; i++) {
              if (!childNode || !hydrate(childNode, children[i], insertedVnodeQueue, inVPre)) {
                childrenMatch = false
                break
              }
              childNode = childNode.nextSibling
            }
            // if childNode is not null, it means the actual childNodes list is
            // longer than the virtual children list.
            if (!childrenMatch || childNode) {
              /* istanbul ignore if */
              if (process.env.NODE_ENV !== 'production' &&
                typeof console !== 'undefined' &&
                !hydrationBailed
              ) {
                hydrationBailed = true
                console.warn('Parent: ', elm)
                console.warn('Mismatching childNodes vs. VNodes: ', elm.childNodes, children)
              }
              return false
            }
          }
        }
      }
      if (isDef(data)) {
        let fullInvoke = false
        for (const key in data) {
          if (!isRenderedModule(key)) {
            fullInvoke = true
            invokeCreateHooks(vnode, insertedVnodeQueue)
            break
          }
        }
        if (!fullInvoke && data['class']) {
          // ensure collecting deps for deep class bindings for future updates
          traverse(data['class'])
        }
      }
    } else if (elm.data !== vnode.text) {
      elm.data = vnode.text
    }
    return true
  }

  function assertNodeMatch (node, vnode, inVPre) {
    if (isDef(vnode.tag)) {
      return vnode.tag.indexOf('vue-component') === 0 || (
        !isUnknownElement(vnode, inVPre) &&
        vnode.tag.toLowerCase() === (node.tagName && node.tagName.toLowerCase())
      )
    } else {
      return node.nodeType === (vnode.isComment ? 8 : 3)
    }
  }

  /**
   * 递归创建一个完整的DOM树并插入到Body上
   * @param {*} oldVnode    旧的VNode节点 可以不存在或是一个DOM对象或是一个VNode
   * @param {*} vnode       执行_render后返回的VNode的节点 占位符VNode或渲染VNode
   * @param {*} hydrating   是否是服务端渲染 
   * @param {*} removeOnly  transition-group组件使用参数
   * @returns               真实DOM
   */
  return function patch (oldVnode, vnode, hydrating, removeOnly) {
    // 删除VNode逻辑 $destroy执行
    if (isUndef(vnode)) {
      // vnode未定义 表明该节点已被销毁卸载
      // oldVnode定义 从旧的VNode上卸载销毁VNode本身及相关的子VNode节点 执行destroy钩子
      if (isDef(oldVnode)) invokeDestroyHook(oldVnode)
      return
    }

    let isInitialPatch = false
    const insertedVnodeQueue = []

    if (isUndef(oldVnode)) {
      // empty mount (likely as component), create new root element
      // 首次渲染的组件 oldVnode为undefined
      isInitialPatch = true
      // 创建渲染VNode的DOM
      createElm(vnode, insertedVnodeQueue)
    } else {
      // 命中：首次渲染 或 组件更新
      // nodeType判断是否是真实DOM节点
      const isRealElement = isDef(oldVnode.nodeType)

      if (!isRealElement && sameVnode(oldVnode, vnode)) {
        // 旧节点已经存在，且新节点和就节点VNode相同
        // patch existing root node
        patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
      } else {
        /**
         * 命中有两种情况：
         * 1. oldVnode节点是真实HTML节点
         * 2. oldVnode不是真实节点，即是VNode节点，但oldVnode和vnode不是同一个VNode节点
         */
        if (isRealElement) { // oldVnode节点是真实HTML节点
          // mounting to a real element
          // check if this is server-rendered content and if we can perform
          // a successful hydration.
          if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
            // 服务端渲染标识处理
            oldVnode.removeAttribute(SSR_ATTR)
            hydrating = true
          }

          // FIXME: 跳过 服务端渲染处理
          if (isTrue(hydrating)) {
            if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
              invokeInsertHook(vnode, insertedVnodeQueue, true)
              return oldVnode
            } else if (process.env.NODE_ENV !== 'production') {
              warn(
                'The client-side rendered virtual DOM tree is not matching ' +
                'server-rendered content. This is likely caused by incorrect ' +
                'HTML markup, for example nesting block-level elements inside ' +
                '<p>, or missing <tbody>. Bailing hydration and performing ' +
                'full client-side render.'
              )
            }
          }
          // either not server-rendered, or hydration failed.
          // create an empty node and replace it
          // 非服务端渲染或hydration失败
          // 将真实DOM节点转换成VNode节点 如 emptyNodeAt(div)
          oldVnode = emptyNodeAt(oldVnode)
        }

        // replacing existing element
        // 通过旧的VNode节点，拿到父DOM节点
        const oldElm = oldVnode.elm
        const parentElm = nodeOps.parentNode(oldElm)

        // create new node
        // 创建一个新的节点 创建VNode节点以及该节点的所有子节点的真实DOM节点 递归创建 先子后父
        // 以当前旧节点为参考节点，创建新的节点，并插入到 DOM 中
        createElm(
          vnode,
          insertedVnodeQueue,
          // extremely rare edge case: do not insert if old element is in a
          // leaving transition. Only happens when combining transition +
          // keep-alive + HOCs. (#4590)
          oldElm._leaveCb ? null : parentElm,
          nodeOps.nextSibling(oldElm)
        )

        /**
         * 递归更新渲染VNode节点的组件占位符VNode节点 执行当前VNode节点的组件占位符节点的更新操作
         * 如HelloWorld组件的具体实现生成的渲染VNode节点，它的parent是组件的占位符HelloWorld节点
         * 
         * 组件更新时候，上一步创建节点时，会更新组件占位符VNode对应的组件实例componentInstance，
         * 这一步是更新组件占位符VNode本身；以及递归更新父级，如果该组件占位符VNode是另一个组件的RootVNode
         */
        // update parent placeholder node element, recursively
        // 当前渲染VNode节点是组件占位符VNode生成的节点，它的parent会指向它的组件占位符VNode
        if (isDef(vnode.parent)) { 
          let ancestor = vnode.parent // 当前渲染VNode的组件占位符VNode
          // 判断当前VNode是否是可挂载的节点 vnode下有可挂载的渲染节点返回true
          const patchable = isPatchable(vnode)
          while (ancestor) {
            // 执行组件占位符节点的cbs.destroy队列
            for (let i = 0; i < cbs.destroy.length; ++i) {
              cbs.destroy[i](ancestor)
            }

            // 将当前新的渲染VNode节点的elm赋值给组件占位符VNode的elm
            // 更新组件占位符VNode的DOM引用elm
            ancestor.elm = vnode.elm

            if (patchable) { // 当前渲染vnode是可挂载的节点
              // 执行组件占位符节点的 cbs.create 队列
              for (let i = 0; i < cbs.create.length; ++i) {
                cbs.create[i](emptyNode, ancestor)
              }
              // #6513
              // invoke insert hooks that may have been merged by create hooks.
              // e.g. for directives that uses the "inserted" hook.
              const insert = ancestor.data.hook.insert
              if (insert.merged) {
                // 执行insert钩子
                // start at index 1 to avoid re-invoking component mounted hook
                for (let i = 1; i < insert.fns.length; i++) {
                  insert.fns[i]()
                }
              }
            } else {
              registerRef(ancestor)
            }

            // 组件占位符VNode的父级组件占位符节点 然后重新循环，做父级的组件占位符节点的更新
            // 组件占位符VNode是另一个组件的RootVNode时，会继续循环，否则会使undefined
            ancestor = ancestor.parent
          }
        }

        // destroy old node
        // 删除旧的节点
        if (isDef(parentElm)) {
          // 父节点存在，把oldVnode渲染节点移除，从当前DOM树中删除
          removeVnodes([oldVnode], 0, 0)
        } else if (isDef(oldVnode.tag)) {
          // 父节点不存在 即父节点已经被删掉了 直接执行destroy钩子
          invokeDestroyHook(oldVnode)
        }
      }
    }

    // 执行insert钩子函数 insertedVnodeQueue在整个patch过程中是不断添加的
    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
    // 返回真实DOM
    return vnode.elm
  }
}
