/*
 * @Author: Himmeltala
 * @Date: 2026-11-09 10:36:00
 * @LastEditors: Himmeltala
 * @LastEditTime: 2026-11-09 11:50:00
 * @FilePath: \plugins\access-log\lib\index.js
 * @Description: 插件宿主侧入口。访问记录不从宿主采集：会话事件在浏览器侧可读，client.js 直接接
 *   `tool/call` 与 `tool/result` 统计；这里只声明插件身份与配置，供 loader 挂载。
 */

// 插件的 Config 用 schemastery 声明，由 DSH 解析到自己的副本；仓库里的校验脚本直接跑 node，
// 解析不到 @deepseek-ai/*，这时退化成没有 schema，插件照样能加载与校验。
let schema
try {
  schema = (await import('@deepseek-ai/schemastery')).default
} catch {
  schema = undefined
}

export const name = '@Himmeltala/dsh-access-log'

/** 不依赖任何服务：宿主侧没有要做的事，记什么由浏览器侧按需读。 */
export const inject = []

export const Config = schema === undefined ? undefined : schema.object({})

export function apply() {
  // 宿主不做任何记录，也不向模型暴露工具；全部在浏览器侧完成。
}
