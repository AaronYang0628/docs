+++
title = 'ECS Mihomo (Clash)'
weight = 20
+++

### 🚀Installation

{{< tabs groupid="environment" style="primary" title="Environment" icon="server" >}}

{{< tab title="ECS" >}}
  {{< tabs groupid="install-method-ecs-mihomo" title="Operating Path" icon="thumbtack" >}}

  {{% tab title="systemd" %}}

  - Active unit: `mihomo.service`
  - Authenticated HTTP proxy: TCP `7890`
  - Authenticated SOCKS listener: TCP `7891`
  - Authenticated external controller: TCP `56396`

  Authentication is required. Configure it through the consuming application's
  secret store; do not place credentials in this page, source control, or
  command history. The persistent rule routes `api64.ipify.org` through
  `🔰 节点选择`. Its current selection is the live US San Jose candidate.

  Authenticated probes to `example.com`, `ip-api.com`, and `api64.ipify.org`
  returned HTTP `403`; probes to `api.country.is`, Cloudflare trace, and Google
  generate_204 returned HTTP `000`. These responses did not establish the
  actual egress country; US egress remains unverified.

  #### External Controller Access

  The external controller on TCP `56396` requires its own credential, separate
  from HTTP proxy authentication.

  #### Network Access

  TCP/`7890` ingress is source-restricted. TCP/`7891` is not publicly exposed.

  {{% /tab %}}

  {{< /tabs >}}
{{< /tab >}}

{{< /tabs >}}
