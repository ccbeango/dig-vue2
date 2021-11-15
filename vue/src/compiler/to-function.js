/* @flow */

import { noop, extend } from 'shared/util'
import { warn as baseWarn, tip } from 'core/util/debug'
import { generateCodeFrame } from './codeframe'

type CompiledFunctionResult = {
  render: Function;
  staticRenderFns: Array<Function>;
};

/**
 * 使用Function构造函数，将字符串代码转换成一个函数
 * @param {*} code 
 * @param {*} errors 
 * @returns 
 */
function createFunction (code, errors) {
  try {
    return new Function(code)
  } catch (err) {
    errors.push({ err, code })
    return noop
  }
}

/**
 * 创建compileToFunctions的工厂函数
 * @param {*} compile 
 * @returns 
 */
export function createCompileToFunctionFn (compile: Function): Function {
  const cache = Object.create(null)

  /**
   * 返回compileToFunctions，即编译入口函数
   *  $mount中就执行了这个函数 
   * @param {*} template 模板字符串 
   * @param {*} options  编译的options
   * @param {*} vm       要进行模板编译的vm实例
   */
  return function compileToFunctions (
    template: string,
    options?: CompilerOptions,
    vm?: Component
  ): CompiledFunctionResult {
    // 浅拷贝options
    options = extend({}, options)
    // 获取定义warn函数
    const warn = options.warn || baseWarn
    delete options.warn

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production') {
      // detect possible CSP restriction
      // 探测是否有CSP限制 (Content Security Policy)
      try {
        new Function('return 1')
      } catch (e) {
        if (e.toString().match(/unsafe-eval|CSP/)) {
          warn(
            'It seems you are using the standalone build of Vue.js in an ' +
            'environment with Content Security Policy that prohibits unsafe-eval. ' +
            'The template compiler cannot work in this environment. Consider ' +
            'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
            'templates into render functions.'
          )
        }
      }
    }

    // check cache
    // 对于同样的template而言，多次编译的结果显然是相同的，而编译的过程本身是耗时的，
    // 对同一模板进行缓存，多次编译可以直接从缓存中获取编译结果，这是一个典型的空间换时间的优化手段
    const key = options.delimiters
      // 定义了纯文本插入分隔符，使用分隔符加template 
      ? String(options.delimiters) + template
      : template
      if (cache[key]) {
      // 编译结果有缓存，直接返回
      return cache[key]
    }

    // compile
    // 执行编译 compile是增强后的baseCompile函数
    const compiled = compile(template, options)

    // check compilation errors/tips
    // 非生产环境 编译错误 或 tips提示处理
    if (process.env.NODE_ENV !== 'production') {
      if (compiled.errors && compiled.errors.length) {
        if (options.outputSourceRange) {
          compiled.errors.forEach(e => {
            warn(
              `Error compiling template:\n\n${e.msg}\n\n` +
              generateCodeFrame(template, e.start, e.end),
              vm
            )
          })
        } else {
          warn(
            `Error compiling template:\n\n${template}\n\n` +
            compiled.errors.map(e => `- ${e}`).join('\n') + '\n',
            vm
          )
        }
      }
      if (compiled.tips && compiled.tips.length) {
        if (options.outputSourceRange) {
          compiled.tips.forEach(e => tip(e.msg, vm))
        } else {
          compiled.tips.forEach(msg => tip(msg, vm))
        }
      }
    }

    // turn code into functions
    const res = {}
    const fnGenErrors = []
    // 将编译后的代码字符串转换成一个真正的函数 其实是一个with()语句包裹的代码段
    res.render = createFunction(compiled.render, fnGenErrors)
    res.staticRenderFns = compiled.staticRenderFns.map(code => {
      return createFunction(code, fnGenErrors)
    })

    // check function generation errors.
    // this should only happen if there is a bug in the compiler itself.
    // mostly for codegen development use
    // 检查编译生成render函数时，是否有错误
    // 只有在编译器本身中存在错误时，才会发生这种情况
    // 主要用于Codegen开发使用
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production') {
      if ((!compiled.errors || !compiled.errors.length) && fnGenErrors.length) {
        warn(
          `Failed to generate render function:\n\n` +
          fnGenErrors.map(({ err, code }) => `${err.toString()} in\n\n${code}\n`).join('\n'),
          vm
        )
      }
    }

    // 使用模板字符串为key，缓存编译结果
    // 返回 { render, staticRenderFns }
    return (cache[key] = res)
  }
}
