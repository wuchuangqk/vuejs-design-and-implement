import { useEffect, useReactive as vueRef } from './reactive'

const obj = vueRef({ a: 1, b: 2 })
// const value = ref('')
const result = computed(() => {
  console.log('执行了');

  return obj.a + obj.b
})
function calc() {
  // value.value = result.value
}
interface IComputed {
  value: any
}
function computed(getter: Function): IComputed {
  // 缓存上次计算的值
  let cache: any
  // 只有发生改变时才再次计算
  let isChange = true
  const effect = useEffect(getter, {
    lazy: true,
    scheduler() {
      // 当getter被执行时，意味着发生了改变
      isChange = true
    }
  })
  const obj = {
    get value() {
      if (isChange) {
        cache = effect()
        isChange = false
      }
      return cache
    }
  }
  return obj
}