# Unsafe HTML fixture

<script>alert('script')</script>

<img src="x" onerror="alert('onerror')" alt="broken">

<a href="javascript:alert('href')">javascript link</a>

[markdown javascript link](javascript:alert('md'))

![svg data url](data:image/svg+xml,<svg onload="alert('svg')"></svg>)

<iframe src="https://example.com"></iframe>

<style>body { display: none }</style>

Safe text stays visible.
