import type {
  MarkdownTheme,
  MermaidRenderOptions,
  MermaidRenderResult,
} from '../core/types'
import { sanitizeSvgAsync } from './sanitize-svg-lazy'

interface MermaidApi {
  initialize(config: Record<string, unknown>): void | Promise<void>
  render(id: string, source: string): Promise<{ svg: string }>
}

interface MermaidRuntimeState {
  api: Promise<MermaidApi> | undefined
  /**
   * Key of the configuration currently installed on the shared Mermaid module.
   * Mermaid configuration is process-wide, so this cannot live on a per-block
   * instance; it is checked before every render inside the serialized queue.
   */
  initializedKey: string | undefined
  /** Serializes renders because Mermaid keeps configuration and IDs globally. */
  queue: Promise<unknown>
  counter: number
}

function createRuntimeState(): MermaidRuntimeState {
  return {
    api: undefined,
    initializedKey: undefined,
    queue: Promise.resolve(),
    counter: 0,
  }
}

// One state object rather than several loose module-level variables. The state
// is shared by design because Mermaid configuration is global; keeping it in a
// single object makes that ownership explicit and gives reset one place to
// clear every field.
const runtime = createRuntimeState()

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

function initializeConfig(theme: MarkdownTheme | undefined): Record<string, unknown> {
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    htmlLabels: false,
    theme: themeName(theme),
    fontFamily: 'var(--vmd-font-sans)',
  }
}

function configKey(config: Record<string, unknown>): string {
  return JSON.stringify(config)
}

async function loadMermaid(state: MermaidRuntimeState): Promise<MermaidApi> {
  if (!state.api) {
    state.api = import('mermaid')
      .then((module) => {
        const api = (module as { default?: MermaidApi }).default ?? module
        return api as MermaidApi
      })
      .catch((error: unknown) => {
        // A rejected dynamic import must not be cached: the retry control and a
        // later mount should be able to load the runtime after a transient
        // chunk or network failure.
        state.api = undefined
        throw error
      })
  }
  return state.api
}

async function initialize(
  state: MermaidRuntimeState,
  api: MermaidApi,
  theme: MarkdownTheme | undefined,
): Promise<void> {
  const config = initializeConfig(theme)
  const key = configKey(config)
  if (state.initializedKey === key) return
  await api.initialize(config)
  state.initializedKey = key
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
  runtime.counter += 1
  return `vmd-mermaid-${runtime.counter}`
}

/**
 * Render one diagram through a single lazy Mermaid instance. Renders are
 * serialized so Mermaid's global configuration cannot be changed while another
 * diagram is rendering. The configuration key is checked inside that queue, so
 * blocks with different themes cannot reuse a stale initialization.
 */
export async function renderMermaid(
  source: string,
  options: MermaidRenderOptions = {},
): Promise<MermaidRenderResult> {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return {
      nodes: [],
      error:
        'Mermaid requires a browser environment. Render it on the client after mount, or pass a pre-rendered renderer.',
    }
  }
  // The renderer is async, so a caller may accidentally pass its Promise in
  // place of the awaited source. Fail with a result instead of throwing.
  if (typeof source !== 'string') {
    return {
      nodes: [],
      error:
        'Mermaid source must be a string. If you used `renderMermaid()`, await its result before passing it as the source.',
    }
  }
  if (!source.trim()) {
    return {
      nodes: [],
      error: 'Mermaid source is empty. Provide diagram text such as `graph TD; A-->B`.',
    }
  }

  const state = runtime
  const run = async (): Promise<MermaidRenderResult> => {
    try {
      const api = await loadMermaid(state)
      await initialize(state, api, options.theme)
      const id = options.id ?? createMermaidRenderId()
      const { svg } = await api.render(id, source)
      return { svg, nodes: await sanitizeSvgAsync(svg) }
    } catch (error) {
      return { nodes: [], error: classifyMermaidError(error) }
    }
  }

  const result = state.queue.then(run, run)
  state.queue = result.catch(() => undefined)
  return result
}

export function resetMermaidRuntime(): void {
  runtime.api = undefined
  runtime.initializedKey = undefined
  // Keep the queue tail and the monotonic counter. Replacing the queue while a
  // render is in flight would let a new render interleave with it, which breaks
  // the serialization guarantee; resetting the counter could reuse a DOM id
  // that still exists in the page. The cached module is dropped only so the
  // next render re-checks the optional peer and reinitializes configuration.
}

export default renderMermaid
