import { log } from 'console'
import { useReactive, useEffect } from '../reactive'

export const NODE_TYPE = {
  Fragment: Symbol(), // 片段（多个子节点）
  Text: Symbol(), // 文本节点
  Comment: Symbol(), // 注释
}

/**
 * 打补丁，比较新旧节点间的差异，精确更新
 * @param oldVnode container当前渲染的节点
 * @param newVnode 新节点
 * @param container dom容器
 */
function patch(oldVnode: IVnode | null, newVnode: IVnode, container: IContainer) {
  // 新节点的类型和现有节点的类型完全不一样，没有打补丁的意义
  if (oldVnode && oldVnode.type !== newVnode.type) {
    // 卸载当前节点，替换为新节点
    unMount(oldVnode)
    oldVnode = null
  }

  // 判断新节点的类型
  const { type } = newVnode
  if (typeof type === 'string') {
    // 存在旧节点，说明是要更新dom
    if (oldVnode) {
      patchChildren(oldVnode, newVnode)
    } else {
      // 不存在旧节点，说明是第一次挂载dom
      mountElement(newVnode, container)
    }
  } else if (type === NODE_TYPE.Text) {
    if (!oldVnode) {
      newVnode.el = document.createTextNode(newVnode.children as string) as unknown as HTMLElement
      container.appendChild(newVnode.el)
    } else {
      newVnode.el = oldVnode.el
      if (newVnode.children !== oldVnode.children) {
        oldVnode.el!.nodeValue = newVnode.children as string
      }
    }
  } else if (type === NODE_TYPE.Fragment) {
    if (!oldVnode) {
      // @ts-ignore
      newVnode.children.forEach((vnode: IVnode) => patch(null, vnode, container))
    } else {
      patchChildren(oldVnode, newVnode)
    }
  } else if (typeof type === 'object') {
    // 新节点是组件
    if (!oldVnode) {
      // 挂载组件
      mountComponent(newVnode, container)
    } else {
      // 更新组件
      patchCompnent()
    }
  }
}

/**
 * 挂载
 * @param vnode 
 * @param container 
 */
function mountElement(vnode: IVnode, container: IContainer) {
  const element = document.createElement(vnode.type) as IContainer
  vnode.el = element
  // 子节点是vnode数组
  if (Array.isArray(vnode.children)) {
    vnode.children.forEach((vnode: IVnode) => {
      patch(null, vnode, element)
    })
  } else if (typeof (vnode.children) === 'string') {
    // 子节点是文本
    element.innerHTML = vnode.children
  }
  if (vnode.props) {
    for (const prop in vnode.props) {
      patchProps(element, prop, null, vnode.props[prop])
    }
  }
  container.appendChild(element)
}

/**
 * 卸载
 * @param vnode 
 */
function unMount(vnode: IVnode) {
  if (vnode.type === NODE_TYPE.Fragment) {
    // @ts-ignore
    vnode.children.forEach((vnode: IVnode) => unMount(vnode))
    return
  }
  // 获取vnode对应的真实dom
  const domEl = vnode.el as HTMLElement
  const parent = domEl.parentElement
  if (parent) {
    parent.removeChild(domEl)
  }
}

/**
 * 更新属性
 * @param element 
 * @param prop 
 * @param prevValue 
 * @param nextValue 
 */
