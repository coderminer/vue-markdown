import type { EditorView } from '@codemirror/view'

export interface MermaidEditorHandle {
  destroy(): void
  focus(): void
  setValue(value: string): void
  focusLine(line: number): void
}

export interface CreateEditorOptions {
  value: string
  theme?: 'light' | 'dark' | 'auto' | 'custom'
  onChange(value: string): void
}

/**
 * Minimal Mermaid tokenizer. CodeMirror has no official Mermaid language
 * package, so a StreamLanguage keeps the editor lazy and dependency-free.
 */
function mermaidMode() {
  return {
    startState: () => ({}),
    token(stream: {
      sol(): boolean
      eatSpace(): boolean
      match(pattern: RegExp): boolean
      next(): string | undefined
      skipToEnd(): void
    }) {
      if (stream.sol()) stream.eatSpace()
      if (stream.match(/^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|C4Context)\b/)) {
        return 'keyword'
      }
      if (stream.match(/%%[^\n]*/)) {
        stream.skipToEnd()
        return 'comment'
      }
      if (stream.match(/"[^"]*"/)) return 'string'
      if (stream.match(/-->|---|==>|-.->|--x|--o|<\|--|\|\|--|\.\.>/)) {
        return 'operator'
      }
      if (stream.match(/[{}[\]()]/)) return 'bracket'
      stream.next()
      return null
    },
  }
}

export async function createMermaidEditor(
  parent: HTMLElement,
  options: CreateEditorOptions,
): Promise<MermaidEditorHandle> {
  const [viewModule, stateModule, languageModule, commandsModule] =
    await Promise.all([
      import('@codemirror/view'),
      import('@codemirror/state'),
      import('@codemirror/language'),
      import('@codemirror/commands'),
    ])

  const { EditorView, keymap, placeholder } = viewModule
  const { EditorState } = stateModule
  const { StreamLanguage } = languageModule
  const { defaultKeymap, history, historyKeymap } = commandsModule

  const theme = EditorView.theme({
    '&': {
      height: '100%',
      backgroundColor: 'var(--vmd-code-bg, #f6f8fa)',
      color: 'var(--vmd-code-text, #1f2328)',
      fontSize: 'var(--vmd-font-size-sm, 0.875rem)',
    },
    '.cm-content': {
      fontFamily: 'var(--vmd-font-mono, monospace)',
      padding: '0.75rem',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--vmd-code-toolbar-bg, #eef1f4)',
      color: 'var(--vmd-color-muted, #59636e)',
      border: 'none',
    },
    '&.cm-focused': { outline: 'none' },
  })

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: options.value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        StreamLanguage.define(mermaidMode() as never),
        placeholder('Write Mermaid source…'),
        EditorView.lineWrapping,
        theme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) options.onChange(update.state.doc.toString())
        }),
      ],
    }),
  })

  return {
    destroy() {
      view.destroy()
    },
    focus() {
      view.focus()
    },
    setValue(value: string) {
      if (value !== view.state.doc.toString()) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: value },
        })
      }
    },
    focusLine(line: number) {
      const docLine = view.state.doc.line(Math.max(1, Math.min(line, view.state.doc.lines)))
      view.dispatch({
        selection: { anchor: docLine.from, head: docLine.to },
        scrollIntoView: true,
      })
      view.focus()
    },
  }
}

export type { EditorView }
