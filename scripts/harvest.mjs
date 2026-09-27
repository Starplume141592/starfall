// 把网页版 AI 产出的代码块落盘：读取 Playwright MCP 导出的 JSON，按块首行 `// src/xxx.ts` 写文件。
// 用法: node scripts/harvest.mjs <json文件或目录>...
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const PATH_RE = /^(?:\/\/|\/\*)\s*((?:(?:src|scripts)\/[\w./-]+\.(?:ts|js|mjs|css))|index\.html)\s*(?:\*\/)?\s*$/

const files = []
for (const arg of process.argv.slice(2)) {
  if (statSync(arg).isDirectory()) {
    for (const f of readdirSync(arg)) if (f.endsWith('.json')) files.push(join(arg, f))
  } else {
    files.push(arg)
  }
}

let written = 0
{
  for (const f of files) {
    // MCP 导出的文件是 JSON 字符串里再套一层 JSON，故解析两次
    const data = JSON.parse(JSON.parse(readFileSync(f, 'utf8')))
    for (const block of data.blocks ?? []) {
      const first = block.split('\n')[0].trim()
      const m = PATH_RE.exec(first)
      if (!m) continue
      const out = resolve(process.cwd(), m[1])
      mkdirSync(dirname(out), { recursive: true })
      writeFileSync(out, block.slice(block.indexOf('\n') + 1).trimEnd() + '\n', 'utf8')
      console.log(`[${f.split(/[\\/]/).pop()}] -> ${m[1]} (${block.length} chars)`)
      written++
    }
  }
}
console.log(written ? `harvested ${written} file(s)` : 'nothing matched (expected blocks starting with // src/...)')
