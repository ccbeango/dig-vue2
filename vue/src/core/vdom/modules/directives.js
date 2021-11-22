/* @flow */

import { emptyNode } from 'core/vdom/patch'
import { resolveAsset, handleError } from 'core/util/index'
import { mergeVNodeHook } from 'core/vdom/helpers/index'

export default {
  create: updateDirectives,
  update: updateDirectives,
  destroy: function unbindDirectives (vnode: VNodeWithData) {
    updateDirectives(vnode, emptyNode)
  }
}

/**
 * 更新指令
 * patch创建阶段、更新阶段、销毁阶段会执行
 * @param {*} oldVnode 
 * @param {*} vnode 
 */
function updateDirectives (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  if (oldVnode.data.directives || vnode.data.directives) {
    _update(oldVnode, vnode)
  }
}

/**
 * 实际执行
 *  执行指令定义的hook
 * @param {*} oldVnode 
 * @param {*} vnode 
 */
function _update (oldVnode, vnode) {
  // 根据oldVnode和vnode的不同，来决定VNode是一个create过程还是一个destroy过程
  const isCreate = oldVnode === emptyNode // 旧节点是空VNode，则也是指令创建过程
  const isDestroy = vnode === emptyNode // 当前节点是空VNode，则也是指令销毁过程
  const oldDirs = normalizeDirectives(oldVnode.data.directives, oldVnode.context)
  const newDirs = normalizeDirectives(vnode.data.directives, vnode.context)

  const dirsWithInsert = [] // 新增VNode 有inserted钩子函数的指令
  const dirsWithPostpatch = [] // 更新VNode 有componentUpdated钩子函数的指令

  let key, oldDir, dir
  // 新节点指令遍历处理
  for (key in newDirs) {
    oldDir = oldDirs[key] // 旧VNode上的指令
    dir = newDirs[key] // 新VNode上的指令
    if (!oldDir) {
      // 旧VNode上没有没有该指令，即是VNode上的新增指令
      // new directive, bind
      callHook(dir, 'bind', vnode, oldVnode) // 执行指令的bind钩子函数
      if (dir.def && dir.def.inserted) {
        // 新增的指令定义了inserted，存储指令，以便之后patch插入后执行insert钩子函数
        dirsWithInsert.push(dir)
      }
    } else {
      // 旧VNode上该指令存在，新VNode上指令存在，即更新此VNode指令
      // existing directive, update
      // 旧VNode上指令的值和参数扩展到新VNode指令上
      dir.oldValue = oldDir.value
      dir.oldArg = oldDir.arg
      callHook(dir, 'update', vnode, oldVnode) // 执行指令的update钩子函数
      if (dir.def && dir.def.componentUpdated) {
        // 新VNode上指令定义了componentUpdated钩子，则记录组件更新完毕指令
        dirsWithPostpatch.push(dir)
      }
    }
  }

  if (dirsWithInsert.length) {
    // 新插入VNode上的指令有inserted钩子
    const callInsert = () => {
      for (let i = 0; i < dirsWithInsert.length; i++) {
        // 在执行insert钩子后，说明已经插入，此时再执行inserted钩子
        callHook(dirsWithInsert[i], 'inserted', vnode, oldVnode)
      }
    }
    if (isCreate) {
      // 创建VNode 在vnode.data.hook[insert]上存储指令的钩子函数
      // 以便 在patch阶段，节点已插入后，执行invokeInsertHook
      mergeVNodeHook(vnode, 'insert', callInsert)
    } else {
      // 更新VNode时 执行VNode节点上的inserted钩子函数
      callInsert()
    }
  }

  if (dirsWithPostpatch.length) {
    // 更新VNode上的指令有componentUpdated钩子
    // 更新VNode时 在vnode.data.hook[postpatch]上存储指令的钩子函数
    mergeVNodeHook(vnode, 'postpatch', () => {
      for (let i = 0; i < dirsWithPostpatch.length; i++) {
        callHook(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode)
      }
    })
  }

  if (!isCreate) {
    // VNode销毁过程，执行不再使用指令的unbind
    for (key in oldDirs) {
      if (!newDirs[key]) {
        // newDirs[key]没有该指令，说明不再用到，执行unbind钩子函数
        // no longer present, unbind
        callHook(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy)
      }
    }
  }
}

const emptyModifiers = Object.create(null)

/**
 * 标准化指令
 *  - 没有modifiers，扩展空modifiers
 *  - 在指令上扩展指令的定义实现def
 * @param {*} dirs VNode的指令
 * @param {*} vm 上下文实例
 */
function normalizeDirectives (
  dirs: ?Array<VNodeDirective>,
  vm: Component
): { [key: string]: VNodeDirective } {
  const res = Object.create(null)
  if (!dirs) {
    // VNode上未定义指令dirs，返回一个空对象
    // $flow-disable-line
    return res
  }
  let i, dir
  for (i = 0; i < dirs.length; i++) {
    dir = dirs[i]
    if (!dir.modifiers) {
      // $flow-disable-line
      dir.modifiers = emptyModifiers // 指令没有修饰符，创建空修饰符对象
    }
    res[getRawDirName(dir)] = dir
    // 查找指令的定义asset 即 实际的指令定义 如 def: { inserted, componentUpdated }
    dir.def = resolveAsset(vm.$options, 'directives', dir.name, true)
  }
  // $flow-disable-line
  return res
}

/**
 * 返回用户定义的指令名
 * @param {*} dir 
 * @returns 
 */
function getRawDirName (dir: VNodeDirective): string {
  return dir.rawName || `${dir.name}.${Object.keys(dir.modifiers || {}).join('.')}`
}

/**
 * 调用指令定义的钩子方法
 * @param {*} dir 指令定义
 * @param {*} hook 钩子函数名 bind insert update unbind
 * @param {*} vnode 
 * @param {*} oldVnode 
 * @param {*} isDestroy 
 */
function callHook (dir, hook, vnode, oldVnode, isDestroy) {
  const fn = dir.def && dir.def[hook] // 钩子函数
  if (fn) {
    try {
      // 执行指令的钩子函数
      fn(vnode.elm, dir, vnode, oldVnode, isDestroy)
    } catch (e) {
      handleError(e, vnode.context, `directive ${dir.name} ${hook} hook`)
    }
  }
}
