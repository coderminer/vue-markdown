import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MarkdownMath from '../../src/components/MarkdownMath.vue'

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
})
