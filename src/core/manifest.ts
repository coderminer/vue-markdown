import { PARTS, TOKEN_NAMES } from './parts'
import type { MarkdownPart } from './parts'

/**
 * Machine-readable customization manifest for one public component.
 *
 * Manifests are Vue-free so documentation, the demo inspector, and validation
 * tests can consume them without importing component code.
 */
export interface MarkdownComponentManifest {
  name: string
  parts: readonly MarkdownPart[]
  tokens: readonly string[]
  slots: readonly string[]
  labels: readonly string[]
  overrideKeys: readonly string[]
  tags?: readonly string[]
  behaviors?: readonly string[]
}

export type ManifestIssueCode =
  | 'duplicate-manifest'
  | 'undeclared-part'
  | 'missing-part'
  | 'undeclared-label'
  | 'missing-slot'

export interface ManifestValidationIssue {
  code: ManifestIssueCode
  component: string
  message: string
}

export interface ManifestRenderSnapshot {
  parts?: readonly string[]
  labels?: readonly string[]
  slots?: readonly string[]
  /** `strict` also requires every declared part to be rendered. */
  mode?: 'strict' | 'observed'
}

const ALL_TOKENS = TOKEN_NAMES

const manifest = (
  name: string,
  options: {
    parts?: MarkdownPart[]
    tokens?: readonly string[]
    slots?: string[]
    labels?: string[]
    overrideKeys?: string[]
    tags?: string[]
    behaviors?: string[]
  },
): MarkdownComponentManifest => ({
  name,
  parts: options.parts ?? [],
  tokens: options.tokens ?? [],
  slots: options.slots ?? [],
  labels: options.labels ?? [],
  overrideKeys: options.overrideKeys ?? [],
  tags: options.tags,
  behaviors: options.behaviors,
})

