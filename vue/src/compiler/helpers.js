/* @flow */

import { emptyObject } from 'shared/util'
import { parseFilters } from './parser/filter-parser'

type Range = { start?: number, end?: number };

/**
 * Vue编译错误警告
 * @param {*} msg 
 * @param {*} range 
 */
/* eslint-disable no-unused-vars */
export function baseWarn (msg: string, range?: Range) {
  console.error(`[Vue compiler]: ${msg}`)
}
/* eslint-enable no-unused-vars */

/**
 * 获取modules数组中的指定方法，并返回获取到的方法数组
 * @param {*} modules 
 * @param {*} key 指定的方法名
 * @returns 
 */
export function pluckModuleFunction<F: Function> (
  modules: ?Array<Object>,
  key: string
): Array<F> {
  return modules
    // filter(_ => _) 会过滤掉非真值
    ? modules.map(m => m[key]).filter(_ => _)
    : []
}

export function addProp (el: ASTElement, name: string, value: string, range?: Range, dynamic?: boolean) {
  (el.props || (el.props = [])).push(rangeSetItem({ name, value, dynamic }, range))
  el.plain = false
}

/**
 * AST元素上添加静态属性或动态属性
 *  静态属性添加到AST元素的dynamicAttrs数组中
 *  动态属性添加到AST元素的attrs数组中
 * 
 *  格式：{ name, value, dynamic, start, end }
 * @param {*} el 
 * @param {*} name 
 * @param {*} value 
 * @param {*} range 
 * @param {*} dynamic 
 */
export function addAttr (el: ASTElement, name: string, value: any, range?: Range, dynamic?: boolean) {
  const attrs = dynamic
    ? (el.dynamicAttrs || (el.dynamicAttrs = []))
    : (el.attrs || (el.attrs = []))
  attrs.push(rangeSetItem({ name, value, dynamic }, range))
  // el置为非普通AST元素
  el.plain = false
}

// add a raw attr (use this in preTransforms)
export function addRawAttr (el: ASTElement, name: string, value: any, range?: Range) {
  el.attrsMap[name] = value
  el.attrsList.push(rangeSetItem({ name, value }, range))
}

export function addDirective (
  el: ASTElement,
  name: string,
  rawName: string,
  value: string,
  arg: ?string,
  isDynamicArg: boolean,
  modifiers: ?ASTModifiers,
  range?: Range
) {
  (el.directives || (el.directives = [])).push(rangeSetItem({
    name,
    rawName,
    value,
    arg,
    isDynamicArg,
    modifiers
  }, range))
  el.plain = false
}

/**
 * 预处理修饰符 将修饰符换成对应前缀符号
 * 修饰符对应的前缀：
 *    .passive  =>  &
 *    .capture  =>  !
 *    .once     =>  ~
 * @param {*} symbol 要生成的前缀符号
 * @param {*} name  
 * @param {*} dynamic 是否是动态属性[key] 
 * @returns 
 */
function prependModifierMarker (symbol: string, name: string, dynamic?: boolean): string {
  return dynamic
    // 包裹动态key处理的修饰符 
    ? `_p(${name},"${symbol}")`
    : symbol + name // mark the event as captured
}

/**
 * 对AST元素扩展events或nativeEvents属性
 *  1. 根据modifier修饰符对事件名name做处理
 *  2. 根据modifier.native判断是一个纯原生事件还是普通事件，
 *     分别对应el.nativeEvents和el.events
 *  3. 按照name对事件做归类，并把回调函数的字符串保留到对应的事件中，
 *     - 同类单个事件保存成对象{ name: event1 }
 *     - 同类多个事件保存成数组{ name: [event1, event2] }
 * @param {*} el AST元素
 * @param {*} name 属性名
 * @param {*} value 属性值
 * @param {*} modifiers 修饰符对象Map
 * @param {*} important 事件权重 true放在同类型事件队列第一个 false放在最后一个
 * @param {*} warn 
 * @param {*} range 属性的索引
 * @param {*} dynamic 是否是动态名属性 @[test] test是一个变量
 */
