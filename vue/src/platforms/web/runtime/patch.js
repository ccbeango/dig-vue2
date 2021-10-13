/* @flow */

import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
import baseModules from 'core/vdom/modules/index'
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
const modules = platformModules.concat(baseModules)

// 创建patch方法
// nodeOps 真实DOM操作的封装API
// modules 模块的钩子函数的实现 如操作directive ref attr class style event等的生命周期钩子函数
export const patch: Function = createPatchFunction({ nodeOps, modules })
