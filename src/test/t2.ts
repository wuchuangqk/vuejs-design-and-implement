import { ast } from '../parse/ast'
import { useEffect, useReactive } from '../reactive/reactive'
import { render } from '../render/render'

const root = document.getElementById('app') as IContainer
const template = root!.innerHTML.trim()
root.innerHTML = ''

const obj = useReactive({
  name: '张三'
})
// @ts-ignore
window.obj = obj
useEffect(() => {
  const lastTree = ast(template, obj)
  render(lastTree, root)
})