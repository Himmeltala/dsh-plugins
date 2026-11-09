/*
 * @Author: Himmeltala
 * @Date: 2026-11-08 23:12:00
 * @LastEditors: Himmeltala
 * @LastEditTime: 2026-11-08 23:20:00
 * @FilePath: \plugins\output-guarding\lib\guard.js
 * @Description: 在写文件与 shell 调用前拦下落到配置目录之外的交付物和临时脚本。
 */
import { isAbsolute, resolve, sep } from 'node:path'

/** 能直接写文件的工具，参数里带目标路径。 */
const FILE_TOOLS = new Set(['write', 'edit'])
/** shell 工具，命令行里可能用重定向或 cmdlet 落盘。 */
const SHELL_TOOLS = new Set(['bash', 'pwsh'])

/** 重定向目标：`> a.md`、`>> "a b.md"`、`2> a.log`。 */
const REDIRECT = /(?:^|[\s;&|(])\d?>>?\s*("[^"]*"|'[^']*'|[^\s;&|()]+)/g
/** `tee [-a] path`。 */
const TEE = /(?:^|[\s;&|(])tee\s+(?:-[a-zA-Z]+\s+)*("[^"]*"|'[^']*'|[^\s;&|()]+)/g
/** PowerShell 的落盘 cmdlet 及其参数段。 */
const PS_WRITE = /\b(?:Out-File|Set-Content|Add-Content|Tee-Object)\b([^;&|]*)/gi
/** 参数段里的一个词，带引号的整段算一个。 */
const TOKEN = /"[^"]*"|'[^']*'|[^\s]+/g

/** 这些目标不是真实文件。 */
const IGNORED_TARGETS = new Set(['/dev/null', '$null', 'nul', 'null', '-'])

function normalize(value) {
  const text = value.replace(/\//g, sep)
  return process.platform === 'win32' ? text.toLowerCase() : text
}

function inside(target, root) {
  const path = normalize(target)
  const base = normalize(root).replace(/[\\/]+$/, '')
  return path === base || path.startsWith(base + sep)
}

function stripQuotes(value) {
  const text = value.trim()
  if (text.length >= 2 && ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")))) {
    return text.slice(1, -1)
  }
  return text
}

function extension(file) {
  const base = file.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? ''
  const dot = base.lastIndexOf('.')
  return dot <= 0 ? '' : base.slice(dot).toLowerCase()
}

/**
 * 命令行里出现的、可能被写出来的文件路径。只做保守识别：认不出的不拦，误拦比漏拦更坏。
 * @param command - 命令行原文。
 * @returns 去重后的目标路径，可能含相对路径。
 */
export function shellTargets(command) {
  const found = new Set()
  const collect = (raw) => {
    const value = stripQuotes(raw ?? '')
    if (value === '' || value.startsWith('-') || value.startsWith('>') || value.startsWith('&')) return
    if (IGNORED_TARGETS.has(value.toLowerCase())) return
    // 带变量、通配符的展开在运行时才知道，判定不了就放行
    if (/[$*?]/.test(value)) return
    found.add(value)
  }

  for (const match of command.matchAll(REDIRECT)) collect(match[1])
  for (const match of command.matchAll(TEE)) collect(match[1])
  for (const match of command.matchAll(PS_WRITE)) {
    const tokens = match[1].match(TOKEN) ?? []
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i]
      // -Value / -Encoding 后面的是内容，不是路径
      if (token === '-Value' || token === '-Encoding' || token === '-InputObject') {
        i += 1
        continue
      }
      collect(token)
    }
  }
  return [...found]
}

/**
 * 判断一个目标该不该拦。
 * @param target - 绝对路径。
 * @param settings - 当前配置。
 * @returns 违规说明；合规或无需管时返回 undefined。
 */
export function violation(target, settings) {
  const ext = extension(target)
  if (ext === '') return undefined

  const deliverable = settings.deliverableExtensions.includes(ext)
  const script = settings.scriptExtensions.includes(ext)
  if (!deliverable && !script) return undefined

  const roots = [...settings.extraRoots]
  if (deliverable) roots.push(settings.deliverablesRoot)
  if (script) roots.push(settings.scriptsRoot)
  if (roots.some(root => inside(target, root))) return undefined

  const home = deliverable ? settings.deliverablesRoot : settings.scriptsRoot
  const kind = deliverable ? '交付物' : '临时脚本'
  return `${target} 是${kind}（${ext} 结尾），落在允许的目录之外。${kind}写到 ${home} 下，工作副本里只放源码；确实要写到别处，把那个根目录加进 extraRoots。`
}

function workingDirectory(ctx, exec) {
  try {
    const service = ctx.get('workingDirectory')
    const session = exec.agent?.session
    if (service !== undefined && session !== undefined) return service.get(session)
  } catch {
    // 服务不可用时退回进程目录，守卫本身不能因此堵住调用。
  }
  return process.cwd()
}

function absolute(ctx, exec, target) {
  const workdir = exec.arguments?.workdir
  const base = typeof workdir === 'string' && workdir !== '' ? resolve(workingDirectory(ctx, exec), workdir) : workingDirectory(ctx, exec)
  return isAbsolute(target) ? target : resolve(base, target)
}

/**
 * 挂上落盘守卫。每次调用都读一遍配置，改配置不用重启。
 * @param ctx - the plugin context.
 * @param settings - 返回当前配置的函数。
 */
export function registerGuard(ctx, settings) {
  ctx.on('tools/pre-execute', async (exec, next) => {
    if (!FILE_TOOLS.has(exec.name) && !SHELL_TOOLS.has(exec.name)) return next()

    const current = settings()
    if (current.mode !== 'block') return next()

    const targets = []
    if (FILE_TOOLS.has(exec.name)) {
      const path = exec.arguments?.file_path ?? exec.arguments?.path
      if (typeof path !== 'string' || path.trim() === '') return next()
      targets.push(path)
    } else {
      const command = exec.arguments?.command
      if (typeof command !== 'string' || command.trim() === '') return next()
      targets.push(...shellTargets(command))
    }

    for (const target of targets) {
      const problem = violation(absolute(ctx, exec, target), current)
      if (problem !== undefined) return { kind: 'deny', reason: problem }
    }
    return next()
  })
}
