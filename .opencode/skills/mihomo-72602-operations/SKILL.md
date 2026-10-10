---
name: mihomo-72602-operations
description: Use ONLY when operating Clash or mihomo on 72602-minipc, including proxy listeners, the external controller/UI, and cluster egress behavior.
---

# mihomo / Clash 72602 Operations

Operate the mihomo/Clash process on `72602-minipc`. The public Clash UI route
is represented by Homepage and ingress, but the proxy process and controller
are host services.

## Fixed scope

- Active GHelper subscription listener: mixed HTTP/SOCKS proxy at
  `127.0.0.1:7890`. The active subscription does not currently expose a
  separate `7891` listener; check the loaded config before assuming it exists.
- External controller/UI listener: `*:9090`.
- Cluster pod egress bridge is `192.168.0.25:17890`; never use LAN port `7890` as the pod egress address.
- Public UI verification uses the canonical HTTPS path `https://clash.72602.space/ui/`.

## Host process and configuration

- From `72602-minipc`, use the canonical SSH alias `72602-minipc-local`.
- The process is `/home/aaron/clashctl/bin/mihomo`, launched with
  `/home/aaron/clashctl/resources/runtime.yaml`.
- `~/.config/systemd/user/clashctl-on.service` runs `clashctl on` at login and
  exits successfully. It is a one-shot login helper, not a persistent
  `mihomo.service`; `clashctl` launches the process with `nohup`.
- `resources/config.yaml` and `resources/mixin.yaml` are merged into
  `runtime.yaml`. Back up and edit the source files, then use
  `bash -ic '_merge_config_restart'` to validate, merge, and restart through
  the owning `clashctl` workflow. Do not print `runtime.yaml`, which contains
  provider credentials.
- Profile `1` is the GHelper subscription. Its direct `/subs/<id>` URL returns
  the current plain YAML subscription; the older `/subs/default/<id>` URL has
  returned a stale HTML/base64 profile and must not be substituted silently.
  Refresh it with `bash -ic 'clashsub update 1'`, then verify the generated
  proxy count and node IDs before declaring the update successful.
- The current generated profile has GHelper groups (`Ghelper` and
  `🌐 全球智能`) and `profile.store-selected: true`. Last verified on
  2026-10-04: `Ghelper` directly selected `🇸🇬 新加坡07`; the same selection
  remained after `_merge_config_restart`, and Sub2API Pod probes returned
  `SG`. Re-read the controller selection for every incident; node names and
  saved selections can change. `🌐 全球智能` is an automatic URL-test group
  that can select another country. Keep `🇸🇬 新加坡07`, the ordinary
  `🇸🇬 新加坡`, and `🇸🇬 新加坡[CM]` distinct when testing; the CM node previously
  reset connections from `72602-minipc`.
- Sub2API's proxy UI tests the stored proxy record using
  `http://ip-api.com/json/?lang=zh-CN` and
  `http://api64.ipify.org?format=json`. Test these exact URLs through
  `http://192.168.0.25:17890` from the Sub2API Pod; Deployment environment
  proxy checks alone do not verify the stored record's test path.
- The subscription contains `DOMAIN-SUFFIX,ip-api.com,DIRECT`, which caused
  the UI probe to report the 72602-minipc ISP address in China. The persistent
  correction in `mixin.yaml` is `rules.prefix` entry
  `DOMAIN-SUFFIX,ip-api.com,Ghelper`; verify that it precedes the subscribed
  `DIRECT` rule after merging or refreshing the subscription. Do not edit
  the generated `runtime.yaml` or claim the subscribed rule was deleted.
- Do not add a `DIRECT` exception for `api64.ipify.org` or other egress probe
  domains. Verify both the live rule decision and returned country; a node
  name alone does not prove its exit location.

## Routine path

1. Read host listeners/process/service status and the controller/UI health without printing the proxy configuration or credentials.
2. Test the exact listener from its intended network scope: mixed `7890` for local proxy use, `17890` for cluster egress, and HTTPS `/ui/` for public UI. Test `7891` only when the loaded config exposes it.
3. For a configuration change, identify the actual host service/unit and preserve the current configuration privately for rollback.
4. Verify listener ownership, selected controller group, proxy connectivity and country, public UI HTTP 200, and affected cluster egress.

## Mutation and rollback

Before changing proxy mode, listeners, rules, credentials, subscriptions, or
routing, state target, current value, proposed value, blast radius, and
rollback. Apply host changes through the owning service method, preserve the
previous config, and reload only after validation. Never print provider
credentials, proxy URLs with credentials, or the full rule configuration.
