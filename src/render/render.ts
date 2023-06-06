/**
 * 打补丁，比较新旧节点间的差异，精确更新
 * @param currentVnode container当前渲染的节点
 * @param newVnode 新节点
 * @param container dom容器
 */
function patch(currentVnode: IVnode | null, newVnode: IVnode, container: IContainer) {
  // 新节点的类型和现有节点的类型完全不一样，没有打补丁的意义
  if (currentVnode && currentVnode.type !== newVnode.type) {
    // 卸载当前节点，替换为新节点
    unMount(currentVnode)
    currentVnode = null
  }

  // 存在旧节点，说明是要更新dom
  if (currentVnode) {
    patchChildren(currentVnode, newVnode)
  } else {
    // 不存在旧节点，说明是第一次挂载dom
    mountElement(newVnode, container)
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
    element.removeEventListener(eventName, nextValue)
    element.addEventListener(eventName, nextValue)
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

function patchChildren(currentVnode: IVnode, newVnode: IVnode) {
  // 因为新节点没有挂载，也就没有createElement，所以要把当前节点的el赋值给新节点
  newVnode.el = currentVnode.el
  const element = newVnode.el as IContainer
  // 当新节点的子级是文本
  if (typeof (newVnode.children) === 'string') {
    // 如果当前节点的子级是数组，则要把之前的元素卸载掉，替换成文本
    if (Array.isArray(currentVnode.children)) {
      currentVnode.children.forEach((vnode: IVnode) => unMount(vnode))
    }
    element.innerHTML = newVnode.children
  } else if (Array.isArray(newVnode.children)) {
    // 如果当前节点的子级也是数组的话，要进行diff
    if (Array.isArray(currentVnode.children)) {
      // diff ……
      currentVnode.children.forEach((vnode: IVnode) => unMount(vnode))
      newVnode.children.forEach((vnode: IVnode) => patch(null, vnode, element))
    } else {
      // 当前节点的子级是文本或者没有子节点
      // 清空容器，重新挂载
      newVnode.children.forEach((vnode: IVnode) => patch(null, vnode, element))
    }
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
    // 卸载
    if (container._vnode) {
      unMount(container._vnode)
    }
  }
  container._vnode = vnode
}