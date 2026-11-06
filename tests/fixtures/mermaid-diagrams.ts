/**
 * Realistic Mermaid diagrams used by the integration tests.
 *
 * Each source is accepted by the real `mermaid` parser. The corpus covers the
 * diagram families a documentation site commonly embeds so the plugin and
 * renderer are exercised with more than a one-line flowchart.
 */
export interface RealMermaidDiagram {
  name: string
  /** Diagram type reported by `mermaid.parse()`. */
  type: string
  source: string
}

export const realMermaidDiagrams: RealMermaidDiagram[] = [
  {
    name: 'Release flow',
    type: 'flowchart-v2',
    source: `flowchart TD
  A[Start] --> B{Is it working?}
  B -- Yes --> C[Ship it]
  B -- No --> D[Debug]
  D --> B`,
  },
  {
    name: 'Session sequence',
    type: 'sequence',
    source: `sequenceDiagram
  autonumber
  participant U as User
  participant A as API
  U->>A: POST /sessions
  A-->>U: 201 Created
  Note over U,A: Token stored`,
  },
  {
    name: 'Repository classes',
    type: 'classDiagram',
    source: `classDiagram
  class Repository~T~ {
    +find(id) T
    +save(entity T) void
  }
  class UserRepository {
    +find(id) User
  }
  Repository <|-- UserRepository`,
  },
  {
    name: 'Fetch state',
    type: 'stateDiagram',
    source: `stateDiagram-v2
  [*] --> Idle
  Idle --> Loading: fetch
  Loading --> Ready: resolve
  Loading --> Error: reject
  Error --> Idle: retry
  Ready --> [*]`,
  },
  {
    name: 'Content relations',
    type: 'er',
    source: `erDiagram
  USER ||--o{ POST : writes
  POST ||--o{ COMMENT : receives
  USER {
    string id PK
    string email
  }`,
  },
  {
    name: 'Release plan',
    type: 'gantt',
    source: `gantt
  title Release plan
  dateFormat YYYY-MM-DD
  section Build
  Implement :done, a1, 2026-01-01, 7d
  Test      :active, a2, after a1, 3d`,
  },
  {
    name: 'Traffic share',
    type: 'pie',
    source: `pie title Traffic share
  "Docs" : 45
  "Blog" : 30
  "App" : 25`,
  },
]

/** One Markdown document that embeds every diagram as a fenced block. */
export const realMermaidMarkdown = realMermaidDiagrams
  .map(
    (diagram) =>
      `## ${diagram.name}\n\n\`\`\`mermaid\n${diagram.source}\n\`\`\``,
  )
  .join('\n\n')
