import { defineComponent, h } from 'vue'
import { visit } from 'unist-util-visit'
import type { MarkdownNodeRenderContext } from '@coderminer/vue-markdown'
import { defineMarkdownPlugin } from '@coderminer/vue-markdown/plugins'

export interface SamplePluginHooks {
  onSetup?: () => void
  onCleanup?: () => void
  onError?: (error: unknown, phase: string) => void
}

const SampleCallout = defineComponent({
  setup(_, { slots }) {
    return () =>
      h('aside', { class: 'demo-callout demo-sample-callout' }, [
        h('strong', { class: 'demo-callout-title' }, 'Sample plugin'),
        h('div', slots.default?.()),
      ])
  },
})

function remarkUppercaseKeyword() {
  return (tree: { children: unknown[] }) => {
    visit(tree as never, 'text', (node: { value: string }) => {
      node.value = node.value.split('plugin').join('PLUGIN')
    })
  }
}

function rehypeMarkHeadings() {
  return (tree: { children: unknown[] }) => {
    visit(tree as never, 'element', (node: {
      tagName: string
      properties: Record<string, unknown>
    }) => {
      if (/^h[1-6]$/.test(node.tagName)) {
        node.properties = { ...node.properties, 'data-sample-heading': 'yes' }
      }
    })
  }
}

/**
 * Complete sample plugin used by the demo and the plugin guide. It exercises
 * every public contribution point:
 *
 * - `transformSource` injects a sample callout before parsing
 * - `remarkPlugins` rewrites text nodes
 * - `rehypePlugins` decorates headings after the sanitizer
 * - `nodeComponents` replaces blockquote rendering
 * - `transformDocument` adds frontmatter metadata
 * - `labels` and `tokens` customise the rendered UI
 * - `setup` / cleanup expose a lifecycle hook
 * - `onError` receives isolated failures
 */
export function createSamplePlugin(hooks: SamplePluginHooks = {}) {
  return defineMarkdownPlugin({
    name: 'sample-plugin',
    phase: 'normal',
    remarkPlugins: [remarkUppercaseKeyword],
    rehypePlugins: [rehypeMarkHeadings],
    labels: { toc: 'Sample contents' },
    tokens: { '--vmd-color-accent': 'rgb(130, 80, 223)' },
    transformSource(source) {
      return source.replace(
        /\[\[sample\]\]/g,
        '> The transformSource hook injected this callout before parsing.',
      )
    },
    transformDocument(document) {
      return {
        ...document,
        frontmatter: { ...(document.frontmatter ?? {}), samplePlugin: true },
      }
    },
    nodeComponents: {
      blockquote: (ctx: MarkdownNodeRenderContext) =>
        h(SampleCallout, null, { default: () => ctx.defaultRender() }),
    },
    setup() {
      hooks.onSetup?.()
      return () => {
        hooks.onCleanup?.()
      }
    },
    onError(error, phase) {
      hooks.onError?.(error, phase)
    },
  })
}
