import { useReactive, useEffect } from './reactive'

const data = ref({ foo: 1 })
const options1 = {
  scheduler(fn: Function) {
    setTimeout(() => {
      fn()
    }, 2000);
  }
}
const jobQueue = new Set<Function>()
let isFlushing = false
function startJob() {
  if (isFlushing) return
  isFlushing = true
  Promise.resolve().then(() => {
    jobQueue.forEach(job => job())
  }).finally(() => {
    isFlushing = false
  })
}
const options2 = {
  scheduler(fn: Function) {
    jobQueue.add(fn)
    startJob()
  }
}

useEffect(() => {
  console.log(data.foo);
}, options2)
data.foo++
data.foo++
data.foo++
data.foo++
data.foo++
console.log('结束了');