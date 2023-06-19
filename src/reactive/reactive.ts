export const TriggerType = {
  SET: 'SET', // 改变属性的值
  ADD: 'ADD', // 添加新属性
  DELETE: 'DELETE', // 删除属性
}
const KEYS = {
  ARRAY_LENGTH: 'length'
}
// 用一个全局变量存储被注册的副作用函数
let activeFnWrap: IFnWrap | any
/**
 * 副作用栈，用以修正在嵌套副作用函数下，activeFnWrap只会指向最内层副作用函数的问题
 * 当一个副作用函数执行时，将其推入栈顶
 * 副作用函数执行完毕后，将其从栈顶弹出
 * a 
 *  - b
 *    - c
 *  - b
 * a
 * 这样，activeFnWrap总是能正确的指向当前执行的副作用函数
 */
const effectStack: IFnWrap[] = []
/**
 * 注册副作用函数
 * 告诉我副作用函数是哪个，我才能知道在变量被修改时去触发哪个副作用函数
 * @param fn 用户传入的副作用函数
 * @param options 额外选项（包含调度器等）
 * @returns 
 */
export function useEffect(fn: Function, options: IOptions = {}) {
  /**
   * 创建一个增强版的副作用函数，来实现额外的需求
   * @returns 原始副作用函数的返回值
   */
  function enhancedEffectFn() {
    // 把副作用函数和所有与之关联的字段解除绑定关系，避免产生遗留的依赖（即字段不再与副作用函数有实际意义的关联作用了）
    // 同理，每次执行副作用函数，都会重新为字段收集和建立依赖关系
    cleanupDeps(enhancedEffectFn)
    // 将这个副作用函数标识为当前活跃的副作用函数
    activeFnWrap = enhancedEffectFn
    // 推入栈底
    effectStack.push(enhancedEffectFn)
    // 执行原始副作用函数，获取返回值（依赖收集在这一步）
    const result = fn()
    // 执行完毕后，从栈底弹出
    effectStack.pop()
    // 获取栈底的元素，当栈为空时，length - 1获取到的是undefined，也就是说没有正在执行的fnWrap
    activeFnWrap = effectStack[effectStack.length - 1]
    return result
  }
  // 添加depSets属性，用以记录包含这个增强版副作用函数的集合有哪些
  enhancedEffectFn.depSets = [] as any
  // 添加用户自定义选项
  enhancedEffectFn.options = options

  // 默认立即执行用户的副作用函数
  // 通过添加lazy选项，可以让用户手动控制副作用函数执行的时机
  if (!options.lazy) {
    enhancedEffectFn()
  }

  // 将包装后的副作用函数返回给用户
  // 以让用户自己决定何时来调用
  return enhancedEffectFn
}

/**
 * 依赖图谱(树形结构)
 * target 对象
 *  - field 字段
 *    - effectFn 与字段有关联的副作用函数（在副作用函数里读取了这个字段，当改变字段的值时，也应当触发这个副作用函数）
 * 
 * 键：对象
 * 值：Map
 *  - 键：字段名称
 *  - 值：副作用函数集合（如果有多个副作用函数都读取这个字段，触发的时候，也应当触发多个副作用函数。所以数据类型上选择用Set来存储，保证唯一不重复。）
 * 
 * WeakMap对比Map，当key是对象时：
 *  - 即使对象已不再使用，Map仍保留对象的引用，所以垃圾回收器无法回收这个对象
 *  - 而WeakMap是弱引用，不会一直保留对象的引用，垃圾回收器能及时清理掉这个对象
 */
const depsMap = new WeakMap<Object, Map<string | symbol, Set<IFnWrap>>>()
const ITERATE_KEY = Symbol()
const proxyObjectMap = new WeakMap<Object, Object>()

/**
 * 在对象的属性与副作用函数之间建立映射关系
 * 即，当该属性触发读取操作时，将当前激活的副作用与这个字段建立联系
 * @param target 对象
 * @param p 属性
 */
