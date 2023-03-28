import { useEffect, useReactive } from './reactive'
let oldValue: any, newValue
function watch(source: any, callback: Function) {
  // 注册副作用函数并立即执行
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

const obj = ref({ name: '张三', age: 14 })
watch(obj, () => {
  console.log('调用callback', obj)
})

setTimeout(() => {
  obj.name = '李四'
}, 3000);
setTimeout(() => {
  obj.age = 16
}, 4000);