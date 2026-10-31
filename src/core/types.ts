import type { Root } from 'hast'
import type { PluggableList } from 'unified'

/** A position inside the original Markdown source. */
export interface SourcePosition {
  line: number
  column: number
  offset?: number
}

/** A half-open range inside the original Markdown source. */
export interface SourceRange {
  start: SourcePosition
  end: SourcePosition
}

/** A piece of a text node, optionally marked as a search match. */
export interface MarkdownTextSegment {
  value: string
  match?: boolean
}

export interface MarkdownTextNode {
  kind: 'text'
  key: string
  value: string
  segments?: MarkdownTextSegment[]
  source?: SourceRange
}

export interface MarkdownElementNode {
  kind: 'element'
  key: string
  tag: string
  attrs: Record<string, string>
  children: MarkdownNode[]
  source?: SourceRange
}

export interface MarkdownCodeNode {
  kind: 'code'
  key: string
  code: string
  language: string
  highlighted?: MarkdownNode[]
  source?: SourceRange
}

export interface MarkdownMathNode {
  kind: 'math'
  key: string
  tex: string
  displayMode: boolean
  rendered?: MarkdownNode[]
  source?: SourceRange
}

export interface MarkdownMermaidNode {
  kind: 'mermaid'
  key: string
  code: string
  complete: boolean
  index: number
  source?: SourceRange
}

export interface MarkdownCustomTagNode {
  kind: 'custom'
  key: string
  tag: string
  props: Record<string, unknown>
  attrs: Record<string, string>
  children: MarkdownNode[]
  source?: SourceRange
}

export interface MarkdownPluginNode {
  kind: 'plugin'
  key: string
  type: string
  payload: unknown
  children?: MarkdownNode[]
  source?: SourceRange
}

/** The immutable, serializable document model. */
export type MarkdownNode =
  | MarkdownTextNode
  | MarkdownElementNode
  | MarkdownCodeNode
  | MarkdownMathNode
  | MarkdownMermaidNode
  | MarkdownCustomTagNode
  | MarkdownPluginNode

export interface TocItem {
  id: string
  text: string
  level: number
}

export interface CustomTagInstance {
  key: string
  tag: string
  props: Record<string, unknown>
  attrs: Record<string, string>
}

export interface MarkdownDocument {
  nodes: MarkdownNode[]
  toc: TocItem[]
  customTags: CustomTagInstance[]
  frontmatter?: Record<string, unknown>
  plugins: string[]
  pipeline: string
}

export type DiagnosticSeverity = 'error' | 'warning'

export type DiagnosticPhase =
  | 'setup'
  | 'source'
  | 'remark'
  | 'rehype'
  | 'normalize'
  | 'document'
  | 'search'
  | 'render'
  | 'pipeline'

export interface MarkdownDiagnostic {
  code: string
  message: string
  severity: DiagnosticSeverity
  phase?: DiagnosticPhase
  plugin?: string
  source?: SourceRange
}

/**
 * A component reference accepted by the core types.
 *
 * The core stays free of Vue types; the Vue-facing aliases in
 * `components/types.ts` narrow this to Vue's `Component`.
 */
export type MarkdownComponentValue =
  | string
  | object
  | ((...args: never[]) => unknown)
  | undefined

export type MarkdownTagComponents = Record<string, MarkdownComponentValue>

export type MarkdownNodeComponents = Record<string, MarkdownComponentValue>

export interface MarkdownRegionComponents {
  root?: MarkdownComponentValue
  content?: MarkdownComponentValue
  toc?: MarkdownComponentValue
  tocItem?: MarkdownComponentValue
  codeBlock?: MarkdownComponentValue
  mermaidBlock?: MarkdownComponentValue
  error?: MarkdownComponentValue
  empty?: MarkdownComponentValue
  loading?: MarkdownComponentValue
}

export type MarkdownLabelContext = Record<string, unknown>

export type MarkdownLabelValue =
  | string
  | ((context: MarkdownLabelContext) => string)

export interface MarkdownLabels {
  toc: MarkdownLabelValue
  error: MarkdownLabelValue
  empty: MarkdownLabelValue
  loading: MarkdownLabelValue
  headingAnchor: MarkdownLabelValue
  externalLink: MarkdownLabelValue
  copy: MarkdownLabelValue
  copied: MarkdownLabelValue
  download: MarkdownLabelValue
  footnoteReference: MarkdownLabelValue
  footnotes: MarkdownLabelValue
  math: MarkdownLabelValue
  mermaid: MarkdownLabelValue
  mermaidFallback: MarkdownLabelValue
  preview: MarkdownLabelValue
  source: MarkdownLabelValue
  retry: MarkdownLabelValue
  showAll: MarkdownLabelValue
  showLess: MarkdownLabelValue
  exportPng: MarkdownLabelValue
  fullscreen: MarkdownLabelValue
  exitFullscreen: MarkdownLabelValue
  zoomIn: MarkdownLabelValue
  zoomOut: MarkdownLabelValue
  reset: MarkdownLabelValue
}

export type MarkdownTheme = 'light' | 'dark' | 'auto' | 'custom'

export interface HighlightOptions {
  theme?: string
  colorScheme?: 'light' | 'dark'
  [option: string]: unknown
}

export interface HighlightResult {
  language: string
  nodes: MarkdownNode[]
  mode?: 'content' | 'block'
  className?: string
}

export interface CodeBlockAction {
  key: string
  label: MarkdownLabelValue
  run(context: {
    code: string
    language: string
    copy(): Promise<void>
    download(): Promise<void>
  }): void | Promise<void>
}

