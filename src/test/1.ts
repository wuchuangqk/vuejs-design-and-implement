import { useReactive, useEffect, useRef } from '../reactive/reactive'
import { useWatch } from '../reactive'

const btn = document.querySelector('#btn')
const btn2 = document.querySelector('#btn2')
const app = document.querySelector('#app') as HTMLElement
const input = document.querySelector('#input') as HTMLInputElement
const stu = useRef('我是学生')

useEffect(function effect() {
  app.innerHTML = stu.value

})
btn?.addEventListener('click', () => {
  stu.value = input.value
})
// useWatch(stu, () => {
//   console.log('进行了网络请求');
//   app.innerHTML = `${stu.firstName}${stu.lastName}`
// }, {flush: 'sync'})
