import { useEffect, useReactive } from '../reactive/reactive'

// 注册拦截get set的方法
const obj = useReactive({
  name: '张三',
})

useEffect(() => {
  console.log('回调执行')
  for(const key in obj) {
    console.log(typeof key, key)
    if (key === 'name') {
      obj[key] = '李四'
    }
  }
  // let b = obj.name
  // obj.name = '李四'
})

// @ts-ignore
window.obj = obj