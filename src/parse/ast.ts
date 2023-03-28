import { tokenize, TOKEN_TYPE } from './tokenize'

export function ast(template: string, context: any) {
  const tree: any = {
    type: 'div',
    children: []
  }
  const stack = [tree]
  const tokens = tokenize(template)
  console.log(tokens);
  
  tokens.forEach((token: any) => {
    // 取出栈顶的元素，即当前父节点
    const parent = stack[0]
    switch (token.type) {
      case TOKEN_TYPE.TAG:
        const child = {
          // type: 'Element',
          type: token.name,
          children: []
        }
        parent.children.push(child)
        // 压入栈顶
        stack.unshift(child)
        break
      case TOKEN_TYPE.TEXT:
        parent.children.push({
          type: 'span',
          children: token.content
        })
        break
      case TOKEN_TYPE.TAG_END:
        stack.shift()
        break
      case TOKEN_TYPE.VARIABLE:
        // console.log(context, token.content)
        parent.children.push({
          type: 'span',
          children: context[token.content]
        })
    }
  })
  return tree
}

// const template = `<div><p>{name}</p><p>Template</p></div>`
// console.log(ast(template, { obj: { name: '张三' } }))