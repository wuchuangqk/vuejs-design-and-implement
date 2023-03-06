import { useEffect, useReactive } from '../reactive/reactive.js'
interface IContainer extends HTMLElement {
  _vnode: IVnode
}
interface IVnode {
  type: string // 标签名称
  children: any // 标签的内容
}
/**
 * 渲染器
 * @param vnode 虚拟dom
 * @param container dom容器
 */
function createCenderer() {
  function render(vnode: IVnode, container: IContainer) {
    if (vnode) {
      patch(container._vnode, vnode, container)
    } else {
      // 执行清除操作
      if (container._vnode) {
        container.innerHTML = ''
      }
    }
    container._vnode = vnode
  }
  return {
    render
  }
}

/**
 * 打补丁，比较新旧节点间的差异，精确更新
 * @param oldVnode 旧节点
 * @param newVnode 新节点
 * @param container dom容器
 */
function patch(oldVnode: IVnode, newVnode: IVnode, container: HTMLElement) {
  const element = document.createElement(newVnode.type)
  element.innerHTML = newVnode.children
  container.innerHTML = ''
  container.appendChild(element)
}

const renderer = createCenderer()
const count = useReactive({ value: 0 })

useEffect(() => {
  count.value++
  const vnode: IVnode = {
    type: 'h1',
    children: 'hello' + count.value
  }
  renderer.render(vnode, document.getElementById('app') as IContainer)
})
document.getElementById('btn')?.addEventListener('click', () => {
  count.value++
})