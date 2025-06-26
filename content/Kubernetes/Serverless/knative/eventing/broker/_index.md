+++
title = 'Broker'
date = 2024-03-07T15:00:59+08:00
weight = 1
+++

{{%children depth="999" description="false" showhidden="true" %}}

Knative Broker 是 Knative Eventing 系统的核心组件，它的主要作用是充当事件路由和分发的中枢，在事件生产者（事件源）和事件消费者（服务）之间提供解耦、可靠的事件传输。

以下是 Knative Broker 的关键作用详解：

事件接收中心：

Broker 是事件流汇聚的入口点。各种事件源（如 Kafka 主题、HTTP 源、Cloud Pub/Sub、GitHub Webhooks、定时器、自定义源等）将事件发送到 Broker。

事件生产者只需知道 Broker 的地址，无需关心最终有哪些消费者或消费者在哪里。

事件存储与缓冲：

Broker 通常基于持久化的消息系统实现（如 Apache Kafka, Google Cloud Pub/Sub, RabbitMQ, NATS Streaming 或内存实现 InMemoryChannel）。这提供了：

持久化： 确保事件在消费者处理前不会丢失（取决于底层通道实现）。

缓冲： 当消费者暂时不可用或处理速度跟不上事件产生速度时，Broker 可以缓冲事件，避免事件丢失或压垮生产者/消费者。

重试： 如果消费者处理事件失败，Broker 可以重新投递事件（通常需要结合 Trigger 和 Subscription 的重试策略）。

解耦事件源和事件消费者：

这是 Broker 最重要的作用之一。事件源只负责将事件发送到 Broker，完全不知道有哪些服务会消费这些事件。

事件消费者通过创建 Trigger 向 Broker 声明它对哪些事件感兴趣。消费者只需知道 Broker 的存在，无需知道事件是从哪个具体源产生的。

这种解耦极大提高了系统的灵活性和可维护性：

独立演进： 可以独立添加、移除或修改事件源或消费者，只要它们遵循 Broker 的契约。

动态路由： 基于事件属性（如 type, source）动态路由事件到不同的消费者，无需修改生产者或消费者代码。

多播： 同一个事件可以被多个不同的消费者同时消费（一个事件 -> Broker -> 多个匹配的 Trigger -> 多个服务）。

事件过滤与路由（通过 Trigger）：

Broker 本身不直接处理复杂的过滤逻辑。过滤和路由是由 Trigger 资源实现的。

Trigger 资源绑定到特定的 Broker。

Trigger 定义了：

订阅者： 目标服务（Knative Service、Kubernetes Service、Channel 等）的地址。

过滤器： 基于事件属性（主要是 type 和 source，以及其他可扩展属性）的条件表达式。只有满足条件的事件才会被 Broker 通过该 Trigger 路由到对应的订阅者。

Broker 接收事件后，会检查所有绑定到它的 Trigger 的过滤器。对于每一个匹配的 Trigger，Broker 都会将事件发送到该 Trigger 指定的订阅者。

提供标准事件接口：

Broker 遵循 CloudEvents 规范，它接收和传递的事件都是 CloudEvents 格式的。这为不同来源的事件和不同消费者的处理提供了统一的格式标准，简化了集成。

多租户和命名空间隔离：

Broker 通常部署在 Kubernetes 的特定命名空间中。一个命名空间内可以创建多个 Broker。

这允许在同一个集群内为不同的团队、应用或环境（如 dev, staging）隔离事件流。每个团队/应用可以管理自己命名空间内的 Broker 和 Trigger。

总结比喻：

可以把 Knative Broker 想象成一个高度智能的邮局分拣中心：

接收信件（事件）： 来自世界各地（不同事件源）的信件（事件）都寄到这个分拣中心（Broker）。

存储信件： 分拣中心有仓库（持久化/缓冲）临时存放信件，确保信件安全不丢失。

分拣规则（Trigger）： 分拣中心里有很多分拣员（Trigger）。每个分拣员负责特定类型或来自特定地区的信件（基于事件属性过滤）。

投递信件： 分拣员（Trigger）找到符合自己负责规则的信件（事件），就把它们投递到正确的收件人（订阅者服务）家门口。

解耦： 寄信人（事件源）只需要知道分拣中心（Broker）的地址，完全不需要知道收信人（消费者）是谁、在哪里。收信人（消费者）只需要告诉分拣中心里负责自己这类信件的分拣员（创建 Trigger）自己的地址，不需要关心信是谁寄来的。分拣中心（Broker）和分拣员（Trigger）负责中间的复杂路由工作。

Broker 带来的核心价值：

松耦合： 彻底解耦事件生产者和消费者。

灵活性： 动态添加/移除消费者，动态改变路由规则（通过修改/创建/删除 Trigger）。

可靠性： 提供事件持久化和重试机制（依赖底层实现）。

可伸缩性： Broker 和消费者都可以独立伸缩。

标准化： 基于 CloudEvents。

简化开发： 开发者专注于业务逻辑（生产事件或消费事件），无需自己搭建复杂的事件总线基础设施。