export function track(target: Object, p: string | symbol) {
  if (!activeFnWrap) return

  // 读取这个对象的依赖图谱
  let targetMap: Map<string | symbol, Set<Function>> | undefined = depsMap.get(target)
  // 如果未建立依赖图谱，则进行初始化
  if (typeof (targetMap) === 'undefined') {
    targetMap = new Map<string | symbol, Set<Function>>()
    depsMap.set(target, targetMap)
  }

  // 从对象的依赖图谱里，读取这个字段关联的副作用函数集合
  let effectFnSet: Set<Function> | undefined = targetMap.get(p)
  // 如果未关联任何副作用函数集合，则进行初始化
  if (typeof (effectFnSet) === 'undefined') {
    effectFnSet = new Set<Function>()
    targetMap.set(p, effectFnSet)
  }

  // 把当前记录的副作用函数，添加到这个字段关联的副作用函数集合里。
  effectFnSet.add(activeFnWrap)
  // 同时，副作用函数也要记录下，它被收集到哪些集合里（哪些集合里包含这个副作用函数）
  // 以便于后续做清理工作里，将这个副作用函数从关联的集合里删除。
  activeFnWrap.depSets.push(effectFnSet)
}
/**
 * 触发与字段建立关联的所有副作用函数
 * @param target 被代理的对象
 * @param p 被更改的属性
 * @param triggerType 是添加新属性还是修改已有的属性
 */
export function trigger(target: Object, p: string, triggerType: string, newValue?: any) {
  const targetMap = depsMap.get(target)
  // 如果这个对象没有建立依赖图谱，就不执行任何操作
  if (typeof (targetMap) === 'undefined') return

  let effectFnList: IFnWrap[] = []
  let effectFnSet: Set<IFnWrap> | undefined
  // 从targetMap里取出这个字段的依赖集合
  effectFnSet = targetMap.get(p)
  if (effectFnSet) {
    effectFnList = effectFnList.concat(Array.from(effectFnSet))
  }
  // 处理数组
  if (Array.isArray(target)) {
    // 触发与length相关的副作用函数
    if (p === KEYS.ARRAY_LENGTH && typeof newValue !== 'undefined') {
      // 对于索引大于或等于新的 length 值的元素，
      // 需要把所有相关联的副作用函数取出并添加到 effectFnList 中待执行
      targetMap.forEach((val: Set<IFnWrap>, key) => {
        if (typeof key === 'string' && Number(key) >= newValue) {
          effectFnList = effectFnList.concat(Array.from(val))
        }
      })
    }
  } else {
    // 处理对象
    // 添加删除对应for in
    if (triggerType === TriggerType.ADD || triggerType === TriggerType.DELETE) {
      // 取出ITERATE_KEY的依赖集合
      effectFnSet = targetMap.get(ITERATE_KEY)
      if (effectFnSet) {
        effectFnList = effectFnList.concat(Array.from(effectFnSet) as IFnWrap[])
      }
    }
  }

  effectFnList.forEach((effectFn: IFnWrap) => {
    // 如果该副作用函数与当前正在执行的副作用函数相同，则不执行
    // 避免无限执行，造成死循环
    if (effectFn !== activeFnWrap) {
      // 用户自定义调度器
      if (effectFn.options.scheduler) {
        effectFn.options.scheduler(effectFn)
      } else {
        // 直接执行
        effectFn()
      }
    }
  })
}

/**
 * 从包含这个副作用函数的每个集合里，移除自身
 * 换句话说，取消了和任何字段的绑定
 * @param fnWrap 
 */
function cleanupDeps(fnWrap: any) {
  fnWrap.depSets.forEach((enhancedEffectFn: any) => {
    enhancedEffectFn.delete(fnWrap)
  })
  // 由于已经没有包含这个副作用函数的集合了，所以要进行清零操作
  fnWrap.depSets.length = 0
}

/**
 * 为对象设置一层代理，在读取和设置对象的每个属性时，添加额外的处理逻辑
 * Reflect用来修正this指向
 * @param obj 
 * @param isShallow 是否浅层次遍历，默认深层次遍历每一个属性
 * @param isReadonly 是否只读
 * @returns 被代理后的对象（非原对象）
 */
