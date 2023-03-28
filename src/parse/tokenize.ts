const template = `<div><a>this is a link</a><p>Vue</p></div>`
// 定义状态机的状态
const State = {
  initial: 1, // 初始状态
  tagStart: 2, // 标签开始状态
  tagName: 3, // 标签名称状态
  text: 4, // 文本状态
  tagEnd: 5, // 标签结束状态
  tagEndName: 6, // 标签结束名称状态
  expressionStart: 7, // 表达式开始标签
  expressionEnd: 8, // 表达式结束标签
  expressionText: 9, // 表达式里的内容
}

// 判断是否是字母
function isAlpha(char: string) {
  return char >= 'a' && char <= 'z' || char >= 'A' && char <= 'Z' || char === '.'
}

export const TOKEN_TYPE = {
  TEXT: 'text', // 文本
  TAG_END: 'tagEnd', // 结束标签
  TAG: 'tag', // 标签名称
  VARIABLE: 'variable', // 表达式里的变量
}

// 解析为token
export function tokenize(str: string) {
  // 记录当前状态
  let currentState = State.initial
  // 用于记录字符
  const chars = []
  // 生成的token
  const tokens = []
  // 从第一个字符遍历到最后一个字符
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    // 判断当前状态
    switch (currentState) {
      // 初始状态
      case State.initial:
        // 开始标签
        if (char === '<') {
          // 状态机切换到标签开始状态
          currentState = State.tagStart
        } else if (isAlpha(char)) {
          // 状态机切换到文本状态
          currentState = State.text
          // 缓存到chars数组
          chars.push(char)
        } else if (char === '{') {
          // 表达式开始标签
          currentState = State.expressionStart
        }
        break
      // 标签开始状态
      case State.tagStart:
        if (isAlpha(char)) {
          currentState = State.tagName
          chars.push(char)
        } else if (char === '/') {
          // 遇到字符 / 表示标签结束了
          currentState = State.tagEnd
        }
        break
      // 标签名称状态
      case State.tagName:
        if (isAlpha(char)) {
          chars.push(char)
        } else if (char === '>') {
          // 开始标签结束了，状态切到初始状态
          currentState = State.initial
          // 此时chars数组中记录的字符就是标签名称
          tokens.push({
            type: TOKEN_TYPE.TAG,
            name: chars.join('')
          })
          // 清空chars
          chars.length = 0
        }
        break
      // 标签结束状态
      case State.tagEndName:
        if (isAlpha(char)) {
          chars.push(char)
        } else if (char === '>') {
          currentState = State.initial
          // 保存结束标签名称
          tokens.push({
            type: TOKEN_TYPE.TAG_END,
            name: chars.join('')
          })
          chars.length = 0
        }
        break
      // 文本状态
      case State.text:
        if (isAlpha(char)) {
          chars.push(char)
        } else if (char === '<') {
          currentState = State.tagStart
          tokens.push({
            type: TOKEN_TYPE.TEXT,
            content: chars.join('')
          })
          chars.length = 0
        }
        break
      // 标签结束状态
      case State.tagEnd:
        if (isAlpha(char)) {
          currentState = State.tagEndName
          chars.push(char)
        }
        break
      // 表达式开始状态
      case State.expressionStart:
        if (isAlpha(char)) {
          chars.push(char)
          currentState = State.expressionText
        }
        break
      case State.expressionText:
        // 表达式里的内容状态
        if (char === '}') {
          // 表达式闭合了，状态切换到初始状态
          currentState = State.initial
          // 记录变量名称
          tokens.push({
            type: TOKEN_TYPE.VARIABLE,
            content: chars.join('')
          })
          chars.length = 0
        } else if (isAlpha(char)) {
          chars.push(char)
        }
    }
  }
  return tokens
}