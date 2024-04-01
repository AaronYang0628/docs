+++
title = 'Deploy'
date = 2024-03-07T15:00:59+08:00
+++

### asdad
```yaml

apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: dag-diamond-
spec:
  entrypoint: entry
  serviceAccountName: argo-workflow
  templates:
  - name: echo
    inputs:
      parameters:
      - name: message
    container:
      image: alpine:3.7
      command: [echo, "{{inputs.parameters.message}}"]
  - name: entry
    dag:
      tasks:
      - name: start
        template: echo
        arguments:
            parameters: [{name: message, value: DAG initialized}]
      - name: diamond
        template: diamond
        dependencies: [start]
  - name: diamond
    dag:
      tasks:
      - name: A
        template: echo
        arguments:
          parameters: [{name: message, value: A}]
      - name: B
        dependencies: [A]
        template: echo
        arguments:
          parameters: [{name: message, value: B}]
      - name: C
        dependencies: [A]
        template: echo
        arguments:
          parameters: [{name: message, value: C}]
      - name: D
        dependencies: [B, C]
        template: echo
        arguments:
          parameters: [{name: message, value: D}]
      - name: end
        dependencies: [D]
        template: echo
        arguments:
          parameters: [{name: message, value: end}]


```