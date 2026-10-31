import { h, type FunctionalComponent, type VNode } from 'vue'

export type IconName =
  | 'copy'
  | 'check'
  | 'download'
  | 'preview'
  | 'source'
  | 'zoom-in'
  | 'zoom-out'
  | 'reset'
  | 'image'
  | 'fullscreen'
  | 'exit-fullscreen'
  | 'retry'
  | 'diagram'

const ICON_PATHS: Record<IconName, string[]> = {
  copy: ['M8 8h12v12H8z', 'M4 16V4h12'],
  check: ['M4 12l5 5L20 6'],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M4 20h16'],
  preview: [
    'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z',
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  ],
  source: ['M8 6l-5 6 5 6', 'M16 6l5 6-5 6', 'M14 4l-4 16'],
  'zoom-in': [
    'M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12z',
    'M10 7v6',
    'M7 10h6',
    'M15.5 15.5L21 21',
  ],
  'zoom-out': [
    'M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12z',
    'M7 10h6',
    'M15.5 15.5L21 21',
  ],
  reset: [
    'M8 8h8v8H8z',
    'M4 12h4',
    'M16 12h4',
    'M12 4v4',
    'M12 16v4',
  ],
  image: [
    'M4 5h16v14H4z',
    'M4 16l4-4 4 4 3-3 5 5',
    'M9 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  ],
  fullscreen: [
    'M8 3H3v5',
    'M16 3h5v5',
    'M21 16v5h-5',
    'M3 16v5h5',
  ],
  'exit-fullscreen': [
    'M3 8h5V3',
    'M21 8h-5V3',
    'M16 21v-5h5',
    'M8 21v-5H3',
  ],
  retry: [
    'M20 12a8 8 0 1 1-2.34-5.66',
    'M20 4v6h-6',
  ],
  diagram: [
    'M4 5h6v4H4z',
    'M14 15h6v4h-6z',
    'M7 9v3h10v3',
  ],
}

export const Icon: FunctionalComponent<{ name: IconName }> = (props): VNode =>
  h(
    'svg',
    {
      class: 'vmd-icon',
      viewBox: '0 0 24 24',
      'aria-hidden': 'true',
      focusable: 'false',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.8,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    ICON_PATHS[props.name].map((d) => h('path', { d })),
  )

export default Icon
