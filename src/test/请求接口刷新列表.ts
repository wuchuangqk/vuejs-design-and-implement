import { render } from '../render/render'
import { useReactive, useEffect } from '../reactive/reactive'

const root = document.getElementById('app') as HTMLElement
const obj = useReactive({
  list: [] as IVnode[]
})

useEffect(() => {
  const template = {
    type: 'div',
    children: [
      {
        type: 'ul',
        children: obj.list
      },
      {
        type: 'button',
        props: {
          onClick() {
            test(1)
          }
        },
        children: '首页',
      },
      {
        type: 'button',
        props: {
          onClick() {
            test(2)
          }
        },
        children: '末页',
      },
    ]
  }
  render(template, root)
})

function test(type: number) {
  const url = type === 1 ? 'data1' : 'data2'
  fetch('http://localhost:4090/' + url).then(async (res) => {
    const data = await res.json()
    obj.list = data.map((val: any) => {
      return {
        type: 'li',
        children: val.label
      }
    })
  })
}