export const COMPONENT_MANIFESTS: Record<string, MarkdownComponentManifest> = {
  MarkdownRenderer: manifest('MarkdownRenderer', {
    parts: Object.values(PARTS),
    tokens: ALL_TOKENS,
    slots: [
      'root',
      'toc',
      'toc-item',
      'content',
      'error',
      'empty',
      'loading',
      'code',
      'code-actions',
      'header',
      'toolbar',
      'tabs',
      'actions',
      'footer',
      'highlighter',
      'math',
      'math-error',
      'mermaid',
      'mermaid-error',
      'editor',
      'editor-diagnostics',
    ],
    labels: ['toc', 'error', 'empty', 'loading', 'headingAnchor'],
    overrideKeys: ['components', 'regions', 'nodeComponents', 'labels', 'theme', 'tokens'],
    behaviors: ['pipeline', 'slugger', 'urlTransform', 'highlighter', 'mathEngine', 'mermaidRenderer', 'diagnosticsFormatter'],
  }),
  MarkdownRoot: manifest('MarkdownRoot', {
    parts: ['root'],
    tokens: ALL_TOKENS,
    slots: ['default'],
    overrideKeys: ['as', 'tokens', 'theme'],
  }),
  MarkdownContent: manifest('MarkdownContent', {
    parts: ['content'],
    slots: ['default'],
    overrideKeys: ['regions.content'],
  }),
  MarkdownToc: manifest('MarkdownToc', {
    parts: ['toc', 'toc-nav', 'toc-item'],
    tokens: ['--vmd-color-accent', '--vmd-color-muted', '--vmd-space-1', '--vmd-space-3', '--vmd-space-4'],
    labels: ['toc'],
    overrideKeys: ['regions.toc', 'regions.tocItem', 'tocItem'],
  }),
  MarkdownTocItem: manifest('MarkdownTocItem', {
    parts: ['toc-item'],
    tokens: ['--vmd-color-accent', '--vmd-color-muted'],
    labels: ['toc'],
    overrideKeys: ['regions.tocItem'],
  }),
  MarkdownError: manifest('MarkdownError', {
    parts: ['error'],
    tokens: ['--vmd-color-danger', '--vmd-space-3', '--vmd-space-4', '--vmd-radius-md'],
    labels: ['error'],
    overrideKeys: ['regions.error'],
  }),
  MarkdownEmpty: manifest('MarkdownEmpty', {
    parts: ['empty'],
    tokens: ['--vmd-color-muted'],
    labels: ['empty'],
    overrideKeys: ['regions.empty'],
  }),
  MarkdownLoading: manifest('MarkdownLoading', {
    parts: ['loading'],
    tokens: ['--vmd-color-muted'],
    labels: ['loading'],
    overrideKeys: ['regions.loading'],
  }),
  MarkdownParagraph: manifest('MarkdownParagraph', {
    parts: ['paragraph'],
    tokens: ['--vmd-space-4'],
    slots: ['default'],
    overrideKeys: ['p', 'paragraph'],
    tags: ['p'],
  }),
  MarkdownHeading: manifest('MarkdownHeading', {
    parts: ['heading', 'heading-anchor'],
    tokens: ['--vmd-space-2', '--vmd-space-3', '--vmd-space-5', '--vmd-color-muted'],
    slots: ['default'],
    labels: ['headingAnchor'],
    overrideKeys: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'heading'],
    tags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  }),
  MarkdownEmphasis: manifest('MarkdownEmphasis', {
    parts: ['emphasis'],
    slots: ['default'],
    overrideKeys: ['em', 'emphasis'],
    tags: ['em'],
  }),
  MarkdownStrong: manifest('MarkdownStrong', {
    parts: ['strong'],
    slots: ['default'],
    overrideKeys: ['strong'],
    tags: ['strong'],
  }),
  MarkdownStrikethrough: manifest('MarkdownStrikethrough', {
    parts: ['strikethrough'],
    slots: ['default'],
    overrideKeys: ['del', 'strikethrough'],
    tags: ['del'],
  }),
  MarkdownLink: manifest('MarkdownLink', {
    parts: ['link'],
    tokens: ['--vmd-color-accent'],
    slots: ['default'],
    labels: ['externalLink'],
    overrideKeys: ['a', 'link'],
    tags: ['a'],
  }),
  MarkdownImage: manifest('MarkdownImage', {
    parts: ['image'],
    slots: ['fallback'],
    overrideKeys: ['img', 'image'],
    tags: ['img'],
  }),
  MarkdownList: manifest('MarkdownList', {
    parts: ['list'],
    tokens: ['--vmd-space-4', '--vmd-space-5'],
    slots: ['default'],
    overrideKeys: ['ul', 'ol', 'list'],
    tags: ['ul', 'ol'],
  }),
  MarkdownListItem: manifest('MarkdownListItem', {
    parts: ['list-item'],
    tokens: ['--vmd-space-1'],
    slots: ['default'],
    overrideKeys: ['li', 'listItem'],
    tags: ['li'],
  }),
  MarkdownBlockquote: manifest('MarkdownBlockquote', {
    parts: ['blockquote'],
    tokens: ['--vmd-space-4', '--vmd-color-border', '--vmd-color-muted'],
    slots: ['default'],
    overrideKeys: ['blockquote'],
    tags: ['blockquote'],
  }),
  MarkdownHorizontalRule: manifest('MarkdownHorizontalRule', {
    parts: ['hr'],
    tokens: ['--vmd-space-5', '--vmd-color-border'],
    overrideKeys: ['hr', 'horizontalRule'],
    tags: ['hr'],
  }),
  MarkdownTable: manifest('MarkdownTable', {
    parts: ['table'],
    tokens: ['--vmd-space-4'],
    slots: ['default'],
    overrideKeys: ['table'],
    tags: ['table'],
  }),
  MarkdownTableSection: manifest('MarkdownTableSection', {
    parts: ['table-section'],
    tokens: ['--vmd-color-surface'],
    slots: ['default'],
    overrideKeys: ['thead', 'tbody', 'tfoot', 'tableSection'],
    tags: ['thead', 'tbody', 'tfoot'],
  }),
  MarkdownTableRow: manifest('MarkdownTableRow', {
    parts: ['table-row'],
    slots: ['default'],
    overrideKeys: ['tr', 'tableRow'],
    tags: ['tr'],
  }),
  MarkdownTableCell: manifest('MarkdownTableCell', {
    parts: ['table-cell'],
    tokens: ['--vmd-space-2', '--vmd-space-3', '--vmd-color-border'],
    slots: ['default'],
    overrideKeys: ['th', 'td', 'tableCell'],
    tags: ['th', 'td'],
  }),
  MarkdownInlineCode: manifest('MarkdownInlineCode', {
    parts: ['inline-code'],
    tokens: ['--vmd-code-bg', '--vmd-code-text', '--vmd-font-mono', '--vmd-radius-sm'],
    slots: ['default'],
    overrideKeys: ['code', 'inlineCode'],
    tags: ['code'],
  }),
  MarkdownCode: manifest('MarkdownCode', {
    parts: ['code'],
    tokens: ['--vmd-code-bg', '--vmd-code-text', '--vmd-code-border', '--vmd-code-toolbar-bg', '--vmd-font-mono'],
    slots: ['default', 'code', 'code-actions'],
    labels: ['copy', 'copied', 'download'],
    overrideKeys: ['pre', 'code'],
    tags: ['pre', 'code'],
    behaviors: ['highlighter'],
  }),
  CodeBlock: manifest('CodeBlock', {
    parts: [
      'code',
      'code-header',
      'code-heading',
      'code-title',
      'code-file-name',
      'code-lang',
      'code-toolbar',
      'code-body',
      'code-action',
      'code-feedback',
      'highlighter-line',
      'highlighter-gutter',
      'highlighter-toggle',
    ],
    tokens: ['--vmd-code-bg', '--vmd-code-text', '--vmd-code-border', '--vmd-code-toolbar-bg', '--vmd-font-mono'],
    slots: ['code', 'code-actions', 'header', 'toolbar'],
    labels: ['copy', 'copied', 'copyFailed', 'download', 'showAll', 'showLess'],
    overrideKeys: ['pre', 'code', 'codeBlock'],
    tags: ['pre', 'code'],
    behaviors: ['highlighter'],
  }),
  VueSyntaxHighlighter: manifest('VueSyntaxHighlighter', {
    parts: [
      'highlighter',
      'highlighter-header',
      'highlighter-actions',
      'highlighter-footer',
      'highlighter-body',
      'highlighter-line',
      'highlighter-gutter',
      'highlighter-empty',
      'highlighter-toggle',
    ],
    tokens: ['--vmd-code-bg', '--vmd-code-text', '--vmd-font-mono'],
    slots: ['header', 'footer', 'empty', 'actions', 'highlighter'],
    labels: ['empty', 'showAll', 'showLess', 'copyFailed'],
    overrideKeys: ['highlighter'],
    behaviors: ['highlighter'],
  }),
  MarkdownTaskItem: manifest('MarkdownTaskItem', {
    parts: ['task-item', 'task-checkbox'],
    tokens: ALL_TOKENS,
    slots: ['default'],
    labels: [],
    overrideKeys: ['li', 'taskItem'],
    tags: ['li'],
    behaviors: ['task-change'],
  }),
  MarkdownFootnoteReference: manifest('MarkdownFootnoteReference', {
    parts: ['footnote-reference'],
    labels: ['footnoteReference'],
    overrideKeys: ['sup', 'footnoteReference'],
    tags: ['sup'],
  }),
  MarkdownFootnotes: manifest('MarkdownFootnotes', {
    parts: ['footnotes'],
    labels: ['footnotes'],
    slots: ['default'],
    overrideKeys: ['section', 'footnotes'],
    tags: ['section'],
  }),
  MarkdownMath: manifest('MarkdownMath', {
    parts: ['math'],
    tokens: ['--vmd-math-color', '--vmd-math-bg'],
    slots: ['math', 'math-error'],
    labels: ['math'],
    overrideKeys: ['math'],
    behaviors: ['mathEngine'],
  }),
  MermaidBlock: manifest('MermaidBlock', {
    parts: [
      'mermaid',
      'mermaid-header',
      'mermaid-tabs',
      'mermaid-actions',
      'mermaid-action',
      'mermaid-preview',
      'mermaid-source',
      'mermaid-pending',
      'mermaid-error',
      'mermaid-fallback',
      'mermaid-fullscreen',
    ],
    tokens: ['--vmd-mermaid-bg', '--vmd-mermaid-border'],
    slots: ['mermaid', 'mermaid-error', 'header', 'tabs', 'actions'],
    labels: [
      'mermaid',
      'mermaidFallback',
      'preview',
      'source',
      'retry',
      'exportPng',
      'download',
      'fullscreen',
      'exitFullscreen',
      'zoomIn',
      'zoomOut',
      'reset',
      'copy',
      'copied',
    ],
    overrideKeys: ['mermaid', 'mermaidBlock'],
    behaviors: ['mermaidRenderer'],
  }),
  MermaidLiveEditor: manifest('MermaidLiveEditor', {
    parts: [
      'editor',
      'editor-toolbar',
      'editor-pane',
      'editor-divider',
      'editor-preview',
      'editor-diagnostics',
      'mermaid',
      'mermaid-header',
      'mermaid-tabs',
      'mermaid-actions',
      'mermaid-action',
      'mermaid-preview',
      'mermaid-source',
      'mermaid-pending',
      'mermaid-error',
      'mermaid-fallback',
    ],
    tokens: ALL_TOKENS,
    slots: ['editor', 'editor-diagnostics'],
    labels: ['fullscreen', 'exitFullscreen', 'reset', 'mermaid', 'mermaidFallback'],
    overrideKeys: ['editor', 'diagnosticsFormatter'],
    behaviors: ['mermaidRenderer', 'diagnosticsFormatter'],
  }),
  MarkdownMermaid: manifest('MarkdownMermaid', {
    parts: [
      'mermaid',
      'mermaid-header',
      'mermaid-tabs',
      'mermaid-actions',
      'mermaid-action',
      'mermaid-preview',
      'mermaid-source',
      'mermaid-pending',
      'mermaid-error',
      'mermaid-fallback',
      'mermaid-fullscreen',
    ],
    tokens: ['--vmd-mermaid-bg', '--vmd-mermaid-border'],
    slots: ['mermaid', 'mermaid-error', 'header', 'tabs', 'actions'],
    labels: [
      'mermaid',
      'mermaidFallback',
      'preview',
      'source',
      'retry',
      'exportPng',
      'download',
      'fullscreen',
      'exitFullscreen',
      'zoomIn',
      'zoomOut',
      'reset',
      'copy',
      'copied',
    ],
    overrideKeys: ['mermaid', 'mermaidBlock'],
    behaviors: ['mermaidRenderer'],
  }),
  MarkdownBreak: manifest('MarkdownBreak', {
    parts: ['break'],
    overrideKeys: ['br', 'break'],
    tags: ['br'],
  }),
  MarkdownHtml: manifest('MarkdownHtml', {
    parts: ['html'],
    overrideKeys: ['html'],
  }),
  MarkdownCustomTag: manifest('MarkdownCustomTag', {
    parts: ['custom-tag'],
    slots: ['default'],
    overrideKeys: ['customTag', 'x-*'],
  }),
  MarkdownChildren: manifest('MarkdownChildren', {
    parts: [],
    overrideKeys: [],
  }),
}

