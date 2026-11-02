---
description: '@coderminer/vue-markdown 1.0 发布说明与升级指南。'
---

# 发布说明

## 1.0.1 — 2026-11-02

修复 1.0.0 发布后发现的运行时问题。由于包还没有外部使用者，这个补丁版本也包含
有意的契约收紧：`externalLinkTarget` 的类型收窄，`mermaidPlugin()` 会拒绝非对象
参数。

- `toc-change` 不会在首次解析完成前再触发一次空目录事件。首次解析结果确实没有
  标题时，仍会在稳定后触发一次 `[]`。
- 自定义标签属性会从 kebab-case 归一化为 camelCase；`data-*` 和 `aria-*`
  保持原样。
- `MermaidBlock` 在每次重新渲染以及从源码页返回时重置缩放，并在错误/回退区域显示
  重试按钮。
- Mermaid 运行时会重试失败的懒加载，按完整配置判断初始化，并串行化配置变更。
- 每次运行（包括失败）都会替换并去重诊断。只有 code、message、severity、phase、
  plugin、来源范围和 details 都相同时才视为重复，因此不同位置的同类问题会保留。
  安装阶段的诊断会生成快照，插件即使保留 setup 上下文也无法在后续运行中继续追加。
  `useMarkdownDocument` 新增 `clearDiagnostics()`，渲染器不再无限增长已上报诊断的记录。
- 导出带类型的 `MarkdownRendererEvents` 和 `MermaidBlockEvents`，并记录事件负载约定。
  交互事件会携带来源 DOM 事件；文档不再声称所有负载都可序列化。
- 新增完整示例插件和指南，覆盖全部公开插件钩子。
- 空搜索查询不再遍历整棵文档树，也不再统计匹配数。
- 新增 `searchDebounce` 属性，在查询最后一次变化后延迟解析，适合大文档的即时搜索；
  初始查询仍会立即应用，服务端渲染不受影响。
- 目录侧栏在目录高于视口时会在内部滚动。移动端堆叠布局会重置该高度限制，让目录
  在内容上方自然展开。
- 渲染器的所有标量属性都会在运行时校验。非法值会报告 `prop-*` 警告并使用安全的
  回退值。省略可选的 `baseUrl` 是合法的，不会产生诊断。`externalLinkTarget` 的
  类型收窄为 `'_self' | '_blank'`，`theme` 现在具有运行时 string 类型。
- `MermaidBlock` 在卸载后会忽略仍在进行中的渲染；`resetMermaidRuntime()` 保留队列
  顺序和 ID 唯一性。
- `mermaidPlugin()` 会拒绝非对象参数，而不是静默忽略；`languages` 仍是唯一选项。
- 浏览器产物不再包含 Node 内置模块（`node:process`、`node:path`、`node:url`），
  修复渲染时 `process.cwd` 崩溃。
- 默认 highlight.js 适配器改用 `lowlight` 直接生成 hast。高亮入口不再引入 HTML
  解析器；只有 Mermaid 和 KaTeX 在转换引擎输出时保留解析器。高亮入口不再导出
  `highlightedNodesFromHtml`，已经生成 hast 的适配器请使用
  `highlightedNodesFromHast`。
- 发布的 JavaScript 不再包含指向未发布 sourcemap 的 `sourceMappingURL` 注释。
- 文档明确 `renderMermaid()` 是异步的；传入非字符串或 Promise source 时会报告清晰
  错误，而不是抛出 `trim is not a function`。
- `MermaidBlock` 会区分非法渲染器结果、空输出和被净化完全拒绝的 SVG，并为每种错误
  给出修复提示。`mermaidRenderer` 非法时的诊断现在会说明回退到内置运行时。
- Mermaid 指南记录了渲染器优先级：单块 `renderer` > provider/预设
  `mermaidRenderer` > 内置运行时；并说明 `renderMermaid()` 是函数而不是适配器对象，
  `resetMermaidRuntime()` 不是生命周期钩子。
- 默认标题 ID 会把连续的空白和减号折叠为一个减号，例如 `My   -   Heading` 生成
  `my-heading`。自定义 slugger 保持自己的格式，仅追加重复后缀。
- 基础渲染器不再静态包含 HTML 解析器。Mermaid SVG 净化会在图表实际渲染后才加载
  解析器；高亮入口不再打包一份 highlight.js，而是从宿主 peer 依赖解析其语言子路径。

## 1.0.0 — 2026-11-01

`@coderminer/vue-markdown` 首个稳定版本。

### 亮点

- 通过 `unified`、`remark-parse` 和 `remark-rehype` 进行 Vue 原生 Markdown
  渲染，没有 HTML 字符串往返，也不使用 `v-html`。
- 可序列化文档模型同时服务于渲染器、无头组合式函数和静态 HTML 导出。
- 支持标签组件、节点组件、函数渲染器、区域、具名插槽、文案、令牌、预设和可检查清单。
- 支持目录生成与位置、搜索、自定义标签、GFM、frontmatter、脚注、任务项、过滤、URL
  策略和静态导出。
- 可选的 highlight.js / Shiki 高亮、`CodeBlock`、`VueSyntaxHighlighter`、KaTeX
  数学、Mermaid 渲染和 CodeMirror Mermaid 编辑器，均位于独立入口或按需分块。
- 通过 `@coderminer/vue-markdown/html` 启用净化后的原始 HTML。

### 升级说明

#### 原始 HTML

`skipHtml` 已移除。原始 HTML 默认丢弃，需要显式启用：

```ts
import { htmlPlugin } from '@coderminer/vue-markdown/html'

const plugins = [...defaultPlugins, htmlPlugin()]
```

使用时安装可选解析器：

```bash
npm install rehype-raw
```

#### 错误区域默认值

`showError` 现在默认 `true`。如果需要旧行为：

```vue
<MarkdownRenderer :source="source" :show-error="false" />
```

#### 渲染器结构

渲染器新增 `[data-vmd-part="body"]` 和 `[data-vmd-part="toc-column"]` 包装层。
宿主 CSS 应使用稳定部件，而不是直接子元素结构：

```css
[data-vmd-part='content'] {
  /* 内容 */
}

[data-vmd-part='toc-column'] {
  /* 目录布局列 */
}
```

#### 搜索

渲染器支持 `search` 和 `searchCaseSensitive`；`search-change` 报告
`{ query, caseSensitive, matches }`。该事件反映当前实际渲染的文档，等待中或失败的
运行不会报告旧匹配数。空查询挂载时不会发事件。搜索会参与解析 memo key，大文档的即时
搜索请设置 `searchDebounce`。

#### Mermaid 编辑器

`MermaidLiveEditor` 现在提供 `toolbar`、`editor`、`preview`、
`editor-diagnostics`、`empty` 和 `fullscreen` 插槽，以及 `rawDetails` 和
`autoFocus`。空 `editor` 插槽会回退到 CodeMirror；多个全屏编辑器退出或卸载时会恢复
共享的页面滚动状态。

### 完整变更

完整历史见
[CHANGELOG.md](https://github.com/coderminer/vue-markdown/blob/main/CHANGELOG.md)。