function patchProps(element: IContainer, prop: string, prevValue: any, nextValue: any) {
  // 处理class
  if (prop === 'class') {
    // 直接设置className比setAttribute设置class性能要高
    element.className = nextValue
  } else if (/^on/.test(prop)) {
    // 以on开头的都认为是事件
    // 获取事件名称，例如onClick -> click
    const eventName = prop.substring(2).toLowerCase()
    // 封装事件处理
    const invokers = element._vel || (element._vel = {})
    let invoker = invokers[eventName]
    if (nextValue) {
      // 检查有没有invoker对象
      if (!invoker) {
        // 创建一个包装的事件处理函数，并挂载到容器上
        // invoker是一个函数，当它被事件处理程序调用时，会执行自身上的eventHandle方法
        // 而eventHandle实际就是用户传入的方法
        invokers[eventName] = invoker = (event: any) => {
          invoker.eventHandle(event)
        }
        invoker.eventHandle = nextValue
        element.addEventListener(eventName, invoker)
      } else {
        // 当invoker存在时，只需更新自身上的eventHandle属性
        invoker.eventHandle = nextValue
      }
    } else if (invoker) {
      // 没有新的事件绑定函数，且之前绑定的invoker还存在，就移除绑定
      element.removeEventListener(eventName, invoker)
    }
  } else if (prop in element) {
    // 检查创建的html元素有没有这个DOM Properties
    // 获取DOM Properties的类型
    const type = typeof element[prop]
    // 如果是布尔类型，并且 nextValue 是空字符串，则将值矫正为 true
    if (type === 'boolean' && nextValue === '') {
      element[prop] = true
    } else {
      element[prop] = nextValue
    }
  } else {
    // 当html元素没有这个DOM Properties时，说明是自定义属性
    element.setAttribute(prop, nextValue)
  }
}

function patchChildren(oldVnode: IVnode, newVnode: IVnode) {
  // 因为新节点没有挂载，也就没有createElement，所以要把当前节点的el赋值给新节点
  newVnode.el = oldVnode.el
  const element = newVnode.el as IContainer
  // 当新节点的子级是文本
  if (typeof (newVnode.children) === 'string') {
    // 如果当前节点的子级是数组，则要把之前的元素卸载掉，替换成文本
    if (Array.isArray(oldVnode.children)) {
      oldVnode.children.forEach((vnode: IVnode) => unMount(vnode))
    }
    element.innerHTML = newVnode.children
  } else if (Array.isArray(newVnode.children)) {
    // 如果当前节点的子级也是数组的话，要进行diff
    if (Array.isArray(oldVnode.children)) {
      // diff ……
      oldVnode.children.forEach((vnode: IVnode) => unMount(vnode))
      newVnode.children.forEach((vnode: IVnode) => patch(null, vnode, element))
    } else {
      // 当前节点的子级是文本或者没有子节点
      // 清空容器，重新挂载
      newVnode.children.forEach((vnode: IVnode) => patch(null, vnode, element))
    }
  } else {
    // 新节点不存在
    if (Array.isArray(oldVnode.children)) {
      oldVnode.children.forEach((vnode: IVnode) => unMount(vnode))
    } else if (typeof oldVnode.children === 'string') {
      element.innerHTML = ''
    }
  }
}

function mountComponent(vnode: IVnode, container: IContainer) {
  // 组件的选项对象
  const options = vnode.type as IComponet
  const { data, render } = options
  // 将组件的状态包装为响应式变量
  const state = useReactive(data())
  // 执行渲染函数，获取虚拟dom
  useEffect(() => {
    console.log(1);
    
    const subTree = render.call(state)
    patch(null, subTree, container)
  }, {
    scheduler: queueJob
  })
}

function patchCompnent() {

}

let isFlushing = false
const p = Promise.resolve()
const queue = new Set<IFnWrap>()
/**
 * 组件更新副作用函数的调度器
 */
function queueJob(job: IFnWrap) {
  queue.add(job)
  if (!isFlushing) {
    isFlushing = true
    p.then(() => {
      try {
        queue.forEach((fn: IFnWrap) => fn())
      } finally {
        // 重置状态并清空队列
        isFlushing = false
        queue.clear()
      }
    })
  }
}

/**
 * 渲染器
 * @param vnode 虚拟dom
 * @param container dom容器
 */
export function render(vnode: IVnode | null, container: IContainer) {
  if (vnode) {
    patch(container._vnode || null, vnode, container)
  } else {
    // 卸载(清空容器)
    if (container._vnode) {
      unMount(container._vnode)
    }
  }
  container._vnode = vnode
}