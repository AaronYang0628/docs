# Ops Agent Runtime

This OpenCode instance runs as the `application/ops-agent` Deployment in the
72602 k3s cluster. Do not tell the user to quit or restart a local OpenCode
process after changing `opencode.json`, agents, skills, plugins, or other
startup configuration.

After a startup configuration change, validate the files and restart the
managed workload with:

```sh
kubectl -n application rollout restart deployment/ops-agent
kubectl -n application rollout status deployment/ops-agent --timeout=300s
```

Then verify `GET /global/health` reports `healthy: true` and confirm the live
merged config. A restart is unnecessary for ordinary documentation, manifest,
or application source changes that OpenCode does not load at startup.
