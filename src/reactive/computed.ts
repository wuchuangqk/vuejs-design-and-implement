import { useEffect, track, trigger, TriggerType } from './reactive'

interface IComputed {
  value: any
}
/**
 * 计算属性
 * @param getter 
 * @returns 计算属性函数返回一个设置了getter访问器的对象，当getter访问器触发时，调用原始函数并返回结果
 */
function useComputed(getter: Function): IComputed {
  // 缓存上次计算的值
  let cache: any
  // 标识依赖发生了改变
  let isChange = true
  // 推迟副作用函数的调用时机
  const effectFn = useEffect(getter, {
    lazy: true, // 不立即执行
    scheduler() {
      // 当trigger触发时，不执行原始函数，而是将isChange设置为true
      // 这样，当下次访问计算属性的.value时，就会执行effectFn()
      isChange = true
      // 每次计算属性里的依赖改变时，手动触发绑定的上层副作用函数
      trigger(obj, 'value', TriggerType.SET)
    }
  })
  const obj = {
    get value() {
      // 只有发生改变时才再次计算
      if (isChange) {
        // 执行effect相当于执行传入的getter函数
        // 拿到用户在getter里的返回值
        cache = effectFn()
        isChange = false
        // 将外层的副作用函数与obj.value建立依赖关系
        track(obj, 'value')
      }
      return cache
    }
  }
  return obj
}

export default useComputed