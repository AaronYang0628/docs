---
name: hugo-runbook-authoring
description: Use when creating or editing middleware and application deployment records under content/Installation, including environment-specific commands and installation methods.
---

# Installation Runbook Authoring

`content/Installation/` records middleware and applications that were actually installed. It is an executable deployment notebook, not a product overview or a generic tutorial.

Always read `content/Installation/_template.md`, the target page, and one nearby page before editing. Load `hugo-relearn-authoring` for shortcode rules.

## Information architecture

Use this hierarchy:

1. `### 🚀Installation`
2. Outer tabs select the environment, for example `ZJLAB` and `72602`.
3. Inside each environment, nested tabs select only the installation methods actually used there, such as `ArgoCD`, `Helm`, or `Docker`.
4. Inside the method, record preparation, deployment, sync/apply, and verification in runnable order.
5. Put reusable failure recovery under `### 🛎️FAQ` only when it prevents repeating a known wrong route.

Do not create an empty method tab. Do not document Helm, Docker, or manifests merely because they are possible. Record how that environment was really installed.

## Step style

Preserve the repository's compact numbered form:

```html
<p> <b>1.prepare</b> `credentials` </p>
<p> <b>2.prepare</b> `application.yaml` </p>
<p> <b>3.sync by argocd</b> </p>
<p> <b>4.verify</b> </p>
```

- Reuse the matching preliminary SNIPPET first.
- Use `bash` for commands and `yaml` for YAML content.
- Shell heredocs that create YAML may use a `bash` fence; do not label arbitrary shell commands as YAML.
- Include namespace, context, host, issuer, storage class, and rollback details when environment-specific.
- Keep secrets as placeholders or Secret references.

## Source of truth

Cluster state is authoritative for facts. The corresponding cluster agent supplies verified values. If the page is stale, replace the wrong route; do not append a second contradictory recipe.

Prefer repository manifests over large inline resources. If an ArgoCD Application exists only as inline values, keep one canonical documented block aligned with the live Application until it is extracted into `manifests/`.

## Quality gate

Reject the edit when:

- environments and installation methods are mixed at the same tab level;
- an environment contains methods that were never used;
- an obsolete command/domain remains beside the replacement;
- steps cannot be run from top to bottom;
- the page builds but nested tabs do not render or switch correctly;
- the change adds a chronological incident dump to the installation flow.
