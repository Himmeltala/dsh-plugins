---
name: dsh-client-plugin
description: 给 DSH 写浏览器侧插件（Web 客户端插件）时用：怎么从会话事件里读工具调用、怎么往左栏加面板入口、怎么用 ctx.slots 注册界面、怎么把文件在右侧栏打开。触发词包括「写个 DSH 插件」「加个侧边栏面板」「读会话事件」「tool/call」「ctx.slots.register」「sidebar.panellist」「在侧边栏打开文件」「client.js 怎么打包」。
---

# 给 DSH 写浏览器侧插件

DSH 的 Web 界面由一串客户端插件拼出来。界面上的每一块——左栏导航、主列面板、右侧栏标签页、设置页——都是一次 `ctx.slots.register`。这个技能只讲浏览器侧（`dsh.client`）能用的东西，宿主侧另说。

## 插件包长什么样

一个客户端插件是普通的 npm 包，加两处声明：

- `package.json` 里的 `dsh.client`：`{ "platform": "web" }`，需要模块表里的模块时写进 `external`。
- `exports["./client"]` 指向浏览器产物，一个闭包工厂：

```js
window.__ModuleLoader__.load({
  id: '@作者/包名',
  factory: (require) => {
    const module = { exports: {} }
    const React = require('react')
    const jsxRuntime = require('react/jsx-runtime')
    const { createSnapshotStore } = require('@deepseek-ai/dsh-client-store')
    module.exports.apply = (ctx) => { /* 注册 */ }
    module.exports.inject = ['slots', 'locale']
    return module.exports
  },
})
```

`factory` 只登记，不执行。真正跑起来是在模块第一次 `require` 时，此时 `window.__ModuleLoader__` 已经在、`document` 也已经挂好，所以样式可以在工厂里直接往 `document.head` 里塞。

## 能 `require` 什么

模块表里只有宿主共享的少数几个，其余一律内联：

- `react`、`react/jsx-runtime`、`react-dom`、`react-dom/client`
- `@deepseek-ai/cordis`
- `@deepseek-ai/dsh-client-store`：`createSnapshotStore`、`defineStore`、`notifySubscribers`
- `@deepseek-ai/dsh-client-ui-slots`：类型与 `standardHookPropName` 一类工具
- `@deepseek-ai/dsh-client-ui-primitives`：按钮、图标、菜单
- `@deepseek-ai/dsh-client-ui-dockkit`
- `@deepseek-ai/dsh-util-values`：`PartialArguments`

别的 `@deepseek-ai/*` 要在 `dsh.client.external` 里显式声明才能留在外部，声明了模块表却没有的，运行时会直接报错。自己写的相对模块（`./x.js`）会被打进同一个文件，前提是打包工具把它们内联；不内联就得把多个文件一起发，DSH 的 `/plugins` 路由只取一个 `client.js`。

## 读会话事件

这是“DSH 读过哪些文件”最准确的来源，不需要宿主配合：

- `ctx.sessions.list` 是 `{ getSnapshot, subscribe }` 的快照源，快照里有 `ids` 与 `byId`，每行带 `cwd`、`displayTitle`、`running`。
- `ctx.sessions.binding(sessionId)` 拿到当前保留着的会话绑定；`binding.eventSource.events` 是事件窗口数组，按 `seq` 升序。
- 事件形状：`tool/call` 的 `data` 是 `{ turn, step, callId, name, arguments }`，`arguments` 是模型产出的原始 JSON 字符串；`tool/result` 的 `data` 带 `callId` 与 `message`，`message.isError` 表示失败。
- `ctx.uiSession.adapter.current` 的 `key` 是当前选中的会话 id。

一个最小扫描：

```js
function scan(binding, cwd) {
  const results = new Map()
  const calls = []
  for (const event of binding.eventSource.events) {
    if (event.type === 'tool/call') calls.push(event)
    else if (event.type === 'tool/result') results.set(event.data.callId, event)
  }
  return calls.map(call => {
    const args = JSON.parse(call.data.arguments)   // 坏 JSON 要 try 住
    const failed = results.get(call.data.callId)?.data?.message?.isError === true
    return { tool: call.data.name, args, failed, time: call.time }
  })
}
```

注意几点：

- 事件窗口只有已加载的一段，早于窗口的记录读不到；要全量得让宿主提供服务，或在浏览器里留一份历史。
- `binding` 可能为空：没被任何界面保留的会话没有绑定。
- 读事件是同步的，一次扫全部窗口可能卡；只扫 `tool/call` 并截断到最近 N 条。

