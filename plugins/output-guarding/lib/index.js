/*
 * @Author: Himmeltala
 * @Date: 2026-11-08 23:10:00
 * @LastEditors: Himmeltala
 * @LastEditTime: 2026-11-08 23:10:00
 * @FilePath: \plugins\output-guarding\lib\index.js
 * @Description: 把插件内的技能目录注册为 DSH 技能来源，并挂上产出物与临时脚本的落盘守卫。
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerGuard } from './guard.js'

// 插件的 Config 用 schemastery 声明，由 DSH 解析到自己的副本；仓库里的校验脚本直接跑 node，
// 解析不到 @deepseek-ai/*，这时退化成没有 schema，插件照样能加载与校验。
let schema
try {
  schema = (await import('@deepseek-ai/schemastery')).default
} catch {
  schema = undefined
}

const PROVIDER = '@Himmeltala/dsh-output-guarding'
const SKILLS = fileURLToPath(new URL('../skills/', import.meta.url))
const RANK = 600
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** 默认的交付物扩展名。文档类 .md 不在内：仓库里到处是 README，一律拦会把正常改文件堵死。 */
export const DELIVERABLE_EXTENSIONS = ['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.pdf', '.csv', '.png', '.jpg', '.jpeg', '.svg']

/** 默认的临时脚本扩展名。.js/.mjs 不在内：那是项目源码，不是排查用的一次性脚本。 */
export const SCRIPT_EXTENSIONS = ['.ps1', '.psm1', '.sh', '.py', '.sql', '.bat', '.cmd']

/** 交付物与脚本的默认落点，按全局约定。 */
export const DEFAULT_DELIVERABLES_ROOT = 'D:/Media Files/个人/TEMP/docs'
export const DEFAULT_SCRIPTS_ROOT = 'D:/Media Files/个人/TEMP/scripts'

export const Config = schema === undefined ? undefined : schema.object({
  deliverablesRoot: schema.string().default(DEFAULT_DELIVERABLES_ROOT)
    .description('交付物根目录，所有 docx、xlsx、pptx、pdf 这类产出文件必须落在它下面')
    .volatile(),
  scriptsRoot: schema.string().default(DEFAULT_SCRIPTS_ROOT)
    .description('临时脚本根目录，ps1、sh、py、sql 这类排查脚本必须落在它下面')
    .volatile(),
  extraRoots: schema.array(schema.string()).default([])
    .description('额外放行的根目录，工作副本等确实需要写脚本或产出物的位置写在这里')
    .volatile(),
  deliverableExtensions: schema.array(schema.string()).default(DELIVERABLE_EXTENSIONS)
    .description('按交付物管的扩展名，小写、带点')
    .volatile(),
  scriptExtensions: schema.array(schema.string()).default(SCRIPT_EXTENSIONS)
    .description('按临时脚本管的扩展名，小写、带点')
    .volatile(),
  mode: schema.union(['block', 'off']).default('block')
    .description('block 拦下越界写入，off 只保留技能说明、不做拦截')
    .volatile(),
})

function splitFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (match === null) return { meta: {}, body: text }
  const meta = {}
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(':')
    if (colon <= 0) continue
    const key = line.slice(0, colon).trim()
    if (key === '' || key.startsWith('#')) continue
    meta[key] = line.slice(colon + 1).trim()
  }
  return { meta, body: text.slice(match[0].length) }
}

function discovered() {
  let entries
  try {
    entries = readdirSync(SKILLS, { withFileTypes: true })
  } catch {
    return []
  }
  const skills = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const dir = join(SKILLS, entry.name)
    let text
    try {
      text = readFileSync(join(dir, 'SKILL.md'), 'utf8')
    } catch {
      continue
    }
    const { meta, body } = splitFrontmatter(text)
    const name = meta.name || entry.name
    if (!SKILL_NAME.test(name) || meta.description === undefined) continue
    skills.push({
      name,
      description: meta.description,
      invocation: {
        modelInvocable: meta['disable-model-invocation'] !== 'true',
        userInvocable: meta['user-invocable'] !== 'false',
      },
      dir,
      body,
    })
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name))
}

function summary(skill) {
  return {
    name: skill.name,
    description: skill.description,
    invocation: skill.invocation,
    provider: PROVIDER,
    source: 'bundled',
    resourceBase: { kind: 'directory', path: skill.dir },
  }
}

/** 读一个配置字段的当前值：volatile 字段是带 get() 的引用，普通字段就是值本身。 */
function plain(value) {
  return value !== null && typeof value === 'object' && typeof value.get === 'function' ? value.get() : value
}

/** 取配置项，缺失时退到默认值。校验脚本直接调 apply 时没有 config，也走这条。 */
function pick(config, key, fallback) {
  if (config === undefined || config === null) return fallback
  const value = plain(config[key])
  return value === undefined ? fallback : value
}

export const name = PROVIDER
export const inject = ['skills']

export function apply(ctx, config = {}) {
  ctx.skills.registerProvider(() => ({
    name: PROVIDER,
    async list() {
      return discovered().map(skill => ({ ...summary(skill), rank: RANK, locator: skill.name }))
    },
    async get(candidate) {
      const skill = discovered().find(item => item.name === candidate.name)
      if (skill === undefined) return undefined
      return { ...summary(skill), content: skill.body }
    },
  }))

  registerGuard(ctx, () => ({
    mode: pick(config, 'mode', 'block'),
    deliverablesRoot: pick(config, 'deliverablesRoot', DEFAULT_DELIVERABLES_ROOT),
    scriptsRoot: pick(config, 'scriptsRoot', DEFAULT_SCRIPTS_ROOT),
    extraRoots: pick(config, 'extraRoots', []),
    deliverableExtensions: pick(config, 'deliverableExtensions', DELIVERABLE_EXTENSIONS),
    scriptExtensions: pick(config, 'scriptExtensions', SCRIPT_EXTENSIONS),
  }))
}
