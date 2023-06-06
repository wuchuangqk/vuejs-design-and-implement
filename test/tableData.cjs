const http = require('http')

const data1 = [
  '政协委员何超琼：我是大湾区人热',
  '秦刚：美要中国打不还手我们办不到热',
  '美国波士顿两架客机发生碰撞',
  '朝称如美拦截朝武器则视为宣战',
]
const data2 = [
  '父母不给买鞋28岁女儿瞬间崩溃',
  '95后女生去百所学校大方谈月经',
  '家长谈养娃压力：躺不起卷不动',
  '女子抹护手霜摸UGG靴子被要求买下',
]

const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json;charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.writeHead(200, 'ok')
  if (req.url === '/data1') {
    res.end(JSON.stringify(data1.map(str => {
      return { label: str }
    })))
  } else if (req.url === '/data2') {
    res.end(JSON.stringify(data2.map(str => {
      return { label: str }
    })))
  } else {
    res.end('ok')
  }
})

server.listen(4090, () => {
  console.log('server is running at port: 4090')
})