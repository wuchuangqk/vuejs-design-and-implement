import { useReactive, useEffect } from '../reactive/reactive'
import { useWatch } from '../reactive'

const btn = document.querySelector('#btn')
const btn2 = document.querySelector('#btn2')
const app = document.querySelector('#app') as HTMLElement
const stu = useReactive({ firstName: '张', lastName: '三' })

// useEffect(function effect() {
//   app.innerHTML = `我的名字是${name.value}`
// })
btn?.addEventListener('click', () => {
  stu.lastName = '四'
  stu.firstName = '王'
})
useWatch(stu, () => {
  console.log('进行了网络请求');
  app.innerHTML = `${stu.firstName}${stu.lastName}`
}, {flush: 'sync'})
