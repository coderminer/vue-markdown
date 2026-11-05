---
description: '@coderminer/vue-markdown 1.1 发布说明与升级指南。'
---

# 发布说明

## 1.1.0 — 2026-11-05

正式版，包含 `1.1.0-beta.0` 的全部内容，并新增 Mermaid 文案定制、一处视觉调整和两个
生命周期修复：

- `MermaidBlock` 和 `MarkdownMermaid` 新增 `labels` 属性，独立使用时可以覆盖文案。
  新增的 `mermaidPending` 标签用于定制图表渲染期间的占位文案。
- `MarkdownLabels` 新增必填的 `mermaidPending` 键；使用 `Partial<MarkdownLabels>`
  的配置不受影响。
- Mermaid 图表默认在预览区域水平居中。大图仍以预览区宽度为上限，缩放和平移行为
  保持不变。
- `MermaidLiveEditor` 在组件卸载后才完成懒加载的 CodeMirror 实例会被立即销毁，
  不再泄漏编辑器及其监听器。
- `MarkdownImage` 在加载失败后 `src` 发生变化时会重新尝试渲染，不再一直停留在
  文本回退状态。

行为变更和升级步骤见下方的 `1.1.0-beta.0` 说明。

## 1.1.0-beta.0 — 2026-11-04

`1.1.0` 的首个 beta 版本，通过 npm 的 `beta` dist-tag 发布，正式版随后发布。
该版本修复运行时正确性问题，并把可选引擎的加载移到显式入口。有两处行为变更需要注意：
`sanitizeSvg` 移到了 `@coderminer/vue-markdown/mermaid/sanitize-svg`，语法高亮改为
显式启用。后续改进记录在 `IMPROVEMENTS.md`。

- 搜索只影响展示：修改 `search` 或 `searchCaseSensitive` 时，高亮直接基于已解析
  文档更新，不会重新解析。`search-change` 报告当前已渲染文档的数据；解析进行中时
  会保留上一份文档的匹配数，直到新文档落地。
- 显式 `search` 选项会覆盖 `searchPlugin()` 提供的片段，包括不再匹配当前查询的文本，
  因此切换查询后不会残留旧的高亮和匹配数。
- 官方 pipeline 在每个 document composable 中只创建一次，因此修改组件、标签、
  tokens 或搜索状态不再重建 unified processor。
- 基础渲染器不再静态引入 Mermaid 组件、运行时包装或 SVG 解析器；
  `mermaidPlugin()` 会注册内置 Mermaid 组件，因此只引入 `MarkdownRenderer` 的应用
  不会打包 Mermaid 运行时和 HTML 解析器分块。未注册组件的 `mermaid` 节点会回退为
  代码块。
- 语法高亮改为显式启用。代码块默认按纯文本渲染，需要宿主自行引入适配器：

  ```ts
  import { highlightjs } from '@coderminer/vue-markdown/highlight'
  ```

  ```vue
  <MarkdownRenderer :source="source" :highlighter="highlightjs" />
  ```
- `@coderminer/vue-markdown/mermaid/plugin` 只导出 `mermaidPlugin`，运行时辅助函数仍在
  Mermaid 入口。`sanitizeSvg` 移到了
  `@coderminer/vue-markdown/mermaid/sanitize-svg`；Mermaid 入口不再静态加载 HTML 解析器，
  渲染后的 SVG 按需净化。
- `remark-math` 和 `rehype-katex` 改为数学入口的可选 peer，只有使用数学功能时才需要安装：

  ```bash
  npm install katex remark-math rehype-katex
  ```
- 库不会再 dispose 宿主提供的 pipeline；只有库自己创建的 pipeline 会在卸载或替换
  时释放。
- 插件的 `setup()` 在插件的 `effectScope` 内执行，watcher 和作用域清理会在重新配置
  或卸载时停止，返回的 cleanup 只执行一次。
- `source=""` 会渲染空文档，不再回退到默认插槽。
- 缓存文档的键包含 pipeline 实例身份和新增的可选 `MarkdownPipeline.version`，
  同名但不同实例的 pipeline 不会共享结果。
- 异步运行使用每次运行独立的 slugger 和固定配置快照。
- 插件 `onError` 抛出的异常会记录为 `plugin-onerror`，不会破坏文档。
- Mermaid 作用域样式表只保留展示类声明；可能把 SVG 变成全屏遮罩的布局声明会被移除，
  外部 `url()` 引用会被拒绝。
- 原始 HTML 的 `id`/`name` 会加上 `user-content-` 前缀，避免 DOM clobbering 和
  id 冲突；同文档片段链接会自动改写到加前缀的目标，标题锚点不受影响。原始 HTML 的
  `class` 仍会保留，方便作者为自己的标记添加样式；在全局工具类 CSS 下渲染不可信内容前，
  请先阅读安全指南。

## 1.0.2 — 2026-11-03

聚焦 Mermaid 渲染质量和文档稳定性的补丁版本。

- Mermaid 块在可复用的离屏测量容器中渲染，图表不再短暂进入页面流导致内容跳动或
  滚动条闪烁。图表保持 Mermaid 报告的固有宽度并以预览区宽度为上限，小图不再被拉伸
  铺满整个块。
- 首次渲染会推迟到块接近视口时；开始打印时会放弃推迟。可通过 `MermaidBlock` /
  `MarkdownMermaid` 的 `deferRendering`，或 `MarkdownRenderer` /
  `MarkdownConfigProvider` 的 `mermaidDeferRendering` 关闭推迟，供打印、PDF 和
  截图流水线使用。`MarkdownRenderer` 新增 `mermaid-rendered` 事件。
- Mermaid 预览按真实溢出启用拖拽和键盘平移，并提供 `data-pannable`、
  `data-dragging` 状态属性。pending 高度由 `--vmd-mermaid-min-height` 预留。
- PNG 导出按最高 3 倍栅格化，并受 8192 px 最长边和 1600 万像素预算约束，文字清晰且
  不会因画布超限导致导出失败。
- Mermaid 节点使用基于内容的键，编辑一个图表不会让后面的图表重新挂载。
- npm 包同时包含 `src/` 源码，便于使用方查看。
- 目录默认渲染为不编号的 `<ul role="list">`；需要编号的宿主可用
  `list-style: decimal` 和标记内边距自行开启。
- Vue peer 范围调整为 `>=3.3.0 <4.0.0`，字符串标签覆盖和原始 HTML 的子节点在
  Vue 3.3 / 3.4 上也能正确渲染。

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
