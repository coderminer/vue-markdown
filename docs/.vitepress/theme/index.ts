import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { defineAsyncComponent } from 'vue'
import 'vue-markdown-suite/style.css'
import 'katex/dist/katex.min.css'
import 'vue-markdown-suite/styles/math.css'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component(
      'LivePlayground',
      defineAsyncComponent(() => import('./components/LivePlayground.vue')),
    )
    app.component(
      'CompleteExample',
      defineAsyncComponent(() => import('./components/CompleteExample.vue')),
    )
    app.component(
      'CustomizationLab',
      defineAsyncComponent(() => import('./components/CustomizationLab.vue')),
    )
  },
} satisfies Theme
