/* 由 scripts/build-client.mjs 生成，勿直接编辑；改 client-entry.js、client-core.js 或 client-styles.js 后重新构建。 */
/*
 * @Author: Himmeltala
 * @Date: 2026-11-09 10:50:00
 * @LastEditors: Himmeltala
 * @LastEditTime: 2026-11-09 11:55:00
 * @FilePath: \plugins\access-log\lib\client.js
 * @Description: 浏览器侧入口：从会话事件里统计读取过的文件、目录与命令，按工作区归并，
 *   提供左栏入口、主列整页列表、右侧栏页面，以及“在侧边栏打开文件”的跳转。
 */
window.__ModuleLoader__.load({
  id: '@Himmeltala/dsh-access-log',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const jsxRuntime = require('react/jsx-runtime')
    const { createSnapshotStore } = require('@deepseek-ai/dsh-client-store')
    const css = (() => {
/*
 * @Author: Himmeltala
 * @Date: 2026-11-09 11:30:00
 * @LastEditors: Himmeltala
 * @LastEditTime: 2026-11-09 12:05:00
 * @FilePath: \plugins\access-log\lib\client-styles.js
 * @Description: 访问记录面板的类名与样式表：类名带前缀，样式由 client.js 挂进页面一次。
 *   颜色取 DSH 主题的 --dsw-alias-* 变量，深浅色跟随主题，取不到时退到中性灰。
 */

/** 类名前缀，避免与别的插件撞名。 */
const P = 'dsh-access-log'

/** 面板用到的类名，export 给 client.js 的 JSX 引用。 */
const root = `${P}-root`
const head = `${P}-head`
const stats = `${P}-stats`
const stat = `${P}-stat`
const tools = `${P}-tools`
const search = `${P}-search`
const button = `${P}-button`
const tabs = `${P}-tabs`
const tab = `${P}-tab`
const tabActive = 'is-active'
const groups = `${P}-groups`
const group = `${P}-group`
const row = `${P}-row`
const actions = `${P}-actions`
const name = `${P}-name`
const count = `${P}-count`
const time = `${P}-time`
const failed = 'is-failed'
const link = `${P}-link`
const empty = `${P}-empty`
const compact = `${P}-compact`

/** 整份样式表。 */
const __default = `
.${root} {
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
  height: 100%;
  padding: 20px 24px;
  overflow: auto;
  color: var(--dsw-alias-label-primary, inherit);
}
.${head} {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
}
.${head} h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.${stats} {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.${stat} {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary, #8a8f98);
}
.${stat} strong {
  font-size: 15px;
  color: var(--dsw-alias-label-primary, inherit);
}
.${tools} {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
.${search} {
  min-width: 240px;
  padding: 6px 10px;
  border: 1px solid var(--dsw-alias-border-l3, #d8dbe0);
  border-radius: var(--dsw-radius-sm, 8px);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
}
.${button}, .${tab} {
  padding: 6px 12px;
  border: 1px solid var(--dsw-alias-border-l3, #d8dbe0);
  border-radius: var(--dsw-radius-sm, 8px);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.${button}:hover, .${tab}:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.04));
}
.${tabs} {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.${tab} {
  padding: 4px 10px;
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary, #8a8f98);
}
.${tab}.${tabActive} {
  color: var(--dsw-alias-brand-text, #4d6bfe);
  border-color: var(--dsw-alias-border-l4, #4d6bfe);
  background: var(--dsw-alias-interactive-bg-hover, rgba(77, 107, 254, 0.08));
}
.${groups} {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.${group} h3 {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-tertiary, #8a8f98);
  word-break: break-all;
}
.${group} ul {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--dsw-alias-border-l2, #e6e8eb);
}
.${row} {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 2px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, #e6e8eb);
  font-size: 13px;
}
.${actions} {
  flex: none;
  min-width: 76px;
  color: var(--dsw-alias-label-secondary, #8a8f98);
  font-size: 12px;
  white-space: nowrap;
}
.${name} {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
}
.${count} {
  flex: none;
  color: var(--dsw-alias-label-tertiary, #8a8f98);
  font-size: 12px;
}
.${time} {
  flex: none;
  color: var(--dsw-alias-label-tertiary, #8a8f98);
  font-size: 12px;
  white-space: nowrap;
}
.${failed} {
  flex: none;
  padding: 0 6px;
  border-radius: 6px;
  background: var(--dsw-alias-interactive-bg-hover-danger, rgba(220, 38, 38, 0.12));
  color: #dc2626;
  font-size: 11px;
}
.${link} {
  flex: none;
  padding: 2px 8px;
  border: none;
  border-radius: var(--dsw-radius-xs, 6px);
  background: transparent;
  color: var(--dsw-alias-label-primary, inherit);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.${link}:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.04));
}
.${empty} {
  margin: 0;
  color: var(--dsw-alias-label-tertiary, #8a8f98);
  font-size: 13px;
}
/* 右栏窄：收紧留白，标题与统计各占一行。 */
.${root}.${compact} {
  padding: 12px;
  gap: 8px;
}
.${root}.${compact} .${head} {
  gap: 6px 0;
}
.${root}.${compact} .${head} h2 {
  font-size: 15px;
}
.${root}.${compact} .${tools} {
  width: 100%;
  margin-left: 0;
}
.${root}.${compact} .${search} {
  flex: 1 1 auto;
  min-width: 0;
}
.${root}.${compact} .${actions} {
  min-width: 52px;
  font-size: 11px;
}
.${root}.${compact} .${row} {
  gap: 6px;
  font-size: 12px;
}
`

return { root, head, stats, stat, tools, search, button, tabs, tab, tabActive, groups, group, row, actions, name, count, time, failed, link, empty, compact, __default }
})()
    const core = (() => {
/*
 * @Author: Himmeltala
 * @Date: 2026-11-09 10:45:00
 * @LastEditors: Himmeltala
 * @LastEditTime: 2026-11-09 10:45:00
 * @FilePath: \plugins\access-log\lib\client-core.js
 * @Description: 访问记录的核心逻辑：从会话事件里认出读、写、列目录、搜索与执行动作，按工作区归并。
 *   这里不引用任何 DSH 运行时，纯数据进、纯数据出，便于在 node 下直接校验。
 */

/** 动作顺序：先读后写，查询类靠后，列表排序也按它。 */
const ACTION_ORDER = ['read', 'read_image', 'write', 'edit', 'list', 'glob', 'grep', 'shell', 'fetch', 'search', 'invoke']

/** 动作的中文名与英文名。 */
const ACTION_LABELS = {
  read: { zh: '读取', en: 'Read' },
  read_image: { zh: '看图', en: 'View image' },
  write: { zh: '写入', en: 'Write' },
  edit: { zh: '修改', en: 'Edit' },
  list: { zh: '列目录', en: 'List' },
  glob: { zh: '查找', en: 'Glob' },
  grep: { zh: '搜索', en: 'Search' },
  shell: { zh: '命令', en: 'Command' },
  fetch: { zh: '取网页', en: 'Fetch' },
  search: { zh: '联网搜索', en: 'Web search' },
  invoke: { zh: '调用', en: 'Invoke' },
}

/** 只认读类动作；写、改、执行另算，避免把“动过”当成“读过”。 */
const READ_ACTIONS = new Set(['read', 'read_image', 'list', 'glob', 'grep', 'fetch', 'search'])

/** 兜底时按顺序找的路径字段。 */
const PATH_FIELDS = ['file_path', 'path', 'notebook_path', 'directory', 'target']

function isAbsolutePath(value) {
  return /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith('/') || value.startsWith('\\\\')
}

/**
 * 用 base 目录解析一个可能相对的路径，并消掉 `.` 与 `..`。
 * @param raw 工具给的路径原样。
 * @param cwd 解析相对路径用的工作目录，可为空。
 * @returns 规整后的路径；都为空时返回空串。
 */
function resolvePath(raw, cwd) {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (value === '') return ''
  const base = typeof cwd === 'string' ? cwd.trim() : ''
  let joined = value
  if (!isAbsolutePath(value) && base !== '') joined = `${base.replace(/[\\/]+$/, '')}/${value}`
  const drive = /^([a-zA-Z]:)/.exec(joined)
  const absolute = joined.startsWith('/') || joined.startsWith('\\')
  const parts = []
  for (const segment of joined.replace(/\\/g, '/').split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (parts.length > 0 && parts.at(-1) !== '..') parts.pop()
      else if (!absolute && drive === null) parts.push('..')
      continue
    }
    parts.push(segment)
  }
  const body = parts.join('/')
  if (drive !== null) return `${drive[1]}/${body.replace(drive[1], '').replace(/^\/+/, '')}`
  return absolute ? `/${body}` : body
}

/** 路径的父目录；没有父目录时返回空串。 */
function parentOf(path) {
  const trimmed = path.replace(/[\\/]+$/, '')
  const cut = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return cut <= 0 ? '' : trimmed.slice(0, cut)
}

/** 路径最后一段，用来做名字展示。 */
function baseName(path) {
  const trimmed = path.replace(/[\\/]+$/, '')
  const cut = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return cut < 0 ? trimmed : trimmed.slice(cut + 1)
}

/** 比较用的键：不区分大小写，Windows 上同一文件的不同写法要落进同一条记录。 */
function pathKey(path) {
  return path.replace(/\\/g, '/').toLowerCase()
}

/** 是否落在某个根目录下（含根目录本身）。 */
function isUnder(path, root) {
  if (root === '' || path === '') return false
  const target = pathKey(path)
  const base = pathKey(root).replace(/\/+$/, '')
  return target === base || target.startsWith(`${base}/`)
}

/** 一次访问：动作、种类、目标、路径、原始参数、成败。 */
function visit(action, kind, target, path, args) {
  return { action, kind, target, path, args }
}

/**
 * 把一次工具调用归成一次访问。
 * @param toolName 工具名，来自 `tool/call` 事件。
 * @param args 已解析的参数对象。
 * @param cwd 该会话的工作目录，用来解析相对路径。
 * @returns 一次访问；认不出时不返回。
 */
function classify(toolName, args, cwd) {
  const input = args !== null && typeof args === 'object' ? args : {}
  const str = key => (typeof input[key] === 'string' && input[key].trim() !== '' ? input[key].trim() : undefined)

  if (toolName === 'read' || toolName === 'read_image') {
    const path = str('file_path')
    if (path === undefined) return undefined
    const resolved = resolvePath(path, cwd)
    return visit(toolName, 'file', resolved, resolved, input)
  }
  if (toolName === 'write' || toolName === 'edit') {
    const path = str('file_path')
    if (path === undefined) return undefined
    const resolved = resolvePath(path, cwd)
    return visit(toolName, 'file', resolved, resolved, input)
  }
  if (toolName === 'glob') {
    const pattern = str('pattern')
    if (pattern === undefined) return undefined
    const scope = resolvePath(str('path') ?? cwd ?? '', cwd)
    return visit('glob', 'directory', scope === '' ? pattern : `${scope}/${pattern}`, scope, input)
  }
  if (toolName === 'grep') {
    const pattern = str('pattern')
    if (pattern === undefined) return undefined
    const scope = str('path')
    if (scope === undefined) return visit('grep', 'other', pattern, '', input)
    const resolved = resolvePath(scope, cwd)
    return visit('grep', str('include') === undefined ? 'directory' : 'file', resolved, resolved, input)
  }
  if (toolName === 'bash' || toolName === 'pwsh' || toolName === 'terminal') {
    const command = str('command')
    if (command === undefined) return undefined
    const workdir = resolvePath(str('workdir') ?? cwd ?? '', cwd)
    return visit('shell', 'command', command, workdir, input)
  }
  if (toolName === 'web_fetch') {
    const url = str('url')
    if (url === undefined) return undefined
    return visit('fetch', 'web', url, '', input)
  }
  if (toolName === 'web_search') {
    const words = Array.isArray(input.queries) ? input.queries.filter(item => typeof item === 'string' && item.trim() !== '') : []
    const query = words.length > 0 ? words.join(' | ') : str('query')
    if (query === undefined) return undefined
    return visit('search', 'web', query, '', input)
  }

  // 兜底：认不出名字的工具，只要参数里有像路径的字段也记一条，避免漏记。
  for (const field of PATH_FIELDS) {
    const path = str(field)
    if (path !== undefined) {
      const resolved = resolvePath(path, cwd)
      return visit('invoke', 'file', resolved, resolved, input)
    }
  }
  return undefined
}

/**
 * 一条 `tool/call` 事件配成待定访问记录。
 * @param event 形如 `{ type: 'tool/call', time, data: { name, arguments, callId, turn } }`。
 * @param cwd 会话工作目录。
 * @returns 访问记录；参数坏掉或认不出时返回 undefined。
 */
function fromToolCall(event, cwd) {
  const data = event?.data
  if (data === null || typeof data !== 'object') return undefined
  let parsed
  try {
    parsed = typeof data.arguments === 'string' ? JSON.parse(data.arguments) : data.arguments
  } catch {
    return undefined
  }
  if (parsed === null || typeof parsed !== 'object') return undefined
  const record = classify(data.name, parsed, cwd)
  if (record === undefined) return undefined
  return {
    ...record,
    callId: typeof data.callId === 'string' ? data.callId : '',
    turn: typeof data.turn === 'number' ? data.turn : 0,
    time: typeof event.time === 'number' ? event.time : 0,
    status: 'ok',
    error: '',
  }
}

/** 工具结果是否失败。`tool/result` 事件的对象形状在各版之间不完全一致，两种都认。 */
function isFailure(result) {
  if (result === null || typeof result !== 'object') return false
  const message = result.data?.message
  if (message !== null && typeof message === 'object' && message.isError === true) return true
  return false
}

/** 失败原因的一句话摘要。 */
function failureReason(result) {
  const error = result?.error ?? result?.data?.error
  if (error !== null && typeof error === 'object') {
    const text = error.reason ?? error.message
    if (typeof text === 'string' && text !== '') return text
    if (typeof error.code === 'string') return error.code
  }
  return ''
}

/**
 * 把多次访问按目标归并：文件按完整路径，目录按目录本身，命令按命令行，网络按地址或关键词。
 * @param visits 访问记录，每条都要带 key、name、path、dir、kind、action、time、status、sessionId。
 * @param now 判定“新”与“最近一次”的时间基准。
 * @param recentMs 多久以内算新。
 * @returns 归并后的条目，按最近一次访问时间倒序。
 */
function mergeVisits(visits, now, recentMs) {
  const byKey = new Map()
  for (const item of visits) {
    let entry = byKey.get(item.key)
    if (entry === undefined) {
      entry = {
        key: item.key,
        name: item.name,
        path: item.path,
        dir: item.dir,
        target: item.target,
        kind: item.kind,
        actions: [],
        count: 0,
        ok: 0,
        failed: 0,
        sessions: new Set(),
        firstAt: item.time,
        lastAt: item.time,
        lastStatus: item.status,
        lastError: '',
      }
      byKey.set(item.key, entry)
    }
    if (!entry.actions.includes(item.action)) entry.actions.push(item.action)
    entry.count += 1
    if (item.status === 'error') entry.failed += 1
    else entry.ok += 1
    entry.sessions.add(item.sessionId)
    if (item.time < entry.firstAt) entry.firstAt = item.time
    if (item.time >= entry.lastAt) {
      entry.lastAt = item.time
      entry.lastStatus = item.status
      entry.lastError = item.status === 'error' ? item.error : ''
    }
  }
  const entries = []
  for (const entry of byKey.values()) {
    entries.push({
      ...entry,
      sessions: [...entry.sessions],
      recent: now - entry.lastAt <= recentMs,
      actions: [...entry.actions].sort((a, b) => ACTION_ORDER.indexOf(a) - ACTION_ORDER.indexOf(b)),
    })
  }
  return entries.sort((a, b) => b.lastAt - a.lastAt || a.key.localeCompare(b.key))
}

/** 写类动作：界面据此把“动过”标出来。 */
function isWriteAction(action) {
  return action === 'write' || action === 'edit'
}

/** 该动作算不算读取。 */
function isReadAction(action) {
  return READ_ACTIONS.has(action)
}

/**
 * 按工作区分组：条目落在哪个工作区，由工作区根目录的前缀判断，最长者优先。
 * @param entries 归并后的条目。
 * @param workspaces 已知工作区 `{ path, title }` 数组。
 * @param current 当前工作区路径，用于排序。
 * @param looseLimit 不属于任何工作区的条目单独成组，最多保留这么多条。
 * @returns 分组数组，当前工作区排最前，其余按最近访问时间。
 */
function groupByWorkspace(entries, workspaces, current, looseLimit) {
  const roots = workspaces
    .filter(item => typeof item.path === 'string' && item.path.trim() !== '')
    .map(item => ({ ...item, path: item.path.trim().replace(/[\\/]+$/, '') }))
    .sort((a, b) => b.path.length - a.path.length)
  const groups = new Map()
  const loose = []
  for (const entry of entries) {
    const home = roots.find(root => entry.path !== '' && isUnder(entry.path, root.path))
    if (home === undefined) {
      loose.push(entry)
      continue
    }
    let group = groups.get(home.path)
    if (group === undefined) {
      group = { root: home.path, title: home.title || baseName(home.path) || home.path, entries: [] }
      groups.set(home.path, group)
    }
    group.entries.push(entry)
  }
  if (loose.length > 0) groups.set('', { root: '', title: '', entries: loose.slice(0, looseLimit) })
  const recency = group => Math.max(...group.entries.map(entry => entry.lastAt))
  return [...groups.values()].sort((a, b) => {
    if (a.root === current) return -1
    if (b.root === current) return 1
    // 当前工作区之外的条目垫底：它们不属于任何一个工作区，排在各工作区之后。
    if (a.root === '') return 1
    if (b.root === '') return -1
    return recency(b) - recency(a)
  })
}

/** 统计：按动作与种类计数，给面板顶部的摘要用。 */
function summarize(entries) {
  const byAction = {}
  const byKind = {}
  const sessions = new Set()
  let total = 0
  let recent = 0
  let failed = 0
  for (const entry of entries) {
    total += entry.count
    if (entry.recent) recent += 1
    failed += entry.failed
    for (const action of entry.actions) byAction[action] = (byAction[action] ?? 0) + 1
    byKind[entry.kind] = (byKind[entry.kind] ?? 0) + 1
    for (const sessionId of entry.sessions) sessions.add(sessionId)
  }
  return { entries: entries.length, total, recent, failed, byAction, byKind, sessions: sessions.size }
}

/**
 * 一次工具调用是否构成一条访问记录并补上工作区与会话信息。
 * 记录键：文件与目录用路径，命令用命令行，网页与搜索用目标串。
 * @param record fromToolCall 的结果。
 * @param sessionId 所属会话。
 * @returns 可直接参与归并的访问记录。
 */
function toVisit(record, sessionId) {
  let key
  let name
  const path = record.path
  if (record.kind === 'file' || record.kind === 'directory') {
    key = `p:${pathKey(path)}`
    name = baseName(path)
  } else if (record.kind === 'command') {
    key = `c:${pathKey(path ?? '')}|${record.target}`
    name = record.target
  } else if (record.kind === 'web') {
    key = `w:${record.target}`
    name = record.target
  } else {
    key = `o:${record.target}`
    name = record.target
  }
  const dir = record.kind === 'file' ? parentOf(path) : path
  return { ...record, key, name, path, dir, sessionId, status: record.status ?? 'ok', error: record.error ?? '' }
}

return { ACTION_ORDER, ACTION_LABELS, resolvePath, parentOf, baseName, pathKey, isUnder, classify, fromToolCall, isFailure, failureReason, mergeVisits, isWriteAction, isReadAction, groupByWorkspace, summarize, toVisit }
})()

    const jsx = jsxRuntime.jsx
    const jsxs = jsxRuntime.jsxs
    const Fragment = jsxRuntime.Fragment
    const useState = React.useState
    const useMemo = React.useMemo

    const NS = 'accessLog'
    const PANEL_ID = '@Himmeltala/dsh-access-log'
    const KIND = 'access-log'
    const RECENT_MS = 24 * 60 * 60 * 1000
    const LOOSE_LIMIT = 2000
    const SCAN_LIMIT = 2000

    installStyles()

    const zh = {
      title: '访问记录',
      guideDescription: 'DSH 读过、找过、执行过的文件、目录与命令，按工作区分组。',
      loading: '正在读取会话记录…',
      empty: '还没有访问记录。读文件、列目录、搜索或执行命令之后，这里会出现记录。',
      noMatch: '没有符合条件的记录。',
      search: '筛选路径、文件名或命令',
      reads: '读取',
      writes: '修改',
      recent: '近 24 小时',
      total: '总次数',
      sessions: '会话',
      failed: '失败',
      current: '当前工作区',
      loose: '工作区外',
      scopeAll: '全部工作区',
      kindAll: '全部',
      file: '文件',
      directory: '目录',
      command: '命令',
      web: '网页',
      other: '其它',
      read: '读取',
      read_image: '看图',
      write: '写入',
      edit: '修改',
      list: '列目录',
      glob: '查找',
      grep: '搜索',
      shell: '命令',
      fetch: '取网页',
      searchWeb: '联网搜索',
      invoke: '调用',
      open: '打开',
      copy: '复制路径',
      copied: '已复制',
      refresh: '刷新',
      times: '次',
    }

    const en = {
      title: 'Access log',
      guideDescription: 'Files, directories, and commands DSH read, searched, or ran, grouped by workspace.',
      loading: 'Reading session events…',
      empty: 'No access yet. Files, directories, searches, and commands appear here once used.',
      noMatch: 'No entry matches the filter.',
      search: 'Filter by path, file name, or command',
      reads: 'Reads',
      writes: 'Changes',
      recent: 'Last 24 hours',
      total: 'Hits',
      sessions: 'Sessions',
      failed: 'Failed',
      current: 'Current workspace',
      loose: 'Outside workspaces',
      scopeAll: 'All workspaces',
      kindAll: 'All',
      file: 'Files',
      directory: 'Directories',
      command: 'Commands',
      web: 'Web',
      other: 'Other',
      read: 'Read',
      read_image: 'View image',
      write: 'Write',
      edit: 'Edit',
      list: 'List',
      glob: 'Glob',
      grep: 'Search',
      shell: 'Command',
      fetch: 'Fetch',
      searchWeb: 'Web search',
      invoke: 'Invoke',
      open: 'Open',
      copy: 'Copy path',
      copied: 'Copied',
      refresh: 'Refresh',
      times: 'hits',
    }

    const EMPTY_SUMMARY = { entries: 0, total: 0, recent: 0, failed: 0, byAction: {}, byKind: {}, sessions: 0 }

    /** 把插件自己的样式挂进页面，只挂一次。 */
    function installStyles() {
      if (typeof document === 'undefined') return
      if (document.querySelector(`style[data-plugin-css="${PANEL_ID}"]`) !== null) return
      const tag = document.createElement('style')
      tag.dataset.pluginCss = PANEL_ID
      tag.textContent = css.default
      document.head.appendChild(tag)
    }

    /** 会话列表里的标题，空的就不用。 */
    function workspaceTitle(value) {
      return typeof value === 'string' && value.trim() !== '' ? value : undefined
    }

    /** 会话列表快照变成工作区候选：按 cwd 去重，当前会话的 cwd 排最前。 */
    function workspacesOf(list, currentCwd) {
      const items = []
      const seen = new Set()
      const push = (cwd, title) => {
        if (typeof cwd !== 'string') return
        const path = cwd.trim().replace(/[\\/]+$/, '')
        if (path === '') return
        const key = core.pathKey(path)
        if (seen.has(key)) return
        seen.add(key)
        items.push({ path, title: workspaceTitle(title) ?? core.baseName(path) })
      }
      push(currentCwd, undefined)
      for (const id of list?.ids ?? []) push(list.byId[id]?.cwd, list.byId[id]?.displayTitle)
      return items
    }

    /** 会话事件窗口：`eventSource.events` 是当前版本的入口。 */
    function eventsOf(binding) {
      const events = binding?.eventSource?.events
      return Array.isArray(events) ? events : []
    }

    /**
     * 扫一个会话的事件窗口：`tool/call` 带工具名与参数，`tool/result` 补成败。
     * @param sessionId 会话 id。
     * @param cwd 会话工作目录。
     * @param events 事件窗口，按 seq 升序。
     */
    function scanSession(sessionId, cwd, events) {
      const calls = []
      const results = new Map()
      for (const event of events) {
        if (event?.type === 'tool/call') calls.push(event)
        else if (event?.type === 'tool/result' && typeof event.data?.callId === 'string') results.set(event.data.callId, event)
      }
      const recent = calls.length > SCAN_LIMIT ? calls.slice(calls.length - SCAN_LIMIT) : calls
      const visits = []
      for (const call of recent) {
        const record = core.fromToolCall(call, cwd)
        if (record === undefined) continue
        const result = record.callId === '' ? undefined : results.get(record.callId)
        if (result !== undefined && core.isFailure(result)) {
          record.status = 'error'
          record.error = core.failureReason(result)
        }
        visits.push(core.toVisit(record, sessionId))
      }
      return visits
    }

    /** 当前会话在前，其余按会话列表顺序补到上限。 */
    function bindingsOf(ctx, list, currentId, maxSessions) {
      const ids = []
      if (typeof currentId === 'string' && currentId !== '') ids.push(currentId)
      for (const id of list?.ids ?? []) {
        if (ids.length >= maxSessions) break
        if (!ids.includes(id)) ids.push(id)
      }
      const bindings = []
      for (const id of ids) {
        const binding = ctx.sessions.binding(id)
        if (binding !== undefined) bindings.push(binding)
      }
      return bindings
    }

    /**
     * 记录器：扫描、归并、按工作区分组，把结果放进一个快照源给界面读。
     * 每次请求现场扫一遍事件，不长期保存整份事件，避免内存越用越大。
     * @param ctx 客户端根上下文。
     */
    function createRecorder(ctx) {
      const state = createSnapshotStore({
        phase: 'idle',
        entries: [],
        groups: [],
        summary: EMPTY_SUMMARY,
        workspaces: [],
        current: '',
        lastScan: 0,
      })

      let sessionId = ''
      let cwd = ''
      let timer

      const refresh = () => {
        const list = ctx.sessions.list.getSnapshot()
        const bindings = bindingsOf(ctx, list, sessionId, 8)
        const visits = []
        for (const binding of bindings) {
          try {
            visits.push(...scanSession(binding.sessionId, list?.byId?.[binding.sessionId]?.cwd ?? '', eventsOf(binding)))
          } catch (error) {
            console.warn('[access-log] reading session events failed:', error)
          }
        }
        const entries = core.mergeVisits(visits, Date.now(), RECENT_MS)
        const workspaces = workspacesOf(list, cwd)
        const current = cwd.trim().replace(/[\\/]+$/, '')
        state.set({
          phase: 'ready',
          entries,
          groups: core.groupByWorkspace(entries, workspaces, current, LOOSE_LIMIT),
          summary: core.summarize(entries),
          workspaces,
          current,
          lastScan: Date.now(),
        })
      }

      /** 会话列表变化可能一次来很多条，合并成一次扫描。 */
      const schedule = () => {
        if (timer !== undefined) return
        timer = setTimeout(() => {
          timer = undefined
          refresh()
        }, 300)
      }

      const track = () => {
        const selected = ctx.uiSession.adapter.current.getSnapshot().key ?? ''
        const list = ctx.sessions.list.getSnapshot()
        const nextCwd = list?.byId?.[selected]?.cwd ?? ''
        if (selected === sessionId && nextCwd === cwd) return
        sessionId = selected
        cwd = nextCwd
        refresh()
      }

      /**
       * 在侧边栏打开一个路径。文件走文档预览，带行号也能落到那一行。
       * @param entry 条目本身，或 `{ path, line }`。
       */
      const openTarget = (entry) => {
        const path = typeof entry === 'string' ? entry : entry?.path
        const line = typeof entry === 'string' ? undefined : entry?.line
        if (typeof path !== 'string' || path === '') return
        try {
          ctx.sidebarRight.openResource(`dsh-resource://file/absolute${path}`, {
            params: line === undefined ? undefined : { line },
            revealIfOpened: false,
          })
        } catch (error) {
          console.warn('[access-log] opening the file failed:', error)
        }
      }

      /** 把主面板拉到前面；已经在前面时不重复切换。 */
      const reveal = () => {
        if (ctx.layout.panelInfo.getSnapshot().activePanelId !== PANEL_ID) ctx.layout.selectPanel(PANEL_ID)
      }

      const actions = {
        refresh,
        schedule,
        track,
        reveal,
        openTarget,
        dispose() {
          if (timer !== undefined) clearTimeout(timer)
        },
        /** 服务都接上之后才扫第一遍：插件 apply 期间不碰别的服务的订阅。 */
        ready() {
          refresh()
        },
      }

      return { state, actions }
    }

    exports.NS = NS
    exports.PANEL_ID = PANEL_ID
    exports.KIND = KIND
    exports.core = core
    exports.createRecorder = createRecorder
    exports.scanSession = scanSession

    /** 依赖的服务：侧边栏槽位、文案、会话与投影、布局、右侧栏的导航与标签类型。 */
    exports.inject = ['slots', 'locale', 'sessions', 'uiSession', 'layout', 'sidebarRight', 'sidebarRightTabs']

    exports.apply = function apply(ctx) {
      const t = ctx.locale.bind(NS)
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'access-log: dictionaries')

      const recorder = createRecorder(ctx)
      exports.recorder = recorder
      exports.t = t

      ctx.effect(() => {
        const offSession = ctx.uiSession.adapter.current.subscribe(() => { recorder.actions.track() })
        const offList = ctx.sessions.list.subscribe(() => { recorder.actions.schedule() })
        const offPanel = ctx.layout.panelInfo.subscribe(() => {
          if (ctx.layout.panelInfo.getSnapshot().activePanelId === PANEL_ID) recorder.actions.refresh()
        })
        recorder.actions.ready()
        return () => {
          offSession()
          offList()
          offPanel()
          recorder.actions.dispose()
        }
      }, 'access-log: follow sessions')

      ctx.provide('accessLog', { state: recorder.state, actions: recorder.actions })

      const face = () => ({
        hooks: { state: recorder.state },
        actions: recorder.actions,
      })

      // 左栏入口：点开是主列里的整页列表。
      ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 30,
        label: () => t('title'),
        locale: NS,
      }, PanelIcon)), 'access-log: sidebar entry')

      // 主面板：侧边栏点进去就是整页列表。
      ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
        inject: face,
      }, MainPanel)), 'access-log: main panel')

      // 右侧栏页面：从右侧栏标签栏的“＋”里打开，和主面板共用同一份数据。
      ctx.effect(() => ctx.sidebarRightTabs.register({
        id: PANEL_ID,
        kind: KIND,
        priority: 'extension',
        title: () => t('title'),
        guide: [{
          id: 'open',
          order: 40,
          title: () => t('title'),
          description: () => t('guideDescription'),
        }],
      }), 'access-log: right sidebar type')

      ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
        name: 'sidebar.right.pane.tab',
        key: PANEL_ID,
        locale: NS,
        inject: face,
      }, PanePanel)), 'access-log: right sidebar body')
    }

    /** 侧边栏图标：一张带线的纸，表示记下来的东西。 */
    function PanelIcon({ size }) {
      const stroke = Math.max(1.2, size / 12)
      return jsx('svg', {
        width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true',
        children: jsxs(Fragment, {
          children: [
            jsx('path', { d: 'M3 2.5h6.5L13 6v7.5H3z', stroke: 'currentColor', strokeWidth: stroke, strokeLinejoin: 'round' }),
            jsx('path', { d: 'M9.5 2.5V6H13', stroke: 'currentColor', strokeWidth: stroke, strokeLinejoin: 'round' }),
            jsx('path', { d: 'M5.2 8.2h5.6M5.2 10.6h3.8', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round' }),
          ],
        }),
      })
    }

    function stat(label, value) {
      return jsxs('span', { className: css.stat, children: [jsx('span', { children: label }), jsx('strong', { children: String(value) })] })
    }

    function tab(label, value, current, set, key) {
      return jsx('button', {
        type: 'button',
        className: value === current ? `${css.tab} ${css.tabActive}` : css.tab,
        onClick: () => { set(value) },
        children: label,
      }, key)
    }

    /**
     * 面板本体：主列与右栏共用。
     * @param props 槽位给的注入面：`useState` 快照钩子、`actions`、`t`。
     * @param compact 右栏宽度窄，少放几列信息。
     */
    function AccessLogPanel(props, compact) {
      const state = props.useState((snapshot) => snapshot)
      const [filter, setFilter] = useState('')
      const [kind, setKind] = useState('all')
      const [scope, setScope] = useState('all')
      const [copied, setCopied] = useState('')
      const t = props.t

      const groups = useMemo(() => {
        const keyword = filter.trim().toLowerCase()
        const result = []
        for (const group of state.groups ?? []) {
          if (scope !== 'all' && (scope === 'loose' ? group.root !== '' : group.root !== scope)) continue
          const entries = group.entries.filter(entry =>
            (kind === 'all' || entry.kind === kind)
            && (keyword === '' || entry.target.toLowerCase().includes(keyword) || entry.name.toLowerCase().includes(keyword)))
          if (entries.length > 0) result.push({ ...group, entries })
        }
        return result
      }, [state.groups, filter, kind, scope])

      const copy = (text) => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(text)
          setTimeout(() => { setCopied('') }, 1500)
        })
      }

      const summary = state.summary ?? EMPTY_SUMMARY
      const head = jsxs('header', { className: css.head, children: [
        jsx('h2', { children: t('title') }),
        jsx('div', { className: css.stats, children: [
          stat(t('reads'), summary.byAction.read ?? 0),
          stat(t('writes'), (summary.byAction.write ?? 0) + (summary.byAction.edit ?? 0)),
          stat(t('recent'), summary.recent),
          stat(t('total'), summary.total),
          stat(t('sessions'), summary.sessions),
        ] }),
        jsxs('div', { className: css.tools, children: [
          jsx('input', {
            className: css.search,
            value: filter,
            placeholder: t('search'),
            onChange: (event) => { setFilter(event.currentTarget.value) },
          }),
          jsx('button', { type: 'button', className: css.button, onClick: () => { props.actions.refresh() }, children: t('refresh') }),
        ] }),
      ] })

      if (state.phase !== 'ready') {
        return jsxs('div', { className: compact ? `${css.root} ${css.compact}` : css.root, children: [
          head, jsx('p', { className: css.empty, children: t('loading') }),
        ] })
      }

      const scopeTabs = [tab(t('scopeAll'), 'all', scope, setScope, 'scope-all')]
      if (state.current !== '') scopeTabs.push(tab(t('current'), state.current, scope, setScope, 'scope-current'))
      scopeTabs.push(tab(t('loose'), 'loose', scope, setScope, 'scope-loose'))
      const kindTabs = [
        tab(t('kindAll'), 'all', kind, setKind, 'kind-all'),
        tab(t('file'), 'file', kind, setKind, 'kind-file'),
        tab(t('directory'), 'directory', kind, setKind, 'kind-dir'),
        tab(t('command'), 'command', kind, setKind, 'kind-cmd'),
        tab(t('web'), 'web', kind, setKind, 'kind-web'),
      ]

      return jsxs('div', { className: compact ? `${css.root} ${css.compact}` : css.root, children: [
        head,
        jsx('nav', { className: css.tabs, children: scopeTabs }),
        jsx('nav', { className: css.tabs, children: kindTabs }),
        summary.entries === 0
          ? jsx('p', { className: css.empty, children: t('empty') })
          : groups.length === 0
            ? jsx('p', { className: css.empty, children: t('noMatch') })
            : jsx('div', { className: css.groups, children: groups.map(group => jsxs('section', {
              key: group.root === '' ? '__loose' : group.root,
              className: css.group,
              children: [
                jsx('h3', { title: group.root, children: group.root === '' ? t('loose') : group.title }),
                jsx('ul', { children: group.entries.map(entry => row(entry, t, props.actions, copy, copied, compact)) }),
              ],
            })) }),
      ] })
    }

    /** 主列整页。 */
    function MainPanel(props) {
      return AccessLogPanel(props, false)
    }

    /** 右栏页面：宽度窄，隐藏次数与时间两列。 */
    function PanePanel(props) {
      return AccessLogPanel(props, true)
    }

    /** 一条记录：动作、名字、次数、最近时间，以及打开与复制。 */
    function row(entry, t, actions, copy, copied, compact) {
      const labels = entry.actions.map(action => t(action === 'search' ? 'searchWeb' : action)).join(' · ')
      const openable = entry.path !== '' && entry.kind !== 'command' && entry.kind !== 'web' && entry.kind !== 'other'
      return jsxs('li', { className: css.row, children: [
        jsx('span', { className: css.actions, children: labels }),
        jsx('span', { className: css.name, title: entry.target, children: entry.name || entry.target }),
        entry.failed > 0 ? jsx('span', { className: css.failed, children: t('failed') }) : null,
        compact ? null : jsx('span', { className: css.count, children: `${entry.count} ${t('times')}` }),
        compact ? null : jsx('time', { className: css.time, children: new Date(entry.lastAt).toLocaleString() }),
        openable ? jsx('button', {
          type: 'button',
          className: css.link,
          title: t('open'),
          onClick: () => { actions.openTarget(entry) },
          children: t('open'),
        }) : null,
        entry.path !== '' ? jsx('button', {
          type: 'button',
          className: css.link,
          title: t('copy'),
          onClick: () => { copy(entry.path) },
          children: copied === entry.path ? t('copied') : t('copy'),
        }) : null,
      ] }, entry.key)
    }

    return module.exports
  },
})
