/**
 * Stable part names and token names.
 *
 * Parts are rendered as `class="vmd-<part>"` plus `data-vmd-part="<part>"`.
 * They are stable within a major version and are never generated or hashed.
 */

export const VMD_CLASS_PREFIX = 'vmd-'

export const PARTS = {
  root: 'root',
  content: 'content',
  toc: 'toc',
  tocNav: 'toc-nav',
  tocItem: 'toc-item',
  paragraph: 'paragraph',
  heading: 'heading',
  headingAnchor: 'heading-anchor',
  emphasis: 'emphasis',
  strong: 'strong',
  strikethrough: 'strikethrough',
  link: 'link',
  image: 'image',
  list: 'list',
  listItem: 'list-item',
  blockquote: 'blockquote',
  hr: 'hr',
  break: 'break',
  table: 'table',
  tableSection: 'table-section',
  tableRow: 'table-row',
  tableCell: 'table-cell',
  inlineCode: 'inline-code',
  code: 'code',
  codeHeader: 'code-header',
  codeLang: 'code-lang',
  codeToolbar: 'code-toolbar',
  codeActions: 'code-actions',
  codeBody: 'code-body',
  codeFeedback: 'code-feedback',
  highlighter: 'highlighter',
  highlighterHeader: 'highlighter-header',
  highlighterBody: 'highlighter-body',
  highlighterGutter: 'highlighter-gutter',
  highlighterLine: 'highlighter-line',
  highlighterHidden: 'highlighter-hidden',
  highlighterEmpty: 'highlighter-empty',
  math: 'math',
  mathError: 'math-error',
  mermaid: 'mermaid',
  mermaidHeader: 'mermaid-header',
  mermaidTabs: 'mermaid-tabs',
  mermaidActions: 'mermaid-actions',
  mermaidPreview: 'mermaid-preview',
  mermaidSource: 'mermaid-source',
  mermaidPending: 'mermaid-pending',
  mermaidError: 'mermaid-error',
  mermaidFullscreen: 'mermaid-fullscreen',
  editor: 'editor',
  editorPane: 'editor-pane',
  editorDivider: 'editor-divider',
  editorPreview: 'editor-preview',
  editorDiagnostics: 'editor-diagnostics',
  editorToolbar: 'editor-toolbar',
  editorFullscreen: 'editor-fullscreen',
  html: 'html',
  customTag: 'custom-tag',
  taskItem: 'task-item',
  footnoteReference: 'footnote-reference',
  footnotes: 'footnotes',
  searchMatch: 'search-match',
  error: 'error',
  empty: 'empty',
  loading: 'loading',
} as const

export type MarkdownPart = (typeof PARTS)[keyof typeof PARTS]

export const TOKENS = {
  fontFamily: '--vmd-font-family',
  fontMono: '--vmd-font-mono',
  fontSize: '--vmd-font-size',
  lineHeight: '--vmd-line-height',
  colorText: '--vmd-color-text',
  colorMuted: '--vmd-color-muted',
  colorBg: '--vmd-color-bg',
  colorSurface: '--vmd-color-surface',
  colorBorder: '--vmd-color-border',
  colorAccent: '--vmd-color-accent',
  colorAccentContrast: '--vmd-color-accent-contrast',
  colorDanger: '--vmd-color-danger',
  colorSuccess: '--vmd-color-success',
  space1: '--vmd-space-1',
  space2: '--vmd-space-2',
  space3: '--vmd-space-3',
  space4: '--vmd-space-4',
  space5: '--vmd-space-5',
  space6: '--vmd-space-6',
  radiusSm: '--vmd-radius-sm',
  radiusMd: '--vmd-radius-md',
  radiusLg: '--vmd-radius-lg',
  shadowSm: '--vmd-shadow-sm',
  shadowMd: '--vmd-shadow-md',
  motionDuration: '--vmd-motion-duration',
  motionEasing: '--vmd-motion-easing',
  codeBg: '--vmd-code-bg',
  codeText: '--vmd-code-text',
  codeBorder: '--vmd-code-border',
  codeToolbarBg: '--vmd-code-toolbar-bg',
  mathColor: '--vmd-math-color',
  mathBg: '--vmd-math-bg',
  mermaidBg: '--vmd-mermaid-bg',
  mermaidBorder: '--vmd-mermaid-border',
  zFullscreen: '--vmd-z-fullscreen',
} as const

export type MarkdownToken = (typeof TOKENS)[keyof typeof TOKENS]

export interface PartAttributes {
  class: string
  'data-vmd-part': string
}

/** Build the class and `data-vmd-part` attributes for a documented part. */
export function partAttrs(part: MarkdownPart): PartAttributes {
  return {
    class: `${VMD_CLASS_PREFIX}${part}`,
    'data-vmd-part': part,
  }
}

/** Merge part attributes with host-provided class names. */
export function partClass(part: MarkdownPart, extra?: string): string {
  return extra
    ? `${VMD_CLASS_PREFIX}${part} ${extra}`
    : `${VMD_CLASS_PREFIX}${part}`
}

export const PART_NAMES: readonly MarkdownPart[] = Object.keys(PARTS).map(
  (key) => PARTS[key as keyof typeof PARTS],
)
export const TOKEN_NAMES: readonly MarkdownToken[] = Object.keys(TOKENS).map(
  (key) => TOKENS[key as keyof typeof TOKENS],
)
