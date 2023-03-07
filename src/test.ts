import { render } from './render/render.js'
import { useReactive, useEffect } from './reactive/reactive.js'

const root = document.getElementById('app') as IContainer
const obj = useReactive({
  list: [] as IVnode[]
})

function fetchData() {
  const newVnode = {
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
  render(newVnode, root)
}
useEffect(fetchData)

function test(type: number) {
  let newsList: string[] = []
  if (type === 1) {
    console.log('1')
    newsList = [
      '政协委员何超琼：我是大湾区人热',
      '秦刚：美要中国打不还手我们办不到热',
      '美国波士顿两架客机发生碰撞',
      '朝称如美拦截朝武器则视为宣战',
    ]
  } else {
    newsList = [
      '父母不给买鞋28岁女儿瞬间崩溃',
      '95后女生去百所学校大方谈月经',
      '家长谈养娃压力：躺不起卷不动',
      '女子抹护手霜摸UGG靴子被要求买下',
    ]
  }
  obj.list = newsList.map(str => {
    return {
      type: 'li',
      children: str
    }
  })
}