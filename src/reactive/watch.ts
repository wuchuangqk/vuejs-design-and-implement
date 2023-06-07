import { useEffect } from './reactive'

interface IWatchOptions {
  immediate?: boolean // 立即执行
  flush?: 'sync' | 'post' // 回调的执行时机：sync同步执行，post把回调放到一个微任务队列
}
type Callback = (newVal: any, oldValue: any, onInvalidate: (fn: Function) => void) => void;
/**
 * watch
 * @param source 可以是getter，也可以是响应式对象
 * @param callback 用户自定义的处理函数
 */
function useWatch(source: Function | Object, callback: Callback, options: IWatchOptions = {}) {
  let oldValue: any, newValue
  // 用户注册的过期回调
  let cleanupFn: Function | undefined
  const invalidate = (fn: Function) => {
    cleanupFn = fn
  }
  const job = () => {
    newValue = effectFn()
    if (cleanupFn) cleanupFn()
    // 当依赖发生变化时，调用callback
    callback(newValue, oldValue, invalidate)
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
    scheduler: () => {
      if (options.flush === 'post') {
        postFlush(job)
      } else {
        job()
      }
    }
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

let isFlushing = false
function postFlush(job: Function) {
  if (isFlushing) return
  isFlushing = true
  Promise.resolve().then(() => {
    job()
  }).finally(() => {
    isFlushing = false
  })
}

export default useWatch