# dsh-plugins

DSH 插件仓库。存放本单位自用约定的 DSH 版本，与 `Himmeltala/claude-plugins`（Claude Code 市场）分工：同一套技能内容两边各存一份，harness 相关的接线各自适配，本仓库只适配 DSH。

| 插件 | 管什么 | 什么时候装 |
| --- | --- | --- |
| `commit-guarding` | 版本控制工作流：SVN 与 git 两套提交流程的检查与硬闸门、提交信息格式、命令速查、冲突与撤销踩坑 | 用 SVN 或 git 管的项目都装，按工作副本类型分流 |
| `comment-trimming` | 注释规范：稀疏优先、只讲本段代码、不复述实现、禁装饰、编辑文件时整文件顺手清干净、整目录批量清理的子代理；Java 类头 Javadoc 与前端文件头六字段块单独一个技能 | 所有 Java、Vue 或 JavaScript 项目 |
| `chinese-writing` | 中文表达与理解：介词、量词、关联词、语序、术语、篇幅、禁符号代字与翻译腔；文档与注释不复述实现细节 | 所有项目 |
| `output-guarding` | 产出物与临时脚本的落点：交付物限在产出目录、一次性脚本限在脚本目录，越界写入直接拦下；两个根目录可在设置页里改 | 要强制产物与脚本落点的项目 |
| `access-log` | 访问记录：DSH 读过、找过、执行过的文件、目录与命令，按工作区分组，左栏整页与右侧栏都能看，也能从记录里直接把文件在侧边栏打开 | 想回看 DSH 动过哪些东西的场合 |

## 目录结构

```
dsh-plugins/
├── README.md
├── scripts/
│   └── check-plugins.mjs      # 校验包名、dsh.bundle、技能齐全、客户端产物、提交闸门
└── plugins/
    ├── commit-guarding/
    │   ├── package.json       # 包名、files、dsh.bundle 指向 cordis.patch.yml
    │   ├── cordis.patch.yml   # DSH 挂载行，id 与包名一致
    │   ├── README.md
    │   ├── lib/
    │   │   ├── index.js       # 把 skills/ 注册成 DSH 技能来源
    │   │   └── guard.js       # shell 调用前复跑 scripts/ 里两份闸门脚本（bash / pwsh）
    │   ├── scripts/           # svn 与 git 两份提交闸门脚本
    │   ├── references/        # 提交信息格式细则
    │   ├── skills/            # git-commit、svn-commit 两份技能
    │   └── tests/             # 闸门脚本的验收测试
    ├── comment-trimming/
    │   ├── package.json
    │   ├── cordis.patch.yml
    │   ├── README.md
    │   ├── lib/index.js
    │   ├── agents/comment-trimmer.md   # subagent 工具的任务说明
    │   └── skills/            # comment-trimming、header-comment 两份技能
    ├── chinese-writing/
    │   ├── package.json
    │   ├── cordis.patch.yml
    │   ├── README.md
    │   ├── lib/index.js
    │   └── skills/            # chinese-writing 技能与三份参考
    ├── output-guarding/
    │   ├── package.json
    │   ├── cordis.patch.yml
    │   ├── README.md
    │   ├── lib/               # index.js、guard.js、client.js（设置页）
    │   └── skills/output-placement
    └── access-log/            # 纯客户端插件，界面全在浏览器侧
        ├── package.json       # 另声明 dsh.client（platform: web）
        ├── cordis.patch.yml
        ├── README.md
        ├── lib/
        │   ├── index.js       # 宿主侧入口：只声明身份
        │   ├── client.js      # 浏览器侧：读会话事件、左栏入口、主面板、右侧栏页面
        │   ├── client-core.js # 纯逻辑：归类、路径解析、归并、按工作区分组
        │   └── client-styles.js
        └── skills/dsh-client-plugin/   # 浏览器侧插件的写法
```

## 安装

仓库已公开，直接从 GitHub 子目录装：

```bash
dsh plugin --profile web add github:Himmeltala/dsh-plugins#path:/plugins/commit-guarding
```

改源码时用本地路径，改动立即生效：

```bash
dsh plugin --profile web add ./plugins/commit-guarding
```

技能由包内 `lib/index.js` 注册，装完即用，不需要往 `~/.dsh/skills` 拷贝。以前用软链挂技能的，切到包安装后先删掉对应软链，否则同名技能按 rank 仍然命中软链那份。

`commit-guarding` 的提交闸门由 `lib/guard.js` 在 shell 调用前复跑 `scripts/` 里那两份脚本，与 Claude 侧 `hooks/` 跑的是同一批判定。它按工具名分平台接：POSIX 上是 `bash`，Windows 上是 `pwsh`；Windows 找不到 bash 时静默放行（Git for Windows 自带的即可，也可用 `DSH_GUARD_BASH` 指定）。

`access-log` 是纯客户端插件：宿主侧只声明身份，记录与界面都在浏览器侧的 `lib/client.js`，数据来自会话事件，不落库。装完重启应用，左栏出现「访问记录」，右侧栏标签栏「＋」里也有一个。

dshmarket 的列表只读 awesome-dsh-plugin 的目录，收录要向上游提 PR；本仓库不走那条路，市场里搜不到，不影响安装。

## 更新

技能内容改动与 `claude-plugins` 仓库对应插件同步改，两边的技能正文保持一致；harness 接线（`lib/`、`cordis.patch.yml`、闸门触发方式）只在本仓库改。

改动后跑 `node scripts/check-plugins.mjs`，它校验包名、dsh.bundle、技能数量、客户端产物可加载，以及提交闸门。
