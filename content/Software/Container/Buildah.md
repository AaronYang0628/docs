+++
tags = ["Buildah"]
title = 'Install Buildah'
date = 2025-03-07T15:00:59+08:00
weight = 20
+++


### Reference
- you can directly  install docker engine from 🐶[buildah official website](https://buildah.io/).

### Prerequisites
- **Kernel Version Requirements**
_To run Buildah on Red Hat Enterprise Linux or CentOS, version 7.4 or higher is required._ On other Linux distributions Buildah requires a kernel version that supports the OverlayFS and/or fuse-overlayfs filesystem -- you'll need to consult your distribution's documentation to determine a minimum version number.

- **`runc` Requirement**
Buildah uses [runc](https://github.com/opencontainers/runc) to run commands when buildah run is used, or when buildah build encounters a RUN instruction, so you'll also need to build and install a compatible version of runc for Buildah to call for those cases. If Buildah is installed via a package manager such as yum, dnf or apt-get, runc will be installed as part of that process.

- **CNI Requirement**
When Buildah uses runc to run commands, it defaults to running those commands in the host's network namespace. If the command is being run in a separate user namespace, though, for example when ID mapping is used, then the command will also be run in a separate network namespace.

A newly-created network namespace starts with no network interfaces, so commands which are run in that namespace are effectively disconnected from the network unless additional setup is done. Buildah relies on the CNI library and plugins to set up interfaces and routing for network namespaces.

{{% expand title="something wrong with CNI"%}}

If Buildah is installed via a package manager such as yum, dnf or apt-get, a package containing CNI plugins may be available (in Fedora, the package is named containernetworking-cni). If not, they will need to be installed, for example using:

```shell
git clone https://github.com/containernetworking/plugins
( cd ./plugins; ./build_linux.sh )
sudo mkdir -p /opt/cni/bin
sudo install -v ./plugins/bin/* /opt/cni/bin
```
The CNI library needs to be configured so that it will know which plugins to call to set up namespaces. Usually, this configuration takes the form of one or more configuration files in the /etc/cni/net.d directory. A set of example configuration files is included in the docs/cni-examples directory of this source tree.

{{% /expand %}}
### Installation

> [!CAUTION]
> If you already have something wrong with `apt update`, please check the following 🔗[link](), adding docker source wont help you to solve that problem.

{{< tabs >}}
{{% tab title="fedora" %}}
```shell
sudo dnf update -y 
sudo dnf -y install buildah
```
Once the installation is complete, The `buildah images` command will list all the images:

```shell
buildah images
```

{{% /tab %}}
{{% tab title="centos" %}}
```shell
sudo yum -y install buildah
```
Once the installation is complete, start the Docker service
```shell
sudo systemctl enable docker
sudo systemctl start docker
```

{{% /tab %}}
{{% tab title="ubuntu✅" %}}
1. Set up Docker's apt repository.
```shell
sudo apt-get -y update
sudo apt-get -y install buildah
```

3. Verify that the installation is successful by running the hello-world image: 
```shell
sudo buildah run hello-world
```

{{% /tab %}}
{{% tab title="Mac OS" %}}
visit [https://www.docker.com/products/docker-desktop ](https://www.docker.com/products/docker-desktop )
{{% /tab %}}

{{< /tabs >}}


### Info
- Docker Image saved in `/var/lib/docker`

### Mirror
You can modify `/etc/docker/daemon.json`
```json
{
  "registry-mirrors": ["<$mirror_url>"]
}
```
for example:
- `https://docker.mirrors.ustc.edu.cn`