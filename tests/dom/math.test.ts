import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import MarkdownRenderer from '../../src/components/MarkdownRenderer.vue'
import MarkdownMath from '../../src/components/MarkdownMath.vue'
import { mathPlugin } from '../../src/math/plugin'
import type { MathEngine } from '../../src/core/types'

describe('MarkdownMath', () => {
  it('renders pre-rendered nodes and an error fallback', () => {
    const wrapper = mount(MarkdownMath, {
      props: {
        tex: 'x^2',
        displayMode: false,
        rendered: [{ kind: 'text', key: 'x', value: 'rendered math' }],
      },
    })
    expect(wrapper.text()).toContain('rendered math')

    const error = mount(MarkdownMath, {
      props: { tex: 'bad', error: 'Invalid TeX' },
    })
    expect(error.find('[data-vmd-part="math-error"]').exists()).toBe(true)
    expect(error.text()).toContain('bad')
  })

  it('surfaces default KaTeX error markup as a math diagnostic', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '$\\frac{1}{$',
        plugins: [mathPlugin()],
      },
    })
    await nextTick()
    expect(wrapper.find('[data-vmd-part="math"]').attributes('data-error')).toBe(
      'true',
    )
    expect(wrapper.find('[data-vmd-part="math-error"]').exists()).toBe(true)
    const errors = wrapper.emitted('render-error') ?? []
    expect(
      errors.some((event) => (event[0] as { code: string }).code === 'math-error'),
    ).toBe(true)
  })

  it('ignores default KaTeX error markup when a custom engine succeeds', async () => {
    const mathEngine: MathEngine = {
      id: 'test-engine',
      render: (tex) => ({
        nodes: [{ kind: 'text', key: 'engine-ok', value: `ENGINE_OK:${tex}` }],
      }),
    }
    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '$\\frac{1}{$',
        plugins: [mathPlugin()],
        mathEngine,
      },
    })
    await nextTick()
    expect(wrapper.find('[data-vmd-part="math"]').attributes('data-error')).toBe(
      undefined,
    )
    expect(wrapper.find('[data-vmd-part="math-error"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('ENGINE_OK:\\frac{1}{')
  })
})
