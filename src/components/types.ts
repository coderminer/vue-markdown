import type { Component } from 'vue'
import type { MarkdownRegionComponents } from '../core/types'

export type VueMarkdownTagComponents = Record<
  string,
  Component | string | undefined
>

export type VueMarkdownNodeComponents = Record<
  string,
  Component | string | undefined
>

export type VueMarkdownRegionComponents = {
  [K in keyof MarkdownRegionComponents]?: Component | string | undefined
}
