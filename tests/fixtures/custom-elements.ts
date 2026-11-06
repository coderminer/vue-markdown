/**
 * A realistic document that mixes prose with host-defined custom elements.
 *
 * `x-note` and `x-callout` are converted into custom nodes by
 * `customTagsPlugin`. The nested callout proves recursion, and the second note
 * carries hostile attributes so sanitization is exercised on the same path.
 */
export const customElementsMarkdown = `# Release checklist

A paragraph before the notes with [a link](https://example.com/docs).

<x-note tone="info" title="Heads up" start-line="12" data-testid="deploy-note">
  <p>Run <code>npm run build:lib</code> before tagging.</p>
  <x-callout kind="warning" data-testid="nested-callout">
    <p>Keep the changelog in sync.</p>
  </x-callout>
</x-note>

<x-note tone="danger" onclick="alert(1)" style="color:red" href="javascript:alert(2)" title="Unsafe attrs">
  <strong>Sanitized</strong> but still visible.
</x-note>

<figure class="diagram" data-kind="architecture">
  <img src="./assets/architecture.png" alt="Architecture" width="640" />
  <figcaption>Request flow</figcaption>
</figure>

A closing paragraph.
`
