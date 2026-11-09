/*
 * @Author: Himmeltala
 * @Date: 2026-11-06 16:00:00
 * @LastEditors: Himmeltala
 * @LastEditTime: 2026-11-06 16:00:00
 * @FilePath: \scripts\check-plugins.mjs
 * @Description: 校验三个插件的 DSH 打包：包名、dsh.bundle、技能可列出、闸门可拦可放。
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
let failures = 0

function check(condition, message) {
  if (condition) {
    console.log(`ok   ${message}`)
  } else {
    failures += 1
    console.log(`FAIL ${message}`)
  }
}

function fakeContext(provider, listener) {
  return {
    skills: { registerProvider: (factory) => { provider.value = factory() } },
    on: (event, handler) => { if (event === 'tools/pre-execute') listener.value = handler },
    get: (name) => name === 'workingDirectory' ? { get: () => ROOT } : undefined,
  }
}

async function runPlugin(plugin) {
  const dir = join(ROOT, 'plugins', plugin)
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))

  check(pkg.name === `@Himmeltala/dsh-${plugin}`, `${plugin} 包名 ${pkg.name}`)
  check(pkg.dsh?.bundle?.patch === './cordis.patch.yml', `${plugin} 声明 dsh.bundle`)
  check(pkg.files?.includes('cordis.patch.yml') === true, `${plugin} 打包带 cordis.patch.yml`)
  check(pkg.repository?.url?.includes('dsh-plugins') === true, `${plugin} 仓库指向 dsh-plugins`)

  // 纯客户端插件：宿主侧只声明身份，界面全在浏览器侧。浏览器产物是“登记工厂”的闭包，
  // 在 node 里给它一个假的 window 与 require，把工厂叫起来就能校验。
  if (pkg.dsh?.client !== undefined) {
    check(pkg.dsh.client.platform === 'web', `${plugin} 客户端插件平台 web`)
    check(pkg.exports?.['./client'] === './lib/client.js', `${plugin} 导出 ./client`)
    check(pkg.files?.includes('lib') === true, `${plugin} 打包带 lib`)

    const libDir = join(dir, 'lib')
    const registered = { value: undefined }
    globalThis.window = { __ModuleLoader__: { load: (registration) => { registered.value = registration } } }
    try {
      await import(pathToFileURL(join(libDir, 'client.js')).href)
    } finally {
      delete globalThis.window
    }
    const registration = registered.value
    check(registration?.id === pkg.name, `${plugin} 客户端注册的 id 与包名一致`)
    // 加载器每个包只交一个 client.js，相对依赖必须在构建时内联，运行时没有别的模块可 require。
    const artifact = readFileSync(join(libDir, 'client.js'), 'utf8')
    check(!artifact.includes("require('./"), `${plugin} 客户端产物无相对依赖`)
    const stub = new Proxy({}, { get: () => () => null })
    const client = registration.factory((specifier) => {
      if (specifier.startsWith('./')) throw new Error(`构建产物仍有相对 require: ${specifier}`)
      if (specifier === 'react') return { useState: () => undefined, useMemo: (fn) => fn() }
      if (specifier === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null, Fragment: 'Fragment' }
      if (specifier === '@deepseek-ai/dsh-client-store') return { createSnapshotStore: () => ({ getSnapshot: () => ({}), subscribe: () => () => {}, set: () => {}, update: () => {} }) }
      return stub
    })
    check(typeof client.apply === 'function', `${plugin} 客户端入口可加载`)
    const injection = typeof client.inject === 'function' ? client.inject() : client.inject
    check(
      (Array.isArray(injection) && injection.length > 0) || (injection !== null && typeof injection === 'object' && Object.keys(injection).length > 0),
      `${plugin} 客户端声明依赖`,
    )

    // 只有带扫描导出的插件才做这一项；其余客户端插件校验到这里为止。
    if (typeof client.scanSession !== 'function') return
    const session = client.scanSession('check', 'D:/w', [
      { type: 'tool/call', time: 1, data: { name: 'read', callId: 'c1', turn: 1, arguments: '{"file_path":"a.ts"}' } },
      { type: 'tool/result', time: 2, data: { callId: 'c1', message: { isError: false } } },
      { type: 'tool/call', time: 3, data: { name: 'pwsh', callId: 'c2', turn: 1, arguments: '{"command":"git status"}' } },
      { type: 'tool/call', time: 4, data: { name: 'read', callId: 'c3', turn: 1, arguments: '{bad json' } },
    ])
    const entries = client.core.mergeVisits(session, 10, 3_600_000)
    check(entries.length === 2 && entries.some((entry) => entry.path === 'D:/w/a.ts'), `${plugin} 会话事件能归成访问记录`)
    // 事件窗口的真实入口是 eventSource.getSnapshot().entries，每项包一层 { event }。
    if (typeof client.eventsOf === 'function') {
      const window = client.eventsOf({
        eventSource: {
          getSnapshot: () => ({
            entries: [
              { event: { type: 'tool/call', time: 1, data: { name: 'read', callId: 'c1', arguments: '{"file_path":"a.ts"}' } } },
              { event: { type: 'tool/result', time: 2, data: { callId: 'c1', message: { isError: false } } } },
            ],
          }),
        },
      })
      const scanned = client.core.mergeVisits(client.scanSession('check', 'D:/w', window), 10, 3_600_000)
      check(window.length === 2 && scanned.length === 1, `${plugin} 能从会话事件源读到事件`)
    }
    return
  }

  const provider = {}
  const listener = {}
  const module = await import(pathToFileURL(join(dir, 'lib', 'index.js')).href)
  module.apply(fakeContext(provider, listener))

  const expected = readdirSync(join(dir, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  const listed = (await provider.value.list()).map((skill) => skill.name).sort()
  check(JSON.stringify(listed) === JSON.stringify(expected), `${plugin} 技能齐全 ${listed.join(',')}`)

  const definition = await provider.value.get({ name: listed[0] })
  check(definition?.content?.length > 0, `${plugin} 正文可读 ${definition?.name}`)

  if (plugin === 'commit-guarding') {
    const exec = (command, name = 'bash') => ({ name, arguments: { command, description: 'check' }, agent: { session: { header: { id: 'check' } } } })
    const next = async () => ({ kind: 'allow' })
    const denied = await listener.value(exec('git commit -m "feat(login): 加个功能"'), next)
    const allowed = await listener.value(exec('ls -la'), next)
    check(denied.kind === 'deny', 'commit-guarding 闸门拦下带范围括号的提交')
    check(allowed.kind === 'allow', 'commit-guarding 闸门放行普通命令')

    // DSH 在 Windows 上把 shell 工具叫 pwsh，闸门同样要接住。
    const pwshDenied = await listener.value(exec('git commit -m "feat(login): 加个功能"', 'pwsh'), next)
    check(pwshDenied.kind === 'deny', 'commit-guarding 闸门接住 pwsh 工具')
  }

  if (plugin === 'output-guarding') {
    const next = async () => ({ kind: 'allow' })
    const call = (name, args) => ({ name, arguments: args, agent: { session: { header: { id: 'check' } } } })
    const docs = 'D:/Media Files/个人/TEMP/docs/check/2026-11-08'
    const scripts = 'D:/Media Files/个人/TEMP/scripts/check/2026-11-08'

    check((await listener.value(call('write', { file_path: 'D:/code/repo/out.docx' }), next)).kind === 'deny',
      'output-guarding 拦下仓库里的交付物')
    check((await listener.value(call('write', { file_path: `${docs}/out.docx` }), next)).kind === 'allow',
      'output-guarding 放行产出目录')
    check((await listener.value(call('write', { file_path: 'D:/code/repo/probe.ps1' }), next)).kind === 'deny',
      'output-guarding 拦下仓库里的脚本')
    check((await listener.value(call('write', { file_path: `${scripts}/probe.ps1` }), next)).kind === 'allow',
      'output-guarding 放行脚本目录')
    check((await listener.value(call('pwsh', { command: 'Out-File -FilePath D:/code/repo/a.py' }), next)).kind === 'deny',
      'output-guarding 拦下命令里的越界脚本')
    check((await listener.value(call('pwsh', { command: 'echo x > "D:/code/repo/b.py"' }), next)).kind === 'deny',
      'output-guarding 认得出重定向目标是越界脚本')
    check((await listener.value(call('pwsh', { command: 'git status' }), next)).kind === 'allow',
      'output-guarding 放行普通命令')
  }
}

const plugins = readdirSync(join(ROOT, 'plugins'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

for (const plugin of plugins) await runPlugin(plugin)
console.log(failures === 0 ? `\n${plugins.length} 个插件全部通过` : `\n${failures} 项失败`)
process.exit(failures === 0 ? 0 : 1)
