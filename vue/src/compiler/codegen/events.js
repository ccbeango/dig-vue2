/* @flow */

/**
 * 匹配箭头或声明函数开头格式
 * 匹配箭头函数格式 如 hello => | (hello, world) =>
 *  1. ^([\w$_]+|\([^)]*?\))\s*=> 捕获(xxx)开头的元数据 xxx匹配两种情况：
 *    1) [\w$_]+ 匹配开头是字母、数字或下划线
 *    2) \([^)]*?\) 匹配开头是小括号、结尾小括号，中间是非 ) 的任意字符串
 *  2. \s*=> 匹配零或任意多个空格 加 箭头 =>
 * 匹配function函数格式 如 function hello ( | function (
 *  1. ^function 匹配 function开头
 *  2. (?:\s+[\w$]+)? 不捕获此元数据 匹配一个或多个空格加字母数字下划线结尾字符串，当作函数名 匹配零次或一次函数名
 *  3. \s*\( 匹配零或任意多个空格 加 (
 */
const fnExpRE = /^([\w$_]+|\([^)]*?\))\s*=>|^function(?:\s+[\w$]+)?\s*\(/
/**
 * 匹配执行函数的括号内容结尾的字符串
 *  - 即匹配以下形式结尾的字符串
 *  - ( 开头 并 ) 结尾，中间是除了 ) 以外任何内容，最后匹配零次或多次分号
 *  - 如 callFn(hello, world); 匹配 '(hello, world);'
 */
const fnInvokeRE = /\([^)]*?\);*$/
/**
 * 匹配访问属性的格式
 *  - 格式如 hello hello.world hello['world'] hello["world"] hello[0] hello[world]
 *  1. ^[A-Za-z_$][\w$]* 匹配字母或下划线开头的字符串
 *  2. (?:xxx)*$ 不捕获元数据xxx 匹配允许xxx出现零或多次的字符串 以此格式结尾
 *  - xxx匹配5种情况：
 *    1) \.[A-Za-z_$][\w$]* 匹配点开头(.)作为连接符，加字母或下划线开头的字符串
 *    2) \['[^']*?'] 匹配中括号开始结束中间是单引号包裹的字符串
 *    3) \["[^"]*?"] 匹配中括号开始结束中间是双引号包裹的字符串
 *    4) \[\d+] 匹配中括号开始结束中间是数字
 *    5) \[[A-Za-z_$][\w$]*] 匹配中括号开始和结束中间是字母或下划线开头的字符串
 */
const simplePathRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/

/**
 * KeyboardEvent.keyCode aliases
 * 键盘码别名
 */
const keyCodes: { [key: string]: number | Array<number> } = {
  esc: 27,
  tab: 9,
  enter: 13,
  space: 32,
  up: 38,
  left: 37,
  right: 39,
  down: 40,
  'delete': [8, 46]
}

/**
 * KeyboardEvent.key aliases
 * 键盘键名别名
 */
const keyNames: { [key: string]: string | Array<string> } = {
  // #7880: IE11 and Edge use `Esc` for Escape key name.
  esc: ['Esc', 'Escape'],
  tab: 'Tab',
  enter: 'Enter',
  // #9112: IE11 uses `Spacebar` for Space key name.
  space: [' ', 'Spacebar'],
  // #7806: IE11 uses key names without `Arrow` prefix for arrow keys.
  up: ['Up', 'ArrowUp'],
  left: ['Left', 'ArrowLeft'],
  right: ['Right', 'ArrowRight'],
  down: ['Down', 'ArrowDown'],
  // #9112: IE11 uses `Del` for Delete key name.
  'delete': ['Backspace', 'Delete', 'Del']
}

// #4868: modifiers that prevent the execution of the listener
// need to explicitly return null so that we can determine whether to remove
// the listener for .once
const genGuard = condition => `if(${condition})return null;` // 根据条件生成if判断

/**
 * 修饰符对应的code Map
 */
const modifierCode: { [key: string]: string } = {
  stop: '$event.stopPropagation();',
  prevent: '$event.preventDefault();',
  self: genGuard(`$event.target !== $event.currentTarget`),
  ctrl: genGuard(`!$event.ctrlKey`),
  shift: genGuard(`!$event.shiftKey`),
  alt: genGuard(`!$event.altKey`),
  meta: genGuard(`!$event.metaKey`),
  left: genGuard(`'button' in $event && $event.button !== 0`),
  middle: genGuard(`'button' in $event && $event.button !== 1`),
  right: genGuard(`'button' in $event && $event.button !== 2`)
}

/**
 * 生成事件的处理code
 * @param {*} events 
 * @param {*} isNative 是否是native修饰符的事件 组件上原生DOM事件加native 自定义事件不加native
 * @returns 
 */
export function genHandlers (
  events: ASTElementHandlers,
  isNative: boolean
): string {
  const prefix = isNative ? 'nativeOn:' : 'on:'
  let staticHandlers = ``
  let dynamicHandlers = ``
  for (const name in events) {
    // 生成事件处理函数
    const handlerCode = genHandler(events[name])
    if (events[name] && events[name].dynamic) {
      // 动态事件字符串 name会作为一个变量
      dynamicHandlers += `${name},${handlerCode},`
    } else {
      // 静态事件字符串 name会作为一个字符串
      staticHandlers += `"${name}":${handlerCode},`
    }
  }

  // 去掉最后的逗号，加上大括号
  staticHandlers = `{${staticHandlers.slice(0, -1)}}`
  if (dynamicHandlers) {
    // _d()包裹动态事件
    return prefix + `_d(${staticHandlers},[${dynamicHandlers.slice(0, -1)}])`
  } else {
    // 静态事件 on|nativeOn: { click: [ function1, funciton2 ], change: function3 }
    return prefix + staticHandlers
  }
}