export function getComponentManifest(
  name: string,
): MarkdownComponentManifest | undefined {
  return COMPONENT_MANIFESTS[name]
}

/**
 * Compare a manifest with rendered output. Missing snapshot fields are skipped
 * so a test can validate only the parts, labels, or slots it can observe.
 */
export function validateManifest(
  entry: MarkdownComponentManifest,
  snapshot: ManifestRenderSnapshot,
): ManifestValidationIssue[] {
  const issues: ManifestValidationIssue[] = []

  if (snapshot.parts) {
    const declared = new Set(entry.parts)
    const rendered = new Set(snapshot.parts)
    for (const part of rendered) {
      if (!declared.has(part as MarkdownPart)) {
        issues.push({
          code: 'undeclared-part',
          component: entry.name,
          message: `Rendered part "${part}" is not declared by ${entry.name}.`,
        })
      }
    }
    for (const part of declared) {
      if (!rendered.has(part) && snapshot.mode !== 'observed') {
        issues.push({
          code: 'missing-part',
          component: entry.name,
          message: `Declared part "${part}" was not rendered by ${entry.name}.`,
        })
      }
    }
  }

  if (snapshot.labels) {
    const declared = new Set(entry.labels)
    for (const label of snapshot.labels) {
      if (!declared.has(label)) {
        issues.push({
          code: 'undeclared-label',
          component: entry.name,
          message: `Label "${label}" is not declared by ${entry.name}.`,
        })
      }
    }
  }

  if (snapshot.slots) {
    const declared = new Set(entry.slots)
    for (const slot of snapshot.slots) {
      if (!declared.has(slot)) {
        issues.push({
          code: 'missing-slot',
          component: entry.name,
          message: `Slot "${slot}" is not declared by ${entry.name}.`,
        })
      }
    }
  }

  return issues
}

export function validateManifestRegistry(
  manifests: Record<string, MarkdownComponentManifest> = COMPONENT_MANIFESTS,
): ManifestValidationIssue[] {
  const issues: ManifestValidationIssue[] = []
  const names = new Set<string>()
  for (const entry of Object.values(manifests)) {
    if (names.has(entry.name)) {
      issues.push({
        code: 'duplicate-manifest',
        component: entry.name,
        message: `Duplicate manifest name "${entry.name}".`,
      })
    }
    names.add(entry.name)
  }
  return issues
}
