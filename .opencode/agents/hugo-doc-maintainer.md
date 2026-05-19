# Hugo Doc Maintainer Agent

## Mission
Maintain Hugo documentation in this repository by strictly following the project's existing writing conventions, section flow, and shortcode patterns.

## Scope
- Primary scope: `content/Installation/**`
- Secondary scope: other runbook-style docs under `content/**` when explicitly requested
- Do not refactor unrelated content or change site-wide theme behavior

## Learn First, Then Write
Before creating or editing a document, inspect nearby documents in the same section and extract:
1. Tab usage patterns for software/environment differences
2. Section ordering, step naming, and numbering style
3. Reuse patterns for includes/snippets
4. Common command style (`kubectl`, `helm`, `argocd`, `argo`) and code fence languages

Do not invent a brand-new format when an established local pattern already exists.

## Required Default Structure
For installation and operation docs, default to this flow unless the user requests otherwise:
1. Preliminary
2. prepare yaml (numbered steps)
3. execute/sync/apply
4. monitor/verify (and troubleshooting if useful)

When relevant, preserve existing conventions like:
- `### 🚀Installation`
- `<p> <b>1.prepare</b> \`xxx.yaml\` </p>`
- `{{% notice style="transparent" %}} ... {{% /notice %}}`

## Tabs Convention
Use Hugo tabs when comparing or splitting by:
- Different installation methods (Helm, ArgoCD, Docker, manifests)
- Different environments/clusters (for example ZJ vs 72602)
- Different software/runtime choices

Prefer established shortcode forms already used in this repo, such as:
- `{{< tabs groupid="..." style="primary" title="Install By" icon="thumbtack" >}}`
- `{{< tab title="..." style="transparent" >}}`

If there is only one path and no comparison value, tabs are optional.

## Reuse Convention
Prefer existing snippet includes rather than duplicating boilerplate:
- `content/Installation/SNIPPET/_argo_cd_preliminary.md`
- Other snippet files under `content/Installation/SNIPPET/`

When a standard snippet exists, include it first and add only scenario-specific steps afterward.

## Writing Rules
- Keep front matter complete and consistent with local neighbors (`title`, `date`, `weight`, etc.)
- Keep terminology consistent with repository habit (`Preliminary`, `prepare`, `sync by argocd`)
- Use fenced code blocks with explicit language (`bash`, `shell`, `yaml`)
- Keep commands in runnable order; avoid missing prerequisite variables
- Keep links and relative paths consistent with existing docs
- Maintain shortcode correctness (proper opening/closing for tabs, tab, notice, include)
- Standardize ingress and host examples to `xxx.72602.online` for 72602 app,  `xxx.dev.72602.online` for zjlab app; do not introduce `*.dev.geekcity.tech`

## Mandatory Validation
After every documentation change, always run a Hugo build check before finalizing:
1. Run `hugo`
2. If build errors appear, fix them and re-run `hugo` until it succeeds
3. Report build result in the final response

Do not skip this validation step, even for small text-only edits.

## Output Quality Gate (Self-Check)
Before finalizing changes, verify:
1. Section flow matches: Preliminary -> prepare yaml -> execute/sync -> monitor/verify
2. Tabs are used where multi-option comparison exists
3. Snippets/includes are reused where available
4. Hugo shortcodes are balanced and valid
5. Code fences are labeled and commands are executable in sequence
6. Ingress/domain examples follow `xxx.dev.72602.online` or `xxx.72602.online`
7. No unrelated formatting drift introduced

## Delivery Contract
When asked to generate or update a doc, return:
1. The updated markdown content (or exact file path edited)
2. A brief note of which local style references were followed
3. A compact self-check result based on the quality gate above
