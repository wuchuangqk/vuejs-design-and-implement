/* 副作用函数 */
let activeFn: Function | any
const effectStack: IFnWrap[] = []
/**
 * 注册副作用函数
 * @param fn 
 * @param options 
 * @returns 
 */
export function useEffect(fn: Function, options: IOptions = {}) {
  // 对fn进行包装，让activeFn指向fnWrap
  // 原先指向fn的时候，只能调用fn，包装可以做额外的事
  function fnWrap<IFnWrap>() {
    cleanup(fnWrap)
    activeFn = fnWrap
    effectStack.push(fnWrap)
    // 正常执行
    const result = fn()
    effectStack.pop()
    // 允许设置为undefined
    activeFn = effectStack[effectStack.length - 1]
    return result
  }
  // 给fnWrap添加依赖收集
  fnWrap.depSets = [] as any
  // 添加用户自定义选项
  fnWrap.options = options
  // 执行副作用函数
  if (!options.lazy) {
    fnWrap()
  }
  return fnWrap
}

/* 响应式对象 */
const depsMap = new WeakMap<Object, Map<string, Set<Function>>>()
// 追踪依赖
function track(target: Object, p: string) {
  if (!activeFn) return
  let targetMap = depsMap.get(target)
  if (typeof (targetMap) === 'undefined') {
    targetMap = new Map()
    depsMap.set(target, targetMap)
  }
  let fnSets = targetMap.get(p)
  if (typeof (fnSets) === 'undefined') {
    fnSets = new Set()
    targetMap.set(p, fnSets)
  }
  fnSets.add(activeFn)
  activeFn.depSets.push(fnSets)
}
// 触发依赖
function trigger(target: Object, p: string) {
  const targetMap = depsMap.get(target)
  if (typeof (targetMap) !== 'undefined') {
    const fnSets = targetMap.get(p)
    if (fnSets) {
      const arr = Array.from(fnSets) as IFnWrap[]
      arr.forEach((fn: IFnWrap) => {
        if (fn !== activeFn) {
          // 用户自定义调度器
          if (fn.options.scheduler) {
            fn.options.scheduler(fn)
          } else {
            // 直接执行
            fn()
          }
        }
      })
    }
  }
}
// 从依赖集合里清除当前的依赖
function cleanup(fnWrap: any) {
  fnWrap.depSets.forEach((fnSets: any) => {
    fnSets.delete(activeFn)
  })
  fnWrap.depSets.length = 0
}
/**
 * 将对象包装成响应式
 * @param obj 
 * @returns 
 */
export function useReactive<T extends object>(obj: T): T {
  return new Proxy(obj, {
    // 触发器，收集依赖
    get(target, p: string) {
      track(target, p)
      // @ts-ignore
      return target[p]
    },
    // 取出并执行依赖
    set(target, p: string, newValue) {
      // @ts-ignore
      target[p] = newValue
      trigger(target, p)
      return true
    },
  })
}