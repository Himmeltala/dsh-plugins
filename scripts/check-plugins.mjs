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
