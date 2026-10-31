import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { defineAsyncComponent } from 'vue'
import 'vue-markdown-suite/style.css'
import 'vue-markdown-suite/styles/math-full.css'
import './custom.css'
import DemoFrame from './components/DemoFrame.vue'

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
    app.component(
      'CodeBlockLab',
      defineAsyncComponent(() => import('./components/CodeBlockLab.vue')),
    )
    app.component('DemoFrame', DemoFrame)
  },
} satisfies Theme
