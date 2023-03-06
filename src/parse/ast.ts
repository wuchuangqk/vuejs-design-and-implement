import { tokenize } from './tokenize'

function ast(template: string) {
  const tree: any = {
    type: 'Root',
    children: []
  }
  const stack = [tree]
  const tokens = tokenize(template)
  tokens.forEach((token: any) => {
    // 取出栈顶的元素，即当前父节点
    const parent = stack[0]
    switch (token.type) {
      case 'tag':
        const child = {
          type: 'Element',
          tag: token.name,
          children: []
        }
        parent.children.push(child)
        // 压入栈顶
        stack.unshift(child)
        break
      case 'text':
        parent.children.push({
          type: 'Text',
          content: token.content
        })
        break
      case 'tagEnd':
        stack.shift()
        break
    }
  })
  return tree
}

const template = `<div><p>Vue</p><p>Template</p></div>`
console.log(ast(template))