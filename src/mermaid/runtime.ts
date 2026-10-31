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
let initializedTheme: MarkdownTheme | null | undefined = null
let queue: Promise<unknown> = Promise.resolve()
let counter = 0

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

function themeName(theme: MarkdownTheme | undefined): string {
  if (theme === 'dark' || (theme === 'auto' && prefersDark())) return 'dark'
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
  if (initializedTheme !== null && initializedTheme === theme) return
  await api.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    htmlLabels: false,
    theme: themeName(theme),
    fontFamily: 'var(--vmd-font-sans)',
  })
  initializedTheme = theme
}

function missingMermaid(message: string): boolean {
  return /(cannot find module|failed to resolve module|failed to fetch dynamically imported module|err_module_not_found|not installed)/i.test(
    message,
  ) && /mermaid/i.test(message)
}

/** Report the actual failure, adding an install hint for a missing peer. */
export function classifyMermaidError(error: unknown): string {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : 'Mermaid rendering failed.'
  if (missingMermaid(message)) {
    return 'Mermaid is not available. Install the optional `mermaid` peer dependency to render diagrams.'
  }
  return message
}

/** Create a unique DOM-safe identifier for one Mermaid render. */
export function createMermaidRenderId(): string {
  return `vmd-mermaid-${++counter}`
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
      const id = options.id ?? createMermaidRenderId()
      const { svg } = await api.render(id, source)
      return { svg, nodes: sanitizeSvg(svg) }
    } catch (error) {
      return { nodes: [], error: classifyMermaidError(error) }
    }
  }

  const result = queue.then(run, run)
  queue = result.catch(() => undefined)
  return result
}

export function resetMermaidRuntime(): void {
  mermaidPromise = undefined
  initializedTheme = null
  queue = Promise.resolve()
  counter = 0
}

export default renderMermaid
