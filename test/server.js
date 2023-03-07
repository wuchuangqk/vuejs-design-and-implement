const http = require('http')
const fs = require('fs')
const server = http.createServer((req, res) => {
  console.log(`${new Date().toLocaleString()} ${req.socket.remoteAddress}: ${req.url}`)
  if (req.url === '/') {
    const content = fs.readFileSync('../src/index.html')
    res.setHeader('Content-Type', 'text/html;charset=utf-8')
    res.end(content)
  } else if (/^\/dist/.test(req.url)) {
    const content = fs.readFileSync(`..${req.url}`)
    res.setHeader('Content-Type', 'application/javascript;charset=utf-8')
    res.end(content)
  } else if (req.url === '/favicon.png') {
    const img = fs.readFileSync('../src/favicon.png')
    res.setHeader('Content-Type', 'image/png')
    res.end(img, 'binary')
  } else {
    res.end('unknow')
  }
})
server.listen(6060, () => {
  console.log('6060 ok')
})