export function addHandler (
  el: ASTElement,
  name: string,
  value: string,
  modifiers: ?ASTModifiers,
  important?: boolean,
  warn?: ?Function,
  range?: Range,
  dynamic?: boolean
) {
  modifiers = modifiers || emptyObject
  // warn prevent and passive modifier
  /* istanbul ignore if */
  if (
    process.env.NODE_ENV !== 'production' && warn &&
    modifiers.prevent && modifiers.passive
  ) {
    // prevent和passive修饰符不能同时使用
    warn(
      'passive and prevent can\'t be used together. ' +
      'Passive handler can\'t prevent default event.',
      range
    )
  }

  // normalize click.right and click.middle since they don't actually fire
  // this is technically browser-specific, but at least for now browsers are
  // the only target envs that have right/middle clicks.
  if (modifiers.right) {
    // 鼠标右键 替换成 contextmenu
    if (dynamic) {
      name = `(${name})==='click'?'contextmenu':(${name})`
    } else if (name === 'click') {
      name = 'contextmenu'
      delete modifiers.right
    }
  } else if (modifiers.middle) {
    // 鼠标滚轮键 替换成 mouseup
    if (dynamic) {
      name = `(${name})==='click'?'mouseup':(${name})`
    } else if (name === 'click') {
      name = 'mouseup'
    }
  }

  // check capture modifier
  if (modifiers.capture) {
    // DOM capture事件
    delete modifiers.capture
    // name = !name
    name = prependModifierMarker('!', name, dynamic)
  }
  if (modifiers.once) {
    // DOM once事件
    delete modifiers.once
    // name = ~name
    name = prependModifierMarker('~', name, dynamic)
  }
  /* istanbul ignore if */
  if (modifiers.passive) {
    // DOM passive事件
    delete modifiers.passive
    // name = &name
    name = prependModifierMarker('&', name, dynamic)
  }

  let events
  if (modifiers.native) {
    // 有native修饰符，将事件添加到el.nativeEvents
    delete modifiers.native
    events = el.nativeEvents || (el.nativeEvents = {})
  } else {
    // 默认将事件添加到el.events
    events = el.events || (el.events = {})
  }

  // newHandler = { value, dynamic, start, end, modifiers }
  const newHandler: any = rangeSetItem({ value: value.trim(), dynamic }, range)
  if (modifiers !== emptyObject) {
    // 保存还没处理的修饰符
    newHandler.modifiers = modifiers
  }

  const handlers = events[name]
  /* istanbul ignore if */
  if (Array.isArray(handlers)) {
    // 多个同类型事件，保存成数组 important将新事件放在第一个 否则放最后一个
    important ? handlers.unshift(newHandler) : handlers.push(newHandler)
  } else if (handlers) {
    // 同类新的有两个事件 保存成数组
    events[name] = important ? [newHandler, handlers] : [handlers, newHandler]
  } else {
    // 同类型的事件只有一个，保存成对象
    events[name] = newHandler
  }

  el.plain = false
}

export function getRawBindingAttr (
  el: ASTElement,
  name: string
) {
  return el.rawAttrsMap[':' + name] ||
    el.rawAttrsMap['v-bind:' + name] ||
    el.rawAttrsMap[name]
}

/**
 * 获取动态绑定属性的值的表达式 或 值的字符串 
 * @param {*} el 
 * @param {*} name 
 * @param {*} getStatic 是否获取静态 true 直接返回绑定值字符串
 * @returns 
 */
export function getBindingAttr (
  el: ASTElement,
  name: string,
  getStatic?: boolean
): ?string {
  // 绑定属性值 : 或 v-bind 语法 
  const dynamicValue =
    getAndRemoveAttr(el, ':' + name) ||
    getAndRemoveAttr(el, 'v-bind:' + name)
  if (dynamicValue != null) {
    // 解析绑定值得到表达式并返回
    return parseFilters(dynamicValue)
  } else if (getStatic !== false) {
    // 静态
    const staticValue = getAndRemoveAttr(el, name)
    if (staticValue != null) {
      // 直接返回绑定值的字符串格式
      return JSON.stringify(staticValue)
    }
  }
}

// note: this only removes the attr from the Array (attrsList) so that it
// doesn't get processed by processAttrs.
// By default it does NOT remove it from the map (attrsMap) because the map is
// needed during codegen.
/**
 * 从attrsList中移除掉指定属性
 * @param {*} el   AST元素
 * @param {*} name 要移除属性
 * @param {*} removeFromMap 是否从attrsMap中也移除指定属性
 * @returns 被移除的属性的value值
 */
export function getAndRemoveAttr (
  el: ASTElement,
  name: string,
  removeFromMap?: boolean
): ?string {
  let val
  if ((val = el.attrsMap[name]) != null) {
    const list = el.attrsList
    for (let i = 0, l = list.length; i < l; i++) {
      if (list[i].name === name) {
        list.splice(i, 1)
        break
      }
    }
  }
  if (removeFromMap) {
    delete el.attrsMap[name]
  }
  return val
}

export function getAndRemoveAttrByRegex (
  el: ASTElement,
  name: RegExp
) {
  const list = el.attrsList
  for (let i = 0, l = list.length; i < l; i++) {
    const attr = list[i]
    if (name.test(attr.name)) {
      list.splice(i, 1)
      return attr
    }
  }
}

/**
 * 设置解析html值的开始和结束索引
 * @param {*} item 
 * @param {*} range 
 * @returns 
 */
function rangeSetItem (
  item: any,
  range?: { start?: number, end?: number }
) {
  if (range) {
    if (range.start != null) {
      item.start = range.start
    }
    if (range.end != null) {
      item.end = range.end
    }
  }
  return item
}
