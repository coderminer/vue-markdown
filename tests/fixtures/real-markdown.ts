/**
 * Realistic Markdown documents used by the integration and security tests.
 *
 * The goal is to exercise the node types a real README or documentation page
 * produces: frontmatter, every heading level, paragraphs, emphasis, inline
 * code, links, images, blockquotes, nested lists, task lists, tables, fenced
 * and indented code, raw HTML, and GFM constructs.
 */
export const realMarkdown = `---
title: Real-world Markdown
description: A document that exercises the common Markdown node types.
tags:
  - markdown
  - security
draft: false
---

# Real-world Markdown

An introductory paragraph with **bold text**, *italic text*, ~~struck text~~,
\`inline code\`, an [external link](https://example.com/docs), a
[relative link](./guide/start), and an ![architecture diagram](./assets/diagram.png "Diagram title").
This line ends with a hard break.  
This is the line after the break.

The entity &copy; stays text, and so does the escaped \\*asterisk\\* pair.

## Headings

### Level three

#### Level four

##### Level five

###### Level six

Setext heading
--------------

> A blockquote with **bold** and a [citation](https://example.com/quote).
>
> > A nested quote with \`inline code\`.

- first unordered item
- second item with **strong text**
  - nested item one
  - nested item two
- third item with a [link](./guide)

1. first ordered item
2. second ordered item
   1. nested ordered item
   2. another nested item

- [x] completed task
- [ ] open task

| Name | Kind | Count |
| --- | :---: | ---: |
| alpha | text | 1 |
| beta | **bold** | 2 |

\`\`\`ts
const dangerous = 'javascript:alert(1)'
const markup = '<script>alert(1)</script>'
console.log(dangerous, markup)
\`\`\`

    indented code block

---

Term text with <kbd>Ctrl</kbd>+<kbd>C</kbd>, H<sub>2</sub>O, x<sup>2</sup>, and
<mark>highlighted text</mark>.

<div class="callout" data-kind="note">
  <strong>Raw HTML block</strong> with <a href="https://example.com/raw">a link</a>.
</div>

<details>
  <summary>More information</summary>
  <p>Hidden details with <em>emphasis</em>.</p>
</details>

An autolink <https://example.com/auto> and a [reference link][guide].

[guide]: https://example.com/reference "Reference title"
`

/**
 * A realistic document that mixes safe prose with hostile links, images,
 * `srcset` candidates, raw HTML, SVG, and CSS injection. The code blocks
 * intentionally contain executable-looking text so tests can prove it stays
 * literal instead of becoming markup.
 */
export const hostileMarkdown = `# Security corpus

Read the [safe documentation](https://example.com/docs) or the
[relative guide](./guide). The [unsafe link](javascript:alert(1)) and the
[JavaScript link](JaVaScRiPt:alert(2)) must disappear.

![safe image](https://example.com/safe.png)

![unsafe image](javascript:alert(3))

<img src="data:image/svg+xml,<svg onload=alert(4)>" alt="SVG data image">

<img src="safe.png" alt="mixed srcset"
  srcset="safe.png 1x, javascript:alert(5) 2x, data:image/svg+xml,<svg/> 3x"
  onerror="alert(6)">

Inline HTML: <img src="x" onerror="alert(7)"><a href="javascript:alert(8)">bad link</a>.

- list item with [a bad link](vbscript:msgbox(1))
- list item with \`javascript:alert(9)\` kept as literal code

> A quote with <script>alert(10)</script> and [another bad link](javascript:alert(11)).

| Cell | Link |
| --- | --- |
| alpha | [bad table link](javascript:alert(12)) |
| beta | [safe table link](https://example.com/table) |

\`\`\`html
<script>alert(13)</script>
<a href="javascript:alert(14)">literal code</a>
\`\`\`

<svg><script>alert(15)</script><a xlink:href="javascript:alert(16)">svg link</a></svg>

<style>@import "https://evil.example/x.css"; body { background: url(https://evil.example/y) }</style>

<div id="note" style="position:fixed;inset:0;background:url(javascript:alert(17))">overlay</div>
`
