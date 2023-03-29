import { useEffect, useReactive, useShallowReactive } from '../reactive/reactive'
import { render } from '../render/render'

const obj1 = useReactive({ child: { name: 1 } })
const obj2 = useShallowReactive({ child: { name: 1 } })

useEffect(() => {
  console.log('执行了', obj1.child.name)
  console.log('执行了', obj2.child.name)
})

render(
  {
    type: 'div',
    children: [
      {
        type: 'button',
        props: {
          onClick() {
            obj1.child.name = 2
          }
        },
        children: 'obj1',
      },
      {
        type: 'button',
        props: {
          onClick() {
            obj2.child.name = 2
          }
        },
        children: 'obj2',
      }
    ]
  }, document.getElementById('app') as any)