## 注册界面

所有界面都走槽位，分两步：**声明**（谁在哪个位置允许放东西）和**注册**（往里放）。

| 槽位 | 位置 | 要点 |
| --- | --- | --- |
| `sidebar.panellist` | 左栏导航一行，id 同时是主列面板的 key | `{ kind: 'list', scope: 'root' }`，必须给 `id`、`order`、`label` |
| `main` | 主列整页，按 key 分发 | `{ kind: 'keyed', scope: 'root' }`，`key` 与左栏的 `id` 相同 |
| `conversation.composer.dock` | 输入框上下方的 dock | `{ kind: 'list', scope: 'session' }` |
| `sidebar.right.pane.tab` | 右侧栏一个标签页的主体 | keyed，key 是标签类型的 `id` |
| `shell.overlay` | 全局浮层 | `{ kind: 'list', scope: 'root' }` |

注册的三条硬规矩：

1. **先 `inject` 再 `register`**：`ctx.slots.inject('槽位名', () => ctx.slots.register(...))`，因为槽位由别的插件声明，可能后到，也可能重载后重新声明。直接 `register` 到没声明的槽位会抛错。
2. **注册放在 `ctx.effect` 里**：插件的每次 apply 都要对应一次清理，否则热重载后同一 id 注册两次会抛错。
3. **给组件注入面用 `inject` 工厂**：`inject: () => ({ hooks: { state }, actions })`。`hooks` 里的每个快照源会变成组件 props 上的 `use<Name>`，比如 `hooks: { state }` 给到 `props.useState((snapshot) => ...)`。普通字段原样变成 props。

```js
ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
  name: 'sidebar.panellist', id: PANEL_ID, order: 30,
  label: () => t('title'), locale: 'myPlugin',
}, PanelIcon)), 'my-plugin: entry')
```

组件不要自己去取 `ctx`；需要的服务与方法都在 `apply` 闭包里，经 `inject` 交给组件。`locale` 字段给了命名空间，组件 props 上就有 `t`。

## 面板里的状态

用一个快照源，少用组件内部状态：

```js
const state = createSnapshotStore({ phase: 'idle', entries: [] })
// 改：state.update(draft => { draft.entries = next })，或者整体 state.set(next)
```

- `createSnapshotStore(init, { persist: { name: 'key' } })` 会把它存进浏览器存储，刷新后还在。
- 组件里 `const snapshot = props.useState(s => s)`，每次 `set` 都会重新渲染。
- 别把整份会话事件塞进快照源；每次要显示时现场扫、现场汇总。

## 打开文件

文件是资源，右侧栏是查看面。打开一个绝对路径：

```js
ctx.sidebarRight.openResource(`dsh-resource://file/absolute${path}`, {
  params: { line },          // 跳到第几行
  revealIfOpened: false,     // 已有同地址标签时再开一个
})
```

- 路径里的 `:` 可以原样留着（`C:/x/y.txt`），别的字符要编码。
- 没有标签类型认领的地址会抛错，所以调用处要 try 住，界面不能因为一个打不开的路径崩掉。
- 打开之前若要切到主列面板，用 `ctx.layout.selectPanel(id)`，并先读 `ctx.layout.panelInfo.getSnapshot().activePanelId` 判断一下。

## 右侧栏加一个标签类型

两步，都放在 effect 里：

```js
ctx.effect(() => ctx.sidebarRightTabs.register({
  id: PANEL_ID, kind: 'my-kind', priority: 'extension',
  title: () => t('title'),
  guide: [{ id: 'open', order: 40, title: () => t('title') }],
}), 'my-plugin: type')

ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
  name: 'sidebar.right.pane.tab', key: PANEL_ID, locale: 'myPlugin',
}, Body)), 'my-plugin: body')
```

`guide` 里有条目，这个类型才会出现在右侧栏标签栏“＋”打开的目录里。

## 落盘与调试

- 浏览器产物要自己打成一个自包含的 CJS 文件，包成上面那个 `__ModuleLoader__.load({ id, factory })` 形状；有 CSS 就在工厂里插 `<style data-plugin-css="包名">`。
- 启动时会在控制台打 `web boot: warning: ... did not activate` 一类告警：`pending` 说明注入的服务不存在，`failed` 后面跟的是它抛的错。先看这一行。
- 注册期间抛错会让整个 fiber 失败，所以可选能力（比如某个槽位本部署里没有）要 try 住并 `console.warn`，不能把插件炸掉。
