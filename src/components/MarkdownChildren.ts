import { defineComponent, type PropType } from 'vue'
import type { MarkdownNode } from '../core/types'
import { useRenderContext } from './context'
import { renderNodes } from './render'

/** Renders a model node list. Text nodes stay strings, not components. */
export default defineComponent({
  name: 'MarkdownChildren',
  props: {
    nodes: {
      type: Array as PropType<MarkdownNode[]>,
      default: () => [],
    },
  },
  setup(props) {
    const ctx = useRenderContext()
    return () => renderNodes(props.nodes, ctx)
  },
})
