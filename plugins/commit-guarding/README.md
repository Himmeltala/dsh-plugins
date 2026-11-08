# commit-guarding

版本控制工作流插件：管提交前的检查与拦截。注释规范在 `comment-trimming` 插件，中文规范在 `chinese-writing` 插件，三者互不依赖，装哪个用哪个。

SVN 与 git 两种工作副本都管，按目录下有没有 `.svn` 或 `.git` 分流：同一个会话里既有 SVN 项目又有 git 项目也能用，各自走各自那套。工作副本不在版本控制之下的不需要它。

## 组件

| 组件 | 类型 | 作用 |
|---|---|---|
| `svn-commit` | 技能 | 提交前检查流程、提交信息格式、SVN 命令速查、冲突与编码踩坑处理 |
| `git-commit` | 技能 | 提交前拉最新、提交信息格式、git 命令速查、变基冲突与撤销处理。提交信息格式与 `svn-commit` 共用一份细则 |
| svn-commit-guard | 闸门 | shell 调用前拦 `svn commit`：工作副本落后于服务器、有未解决冲突、提交信息前缀带范围括号 |
| git-commit-guard | 闸门 | shell 调用前拦 `git commit`：前缀带范围括号、信息不是单行、没给信息、处于 detached HEAD、落后或分叉于远端 |

提交细则在技能触发时加载；提交闸门由 `lib/guard.js` 在 shell 调用前复跑 `scripts/` 里那两份脚本，常驻生效。

闸门同时接 `bash` 与 `pwsh` 两个工具名：DSH 在 POSIX 上发 `bash`，在 Windows 上发 `pwsh`，两边都拦。脚本本身是 bash 写的，Windows 上用 Git for Windows 自带的那份 bash 执行——`lib/guard.js` 先按环境变量 `DSH_GUARD_BASH` 找，再按 `git --exec-path` 推出的 Git 安装目录找 `bin/bash.exe`、`usr/bin/bash.exe`，最后才试 PATH；一份都找不到时静默放行，不堵调用。命令行由环境变量直传脚本，Windows 上不需要 `jq` 或 `python3`。

## 安装

```bash
dsh plugin --profile web add github:Himmeltala/dsh-plugins#path:/plugins/commit-guarding
```

改源码时用本地路径，改动立即生效：

```bash
dsh plugin --profile web add ./plugins/commit-guarding
```

仓库结构、更新方式与校验脚本见仓库根目录的 `README.md`。

## 使用

技能多数会自动触发，也可以显式点名：

- 说"走一遍 SVN 提交流程" —— 触发 `svn-commit` 技能
- 说"走一遍 git 提交流程" —— 触发 `git-commit` 技能

触发词包括"提交"、"提交代码"、"git commit"、"svn commit"、"改了什么"、"git status"、"svn status"、"推送"、"拉最新代码"、"冲突了"、"回滚"、"撤销修改"、"看历史"。提交闸门的两份脚本无需触发，提交命令一执行就生效。
