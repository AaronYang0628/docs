```yaml
kubectl apply -f - <<EOF
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: application-administrator
rules:
  - apiGroups:
      - argoproj.io
    resources:
      - applications
    verbs:
      - '*'
  - apiGroups:
      - apps
    resources:
      - deployments
    verbs:
      - '*'
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: application-administration
  namespace: argocd
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: application-administrator
subjects:
  - kind: ServiceAccount
    name: argo-workflow
    namespace: business-workflows
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: application-administration
  namespace: application
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: application-administrator
subjects:
  - kind: ServiceAccount
    name: argo-workflow
    namespace: business-workflows
EOF
```