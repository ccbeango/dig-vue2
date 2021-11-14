/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
/**
 * createCompilerCreator接收编译流程函数，传入一个默认的基础编译流程函数baseCompile
 * createCompilerCreator会对baseCompile函数增强，返回createCompiler函数
 * createCompiler函数在调用时会返回 { compile, compileToFunctions }
 *  1. compile是增强后的baseCompile函数
 *  2. compileToFunctions是createCompileToFunctionFn方法的返回值，
 *     createCompileToFunctionFn是对compile函数的编译的模板做一层缓存增强
 *  3. compileToFunctions中会调用compile
 * compileToFunctions就是编译入口文本，$mount时会调用此函数，然后内部会调用到compile，
 * 之后会调用到这里传入的baseCompile函数，baseCompile才是最终执行编译相关的部分，
 * 其余的部分都是利用闭包，对baseCompile函数进行增强
 * 
 * 为什么要这样设计？
 * 编译入口逻辑之所以这么绕，是因为Vue.js在不同的平台下都会有编译的过程，因此编译过程中
 * 的依赖的配置baseOptions会有所不同。而编译过程会多次执行，但这同一个平台下每一次的编
 * 译过程配置又是相同的，为了不让这些配置在每次编译过程都通过参数传入，Vue.js利用了
 * 函数柯里化的技巧很好的实现了baseOptions的参数保留。
 * 如果不通过柯里化传入，那么每次执行编译，都要传入baseOptions，此时又会因为baseOptions
 * 在多个平台都会不同，无法避免地就要写很多if逻辑判断，编译执行时频繁的，每次执行编译时
 * 都要判断，这显然是不合理的；因为编译总是在同一个环境下进行的，每次都判断相比于只需要
 * 在第一次确认环境时进行判断而言，显然后者更好
 * 同样，Vue.js也是利用函数柯里化技巧把基础的编译过程函数抽出来，
 * 通过createCompilerCreator(baseCompile)的方式把真正编译的过程和其它逻辑如对编译配置
 * 处理、缓存处理等剥离开，我们根据不同的平台，只需要关注核心的编译处理即可。
 * 
 * 虽然看起来会有点绕，但实际上是非常巧妙的，平常的工作中，这个技巧是值得借鉴学习的。
 * 
 * 此外，Vue对目录也根据不同的环境进行了拆分，把共同的部分放在src/complier，平台相关
 * 的部分，放在相应的平台目录下
 */
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 解析模板字符串生成AST
  const ast = parse(template.trim(), options)
  // 优化AST
  if (options.optimize !== false) {
    optimize(ast, options)
  }
  // 生成渲染代码
  const code = generate(ast, options)

  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
