# access-log

记录 DSH 读过、找过、执行过的东西：文件、目录、搜索与命令，按工作区归类，在界面里点开就能看。

## 记录了什么

数据来源是会话事件，不经过宿主：

- `tool/call` 里的工具名与参数决定一条记录：`read`、`read_image`、`write`、`edit`、`glob`、`grep`、`bash`、`pwsh`、`terminal`、`web_fetch`、`web_search`；认不出名字的工具若带路径参数，记作“调用”。
- `tool/result` 补成败：失败的那条显示“失败”，鼠标悬停能看到原因。
- `cwd` 解析相对路径；同名目标的多次访问合并成一条，算次数、最近一次时间与涉及的动作。

记录键：文件与目录按完整路径（Windows 不区分大小写），命令按工作目录加命令行，网页与搜索按目标串。

## 在哪里看

| 位置 | 作用 |
| --- | --- |
| 左栏导航「访问记录」 | 主列展开整页：按工作区分组，可按工作区、类型筛选，可按路径筛选 |
| 右侧栏标签栏「＋」→「访问记录」 | 同数据，右栏窄版，适合边看对话边对照 |
| 每条记录右侧「打开」 | 文件在右侧栏的文档预览里打开，带行号时会落到那一行 |
| 每条记录右侧「复制路径」 | 复制完整路径 |

统计条上给出读取、修改、近 24 小时、总次数与会话数。

## 边界

- 只读浏览器能拿到的会话事件窗口，更早的会话要打开过才在窗口里；没有长期保存的历史。
- 写与执行单独计数，不算“读取”。
- 打开目录：`dsh-resource://` 的 `file` 资源只认文件，目录的「打开」走文件树标签页，个体条目上不提供。

## 技能

包内 `skills/dsh-client-plugin` 说明浏览器侧插件的写法：读会话事件、注册槽位、加左栏入口、加右侧栏标签类型、把文件在右侧栏打开。

## 安装

```bash
dsh plugin --profile web add ./plugins/access-log
```

DSH 是 Electron 桌面版，profile 名为 `desktop`，那就改用：

```bash
dsh plugin --profile desktop add ./plugins/access-log
```

装完重启应用。启动后控制台若出现 `access-log` 相关的 `did not activate` 告警，多半是宿主版本里缺了某个注入的服务，按告警列出的服务名核对 `lib/client.js` 的 `inject`。

## 目录

```
access-log/
├── package.json          # 包名、dsh.bundle 与 dsh.client 声明
├── cordis.patch.yml      # DSH 挂载行，id 与包名一致
├── lib/
│   ├── index.js          # 宿主侧入口：只声明身份，不采集
│   ├── client.js         # 浏览器侧入口：记录器、左栏入口、主面板、右侧栏页面
│   ├── client-core.js    # 纯逻辑：归类、路径解析、归并、按工作区分组（无运行时依赖）
│   └── client-styles.js  # 类名与样式表
└── skills/dsh-client-plugin/SKILL.md
```
