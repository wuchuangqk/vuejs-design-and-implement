import { useEffect, useReactive } from '../reactive/reactive'
import { render } from '../render/render'

const tableData = useReactive([{ name: '张三' }])

useEffect(() => {
  render(
    {
      type: 'div',
      children: [
        {
          type: 'ul',
          children: [
            {
              type: 'li',
              children: `姓名：${tableData[0].name}`
            }
          ]
        },
        {
          type: 'button',
          props: {
            onClick() {
              tableData.push({ name: '李四' })
            }
          },
          children: 'obj1',
        },
      ]
    }, document.getElementById('app') as any)
})
