/* @flow */

import config from '../config'
import { warn } from './debug'
import { inBrowser, inWeex } from './env'
import { isPromise } from 'shared/util'
import { pushTarget, popTarget } from '../observer/dep'

/**
 * 错误处理
 * 命中组件中errorCaptured函数 命中globalHandleError函数
 * @param {*} err 
 * @param {*} vm 
 * @param {*} info 
 * @returns 
 */
export function handleError (err: Error, vm: any, info: string) {
  // Deactivate deps tracking while processing error handler to avoid possible infinite rendering.
  // See: https://github.com/vuejs/vuex/issues/1505
  pushTarget()
  try {
    if (vm) {
      let cur = vm
      while ((cur = cur.$parent)) {
        const hooks = cur.$options.errorCaptured
        if (hooks) {
          for (let i = 0; i < hooks.length; i++) {
            try {
              // 遍历执行errorCaptured生命周期函数
              const capture = hooks[i].call(cur, err, vm, info) === false
              if (capture) return
            } catch (e) {
              // 触发全局定义错误处理
              globalHandleError(e, cur, 'errorCaptured hook')
            }
          }
        }
      }
    }
    // 触发全局定义错误处理
    globalHandleError(err, vm, info)
  } finally {
    popTarget()
  }
}

/**
 * 执行hanlder
 *  并添加错误处理逻辑 
 *    有错误时，触发errorCaptured生命周期函数
 *      触发config.globalHandleError错误处理函数
 * @param {*} handler 
 * @param {*} context 
 * @param {*} args 
 * @param {*} vm 
 * @param {*} info 
 * @returns 
 */
export function invokeWithErrorHandling (
  handler: Function,
  context: any,
  args: null | any[],
  vm: any,
  info: string
) {
  let res
  try {
    res = args ? handler.apply(context, args) : handler.call(context)
    if (res && !res._isVue && isPromise(res) && !res._handled) {
      res.catch(e => handleError(e, vm, info + ` (Promise/async)`))
      // issue #9511
      // avoid catch triggering multiple times when nested calls
      res._handled = true
    }
  } catch (e) {
    handleError(e, vm, info)
  }
  return res
}

/**
 * config.errorHandler
 * 命中全局定义错误处理
 * @param {*} err 
 * @param {*} vm 
 * @param {*} info 
 * @returns 
 */
function globalHandleError (err, vm, info) {
  if (config.errorHandler) {
    try {
      return config.errorHandler.call(null, err, vm, info)
    } catch (e) {
      // if the user intentionally throws the original error in the handler,
      // do not log it twice
      if (e !== err) {
        logError(e, null, 'config.errorHandler')
      }
    }
  }
  logError(err, vm, info)
}

function logError (err, vm, info) {
  if (process.env.NODE_ENV !== 'production') {
    warn(`Error in ${info}: "${err.toString()}"`, vm)
  }
  /* istanbul ignore else */
  if ((inBrowser || inWeex) && typeof console !== 'undefined') {
    console.error(err)
  } else {
    throw err
  }
}