export interface MarkdownHighlighter {
  id: string
  load?(): Promise<void>
  languages?: string[]
  loadLanguage?(language: string): Promise<void>
  highlight(
    code: string,
    language: string,
    options: HighlightOptions,
  ): HighlightResult
}

export interface MathRenderOptions {
  displayMode?: boolean
  [option: string]: unknown
}

export interface MathRenderResult {
  nodes: MarkdownNode[]
  error?: string
}

export interface MathEngine {
  id: string
  load?(): Promise<void>
  render(tex: string, options: MathRenderOptions): MathRenderResult
}

export interface MermaidRenderOptions {
  theme?: MarkdownTheme
  id?: string
  [option: string]: unknown
}

export interface MermaidRenderResult {
  nodes: MarkdownNode[]
  svg?: string
  error?: string
}

export interface MermaidRenderer {
  id: string
  render(
    source: string,
    options: MermaidRenderOptions,
  ): MermaidRenderResult | Promise<MermaidRenderResult>
}

export interface DiagnosticFormatter {
  id?: string
  format(error: unknown, source: string): MarkdownDiagnostic
}

/** Parsed configuration shared by the provider, presets, and the renderer. */
export interface MarkdownConfig {
  theme?: MarkdownTheme
  tokens?: Record<string, string>
  labels?: Partial<MarkdownLabels>
  components?: MarkdownTagComponents
  regions?: MarkdownRegionComponents
  nodeComponents?: MarkdownNodeComponents
  plugins?: PluginInput[]
  pipeline?: MarkdownPipeline
  highlighter?: MarkdownHighlighter
  mathEngine?: MathEngine
  mermaidRenderer?: MermaidRenderer
  diagnosticsFormatter?: DiagnosticFormatter
  slugger?: MarkdownSlugger
  urlTransform?: MarkdownUrlTransform
}

/** A named, declarative bundle of configuration. Not JSON-serializable. */
export interface MarkdownPreset extends MarkdownConfig {
  name: string
}

export interface MarkdownSlugger {
  slug(value: string): string
  reset?(): void
}

export interface MarkdownElementLike {
  tag: string
  attrs: Record<string, string>
}

export type MarkdownUrlTransform = (
  url: string,
  key: string,
  node: MarkdownElementLike,
) => string | null | undefined

export type AllowElement = (
  node: MarkdownElementNode,
  index: number | undefined,
  parent: MarkdownElementNode | undefined,
) => boolean | null | undefined

/** Result of a pipeline run: hast plus optional document metadata. */
export interface PipelineResult {
  hast: Root
  frontmatter?: Record<string, unknown>
}

export interface PipelineCapabilities {
  /** The pipeline can parse raw HTML into elements. */
  html?: boolean
  /** The pipeline exposes a synchronous path. */
  sync?: boolean
  /** The pipeline reports plugin names. */
  plugins?: boolean
}

export interface PluginContext {
  source: string
  options: MarkdownDocumentOptions
  diagnostics: MarkdownDiagnostic[]
  addDiagnostic(diagnostic: MarkdownDiagnostic): void
  document?: MarkdownDocument
}

export interface MarkdownPlugin {
  name: string
  /**
   * Core invariant markers cannot be disabled. Their names remain in the
   * resolved set for ordering and diagnostics only.
   */
  core?: boolean
  phase?: 'pre' | 'normal' | 'post'
  remarkPlugins?: PluggableList
  rehypePlugins?: PluggableList
  remarkRehypeOptions?: Record<string, unknown>
  transformSource?(source: string, ctx: PluginContext): string
  transformDocument?(
    document: MarkdownDocument,
    ctx: PluginContext,
  ): MarkdownDocument | void
  nodeComponents?: MarkdownNodeComponents
  components?: MarkdownTagComponents
  regions?: MarkdownRegionComponents
  labels?: Partial<MarkdownLabels>
  tokens?: Record<string, string>
  setup?(ctx: PluginContext): void | (() => void)
  onError?(error: unknown, phase: DiagnosticPhase, ctx: PluginContext): void
}

export type PluginInput = MarkdownPlugin | false | null | undefined

export interface PipelineContext {
  source: string
  /**
   * The options that produced this run. Optional for custom pipelines that do
   * not need plugin callbacks.
   */
  options?: MarkdownDocumentOptions
  plugins: MarkdownPlugin[]
  remarkPlugins: PluggableList
  rehypePlugins: PluggableList
  remarkRehypeOptions: Record<string, unknown>
  slugger: MarkdownSlugger
  idPrefix: string
  allowHtml: boolean
  diagnostics: MarkdownDiagnostic[]
}

export interface MarkdownPipeline {
  name: string
  capabilities?: PipelineCapabilities
  process(source: string, ctx: PipelineContext): Promise<PipelineResult>
  processSync?(source: string, ctx: PipelineContext): PipelineResult
  dispose?(): void
}

export interface MarkdownDocumentOptions {
  components?: MarkdownTagComponents
  nodeComponents?: MarkdownNodeComponents
  regions?: MarkdownRegionComponents
  labels?: Partial<MarkdownLabels>
  tokens?: Record<string, string>
  plugins?: PluginInput[]
  disablePlugins?: string[]
  remarkPlugins?: PluggableList
  rehypePlugins?: PluggableList
  remarkRehypeOptions?: Record<string, unknown>
  pipeline?: MarkdownPipeline
  slugger?: MarkdownSlugger
  allowedElements?: string[]
  disallowedElements?: string[]
  unwrapDisallowed?: boolean
  allowElement?: AllowElement
  urlTransform?: MarkdownUrlTransform
  linkTarget?: string
  externalLinkTarget?: string
  baseUrl?: string
  idPrefix?: string
  skipHtml?: boolean
}
