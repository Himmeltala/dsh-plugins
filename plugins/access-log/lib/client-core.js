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
export const ACTION_ORDER = ['read', 'read_image', 'write', 'edit', 'list', 'glob', 'grep', 'shell', 'fetch', 'search', 'invoke']

/** 动作的中文名与英文名。 */
export const ACTION_LABELS = {
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
export function resolvePath(raw, cwd) {
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
export function parentOf(path) {
  const trimmed = path.replace(/[\\/]+$/, '')
  const cut = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return cut <= 0 ? '' : trimmed.slice(0, cut)
}

/** 路径最后一段，用来做名字展示。 */
export function baseName(path) {
  const trimmed = path.replace(/[\\/]+$/, '')
  const cut = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return cut < 0 ? trimmed : trimmed.slice(cut + 1)
}

/** 比较用的键：不区分大小写，Windows 上同一文件的不同写法要落进同一条记录。 */
export function pathKey(path) {
  return path.replace(/\\/g, '/').toLowerCase()
}

/** 是否落在某个根目录下（含根目录本身）。 */
export function isUnder(path, root) {
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
export function classify(toolName, args, cwd) {
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
export function fromToolCall(event, cwd) {
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
export function isFailure(result) {
  if (result === null || typeof result !== 'object') return false
  const message = result.data?.message
  if (message !== null && typeof message === 'object' && message.isError === true) return true
  return false
}

/** 失败原因的一句话摘要。 */
export function failureReason(result) {
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
export function mergeVisits(visits, now, recentMs) {
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
export function isWriteAction(action) {
  return action === 'write' || action === 'edit'
}

/** 该动作算不算读取。 */
export function isReadAction(action) {
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
export function groupByWorkspace(entries, workspaces, current, looseLimit) {
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
export function summarize(entries) {
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
export function toVisit(record, sessionId) {
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
