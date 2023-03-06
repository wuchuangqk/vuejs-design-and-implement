interface IOptions {
  scheduler?: (fn: Function) => void // 把副作用函数的执行控制权交给用户
  lazy?: boolean // 延迟执行副作用函数
}
interface IFnWrap extends Function {
  options: IOptions
  depSets: any[]
}