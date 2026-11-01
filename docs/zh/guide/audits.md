---
description: 可访问性、减少动画、RTL 和资源清理审计。
---

# 可访问性与清理审计

## 语义与键盘路径

- 渲染器保留标题层级，把目录暴露为带标签的导航地标，用 `aria-current` 标记当前项，并
  保持标题 ID 稳定。
- 任务项暴露原生 checkbox 并触发 `task-change`；脚注引用和注释使用
  `role="doc-endnotes"` 与可访问标签。
- 代码操作是原生按钮。复制、下载、重试、缩放、全屏和编辑器尺寸控制都有文字标签或
  `aria-label`。
- 编辑器分隔条是 `role="separator"`，带 `aria-valuenow`，支持 ArrowLeft/ArrowRight，
  Home 重置比例。
- 插槽获得与默认区域相同的动作，自定义键盘路径可以复用内置处理器。

组件测试覆盖 focus-visible 回退、checkbox 变化、编辑器键盘调整、全屏状态、目录导航和
插槽动作。

## 减少动画、打印与强制颜色

样式表保留 `prefers-reduced-motion` 覆盖；打印时隐藏目录和标题锚点；强制颜色模式下使用
`LinkText`/`CanvasText`。新增的部件也包含在这两组打印和强制颜色规则中。

## RTL 与令牌

布局使用逻辑属性并提供物理属性回退。新部件使用 `--vmd-*` 令牌控制颜色、间距、圆角、
代码、数学和 Mermaid 表面；`data-vmd-theme` 模式无需组件级覆盖即可继续生效。

## 资源清理

编辑器在卸载时销毁 CodeMirror view；Mermaid 和编辑器的 keydown 监听会被移除；复制反馈
计时器会被清除；object URL 会被回收。插件作用域在卸载和重新配置时释放。

## 下一步

- [样式与主题](./styling.md)
- [定制手册](./cookbook.md)
