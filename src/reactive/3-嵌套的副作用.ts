/* 副作用函数 */
let activeFn: IFnWrap
const effectStack: IFnWrap[] = []
function useEffect(fn: Function) {
  // 对fn进行包装，让activeFn指向fnWrap
  // 原先指向fn的时候，只能调用fn，包装可以做额外的事
  function fnWrap() {
    cleanup(fnWrap)
    activeFn = fnWrap
    effectStack.push(fnWrap)
    // 正常执行
    fn()
    effectStack.pop()
    if (effectStack.length) {
      activeFn = effectStack[effectStack.length - 1]
    }
  }
  // 给fnWrap添加依赖收集
  fnWrap.depSets = [] as any
  fnWrap.options = [] as IOptions
  // 执行副作用函数
  fnWrap()
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
      Array.from(fnSets).forEach(fn => {
        if (fn !== activeFn) {
          fn()
        }
      })
    }
  }
}
// 从依赖集合里清除当前的依赖
function cleanup(fnWrap: IFnWrap) {
  fnWrap.depSets.forEach(fnSets => {
    fnSets.delete(activeFn)
  })
  fnWrap.depSets.length = 0
}
function ref<T extends object>(obj: T): T {
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

const userNameSpan = document.getElementById('username') as HTMLElement
const user = ref({
  foo: true,
  bar: true
})

// let temp1, temp2
// useEffect(() => {
//   console.log('副作用1执行')
//   useEffect(() => {
//     console.log('副作用2执行')
//     temp2 = user.bar
//   })
//   temp1 = user.foo
// })

const test = ref({ num: 0 })
useEffect(() => {
  test.num++
})