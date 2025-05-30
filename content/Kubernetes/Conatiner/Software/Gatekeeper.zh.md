+++
title = 'Deploy GateKeeper Server'
date = 2024-03-12T15:00:59+08:00
weight = 1
+++

**Official Website**: [https://open-policy-agent.github.io/gatekeeper/website/](https://open-policy-agent.github.io/gatekeeper/website/)

### Preliminary
- Kubernetes 版本必须大于 `v1.16`

### Features
Gatekeeper 是基于 [Open Policy Agent（OPA）](https://www.openpolicyagent.org/docs/latest/policy-language/) 构建的 Kubernetes 准入控制器，它允许用户定义和实施自定义策略，以控制 Kubernetes 集群中资源的创建、更新和删除操作

- 核心组件
    * 约束模板（**Constraint Templates**）：定义策略的规则逻辑，使用 Rego 语言编写。它是策略的抽象模板，可以被多个约束实例(**Constraint Instance**)复用。
    * 约束实例（**Constraints Instance**）：基于约束模板创建的具体策略实例，指定了具体的参数和匹配规则，用于定义哪些资源需要应用该策略。
    * 准入控制器（**Admission Controller**）：拦截 Kubernetes API Server 的请求，根据定义的约束对请求进行评估，如果请求违反了任何约束，则拒绝该请求。

- 约束管理
    * 自定义约束：用户可以使用 [Rego](https://www.openpolicyagent.org/docs/latest/policy-language/#what-is-rego) 语言编写自定义的约束模板，实现各种复杂的策略逻辑。
        > 例如，可以定义策略要求所有的命名空间 NameSpace 必须设置特定的标签，或者限制某些命名空间只能使用特定的镜像。
        > {{% expand title="查看已存在的约束模板和实例" %}}
        ```shell
        kubectl get constrainttemplates
        kubectl get constraints
        ```

        ```shell
        kubectl apply -f - <<EOF
        apiVersion: templates.gatekeeper.sh/v1
        kind: ConstraintTemplate
        metadata:
        name: k8srequiredlabels
        spec:
        crd:
            spec:
            names:
                kind: K8sRequiredLabels
            validation:
                openAPIV3Schema:
                    type: object
                    properties:
                        labels:
                        type: array
                        items:
                            type: string
        targets:
            - target: admission.k8s.gatekeeper.sh
            rego: |
                package k8srequiredlabels

                violation[{"msg": msg, "details": {"missing_labels": missing}}] {
                provided := {label | input.review.object.metadata.labels[label]}
                required := {label | label := input.parameters.labels[_]}
                missing := required - provided
                count(missing) > 0
                msg := sprintf("you must provide labels: %v", [missing])
                }
        EOF
        ```
        {{% /expand %}}
    * 约束复用：约束模板可以被多个约束实例复用，提高了策略的可维护性和复用性。
        > 例如，可以创建一个通用的标签约束模板，然后在不同的命名空间 NameSpace 中创建不同的约束实例，要求不同的标签。
        {{% expand title="一个约束实例的yaml" %}}
        要求所有的命名空间 NameSpace 必须存在标签“gatekeeper”

        ```yaml
        apiVersion: constraints.gatekeeper.sh/v1beta1
        kind: K8sRequiredLabels
        metadata:
        name: ns-must-have-gk-label
        spec:
            enforcementAction: dryrun
            match:
                kinds:
                - apiGroups: [""]
                    kinds: ["Namespace"]
            parameters:
                labels: ["gatekeeper"]
        ```

        {{% /expand %}}

- 资源控制
    * 资源创建和更新限制：Gatekeeper 可以阻止不符合策略的资源创建和更新请求。
        > 例如，如果定义了一个策略要求所有的 Deployment 必须设置资源限制（requests 和 limits），那么当用户尝试创建或更新一个没有设置资源限制的 Deployment 时，请求将被拒绝。
    * 资源类型过滤：可以通过约束的 match 字段指定需要应用策略的资源类型和命名空间。
        > 例如，可以只对特定命名空间中的 Pod 应用策略，或者只对特定 API 组和版本的资源应用策略。

- 合规性保证
    * 行业标准和企业规范：Gatekeeper 可以帮助企业确保 Kubernetes 集群中的资源符合行业标准和企业内部的安全规范。
        > 例如，可以定义策略要求所有的容器必须使用最新的安全补丁，或者要求所有的存储卷必须进行加密。
    * 审计和报告：Gatekeeper 可以记录所有的策略评估结果，方便企业进行审计和报告。通过查看审计日志，企业可以了解哪些资源违反了策略，以及违反了哪些策略。
        > 
    * 审计日志可以导出并接入下游。
        > 详细信息可以查看[https://open-policy-agent.github.io/gatekeeper/website/docs/pubsub/](https://open-policy-agent.github.io/gatekeeper/website/docs/pubsub/)

- 实时监控和反馈
    * 准入拦截：当有资源创建或更新请求时，Gatekeeper 会实时拦截请求，并根据策略进行评估。如果请求违反了策略，会立即拒绝请求，并返回详细的错误信息，帮助用户快速定位问题。
    * 策略更新：当约束模板或约束发生更新时，Gatekeeper 会自动重新评估所有相关的资源，确保策略的实时生效。

### Installation

{{< tabs title="install from" >}}
{{% tab title="kubectl" %}}
```shell
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.18.2/deploy/gatekeeper.yaml
```
{{% /tab %}}
{{% tab title="helm" %}}
```shell
helm repo add gatekeeper https://open-policy-agent.github.io/gatekeeper/charts
helm install gatekeeper/gatekeeper --name-template=gatekeeper --namespace gatekeeper-system --create-namespace
```
{{% /tab %}}
{{% tab title="source" %}}
Make sure that:

- You have Docker version 20.10 or later installed.
- Your kubectl context is set to the desired installation cluster.
- You have a container registry you can write to that is readable by the target cluster.
```shell
git clone https://github.com/open-policy-agent/gatekeeper.git \
&& cd gatekeeper 
```
- Build and push Gatekeeper image:
```shell
export DESTINATION_GATEKEEPER_IMAGE=<add registry like "myregistry.docker.io/gatekeeper">
make docker-buildx REPOSITORY=$DESTINATION_GATEKEEPER_IMAGE OUTPUT_TYPE=type=registry
```
- And the deploy
```shell
make deploy REPOSITORY=$DESTINATION_GATEKEEPER_IMAGE
```
{{% /tab %}}
{{< /tabs >}}

