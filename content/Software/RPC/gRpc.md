+++
title = 'gRpc'
date = 2024-04-07T15:00:59+08:00
+++

This guide gets you started with gRPC in C++ with a simple working example.


In the C++ world, there’s no universally accepted standard for managing project dependencies. You need to build and install gRPC before building and running this quick start’s Hello World example.

Build and locally install gRPC and Protocol Buffers.
The steps in the section explain how to build and locally install gRPC and Protocol Buffers using cmake. If you’d rather use bazel, see Building from source.

### 1. Setup
Choose a directory to hold locally installed packages. This page assumes that the environment variable `MY_INSTALL_DIR` holds this directory path. For example:

```shell
export MY_INSTALL_DIR=$HOME/.local
```
Ensure that the directory exists:

```shell
mkdir -p $MY_INSTALL_DIR
```
Add the local bin folder to your path variable, for example:

```shell
export PATH="$MY_INSTALL_DIR/bin:$PATH"
```

{{% notice style="primary" title="Important" icon="skull-crossbones" %}}
We **strongly** encourage you to install gRPC **locally** — using an appropriately set `CMAKE_INSTALL_PREFIX` 
— because there is **no easy way** to uninstall gRPC after you’ve installed it globally.
{{% /notice %}}

### 2. Install Essentials
##### 2.1 Install Cmake
You need version 3.13 or later of cmake. Install it by following these instructions:

{{< tabs title="Install on " >}}
{{% tab title="ubuntu/debian" %}}
```shell
sudo apt install -y cmake
```
{{% /tab %}}
{{% tab title="MacOS" %}}
```shell
brew install cmake
```
{{% /tab %}}
{{< /tabs >}}

{{% expand title="Check the version of cmake"%}}
```shell
cmake --version
```
{{% /expand%}}

##### 2.2 Install basic tools required to build gRPC

{{< tabs title="Install on " >}}
{{% tab title="ubuntu/debian" %}}
```shell
sudo apt install -y build-essential autoconf libtool pkg-config
```
{{% /tab %}}
{{% tab title="MacOS" %}}
```shell
brew install autoconf automake libtool pkg-config
```
{{% /tab %}}
{{< /tabs >}}


##### 2.3 Clone the grpc repo
Clone the grpc repo and its submodules:

```shell
git clone --recurse-submodules -b v1.62.0 --depth 1 --shallow-submodules https://github.com/grpc/grpc
```
##### 2.4 Build and install gRPC and Protocol Buffers

While not mandatory, gRPC applications usually leverage Protocol Buffers for service definitions and data serialization, and the example code uses `proto3`.

The following commands build and locally install gRPC and Protocol Buffers:

```shell
cd grpc
mkdir -p cmake/build
pushd cmake/build
cmake -DgRPC_INSTALL=ON \
      -DgRPC_BUILD_TESTS=OFF \
      -DCMAKE_INSTALL_PREFIX=$MY_INSTALL_DIR \
      ../..
make -j 4
make install
popd
```

### 3. Run the example
The example code is part of the `grpc` repo source, which you cloned as part of the steps of the previous section.

##### 3.1 change the example's directory:
```shell
cd examples/cpp/helloworld
```

##### 3.2 build the example project by using `cmake`
> make sure you still can `echo $MY_INSTALL_DIR`, and return a valid result
```shell
mkdir -p cmake/build
pushd cmake/build
cmake -DCMAKE_PREFIX_PATH=$MY_INSTALL_DIR ../..
make -j 4
```

#### 3.3 run the server
```shell
./greeter_server
```


#### 3.4 from a different terminal, run the client and see the client output:
```shell
./greeter_client
```

> and the result should be like this:
```text
Greeter received: Hello world
```