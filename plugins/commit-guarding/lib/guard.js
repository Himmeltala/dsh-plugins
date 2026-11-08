/*
 * @Author: Himmeltala
 * @Date: 2026-10-29 15:08:00
 * @LastEditors: Himmeltala
 * @LastEditTime: 2026-11-08 22:55:00
 * @FilePath: \plugins\commit-guarding\lib\guard.js
 * @Description: 在 shell 调用前复跑两份提交闸门脚本。
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPTS = ['svn-commit-guard.sh', 'git-commit-guard.sh']
const DIRECTORY = fileURLToPath(new URL('../scripts/', import.meta.url))
const TIMEOUT = 60_000

// DSH 的 shell 工具在 POSIX 上叫 bash，在 Windows 上叫 pwsh；两个名字都要接。
// Claude Code 那边只发 Bash，不受影响。
const SHELL_TOOLS = new Set(['bash', 'pwsh'])

// 闸门脚本是 bash 写的。Windows 上 bash 一般不在 PATH，但装了 Git for Windows
// 就自带一份，所以按「显式配置 → Git 自带 → PATH」的顺序找，找到一份能执行的为止。
// undefined 表示还没找过，null 表示找过但没有。
let bash

function works(candidate) {
  try {
    const result = spawnSync(candidate, ['-c', 'exit 0'], { stdio: 'ignore', timeout: 10_000, windowsHide: true })
    return result.status === 0
  } catch {
    return false
  }
}

// Git for Windows 的 bash 位置：<git>/bin/bash.exe，有的版本只带 <git>/usr/bin/bash.exe。
// <git> 从 `git --exec-path` 的 mingw64/libexec/git-core 往上退三层得到，
// 覆盖装在非默认目录的情况；再从常见环境变量补几处。
function gitBashCandidates() {
  const env = process.env
  const roots = []
  const exec = spawnSync('git', ['--exec-path'], { encoding: 'utf8', windowsHide: true })
  if (exec.status === 0 && typeof exec.stdout === 'string' && exec.stdout.trim() !== '') {
    roots.push(resolve(exec.stdout.trim(), '..', '..', '..'))
  }
  if (env.ProgramFiles) roots.push(join(env.ProgramFiles, 'Git'))
  if (env.ProgramW6432) roots.push(join(env.ProgramW6432, 'Git'))
  if (env.LOCALAPPDATA) roots.push(join(env.LOCALAPPDATA, 'Programs', 'Git'))

  const candidates = []
  for (const root of roots) {
    candidates.push(join(root, 'bin', 'bash.exe'), join(root, 'usr', 'bin', 'bash.exe'))
  }
  return candidates
}

function findBash() {
  if (bash !== undefined) return bash ?? undefined

  const candidates = []
  if (process.env.DSH_GUARD_BASH) candidates.push(process.env.DSH_GUARD_BASH)
  if (process.platform === 'win32') candidates.push(...gitBashCandidates())
  candidates.push('bash')

  for (const candidate of candidates) {
    if (candidate !== 'bash' && !existsSync(candidate)) continue
    if (!works(candidate)) continue
    bash = candidate
    return bash
  }
  // 一份都没有：只能放行。闸门自身出故障时绝不能堵住调用。
  bash = null
  return undefined
}

function run(shell, script, payload) {
  return new Promise((done) => {
    // 脚本默认从标准输入读 JSON，靠 jq 或 python3 解析；Windows 上这两个常常都没有，
    // 所以同时把字段放进环境变量，由 guard-common.sh 优先取，省掉这一步解析。
    // 标准输入照旧写一份 JSON，脚本哪天只认 JSON 也还能用。
    const child = spawn(shell, [join(DIRECTORY, script).replace(/\\/g, '/')], {
      stdio: ['pipe', 'ignore', 'pipe'],
      env: {
        ...process.env,
        DSH_GUARD_TOOL_NAME: payload.tool_name,
        DSH_GUARD_CWD: payload.cwd,
        DSH_GUARD_COMMAND: payload.tool_input.command,
      },
      windowsHide: true,
    })
    const timer = setTimeout(() => child.kill(), TIMEOUT)
    let stderr = ''
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk) => { stderr += chunk })
    // 脚本不读标准输入时写入会触发 EPIPE，忽略即可，不能让它变成未捕获异常。
    child.stdin.on('error', () => {})
    child.on('error', () => { clearTimeout(timer); done({ code: 0, stderr: '' }) })
    child.on('close', (code) => { clearTimeout(timer); done({ code: code ?? 0, stderr }) })
    child.stdin.end(JSON.stringify(payload))
  })
}

function baseDirectory(ctx, exec) {
  try {
    const service = ctx.get('workingDirectory')
    const session = exec.agent?.session
    if (service !== undefined && session !== undefined) return service.get(session)
  } catch {
    // 服务不可用时退回进程目录，闸门本身不能因此堵住调用。
  }
  return process.cwd()
}

function directory(ctx, exec) {
  const workdir = exec.arguments?.workdir
  const base = baseDirectory(ctx, exec)
  if (typeof workdir !== 'string' || workdir === '') return base
  return isAbsolute(workdir) ? workdir : resolve(base, workdir)
}

export function registerGuard(ctx) {
  ctx.on('tools/pre-execute', async (exec, next) => {
    if (!SHELL_TOOLS.has(exec.name)) return next()
    const command = exec.arguments?.command
    if (typeof command !== 'string' || command.trim() === '') return next()

    const shell = findBash()
    if (shell === undefined) return next()

    const payload = {
      session_id: exec.agent?.session?.header?.id ?? '',
      tool_name: exec.name,
      cwd: directory(ctx, exec),
      tool_input: exec.arguments,
    }
    for (const script of SCRIPTS) {
      const result = await run(shell, script, payload)
      if (result.code === 2) {
        return { kind: 'deny', reason: result.stderr.trim() || '提交被提交闸门拦下' }
      }
    }
    return next()
  })
}
