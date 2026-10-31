## MODIFIED Requirements

### Requirement: Compatibility

The library SHALL support Vue 3.5 and later, Vite 7 and later for development, Node 20 and later for building and SSR, and the same runtime baseline as Vue 3: native ES2016, no IE11, with an effective floor of Chrome 54+, Edge 15+, Firefox 52+, Safari 10.1+, and iOS 10.3+. Chrome 54 rather than 52 is required because a bundled dependency uses `Object.entries` during module initialization. Runtime APIs SHALL stay within ES2016 and SHALL NOT depend on Node.js built-in modules or server-only APIs. Source syntax MAY use newer TypeScript or JavaScript features because the build SHALL downlevel it to ES2016. The optional stylesheet SHALL target the same browser baseline. It SHALL use physical-property fallbacks for logical properties, `:root` rather than `:where(:root)`, a `:focus` fallback alongside `:focus-visible`, a `-webkit-sticky` fallback, and a `left` fallback for `text-align: start`; newer declarations MAY remain as progressive enhancement. The package SHALL declare its supported Vue, Vite, Node, and browser ranges, the build SHALL pin the JavaScript target to ES2016, and the CSS target SHALL be pinned to the shared baseline.

#### Scenario: Browser runtime
- **WHEN** the built library is loaded in a browser with native ES2016 support at or above the effective floor
- **THEN** all components initialize without Node.js polyfills

#### Scenario: Stylesheet baseline
- **WHEN** a host imports the bundled stylesheet in Chrome 54+, Edge 15+, Firefox 52+, Safari 10.1+, or iOS 10.3+
- **THEN** layout and theming remain usable through the documented fallbacks

#### Scenario: Stylesheet fallbacks
- **WHEN** a baseline browser ignores a modern declaration such as a logical property or `:focus-visible`
- **THEN** the physical-property, `:focus`, `-webkit-sticky`, or `text-align: left` fallback keeps the documented layout and interaction usable

#### Scenario: Supported toolchain
- **WHEN** a consumer uses Vue 3.5+, Vite 7+, and Node 20+
- **THEN** development, build, and SSR commands run without unsupported-runtime warnings
