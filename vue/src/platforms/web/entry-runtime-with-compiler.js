/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

// 获取id选择符对应的innerHTML
const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

// 暂存$mount
const mount = Vue.prototype.$mount
// $mount是和编译环境相关的，所以将此方法在这里进行扩展实现
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 获取DOM节点
  el = el && query(el)

  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    /**
     * 节点是body或document节点类型，直接返回节点
     * Vue 不能挂载在body、html这样的根节点上
     * 因为Vue之后在挂载新的根节点时，patch过程会删除掉原来的节点，
     * 而添加上新的节点，所以不能替换掉body或者html节点。
     */
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  const options = this.$options
  // resolve template/el and convert to render function
  /**
   * Vue最终执行的都是render方法
   *  如果没有定义render方法，则会把el或者template字符串转换成render方法
   *  没有render方法时，转换规则如下：
   *    1. 定义了template，template有两种类型：
   *        (1) id字符串 获取此id的后代HTMl字符串作为模板
   *        (2) 原生DOM元素 获取此DOM的后代HTMl字符串作为模板
   *    2. 没有定义template，定义了el，获取el本身HTML字符串作为template
   */
  if (!options.render) {
    let template = options.template
    if (template) {
      // 定义了template
      if (typeof template === 'string') {
        // 模板字符串(不做处理) 和 id选择符
        if (template.charAt(0) === '#') {
          // template是一个id选择符，获取id的节点DOM
          // 获取此id的后代HTML作为字符串作为模板
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        // template是一个原生DOM节点 获取此DOM的后代HTMl字符串作为模板
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        // 不是string也不是原生DOM节点 报警告 并返回本身this
        return this
      }
    } else if (el) {
      // 没有定义template 获取el本身的HTML字符串作为模板
      template = getOuterHTML(el)
    }

    // compileToFunctions 方法 template模板编译 最终生成render函数
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }

      // compileToFunctions：把模板template编译生成render以及staticRenderFns
      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      // 赋值给options
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }

  // 调用原$mount方法
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 * 获取el的HTML字符串
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
