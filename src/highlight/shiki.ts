import { createHighlighter, type Highlighter } from 'shiki'
import type { MarkdownHighlighter } from '../core/types'
import { highlightedNodesFromHast, plaintextHighlight } from './shared'

const THEMES = {
  light: 'github-light',
  dark: 'github-dark',
} as const

const DEFAULT_LANGUAGES = [
  'bash',
  'css',
  'diff',
  'go',
  'html',
  'javascript',
  'json',
  'markdown',
  'python',
  'rust',
  'shell',
  'sql',
  'tsx',
  'typescript',
  'xml',
  'yaml',
]

let highlighterPromise: Promise<Highlighter> | undefined
let highlighter: Highlighter | undefined

async function getHighlighter(): Promise<Highlighter> {
  if (highlighter) return highlighter
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEMES.light, THEMES.dark],
      langs: DEFAULT_LANGUAGES,
    }).then((instance) => {
      highlighter = instance
      return instance
    })
  }
  return highlighterPromise
}

function codeChildren(nodes: readonly unknown[]): readonly unknown[] {
  const root = nodes[0] as { children?: readonly unknown[] } | undefined
  const pre = root?.children?.find(
    (node) => (node as { tagName?: string }).tagName === 'pre',
  ) as { children?: readonly unknown[] } | undefined
  const code = pre?.children?.find(
    (node) => (node as { tagName?: string }).tagName === 'code',
  ) as { children?: readonly unknown[] } | undefined
  return code?.children ?? []
}

/**
 * Optional Shiki adapter. The highlighter, themes, and requested languages
 * load asynchronously; until then callers see plain text.
 */
export const shiki: MarkdownHighlighter = {
  id: 'shiki',
  languages: DEFAULT_LANGUAGES,
  load: async () => {
    await getHighlighter()
  },
  async loadLanguage(language) {
    const instance = await getHighlighter()
    if (!instance.getLoadedLanguages().includes(language)) {
      await instance.loadLanguage(language as never)
    }
  },
  highlight(code, language, options) {
    if (!highlighter) return plaintextHighlight(code, language)
    const loaded = highlighter.getLoadedLanguages()
    const lang = loaded.includes(language as never) ? language : 'text'
    // Keep both theme variants in the token style while making the active
    // scheme the concrete color. Normalization preserves that constrained
    // style subset, so tokens keep their colors instead of rendering
    // monochrome.
    const colorScheme =
      options.colorScheme ?? (options.theme === 'dark' ? 'dark' : 'light')
    const root = highlighter.codeToHast(code, {
      lang: lang as never,
      themes: THEMES,
      defaultColor: colorScheme,
      ...(options.theme ? { theme: options.theme as never } : {}),
    })
    return {
      language: lang,
      nodes: highlightedNodesFromHast(
        codeChildren([root]) as never[],
      ),
    }
  },
}

export default shiki
