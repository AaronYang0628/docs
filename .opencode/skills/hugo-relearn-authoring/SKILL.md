---
name: hugo-relearn-authoring
description: Use when editing this Hugo Relearn site, especially tabs, nested tabs, notices, includes, expands, frontmatter, links, and shortcode rendering.
---

# Hugo Relearn Authoring

Follow the Hugo Relearn theme documentation at `https://mcshelby.github.io/hugo-theme-relearn/`. Use existing site conventions where they are valid, but correct invalid shortcode nesting instead of copying it.

## Tabs

- A `tabs` block contains one or more `tab` blocks.
- Use a stable, meaningful `groupid`. Relearn synchronizes equal group IDs across the whole site and stores the selection in the browser.
- Use `groupid="environment"` intentionally for the outer environment selector.
- Give nested installation-method selectors environment-specific IDs such as `install-method-zjlab` and `install-method-72602`.
- A parent tab that contains nested tabs must use `{{< tab >}}`, not `{{% tab %}}`.
- A leaf tab that contains Markdown should use `{{% tab %}}` so headings, lists, fences, notices, and includes render as Markdown.
- Keep every opening and closing shortcode balanced.

Correct nested form:

```go
{{< tabs groupid="environment" title="Environment" >}}
{{< tab title="ZJLAB" >}}
  {{< tabs groupid="install-method-zjlab" title="Install By" >}}
  {{% tab title="ArgoCD" %}}
  Markdown content
  {{% /tab %}}
  {{< /tabs >}}
{{< /tab >}}
{{< /tabs >}}
```

## Notices and includes

- Use `{{% notice style="transparent" %}}` for unframed command/config groups only when it improves the existing page flow.
- Use severity notices (`important`, `warning`, `tip`, and similar) for actual meaning, not decoration.
- Use `expanded="false"` only when hiding optional details is useful.
- Use `{{% include "logical/path.md" %}}`; prefer Hugo logical paths and forward slashes.
- Reuse existing files under `content/Installation/SNIPPET/` instead of copying boilerplate.

## Validation

1. Run `hugo` after every edit.
2. Read warnings involving the changed page; a successful exit does not excuse broken layout.
3. Inspect the rendered page and exercise each nested tab on desktop and mobile widths.
4. Run `git diff --check` and inspect the complete changed section.

References:

- Tabs: `https://mcshelby.github.io/hugo-theme-relearn/shortcodes/tabs/`
- Notices: `https://mcshelby.github.io/hugo-theme-relearn/shortcodes/notice/`
- Includes: `https://mcshelby.github.io/hugo-theme-relearn/shortcodes/include/`
