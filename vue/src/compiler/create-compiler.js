/* @flow */

import { extend } from 'shared/util'
import { detectErrors } from './error-detector'
import { createCompileToFunctionFn } from './to-function'

/**
 * 工厂函数 创建createCompiler方法
 * @param {*} baseCompile
 * @returns 返回createCompiler方法
 */
export function createCompilerCreator (baseCompile: Function): Function {
  /**
   * createCompiler方法
   * @param {*} baseOptions 编译时默认的options 
   * @returns 返回 { compile, compileToFunctions }
   */
  return function createCompiler (baseOptions: CompilerOptions) {
    /**
     * compile函数
     *  处理配置options，与baseOptions合并，再执行编译
     * @param {*} template  要编译的模板
     * @param {*} options   编译时，用户传入的options
     * @returns 返回编译结果CompiledResult
     */
    function compile (
      template: string,
      options?: CompilerOptions
    ): CompiledResult {
      // 创建finalOptions对象 baseOptions为原型
      const finalOptions = Object.create(baseOptions)
      const errors = []
      const tips = []
      // 在编译过程中记录errors和tips
      let warn = (msg, range, tip) => {
        (tip ? tips : errors).push(msg)
      }

      // 处理编译时传入的options，合并到finalOptions中
      if (options) {
        if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
          // $flow-disable-line
          const leadingSpaceLength = template.match(/^\s*/)[0].length
          // outputSourceRange为true，扩展warn方法
          warn = (msg, range, tip) => {
            const data: WarningMessage = { msg }
            if (range) {
              if (range.start != null) {
                data.start = range.start + leadingSpaceLength
              }
              if (range.end != null) {
                data.end = range.end + leadingSpaceLength
              }
            }
            (tip ? tips : errors).push(data)
          }
        }
        // merge custom modules
        if (options.modules) {
          finalOptions.modules =
            (baseOptions.modules || []).concat(options.modules)
        }
        // merge custom directives
        if (options.directives) {
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          )
        }
        // copy other options
        for (const key in options) {
          if (key !== 'modules' && key !== 'directives') {
            finalOptions[key] = options[key]
          }
        }
      }

      finalOptions.warn = warn

      // 外部传入，真正执行编译的函数
      const compiled = baseCompile(template.trim(), finalOptions)
      if (process.env.NODE_ENV !== 'production') {
        detectErrors(compiled.ast, warn)
      }
      compiled.errors = errors
      compiled.tips = tips
      return compiled
    }

    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile)
    }
  }
}
