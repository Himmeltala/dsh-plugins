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
export const root = `${P}-root`
export const head = `${P}-head`
export const stats = `${P}-stats`
export const stat = `${P}-stat`
export const tools = `${P}-tools`
export const search = `${P}-search`
export const button = `${P}-button`
export const tabs = `${P}-tabs`
export const tab = `${P}-tab`
export const tabActive = 'is-active'
export const groups = `${P}-groups`
export const group = `${P}-group`
export const row = `${P}-row`
export const actions = `${P}-actions`
export const name = `${P}-name`
export const count = `${P}-count`
export const time = `${P}-time`
export const failed = 'is-failed'
export const link = `${P}-link`
export const empty = `${P}-empty`
export const compact = `${P}-compact`

/** 整份样式表。 */
export default `
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
