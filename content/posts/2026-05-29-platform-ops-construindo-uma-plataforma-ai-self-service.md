---
slug: "platform-ops-construindo-uma-plataforma-ai-self-service"
translationKey: "2026/06/15/platform-ops-building-a-self-service-ai-platform"
aliases:
  - "/posts/platform-ops-construindo-uma-plataforma-ai-self-service/"
title: "Platform ops: construindo uma plataforma AI self-service"
description: "Você virou o gargalo. Multi-tenancy, GPU scheduling, Kueue, quotas, priority classes e como parar de ser help desk e virar platform engineer."
date: 2026-05-29T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - ai
  - infraestrutura
  - azure
  - platform-engineering
  - kubernetes
  - kueue
  - multi-tenancy
  - gpu-scheduling
series:
  - "AI para Engenheiros de Infraestrutura"
---

Décimo post da série. No [anterior](/cost-engineering-para-ai-quando-gpu-idle-custa-mais-que-seu-carro/), controlamos custos com Spot VMs, right-sizing e FinOps. Agora: como parar de ser um help desk humano pra GPU.

## O canal do Slack que comeu sua agenda

Seis meses atrás, você provisionou um único VM GPU pro time de ML. Configurou drivers, montou storage, fechou o ticket. Pareceu qualquer outro request de infraestrutura.

Hoje, você tem quatro times, três clusters AKS, dezenas de GPU node pools e uma coleção crescente de endpoints Azure OpenAI. Cada time quer seus recursos, suas quotas e seus SLAs. Seus DMs viraram help desk: "Dá pra dar mais GPUs?" "Por que meu training job está Pending?" "Quem tá usando todas as A100s?"

Esse é o ponto de inflexão. Você saiu de "suportar projetos de AI" pra "ser o gargalo de uma plataforma AI". A solução não é trabalhar mais; é construir os sistemas, políticas e automação que deixam os times se auto-servirem enquanto você mantém controle.

## De projeto AI pra plataforma AI

Platform engineering não é novo. Você já faz há anos com web apps, bancos de dados e CI/CD. O core: infraestrutura reutilizável e self-service que times consomem sem abrir tickets. Golden paths, workflows opinados e testados, do código à produção.

AI infra segue o mesmo princípio. Em vez de provisionar GPU VMs ad hoc, você constrói templates. Em vez de criar namespaces manualmente, oferece portal self-service. Em vez de responder "como faço deploy de modelo?", oferece um pipeline que faz.

**Tradução infra ↔ AI:** Platform engineering é a mesma disciplina que você já conhece, agora aplicada a GPU compute, model registries e inference endpoints em vez de web apps e SQL databases. As camadas de abstração mudam; o raciocínio não.

## O que automatizar vs. o que controlar

| Categoria | Self-service | Requer aprovação |
|-----------|:---:|:---:|
| Namespaces dev/test | ✅ | |
| GPU alocações pequenas (1-2 GPUs) | ✅ | |
| Endpoints de inference em produção | | ✅ |
| Training jobs grandes (8+ GPUs) | | ✅ |
| Provisionamento de novo cluster | | ✅ |
| Ambientes Jupyter notebook | ✅ | |
| Criação de endpoint Azure OpenAI | | ✅ |
| Volumes de storage pra datasets | ✅ | |

**Regra:** Se um erro custa menos que centenas de dólares e pode ser revertido em minutos, faça self-service. Se envolve recursos caros, tráfego de produção ou impacto cross-team, coloque um gate.

## Multi-tenancy: isolamento vs. eficiência

| Nível de isolamento | Eficiência de custo | Boundary de segurança | Overhead operacional | Melhor pra |
|--------------------|--------------------|----------------------|---------------------|------------|
| **Namespace** | ⭐⭐⭐⭐⭐ | Baixo | Baixo | Times trusted compartilhando cluster |
| **Node pool** | ⭐⭐⭐⭐ | Médio | Médio | Times precisando GPU types dedicados |
| **Cluster** | ⭐⭐⭐ | Alto | Alto | Times com compliance requirements diferentes |
| **Subscription** | ⭐⭐ | Muito alto | Muito alto | Workloads regulados, billing separado |

A maioria das organizações cai num híbrido: um ou dois clusters compartilhados com namespaces por time e node pools GPU dedicados, mais clusters separados pra inference em produção e workloads regulados.

### RBAC scoping por namespace

```yaml
# team-data-science-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: team-data-science
  name: gpu-workload-role
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps", "persistentvolumeclaims"]
    verbs: ["get", "list", "create", "delete", "watch"]
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["get", "list", "create", "delete"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "create", "update", "delete"]
```

Bind essa role ao grupo Entra ID do time. Eles deployam workloads no namespace deles, mas não tocam em recursos de outros times nem em objetos cluster-level.

### Resource quotas (sem isso, um time come todas as GPUs)

```yaml
# team-data-science-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  namespace: team-data-science
  name: gpu-quota
spec:
  hard:
    requests.cpu: "64"
    requests.memory: 256Gi
    requests.nvidia.com/gpu: "8"
    limits.cpu: "128"
    limits.memory: 512Gi
    limits.nvidia.com/gpu: "8"
    pods: "50"
```

Isso limita o time a 8 GPUs, 64 CPU cores e 256 GiB de memória. Podem distribuir entre pods como quiserem (um job com 8 GPUs ou oito jobs com 1 GPU cada), mas não excedem o total.

> **Cuidado:** ResourceQuotas só enforcam no scheduling. Se você abaixar uma quota abaixo do uso atual, pods existentes não são evicted. Novos pods é que serão rejeitados. Planeje mudanças de quota em maintenance windows.

### Network isolation entre namespaces

