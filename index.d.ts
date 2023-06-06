/**
 * 副作用函数的调度器选项
 */
interface IOptions {
  scheduler?: (fn: IFnWrap) => void // 把副作用函数的执行控制权交给用户
  lazy?: boolean // 延迟执行副作用函数
}
interface IFnWrap extends Function {
  options: IOptions
  depSets: any[]
}

interface IVnode {
  type: string // vnode类型
  props?: IProp // 标签里的属性，id、class、name等等
  children: string | IVnode[] // 子节点
  el?: HTMLElement // vnode对应的真实dom
}

interface IProp {
  [key: string]: any
}

interface IContainer extends HTMLElement {
  _vnode?: IVnode | null
  [key: string]: any
}