// Generate handler code with binding params on Weex
/* istanbul ignore next */
function genWeexHandler (params: Array<any>, handlerCode: string) {
  let innerHandlerCode = handlerCode
  const exps = params.filter(exp => simplePathRE.test(exp) && exp !== '$event')
  const bindings = exps.map(exp => ({ '@binding': exp }))
  const args = exps.map((exp, i) => {
    const key = `$_${i + 1}`
    innerHandlerCode = innerHandlerCode.replace(exp, key)
    return key
  })
  args.push('$event')
  return '{\n' +
    `handler:function(${args.join(',')}){${innerHandlerCode}},\n` +
    `params:${JSON.stringify(bindings)}\n` +
    '}'
}

/**
 * 根据事件handler生成一个事件处理函数字符串
 * @param {*} handler 
 * @returns 
 */
function genHandler (handler: ASTElementHandler | Array<ASTElementHandler>): string {
  if (!handler) {
    // 没有handler
    return 'function(){}'
  }

  if (Array.isArray(handler)) {
    // handler数组格式，递归再执行genHandler
    // 返回数组拼接格式的function字符串
    return `[${handler.map(handler => genHandler(handler)).join(',')}]`
  }

  // 以下是正则匹配用户传入的方法是哪种格式 支持三种：
  // 1. 访问属性名作方法名 hello | hello.world
  const isMethodPath = simplePathRE.test(handler.value)
  // 2. 函数表达式 () => | function hello ()
  const isFunctionExpression = fnExpRE.test(handler.value)
  // 3. 内联处理器中的方法 去掉结尾括号部分 访问属性名做方法名 hello() | hello.world()
  const isFunctionInvocation = simplePathRE.test(handler.value.replace(fnInvokeRE, ''))

  if (!handler.modifiers) { // 没有还未处理的修饰符
    if (isMethodPath || isFunctionExpression) {
      // 是方法名 或 函数表达式
      return handler.value
    }
    /* istanbul ignore if */
    if (__WEEX__ && handler.params) {
      return genWeexHandler(handler.params, handler.value)
    }
    // 内联处理器中的方法 
    // 将事件value包括一层function，并传入$event，这也是为什么模板中能直接使用$event
    return `function($event){${
      isFunctionInvocation ? `return ${handler.value}` : handler.value
    }}` // inline statement
  } else { // 还有未处理修饰符
    let code = '' // 修饰符生成的code
    let genModifierCode = ''
    const keys = [] // 键盘码修饰符
    for (const key in handler.modifiers) {
      if (modifierCode[key]) {
        // 生成修饰符对应的code
        genModifierCode += modifierCode[key]
        // left/right
        if (keyCodes[key]) {
          keys.push(key) // 键盘码修饰符
        }
      } else if (key === 'exact') { // exact修饰符
        const modifiers: ASTModifiers = (handler.modifiers: any)
        // 生成 if ($event.ctrlKey || $event.shiftKey || ...) return null
        genModifierCode += genGuard(
          ['ctrl', 'shift', 'alt', 'meta']
            .filter(keyModifier => !modifiers[keyModifier])
            .map(keyModifier => `$event.${keyModifier}Key`)
            .join('||')
        )
      } else {
        keys.push(key) // 键盘码修饰符
      }
    }
    if (keys.length) {
      // 过滤键盘码修饰符
      code += genKeyFilter(keys)
    }
    // Make sure modifiers like prevent and stop get executed after key filtering
    if (genModifierCode) {
      // 键盘修饰符后 添加 其它修饰符 保证其它修饰符在键盘修饰符后执行
      code += genModifierCode
    }

    // 生成事件执行code
    const handlerCode = isMethodPath
      // return hello.apply(null, arguments) 
      ? `return ${handler.value}.apply(null, arguments)`
      : isFunctionExpression
        // return (() => hello()).apply(null, arguments)
        ? `return (${handler.value}).apply(null, arguments)`
        : isFunctionInvocation
          // return hello()
          ? `return ${handler.value}`
          : handler.value
    /* istanbul ignore if */
    if (__WEEX__ && handler.params) {
      return genWeexHandler(handler.params, code + handlerCode)
    }

    // 返回function包裹，传入$event，函数体种是 修饰符处理code + 事件执行code
    return `function($event){${code}${handlerCode}}`
  }
}

/**
 * 生成过滤掉无法使用的键盘码修饰符code
 * @param {*} keys 
 * @returns 
 */
function genKeyFilter (keys: Array<string>): string {
  // 返回if判断
  // if(!$event.type.indexOf('key') &&
  //   _k($event.keyCode, key, keyCode, $event.key, keyName) &&
  //   _k($event.keyCode, key, keyCode, $event.key, keyName) && ...) return null 
  return (
    // make sure the key filters only apply to KeyboardEvents
    // #9441: can't use 'keyCode' in $event because Chrome autofill fires fake
    // key events that do not have keyCode property...
    `if(!$event.type.indexOf('key')&&` +
    `${keys.map(genFilterCode).join('&&')})return null;`
  )
}

/**
 * 生成过滤键盘码的code
 * @param {*} key 
 * @returns 
 */
function genFilterCode (key: string): string {
  const keyVal = parseInt(key, 10)
  if (keyVal) {
    return `$event.keyCode!==${keyVal}`
  }
  const keyCode = keyCodes[key] // 修饰符对应的键盘码
  const keyName = keyNames[key] // 修饰符对应的键盘按键名
  // 返回 _k($event.keyCode, key, keyCode, $event.key, keyName)
  return (
    `_k($event.keyCode,` +
    `${JSON.stringify(key)},` +
    `${JSON.stringify(keyCode)},` +
    `$event.key,` +
    `${JSON.stringify(keyName)}` +
    `)`
  )
}