function createReactive<T extends object>(obj: T, isShallow: boolean = false, isReadonly: boolean = false): T {
  // 做一步优化，如果已经为obj创建的代理对象，则不再创建
  let proxyObject = proxyObjectMap.get(obj) as T
  if (proxyObject) return proxyObject
  proxyObject = new Proxy(obj, {
    /**
     * 拦截读取操作
     * 收集依赖
     * @param target 被代理的对象
     * @param p 属性(字段)名称
     * @param receiver 
     * @returns 
     */
    get(target: any, p: string, receiver: any) {
      // 自定义属性_raw，当访问这个属性时，返回原始对象
      if (p === '_raw') {
        return target
      }
      // 追踪(收集)依赖
      // 只读对象，无需追踪依赖
      // 书中提到：不应该在副作用函数与 Symbol.iterator 这类symbol 值之间建立响应联系
      if (!isReadonly && typeof p !== 'symbol') {
        track(target, p)
      }
      const result = Reflect.get(target, p, receiver)

      // 浅层级：直接返回结果
      if (isShallow) {
        return result
      }
      // 深层级：如果结果是个对象，递归对结果进行代理操作，使其也具有响应式能力
      if (typeof result === 'object' && result !== null) {
        return isReadonly ? useReadonly(result) : createReactive(result)
      }
      return result
    },
    // 拦截写入操作
    // 当触发修改操作时，会一并触发这个变量关联的副作用函数
    set(target, p: string, newValue, receiver) {
      if (isReadonly) {
        console.warn(`${p}是只读属性`);
        return true
      }
      const oldValue = target[p]
      // 判断是添加新属性还是修改已有的属性
      let triggerType = ''
      // 处理数组
      if (Array.isArray(target)) {
        // 设置的索引小于数组长度视为赋值操作，大于数组长度视为新增操作
        if (p === KEYS.ARRAY_LENGTH) {
          triggerType = TriggerType.SET
        } else {
          triggerType = Number(p) < target.length ? TriggerType.SET : TriggerType.ADD
        }
      } else {
        // 处理对象
        triggerType = Object.prototype.hasOwnProperty.call(target, p) ? TriggerType.SET : TriggerType.ADD
      }
      const result = Reflect.set(target, p, newValue, receiver)
      // 只有当receiver是target的代理对象时，才触发依赖
      if (target === receiver._raw) {
        // 只有赋新值才触发依赖
        if (triggerType === TriggerType.SET) {
          // 处理NaN(两个NaN是不相等的)
          if (newValue !== oldValue && (newValue === newValue || oldValue === oldValue)) {
            trigger(target, p, triggerType, newValue)
          }
        } else {
          trigger(target, p, triggerType, newValue)
        }
      }
      return result
    },
    // 拦截has访问器，用于 in 操作符，如 'age' in people
    has(target, p: string) {
      track(target, p)
      return Reflect.has(target, p)
    },
    // 拦截for in
    ownKeys(target) {
      // 对于数组的话，直接用length
      if (Array.isArray(target)) {
        track(target, KEYS.ARRAY_LENGTH)
      } else {
        // for in里获取不到具体操作的是哪个属性，所以只能用一个唯一key来作为属性
        track(target, ITERATE_KEY)
      }
      return Reflect.ownKeys(target)
    },
    // 拦截删除操作
    deleteProperty(target, p: string) {
      if (isReadonly) {
        console.warn(`${p}是只读属性`);
        return true
      }
      // 检查对象里有没有这个属性
      const hasKey = Object.prototype.hasOwnProperty.call(target, p)
      // 是否删除成功
      const result = Reflect.deleteProperty(target, p)
      // 当属性从对象中被删除时，也要触发相应的副作用函数
      if (hasKey && result) {
        trigger(target, p, TriggerType.DELETE, null)
      }
      return result
    },
  })
  return proxyObject
}
/**
 * 深层次遍历对象，为每个属性设置监听事件
 * @param obj 
 * @returns 
 */
export function useReactive<T extends object>(obj: T): T {
  return createReactive(obj)
}
/**
 * 浅层次遍历对象，只为第一层属性设置监听事件
 * @param obj 
 * @returns 
 */
export function useShallowReactive<T extends object>(obj: T): T {
  return createReactive(obj, true)
}

export function useReadonly<T extends object>(obj: T): T {
  return createReactive(obj, false, true)
}
export function useShallowReadonly<T extends object>(obj: T): T {
  return createReactive(obj, true, true)
}

export function useRef(val: any) {
  const wrapper = {
    value: val
  }
  // 定义一个不可枚举的私有属性，来标识这是原始值
  // 而非一个对象 reactive({ value: 1 })
  // 用来自动脱ref
  Object.defineProperty(wrapper, '_ref', {
    value: true
  })
  return useReactive(wrapper)
}

export function useToRef(obj: any, key: any) {
  const wrapper = {
    get value() {
      return obj[key]
    },
    set value(val) {
      obj[key] = val
    }
  }
  Object.defineProperty(wrapper, '_ref', {
    value: true
  })
  return wrapper
}
export function useToRefs(obj: any) {
  const ret: any = {}
  // 使用 for...in 循环遍历对象
  for (const key in obj) {
    // 逐个调用 toRef 完成转换
    ret[key] = useToRef(obj, key)
  }
  return ret
}

window.depsMap = depsMap