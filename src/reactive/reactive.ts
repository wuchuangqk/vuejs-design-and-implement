const TriggerType = {
  SET: 'SET', // 改变属性的值
  ADD: 'ADD', // 添加新属性
  DELETE: 'DELETE', // 删除属性
}

/* 副作用函数 */
let activeFnWrap: Function | any
// 副作用栈，始终让activeFnWrap处于栈底，也就是数组的最后一项
const effectStack: IFnWrap[] = []
/**
 * 注册副作用函数
 * @param fn 用户传入的副作用函数
 * @param options 
 * @returns 
 */
export function useEffect(fn: Function, options: IOptions = {}) {
  // 对fn进行包装，让activeFnWrap指向fnWrap
  // 原先指向fn的时候，只能调用fn，包装可以做额外的事
  function fnWrap() {
    // 每次重复执行fnWrap的时候，先把依赖清空，执行的时候再收集，避免持有多余的依赖
    cleanupDeps(fnWrap)
    // 记录下来当前正在执行的fnWrap
    activeFnWrap = fnWrap
    // 推入栈底
    effectStack.push(fnWrap)
    // 执行用户传入的副作用函数，获取返回值
    const result = fn()
    // 执行完毕后，从栈底弹出
    effectStack.pop()
    // 获取栈底的元素，当栈为空时，获取到的是undefined，也就是说没有正在执行的fnWrap
    activeFnWrap = effectStack[effectStack.length - 1]
    return result
  }
  // 给fnWrap添加依赖收集
  fnWrap.depSets = [] as any
  // 添加用户自定义选项
  fnWrap.options = options
  // 是否立即执行
  if (!options.lazy) {
    fnWrap()
  }
  // 把包装后的函数返回给调用者
  return fnWrap
}

/* 响应式对象 */
const depsMap = new WeakMap<Object, Map<string | symbol, Set<Function>>>()
// 追踪、收集依赖
function track(target: Object, p: string | symbol) {
  if (!activeFnWrap) return
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
  // 给每一个字段都设置一个依赖set，当调用getter时，把当前正在活跃的FnWrap收集到字段的依赖集合里
  // 这样当触发字段的setter时，就能从字段的依赖集合里获取到它收集了哪些副作用函数，从而可以执行这些副作用函数
  fnSets.add(activeFnWrap)
  activeFnWrap.depSets.push(fnSets)
}
/**
 * 触发依赖
 * @param target 被代理的对象
 * @param p 被更改的属性
 * @param triggerType 是添加新属性还是修改已有的属性
 */
function trigger(target: Object, p: string, triggerType: string) {
  const targetMap = depsMap.get(target)
  if (typeof (targetMap) === 'undefined') return
  let fnArr: IFnWrap[] = []
  // 从targetMap里取出这个字段的依赖集合
  let fnSets = targetMap.get(p)
  if (fnSets) {
    fnArr = fnArr.concat(Array.from(fnSets) as IFnWrap[])
  }
  if (triggerType === TriggerType.ADD || triggerType === TriggerType.DELETE) {
    // 取出ITERATE_KEY的依赖集合
    fnSets = targetMap.get(ITERATE_KEY)
    if (fnSets) {
      fnArr = fnArr.concat(Array.from(fnSets) as IFnWrap[])
    }
  }
  fnArr.forEach((fn: IFnWrap) => {
    if (fn !== activeFnWrap) {
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
// 从fnWrap的所有依赖集合中移除activeFnWrap
function cleanupDeps(fnWrap: any) {
  fnWrap.depSets.forEach((fnSets: any) => {
    fnSets.delete(activeFnWrap)
  })
  // 这里不能只清空depSets，因为depSets是保存的依赖集合的引用
  // 清空depSets，依赖集合依然存在，所以要从依赖集合里把activeFnWrap移除掉
  fnWrap.depSets.length = 0
}
const ITERATE_KEY = Symbol()
/**
 * 将对象包装成响应式
 * @param obj 
 * @returns 
 */
function createReactive<T extends object>(obj: T, isShallow: boolean = false): T {
  return new Proxy(obj, {
    // 触发器，收集依赖
    get(target: any, p: string, receiver: any) {
      // 私有属性_raw，返回代理对象的原始对象
      if (p === '_raw') {
        return target
      }
      track(target, p)
      const result = Reflect.get(target, p, receiver)
      // 浅层级
      if (isShallow) {
        return result
      }
      // 递归代理深层次属性
      if (typeof result === 'object' && result !== null) {
        return createReactive(result)
      }
      return result
    },
    // 取出并执行依赖
    set(target, p: string, newValue, receiver) {
      const oldValue = target[p]
      // 判断是添加新属性还是修改已有的属性
      const triggerType: string = Object.prototype.hasOwnProperty.call(target, p) ? TriggerType.SET : TriggerType.ADD
      const result = Reflect.set(target, p, newValue, receiver)
      // 只有当receiver是target的代理对象时，才触发依赖
      if (target === receiver._raw) {
        // 只有赋新值才触发依赖
        if (triggerType === TriggerType.SET) {
          // 处理NaN(两个NaN是不相等的)
          if (newValue !== oldValue && (newValue === newValue || oldValue === oldValue)) {
            trigger(target, p, triggerType)
          }
        } else {
          trigger(target, p, triggerType)
        }
      }
      return result
    },
    // 拦截has访问器，用于 'name' in obj
    has(target, p: string) {
      track(target, p)
      return Reflect.has(target, p)
    },
    ownKeys(target) {
      track(target, ITERATE_KEY)
      return Reflect.ownKeys(target)
    },
    deleteProperty(target, p: string) {
      // 检查对象里有没有这个属性
      const hasKey = Object.prototype.hasOwnProperty.call(target, p)
      const result = Reflect.deleteProperty(target, p)
      if (hasKey && result) {
        trigger(target, p, TriggerType.DELETE)
      }
      return result
    },
  })
}
export function useReactive<T extends object>(obj: T): T {
  return createReactive(obj)
}
export function useShallowReactive<T extends object>(obj: T): T {
  return createReactive(obj, true)
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

interface IWatchOptions {
  immediate?: boolean // 立即执行
}
type Callback = (newVal: any, oldValue: any) => void;
let oldValue: any, newValue
/**
 * watch
 * @param source 可以是getter，也可以是响应式对象
 * @param callback 用户自定义的处理函数
 */
export function watch(source: Function | Object, callback: Callback, options: IWatchOptions = {}) {
  const job = () => {
    newValue = effectFn()
    // 当依赖发生变化时，调用callback
    callback(newValue, oldValue)
    // 更新旧值
    oldValue = newValue
  }
  // 收集依赖
  const effectFn = useEffect(() => {
    // 触发get
    if (typeof (source) === 'function') {
      return source()
    } else {
      // 深入监听对象的每个属性
      return traverse(source)
    }
  }, {
    lazy: true,
    scheduler: job
  })
  // 立即执行callback
  if (options.immediate) {
    job()
  } else {
    // 手动调用effectFn，拿到的值就是旧值
    // 同时触发getter收集依赖
    oldValue = effectFn()
  }
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