+++
title = 'Job Privilieges'
date = 2024-07-07T15:00:59+08:00
weight = 3
+++

### Template
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: flink
  name: flink-deployment-manager
rules:
- apiGroups: 
  - flink.apache.org
  resources: 
  - flinkdeployments
  verbs: 
  - 'get'
  - 'list'
  - 'create'
  - 'update'
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: flink-deployment-manager-binding
  namespace: flink
subjects:
- kind: User
  name: "277293711358271379"  
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: flink-deployment-manager
  apiGroup: rbac.authorization.k8s.io
```

