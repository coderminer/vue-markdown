/**
 * Curated GFM conformance fixtures.
 *
 * Each case is a Markdown input and the HTML that `remark-gfm` + the official
 * pipeline must produce. The conformance suite canonicalizes both sides before
 * comparing, so attribute order and entity spelling do not matter.
 */
export interface ConformanceFixture {
  name: string
  markdown: string
  html: string
}

export const gfmFixtures: ConformanceFixture[] = [
  {
    name: 'table',
    markdown: '| foo | bar |\n| --- | --- |\n| baz | bim |\n',
    html: [
      '<table>',
      '<thead>',
      '<tr>',
      '<th>foo</th>',
      '<th>bar</th>',
      '</tr>',
      '</thead>',
      '<tbody>',
      '<tr>',
      '<td>baz</td>',
      '<td>bim</td>',
      '</tr>',
      '</tbody>',
      '</table>',
    ].join('\n'),
  },
  {
    name: 'table alignment',
    markdown: '| foo | bar |\n| :-- | --: |\n| baz | bim |\n',
    html: [
      '<table>',
      '<thead>',
      '<tr>',
      '<th align="left">foo</th>',
      '<th align="right">bar</th>',
      '</tr>',
      '</thead>',
      '<tbody>',
      '<tr>',
      '<td align="left">baz</td>',
      '<td align="right">bim</td>',
      '</tr>',
      '</tbody>',
      '</table>',
    ].join('\n'),
  },
  {
    name: 'strikethrough',
    markdown: '~~Hi~~ Hello, ~there~ world!\n',
    html: '<p><del>Hi</del> Hello, <del>there</del> world!</p>',
  },
  {
    name: 'strikethrough with strong',
    markdown: '~~**strong**~~\n',
    html: '<p><del><strong>strong</strong></del></p>',
  },
  {
    name: 'task list',
    markdown: '- [ ] foo\n- [x] bar\n',
    html: [
      '<ul class="contains-task-list">',
      '<li class="task-list-item"><input type="checkbox" disabled> foo</li>',
      '<li class="task-list-item"><input type="checkbox" checked disabled> bar</li>',
      '</ul>',
    ].join('\n'),
  },
  {
    name: 'autolinks',
    markdown: 'www.example.com, https://example.com, and contact@example.com.\n',
    html:
      '<p><a href="http://www.example.com">www.example.com</a>, ' +
      '<a href="https://example.com">https://example.com</a>, and ' +
      '<a href="mailto:contact@example.com">contact@example.com</a>.</p>',
  },
]
