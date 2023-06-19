import { useEffect, useRef } from '../reactive'
import { render, NODE_TYPE } from '../render/render'


const TodoList: IComponet = {
  data() {
    return {
      list: [],
      text: '',
    }
  },
  render() {
    const that = this as any
    return {
      type: NODE_TYPE.Fragment,
      children: [
        {
          type: 'ul',
          children: that.list.map((val: string) => {
            return {
              type: 'li',
              children: val
            }
          })
        },
        {
          type: 'input',
          children: '',
          props: {
            onBlur(e: any) {
              that.text = e.target.value
            }
          }
        },
        {
          type: 'button',
          children: '添加',
          props: {
            onClick() {
              // debugger
              // that.list.push(this.text)
              that.list = ['222']
            }
          }
        }
      ]
    }
  },
}

const root = document.querySelector('#app') as HTMLElement

render({
  type: TodoList,
  children: []
}, root)
