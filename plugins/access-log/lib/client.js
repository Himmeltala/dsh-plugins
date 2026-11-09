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
    const css = require('./client-styles.js')
    const core = require('./client-core.js')

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
