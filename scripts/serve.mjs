// 极简静态服务器：Demo 是纯静态单文件，不需要打包器，也不需要子进程（避开 esbuild 的 spawn 限制）。
// 用法: node scripts/serve.mjs  (PORT 环境变量可改端口，默认 5173)
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'

const ROOT = process.cwd()
const PORT = Number(process.env.PORT ?? 5173)
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

createServer(async (req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0])
  const rel = normalize(url === '/' ? 'index.html' : url.replace(/^[/\\]+/, ''))
  const file = join(ROOT, rel)
  if (!file.startsWith(ROOT + sep)) {
    res.writeHead(403).end('forbidden')
    return
  }
  try {
    const body = await readFile(file)
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-cache',
    })
    res.end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 ' + rel)
  }
}).listen(PORT, () => console.log(`墨劫 → http://localhost:${PORT}/`))
