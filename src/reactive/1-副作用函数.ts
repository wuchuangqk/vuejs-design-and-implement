/* 副作用函数 */
let activeFn: Function
function useEffect(fn: Function) {
  activeFn = fn
  fn()
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
}
// 触发依赖
function trigger(target: Object, p: string) {
  const targetMap = depsMap.get(target)
  if (typeof (targetMap) !== 'undefined') {
    const fnSets = targetMap.get(p)
    fnSets && fnSets.forEach(fn => fn())
  }
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

/* 计算属性 */
function computed(fn: Function) {
  activeFn = fn
  fn()
}

const userNameSpan = document.getElementById('username') as HTMLElement
const genderSpan = document.getElementById('gender') as HTMLElement
const user = ref({
  name: '张三',
  gender: 'boy'
})

useEffect(() => {
  console.log(1)
  userNameSpan.innerHTML = user.name
})
useEffect(() => {
  console.log(2)
  genderSpan.innerHTML = user.name
})

computed(() => {
  console.log(3)
  userNameSpan.innerHTML = user.name + user.gender
})

function changeUserName() {
  user.name = '李四'
}
function changeGender() {
  user.gender = 'girl'
}

export {}