```yaml
# deny-cross-namespace.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  namespace: team-data-science
  name: deny-other-namespaces
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector: {}
```

Pods dentro do namespace conversam entre si; tráfego de outros namespaces é bloqueado. Adicione regras explícitas pra serviços compartilhados (model registries, monitoring).

## GPU scheduling e filas

### O problema fundamental

GPU é finito e caro. Um nó A100 custa ~$3/hora. Com 20 nós e 4 times, scheduling first-come-first-served cria atrito constante. Training jobs monopolizam GPUs por horas. Inference fica starved. Scientists submetem 10 jobs de uma vez e se perguntam por que só 2 rodam.

### Priority classes

```yaml
# priority-classes.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: production-inference
value: 1000000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Produção inference - nunca preempted por training."
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: scheduled-training
value: 100000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Training jobs com deadline."
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: exploratory
value: 1000
globalDefault: true
preemptionPolicy: Never
description: "Notebooks, experimentos - podem ser preempted."
```

Com essa hierarquia: inference em produção preempta training se GPUs estão escassas. Training preempta notebooks exploratórios. Mas exploratórios nunca preemptam nada; esperam na fila.

> **Dica:** Use `preemptionPolicy: Never` pra workloads exploratórios. Previne stampede onde 50 pods de notebook tentam preemptar uns aos outros.

### Kueue: fair scheduling pra batch AI

Kubernetes nativo não entende job queuing. Se você submete 100 jobs e tem capacidade pra 10, Kubernetes cria 100 pods pendentes. Kueue adiciona uma camada de queue que admite jobs baseado em capacidade disponível e fair-share.

```yaml
# cluster-queue.yaml
apiVersion: kueue.x-k8s.io/v1beta1
kind: ClusterQueue
metadata:
  name: gpu-cluster-queue
spec:
  namespaceSelector: {}
  resourceGroups:
    - coveredResources: ["cpu", "memory", "nvidia.com/gpu"]
      flavors:
        - name: a100-spot
          resources:
            - name: "cpu"
              nominalQuota: 128
            - name: "memory"
              nominalQuota: 512Gi
            - name: "nvidia.com/gpu"
              nominalQuota: 16
        - name: a100-ondemand
          resources:
            - name: "cpu"
              nominalQuota: 64
            - name: "memory"
              nominalQuota: 256Gi
            - name: "nvidia.com/gpu"
              nominalQuota: 8
  preemption:
    withinClusterQueue: LowerPriority
---
# local-queue.yaml
apiVersion: kueue.x-k8s.io/v1beta1
kind: LocalQueue
metadata:
  namespace: team-nlp
  name: team-nlp-queue
spec:
  clusterQueue: gpu-cluster-queue
```

Times submetem jobs pra sua LocalQueue; o ClusterQueue enforça capacidade global. Jobs ficam queued (não scheduled) até ter espaço. Elimina o problema dos "100 pods pendentes".

### Volcano: gang scheduling pra distributed training

Training distribuído precisa de múltiplos GPUs em múltiplos nós iniciando simultaneamente. Scheduling padrão do Kubernetes pode schedulear 3 de 4 pods requeridos, deixando todos esperando pelo quarto.

Volcano garante: todos os pods de um job começam juntos, ou nenhum começa.

```yaml
# distributed-training-volcano.yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: distributed-llm-training
  namespace: team-nlp
spec:
  minAvailable: 4
  schedulerName: volcano
  tasks:
    - replicas: 4
      name: worker
      template:
        spec:
          containers:
            - name: trainer
              image: myregistry.azurecr.io/llm-trainer:v1.0
              resources:
                requests:
                  nvidia.com/gpu: "4"
                limits:
                  nvidia.com/gpu: "4"
          restartPolicy: OnFailure
```

`minAvailable: 4` diz ao Volcano: não schedule nenhum worker a menos que consiga schedulear todos quatro. Previne alocação parcial, a fonte mais comum de GPU-hours desperdiçadas em training distribuído.

> **GPU requests = limits, sempre.** Diferente de CPU e memória, GPUs não podem ser overcommitted. Um pod requesting 1 GPU vai exclusivamente possuir aquela GPU independente do limit value. Valores diferentes só criam confusão.

## Quota e capacity management

### O stack de quotas

| Camada | Mecanismo | Quem gerencia |
|--------|-----------|---------------|
| Azure subscription | Regional vCPU quotas | Cloud admin (portal ou support request) |
| AKS cluster | Node pool scaling limits | Platform team |
| Kubernetes namespace | ResourceQuota objects | Platform team |
| Kueue | ClusterQueue nominal quotas | Platform team |
| Team-level | LocalQueue admission | Self-service dentro dos limites |

### Capacity reservation pra produção

```bash
# Reservar capacidade garantida pra inference
az capacity reservation group create \
  --resource-group rg-ai-platform \
  --name crg-inference-prod \
  --location eastus

az capacity reservation create \
  --resource-group rg-ai-platform \
  --capacity-reservation-group crg-inference-prod \
  --name cr-a100-inference \
  --sku Standard_NC24ads_A100_v4 \
  --capacity 4
```

Você paga pela capacidade reservada esteja usando ou não, mas garante que os VMs existem quando precisar. Pra inference em produção servindo tráfego real-time, esse tradeoff quase sempre vale.

### Monitoramento de quota

```bash
# Verificar uso de quota GPU na região
az vm list-usage \
  --location eastus \
  --query "[?contains(localName, 'NCv') || contains(localName, 'NDv')].{Name:localName, Used:currentValue, Limit:limit}" \
  --output table
```

## No próximo post

Plataforma operando com self-service, quotas e scheduling inteligente. No próximo, mergulhamos no **Azure OpenAI em produção**: deployments, rate limiting, failover multi-região, content filtering e patterns de production readiness.
