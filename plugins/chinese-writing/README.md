# chinese-writing

中文表达与理解规范插件：约束助手写中文的方式，以及读中文需求的方式。

## 组件

| 组件 | 类型 | 作用 |
|---|---|---|
| `chinese-writing` | 技能 | 中文产出十条（介词、量词、关联词、语序、术语、符号代字、一句一义、中英空格、禁翻译腔、不复述实现）；篇幅标准（回复、注释、提交信息、文档）；读中文需求的歧义确认 |

技能内另有三份参考：`symbols-and-grammar.md` 管符号与语法，`translationese.md` 管翻译腔对照，`reading-chinese.md` 管读需求。

规范正文只在技能触发时加载，会话开始不再注入摘要。

## 安装

```bash
dsh plugin --profile web add github:Himmeltala/dsh-plugins#path:/plugins/chinese-writing
```

改源码时用本地路径，改动立即生效：

```bash
dsh plugin --profile web add ./plugins/chinese-writing
```

仓库结构、更新方式与校验脚本见仓库根目录的 `README.md`。

## 使用

技能会在写注释、写文档、写提交信息时自动触发，也可以显式点名：

- 说"这句话中文不通""缺介词""符号别当代替""这是翻译腔" —— 触发规则

篇幅数值（回复精简、注释最多两行、提交信息一行、文档不限长）以本插件的篇幅标准为准，`comment-trimming` 与 `commit-guarding` 的技能文档只指认。
