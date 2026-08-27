# Ops Agent Runtime

This OpenCode instance runs as the `application/ops-agent` Deployment in the
72602 k3s cluster. Do not tell the user to quit or restart a local OpenCode
process after changing `opencode.json`, agents, skills, plugins, or other
startup configuration.

Every running 72602 middleware has a service-specific skill under
`.opencode/skills/`. Before operating a named service, load its
`<service>-72602-operations` skill and follow its fixed ownership, read,
mutation, verification, and rollback path. If no skill exists, create the
coverage entry before routine operation. Do not repeat a full architecture or
deployment investigation when the skill already records the fact; investigate
only verified drift and write the corrected fact back to the owning skill.

After a startup configuration change, validate the files and restart the
managed workload with:

```sh
kubectl -n application rollout restart deployment/ops-agent
kubectl -n application rollout status deployment/ops-agent --timeout=300s
```

Then verify `GET /global/health` reports `healthy: true` and confirm the live
merged config. A restart is unnecessary for ordinary documentation, manifest,
or application source changes that OpenCode does not load at startup.
