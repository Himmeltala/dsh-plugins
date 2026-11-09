# output-guarding

产出物与临时脚本的落盘守卫。管两件事：交付物（docx、xlsx、pptx、pdf、图片、csv）必须写到产出目录，排查、验证、转换数据用的一次性脚本（ps1、sh、py、sql、bat、cmd）必须写到脚本目录。写在别处，工具调用会被直接拦下。

## 组件

| 组件 | 类型 | 作用 |
|---|---|---|
| `output-placement` | 技能 | 说明两类文件各自的落点、命名与分层规则，以及被拦下时的处理顺序 |
| 落盘守卫 | 闸门 | `write`、`edit` 与 `bash`、`pwsh` 调用前判定目标路径，越界即拒绝 |

守卫按扩展名认文件，不按目录猜：

| 类别 | 默认扩展名 | 默认根目录 |
|---|---|---|
| 交付物 | `.docx` `.doc` `.xlsx` `.xls` `.pptx` `.ppt` `.pdf` `.csv` `.png` `.jpg` `.jpeg` `.svg` | `D:/Media Files/个人/TEMP/docs` |
| 临时脚本 | `.ps1` `.psm1` `.sh` `.py` `.sql` `.bat` `.cmd` | `D:/Media Files/个人/TEMP/scripts` |

`.md` 与 `.js`/`.mjs` 默认不管：仓库里到处是 README 与源码，一律拦会把正常改文件堵死。

## 配置

配置项都在 DSH 里改，改完立即生效，不用重启（字段是 volatile 的）：

| 字段 | 含义 |
|---|---|
| `deliverablesRoot` | 交付物根目录 |
| `scriptsRoot` | 临时脚本根目录 |
| `extraRoots` | 额外放行的根目录，例如某个必须放脚本的工作副本 |
| `deliverableExtensions` | 按交付物管的扩展名 |
| `scriptExtensions` | 按临时脚本管的扩展名 |
| `mode` | `block` 拦截越界写入，`off` 只留技能说明 |

不装设置页也能配：在 profile 的 `cordis.patch.yml` 里给插件条目加 `config:` 段即可。

## shell 命令怎么判

守卫不全量解析命令行，只认能确定目标的几种写法：`>`、`>>`、`2>` 重定向，`tee`，以及 PowerShell 的 `Out-File`、`Set-Content`、`Add-Content`、`Tee-Object`。带变量、通配符的目标在运行时才知道值，判定不了就放行。

## 限制

- 只拦本插件看到的写入路径。用别的工具、别的语言自己拼路径写文件（例如 Python 里 `open()`）不在检查范围内。
- 扩展名判定是字面量匹配，大小写不敏感，但不认识压缩包、临时后缀这类间接写法。
