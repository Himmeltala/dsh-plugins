/*
 * @Author: Himmeltala
 * @Date: 2026-11-08 23:40:00
 * @LastEditors: Himmeltala
 * @LastEditTime: 2026-11-08 23:40:00
 * @FilePath: \plugins\output-guarding\lib\client.js
 * @Description: 在「设置 → 插件」里给产出物根目录与脚本根目录提供配置页。
 */
window.__ModuleLoader__.load({
  id: '@Himmeltala/dsh-output-guarding',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const jsxRuntime = require('react/jsx-runtime')
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives')

    const jsx = jsxRuntime.jsx
    const jsxs = jsxRuntime.jsxs

    /** 字典命名空间，避免与别的插件撞键。 */
    const NS = 'settings.output-guarding'
    /** profile 条目 id、包名与配置表单的命名空间是同一个。 */
    const ENTRY = '@Himmeltala/dsh-output-guarding'

    const zh = {
      title: '产出物与临时脚本',
      summary: '限制交付物与临时脚本能写到哪些目录。',
      deliverablesRoot: '交付物根目录',
      deliverablesRootHint: 'docx、xlsx、pptx、pdf、csv、图片这类产出文件必须落在它下面。',
      scriptsRoot: '临时脚本根目录',
      scriptsRootHint: 'ps1、sh、py、sql、bat 这类排查脚本必须落在它下面。',
      overridden: '已改过',
      reset: '恢复默认',
      invalid: '这个值不合法，改好再保存。',
      unavailable: '该插件当前未加载，暂时无法配置。',
      readOnly: '本部署的设置为只读。',
      saveFailed: '没有保存成功，值已保留供你修改。',
      save: '保存',
      saving: '保存中…',
    }

    const en = {
      title: 'Outputs and scratch scripts',
      summary: 'Restrict where deliverables and scratch scripts may be written.',
      deliverablesRoot: 'Deliverables root',
      deliverablesRootHint: 'docx, xlsx, pptx, pdf, csv and image outputs must stay under this directory.',
      scriptsRoot: 'Scratch scripts root',
      scriptsRootHint: 'ps1, sh, py, sql and bat scratch scripts must stay under this directory.',
      overridden: 'Overridden',
      reset: 'Reset to default',
      invalid: 'This value is not accepted; fix it before saving.',
      unavailable: 'This plugin is not loaded, so it cannot be configured right now.',
      readOnly: 'This deployment stores settings read-only.',
      saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
      save: 'Save',
      saving: 'Saving…',
    }

    function formLabels(t) {
      return {
        unavailable: t('unavailable'),
        readOnly: t('readOnly'),
        saveFailed: t('saveFailed'),
        save: t('save'),
        saving: t('saving'),
      }
    }

    /** 一页表单：两个路径，保存时一次性写入。 */
    function OutputPage(props) {
      const { t } = props
      const state = props.useOutputForm((snapshot) => snapshot)
      if (props.view === 'summary') return t('summary')

      const disabled = !state.writable
      return jsxs(primitives.SettingsForm, {
        labels: formLabels(t),
        state,
        onSave: props.save,
        onDiscard: props.discard,
        children: [
          jsx(primitives.SettingsValueField, {
            id: 'output-guarding-deliverables',
            label: t('deliverablesRoot'),
            hint: t('deliverablesRootHint'),
            overriddenLabel: t('overridden'),
            resetLabel: t('reset'),
            invalidLabel: t('invalid'),
            disabled,
            text: state.deliverablesRoot.text,
            overridden: state.deliverablesRoot.overridden,
            invalid: state.deliverablesRoot.invalid,
            onEdit: (text) => props.edit('deliverablesRoot', text),
            onReset: () => props.resetField('deliverablesRoot'),
          }),
          jsx(primitives.SettingsValueField, {
            id: 'output-guarding-scripts',
            label: t('scriptsRoot'),
            hint: t('scriptsRootHint'),
            overriddenLabel: t('overridden'),
            resetLabel: t('reset'),
            invalidLabel: t('invalid'),
            disabled,
            text: state.scriptsRoot.text,
            overridden: state.scriptsRoot.overridden,
            invalid: state.scriptsRoot.invalid,
            onEdit: (text) => props.edit('scriptsRoot', text),
            onReset: () => props.resetField('scriptsRoot'),
          }),
        ],
      })
    }

    const inject = ['slots', 'locale', 'configForms']

    function apply(ctx) {
      const t = ctx.locale.bind(NS)
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'output-guarding: dictionaries')

      const form = new primitives.SettingsFormModel(ctx.configForms.get(ENTRY), [
        primitives.settingsTextField('deliverablesRoot'),
        primitives.settingsTextField('scriptsRoot'),
      ])
      const store = form.bind(() => ({
        ...form.shell(),
        deliverablesRoot: form.field('deliverablesRoot'),
        scriptsRoot: form.field('scriptsRoot'),
      }))
      ctx.effect(() => () => form.dispose(), 'output-guarding: form subscription')

      ctx.effect(() => ctx.configForms.whileServed([ENTRY], () => ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
        name: 'plugins.bundle.config',
        entryKey: ENTRY,
        id: ENTRY,
        order: 40,
        label: () => t('title'),
        locale: NS,
        inject: () => ({ hooks: { outputForm: store }, ...form.actions() }),
      }, OutputPage))), 'output-guarding: settings page')
    }

    exports.NS = NS
    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
