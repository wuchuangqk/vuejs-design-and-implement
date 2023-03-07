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
  function fnWrap() {
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
// 追踪、收集依赖
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
    get(target: any, p: string) {
      track(target, p)
      return target[p]
    },
    // 取出并执行依赖
    set(target, p: string, newValue) {
      target[p] = newValue
      trigger(target, p)
      return true
    },
  })
}

interface IComputed {
  value: any
}
/**
 * 计算属性
 * @param getter 
 * @returns 
 */
export function useComputed(getter: Function): IComputed {
  // 缓存上次计算的值
  let cache: any
  // 只有发生改变时才再次计算
  let isChange = true
  const effect = useEffect(getter, {
    lazy: true, // 不立即执行
    scheduler() {
      // 当getter被执行时，意味着发生了改变
      isChange = true
    }
  })
  const obj = {
    get value() {
      if (isChange) {
        // 执行effect相当于执行传入的getter函数
        // 拿到用户在getter里的返回值
        cache = effect()
        isChange = false
      }
      return cache
    }
  }
  return obj
}

type Callback = (newVal: any, oldValue: any) => void;
let oldValue: any, newValue
/**
 * watch
 * @param source 可以是getter，也可以是响应式对象
 * @param callback 用户自定义的处理函数
 */
export function watch(source: Function | Object, callback: Callback) {
  const effectFn = useEffect(() => {
    // 触发get
    if (typeof (source) === 'function') {
      source()
    } else {
      traverse(source)
    }
  }, {
    lazy: true,
    scheduler() {
      newValue = effectFn()
      // 监听set，当触发set时调用回调函数
      callback(newValue, oldValue)
      // 更新旧值
      oldValue = newValue
    }
  })
  // 手动调用effectFn，拿到的值就是旧值
  oldValue = effectFn()
}

/**
 * 递归遍历对象的每一个属性，并触发getter，收集依赖
 * @param value 
 * @param seen 
 * @returns 
 */
function traverse(value: any, seen = new Set()) {
  if (typeof (value) !== 'object' || value === null || seen.has(value)) {
    return
  }
  // 避免循环引用
  seen.add(value)
  for (const key in value) {
    traverse(value[key], seen)
  }
  return value
}