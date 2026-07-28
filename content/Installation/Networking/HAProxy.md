+++
title = 'Install HAProxy'
date = 2024-03-07T15:00:59+08:00
weight = 80
+++

### 🚀Installation

{{< tabs groupid="environment" style="primary" title="Environment" icon="server" >}}

{{< tab title="72602" >}}
  {{< tabs groupid="install-method-72602-haproxy" title="Install By" icon="thumbtack" >}}

  {{% tab title="📦APT" %}}

  <p> <b>1.prepare</b> ECS host and backups </p>

  ```bash
  ssh root@47.110.67.161 hostname
  sudo ss -ltnp
  sudo test -e /etc/haproxy || echo absent
  ```

  Back up `/etc/haproxy` before installing. Keep the backup outside tracked
  source. The 72602 mail change also keeps the reverse-tunnel unit backup on
  the minipc.

  <p> <b>2.install</b> Ubuntu package </p>

  ```bash
  sudo apt-get install --no-install-recommends haproxy
  ```

  Do not run `upgrade`, `full-upgrade`, or `dist-upgrade`. Ubuntu may start the
  package service during installation; stop it before replacing the default
  configuration and before the tunnel backends are ready.

  <p> <b>3.configure</b> TCP passthrough </p>

  `/etc/haproxy/haproxy.cfg` must use `mode tcp`, bind public IPv4 and IPv6
  `25`, `465`, `587`, and `993`, and send PROXY v2 to:

  ```text
  127.0.0.1:10225
  127.0.0.1:10465
  127.0.0.1:10587
  127.0.0.1:10993
  ```

  Do not terminate TLS or configure HTTP, relay, or authentication in HAProxy.
  Validate before starting it:

  ```bash
  haproxy -c -f /etc/haproxy/haproxy.cfg
  ```

  <p> <b>4.start after tunnel verification</b> </p>

  ```bash
  # Confirm the four ECS loopback backends are sshd listeners first.
  sudo ss -ltnp
  sudo systemctl enable --now haproxy
  sudo systemctl is-active haproxy
  sudo systemctl is-enabled haproxy
  sudo ss -ltnp
  ```

  The public mail ports must belong to `haproxy`; only the four high ports on
  `127.0.0.1` may belong to the tunnel `sshd`.

  <p> <b>5.rollback</b> </p>

  ```bash
  sudo systemctl stop haproxy
  # Restore the saved 10022 unit on 72602-minipc, daemon-reload, restart only 10022.
  ```

  Do not restore an old HAProxy configuration or uninstall the package as part
  of this rollback. Preserve Mailu Secrets and PVCs.

  {{% /tab %}}
  {{< /tabs >}}
{{< /tab >}}

{{< /tabs >}}

### 🛎️FAQ

{{% expand title="Mailu does not accept PROXY protocol" %}}

Check the transport source that reaches the Mailu front Pod. The current
72602 hostPort path is observed as `10.42.0.1`, while the current Git values use
`realIpFrom=127.0.0.1/32`. Dovecot logs `Client not trusted` when these do not
match, and TLS/STARTTLS can close before negotiation. Correct the source or
trust boundary in Git, wait for automatic ArgoCD reconciliation, and repeat the
protocol and no-DATA relay checks. Do not manually patch or restart Mailu.
{{% /expand %}}
