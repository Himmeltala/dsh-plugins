/*
 * @Author: Himmeltala
 * @Date: 2026-11-09 13:30:00
 * @LastEditors: Himmeltala
 * @LastEditTime: 2026-11-09 13:30:00
 * @FilePath: \plugins\access-log\scripts\build-client.mjs
 * @Description: 把 client-entry.js 与它依赖的 client-core.js、client-styles.js 内联成单个
 *   lib/client.js。DSH 的模块加载器每个包只交一个 client.js，相对 require 运行时没有模块表，
 *   必须在构建时并进去。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const LIB = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib')
const read = (name) => readFileSync(join(LIB, name), 'utf8')

/**
 * 把一个 ESM 模块源码转成「返回导出对象」的 IIFE，供入口里的 require 占位替换。
 * @param source - 模块原文。
 * @param file - 文件名，供报错使用。
 * @returns 可直接嵌入的表达式文本。
 */
function inlineModule(source, file) {
  const names = []
  let hasDefault = false
  const body = source
    .split(/\r?\n/)
    .map((line) => {
      const def = /^export default (.*)$/.exec(line)
      if (def !== null) {
        hasDefault = true
        return `const __default = ${def[1]}`
      }
      const named = /^export (?:async )?(function|const|let|class) ([A-Za-z0-9_$]+)/.exec(line)
      if (named !== null) {
        names.push(named[2])
        return line.replace(/^export /, '')
      }
      const list = /^export \{ ?([^}]*) ?\}$/.exec(line)
      if (list !== null) {
        for (const item of list[1].split(',')) {
          const name = item.trim()
          if (name !== '') names.push(name)
        }
        return ''
      }
      if (/^export /.test(line)) throw new Error(`${file}: 不支持的导出形式: ${line.trim()}`)
      return line
    })
    .join('\n')
  const fields = [...names, ...(hasDefault ? ['__default'] : [])].join(', ')
  return `(() => {\n${body}\nreturn { ${fields} }\n})()`
}

const entry = read('client-entry.js')
const core = inlineModule(read('client-core.js'), 'client-core.js')
const styles = inlineModule(read('client-styles.js'), 'client-styles.js')

let output = entry
  .replace("require('./client-core.js')", core)
  .replace("require('./client-styles.js')", styles)

if (output.includes('require(\'./')) {
  throw new Error('client-entry.js 仍残留相对 require，构建拒绝产出')
}

output = `/* 由 scripts/build-client.mjs 生成，勿直接编辑；改 client-entry.js、client-core.js 或 client-styles.js 后重新构建。 */\n${output}`
writeFileSync(join(LIB, 'client.js'), output)
console.log(`client.js 已生成：${output.length} 字节，无相对依赖`)
