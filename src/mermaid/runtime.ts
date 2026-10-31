import type {
  MarkdownTheme,
  MermaidRenderOptions,
  MermaidRenderResult,
} from '../core/types'
import { sanitizeSvg } from './sanitize'

interface MermaidApi {
  initialize(config: Record<string, unknown>): void | Promise<void>
  render(id: string, source: string): Promise<{ svg: string }>
}

let mermaidPromise: Promise<MermaidApi> | undefined
let initializedTheme: MarkdownTheme | undefined
let queue: Promise<unknown> = Promise.resolve()
let counter = 0

function themeName(theme: MarkdownTheme | undefined): string {
  if (theme === 'dark') return 'dark'
  if (theme === 'custom') return 'neutral'
  return 'default'
}

async function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((module) => {
      const api = (module as { default?: MermaidApi }).default ?? module
      return api as MermaidApi
    })
  }
  return mermaidPromise
}

async function initialize(api: MermaidApi, theme: MarkdownTheme | undefined): Promise<void> {
  if (initializedTheme === theme) return
  await api.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: themeName(theme),
    fontFamily: 'var(--vmd-font-sans)',
  })
  initializedTheme = theme
}

function classify(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Mermaid rendering failed.'
}

/**
 * Render one diagram through a single lazy Mermaid instance. Renders are
 * serialized so Mermaid's global state cannot interleave.
 */
export async function renderMermaid(
  source: string,
  options: MermaidRenderOptions = {},
): Promise<MermaidRenderResult> {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return { nodes: [], error: 'Mermaid requires a browser environment.' }
  }
  if (!source.trim()) {
    return { nodes: [], error: 'Mermaid source is empty.' }
  }

  const run = async (): Promise<MermaidRenderResult> => {
    try {
      const api = await loadMermaid()
      await initialize(api, options.theme)
      const id = options.id ?? `vmd-mermaid-${++counter}`
      const { svg } = await api.render(id, source)
      return { svg, nodes: sanitizeSvg(svg) }
    } catch (error) {
      return { nodes: [], error: classify(error) }
    }
  }

  const result = queue.then(run, run)
  queue = result.catch(() => undefined)
  return result
}

export function resetMermaidRuntime(): void {
  mermaidPromise = undefined
  initializedTheme = undefined
  queue = Promise.resolve()
  counter = 0
}

export default renderMermaid
