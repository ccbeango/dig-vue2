/* @flow */

import { baseOptions } from './options'
import { createCompiler } from 'compiler/index'

// createCompiler方法 返回 compile和compileToFunctions
// baseOptions是Web平台编译的默认相关配置
// 关于baseOptions，在不同的平台下都会有不同的编译的过程，因此编译过程中的依赖的配置
// baseOptions会有所不同
const { compile, compileToFunctions } = createCompiler(baseOptions)

export { compile, compileToFunctions }
