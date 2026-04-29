---
slug: "compute-para-ai-escolhendo-o-hardware-certo"
aliases:
  - "/posts/compute-para-ai-escolhendo-o-hardware-certo/"
title: "Compute para AI: escolhendo o hardware certo (e conectando ele direito)"
description: "A diferença entre um training job de dois dias e um de 90 minutos não é uma GPU mais rápida. É saber qual GPU usar e como conectar elas. Guia completo de VMs GPU no Azure."
date: 2026-05-01T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - ai
  - infraestrutura
  - azure
  - gpu
  - compute
  - aks
  - infiniband
  - nvidia
series:
  - "AI para Engenheiros de Infraestrutura"
---

Terceiro post da série onde traduzo AI para a linguagem de quem vive infraestrutura. No [post anterior](/dados-e-storage-para-workloads-de-ai/), falamos do gargalo escondido de storage. Hoje vamos pro que todo mundo pensa que é o assunto principal de AI: **compute**.

Spoiler: não é só sobre ter a GPU mais cara. É sobre ter a GPU **certa**, conectada do **jeito certo**.

## A história que você não quer viver

O time de ML pede "um cluster GPU pra treinamento". Você faz o que qualquer engenheiro de infra faria: provisiona oito `Standard_D16s_v5`. Sessenta e quatro vCPUs cada, 128 GiB de RAM, SSD premium. No papel, muita força.

O time lança o script de treinamento. Barra de progresso: estimativa de conclusão em **47 horas**. CPUs a 100%, rede mal registra tráfego, e ninguém parece feliz.

Aí um colega sugere dois nós `Standard_ND96asr_v4`, cada um com oito GPUs A100 conectadas por InfiniBand de 200 Gb/s. Mesmo training job, mesmo dataset, mesmo código. O job termina em **90 minutos**.

A diferença não é só as GPUs. É como elas conversam entre si dentro do nó (NVLink), como sincronizam gradientes entre nós (InfiniBand), e como o dado flui sem o CPU virar gargalo. Compute pra AI não é sobre cavalos de potência brutos. É sobre o **tipo certo** de potência, conectado do **jeito certo**.

## Training vs. inference: dois mundos diferentes

Antes de escolher qualquer SKU, você precisa saber qual workload vai rodar. Training e inference parecem similares na superfície, mas o perfil de infraestrutura é completamente oposto.

| Dimensão | Training | Inference |
|----------|----------|-----------|
| **Padrão de workload** | Batch, roda por horas/dias/semanas | Real-time, respostas em milissegundos |
| **Demanda de GPU** | Satura todos os cores disponíveis | Muitas vezes roda numa GPU só (ou CPU) |
| **Pressão de memória** | GPU memory-bound (pesos + gradientes + optimizer states) | Compute-bound (forward pass only) |
| **Eixo de scaling** | Scale *up* (GPUs maiores, mais nós) | Scale *out* (mais réplicas atrás de load balancer) |
| **Modelo de custo** | Custo total do job (horas × GPUs × preço/hr) | Custo por request (latência × throughput × preço) |
| **Impacto de falha** | Restart do último checkpoint, horas perdidas | Request perdido, retry em milissegundos |
| **Sensibilidade à rede** | Extrema: sync de gradientes a cada poucos segundos | Moderada: payloads pequenos |

**Tradução infra ↔ AI:** Pense em **training** como um job de batch massivo, tipo re-indexar um data warehouse de petabytes. Pense em **inference** como um endpoint de API com tráfego alto, tipo seu serviço de autenticação lidando com milhares de logins por segundo. Os padrões de infra que você já conhece se aplicam direto.

### Quando CPU basta

Nem todo workload de AI precisa de GPU. Cenários leves de inference (modelos pequenos de classificação, geração de embeddings pra search, deploy em edge) rodam bem em VMs `Standard_D` ou `Standard_F`. Se o modelo cabe confortável na RAM e o requisito de latência é acima de 50 ms, benchmarke em CPU primeiro. GPUs são caras; não use quando não precisa.

**Dica prática:** pergunte ao time de ML duas coisas antes de provisionar qualquer coisa: (1) "estamos treinando ou servindo?" e (2) "qual o tamanho do modelo em parâmetros?" Um modelo de 350 milhões de parâmetros geralmente roda inference em CPU. Um de 70 bilhões, não.

## Por que GPUs dominam AI

Uma CPU moderna de servidor tem 32 a 128 cores otimizados pra lógica complexa com branching. Uma GPU como a NVIDIA H100 tem **16.896 CUDA cores** e **528 Tensor Cores**, todos desenhados pra fazer uma coisa extremamente bem: multiplicar matrizes em paralelo.

Workloads de AI são fundamentalmente multiplicação de matrizes. Cada camada de uma rede neural multiplica uma matriz de entrada por uma de pesos, soma um bias, aplica uma função de ativação. A CPU processa isso sequencialmente em algumas dezenas de cores. A GPU processa milhares dessas operações simultaneamente.

**Tradução infra ↔ AI:** Pense na GPU como uma NIC SmartNIC que offloada processamento de pacotes do CPU. Assim como uma SmartNIC lida com milhões de pacotes por segundo sem sobrecarregar o host, a GPU offloada milhões de operações de matrizes. O CPU orquestra; a GPU executa a matemática pesada.

### CUDA Cores vs. Tensor Cores

Nem todos os cores de GPU são iguais:

- **CUDA cores** são processadores paralelos de propósito geral, lidam com qualquer math de ponto flutuante
- **Tensor Cores** são unidades especializadas que fazem multiply-and-accumulate de matrizes em mixed-precision num único ciclo de clock

Pra workloads de AI usando FP16 ou BF16 (que é a maioria dos trainings hoje), Tensor Cores entregam até **8× o throughput** dos CUDA cores sozinhos. Quando olhar specs de GPU, preste atenção no número de Tensor Cores. Esse número define sua performance real de AI mais do que a contagem de CUDA cores.

## Famílias de VMs GPU no Azure: a matriz de decisão

Escolher a família certa de VM GPU é a decisão de maior impacto que você vai tomar pra um workload de AI. Acertar e o training termina no prazo, dentro do budget. Errar e você queima dinheiro em hardware ocioso ou espera dias por resultados que deveriam levar horas.

| Família | SKU Exemplo | GPUs | GPU Mem | Interconexão | Melhor Para | ~Custo/hr |
|---------|-------------|------|---------|--------------|-------------|-----------|
| **NC T4 v3** | `Standard_NC4as_T4_v3` | 1× T4 | 16 GiB | Ethernet | Inference custo-eficiente, light training, dev/test | $0.53 |
| **NC T4 v3** | `Standard_NC64as_T4_v3` | 4× T4 | 64 GiB | Ethernet | Multi-model inference, batch scoring | $4.25 |
| **ND A100 v4** | `Standard_ND96asr_v4` | 8× A100 40GB | 320 GiB | InfiniBand 200 Gb/s | Training distribuído, fine-tuning de modelos grandes | $27.20 |
| **ND H100 v5** | `Standard_ND96isr_H100_v5` | 8× H100 80GB | 640 GiB | InfiniBand 400 Gb/s | Flagship training, LLMs, NCCL-optimized | $98.32 |
| **NV A10 v5** | `Standard_NV36ads_A10_v5` | 1× A10 (full) | 24 GiB | Ethernet | Visualização, AI leve, dev/test | $1.80 |
| **NV A10 v5** | `Standard_NV6ads_A10_v5` | ⅙× A10 | 4 GiB | Ethernet | GPU fracionada pra workloads pequenos | $0.45 |
| **D/E/F series** | `Standard_D16s_v5` | Nenhuma | — | Accel. Networking | Pré-processamento, data pipelines, CPU inference | $0.77 |

*Preços aproximados pay-as-you-go East US. Sempre confira no [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/).*

> **Cuidado:** A **ND-series original** (ND6s, ND12s, ND24s, ND24rs) foi **aposentada em setembro de 2023**. Se você achar templates Terraform ou posts de blog referenciando esses SKUs, vão falhar no deploy. A ND-series atual é `Standard_ND96asr_v4` (A100) e `Standard_ND96isr_H100_v5` (H100).

### Como escolher

**Pra inference:** comece com `Standard_NC4as_T4_v3`. A T4 é o workhorse da NVIDIA pra inference: suporta INT8 e FP16, tem Tensor Cores dedicados, e custa uma fração da A100. Se o modelo cabe em 16 GiB de GPU memory, comece aqui.

**Pra training:** depende do tamanho do modelo. Fine-tuning de modelo com menos de 10B parâmetros? Um nó `Standard_ND96asr_v4` com oito A100s pode ser suficiente. Training de modelo 70B+ from scratch? Vários nós `Standard_ND96isr_H100_v5` conectados por InfiniBand, rodando DeepSpeed ou PyTorch FSDP.

**Pra dev/test:** use `Standard_NV6ads_A10_v5` (GPU fracionada) ou VMs somente CPU. Não queime quota de ND-series em Jupyter notebooks.

**Verifique disponibilidade antes de tudo:**

```bash
az vm list-skus \
  --location eastus2 \
  --resource-type virtualMachines \
  --query "[?contains(name,'Standard_N')].{Name:name, Zones:locationInfo[0].zones, Restrictions:restrictions[0].reasonCode}" \
  -o table
```

Se a coluna `Restrictions` mostrar `NotAvailableForSubscription`, você precisa pedir aumento de quota no portal Azure em **Subscriptions → Usage + quotas**.

## Clustering: quando uma VM não basta

Três razões pra distribuir um workload de AI: o modelo é grande demais pra memória de uma GPU, o training é lento demais num único nó, ou você precisa servir mais requests de inference do que uma VM aguenta. Cada razão aponta pra uma estratégia diferente de clustering.

| Plataforma | Melhor Para | Suporte GPU | Scaling | Complexidade |
|------------|-------------|-------------|---------|--------------|
| **AKS** | Inference at scale, microservices | GPU node pools, device plugin, taints | HPA + Cluster Autoscaler | Média |
| **Azure Machine Learning** | Experiment tracking, managed training | Managed compute clusters, auto-provisioning | Built-in, job-based | Baixa |
| **VMSS** | GPU workloads homogêneos, batch | Custom images com drivers pré-instalados | Instance-based autoscaling | Baixa-Média |
| **Ray / DeepSpeed / Horovod** | Frameworks de training distribuído | Rodam em cima de AKS ou VMs | Gerenciado pelo framework | Alta |

### AKS pra workloads GPU

AKS é a plataforma mais comum pra servir modelos de AI em escala. Quando você adiciona VMs GPU a um cluster AKS, precisa de três coisas configuradas corretamente: o **taint no node pool**, o **NVIDIA device plugin**, e as **tolerations nos pods**.

AKS aplica automaticamente um taint em node pools GPU pra que workloads não-GPU não caiam em nós caros:

```
sku=gpu:NoSchedule
```

Seus pods GPU precisam de um toleration correspondente e devem requisitar GPU resources explicitamente:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-inference
spec:
  tolerations:
  - key: "sku"
    operator: "Equal"
    value: "gpu"
    effect: "NoSchedule"
  containers:
  - name: model-server
    image: myregistry.azurecr.io/model-server:latest
    resources:
      limits:
        nvidia.com/gpu: 1
```

O NVIDIA device plugin (DaemonSet, versão atual v0.18.0) roda nos nós GPU e expõe `nvidia.com/gpu` como recurso schedulável pro Kubernetes. Sem ele, o Kubernetes nem sabe que GPUs existem no nó.

> **Cuidado:** O taint de GPU no AKS é `sku=gpu:NoSchedule`, **não** `nvidia.com/gpu`. Muitos tutoriais usam a key errada, o que faz seus pods ficarem em `Pending` pra sempre.

## Rede: o multiplicador escondido

Fato que surpreende a maioria de engenheiros de infra quando encontram workloads de AI pela primeira vez: **a rede é frequentemente o gargalo, não a GPU**. Em training distribuído, GPUs precisam sincronizar gradientes após cada forward-backward pass. Com oito GPUs por nó e múltiplos nós, essa sincronização gera dezenas de gigabytes de tráfego de rede a cada poucos segundos. Se a rede não acompanha, GPUs ficam ociosas esperando dados, e você está pagando por silício caro que não faz nada.

### InfiniBand e RDMA

**InfiniBand** habilita **RDMA (Remote Direct Memory Access)**: uma máquina lê ou escreve na memória GPU de outra máquina *sem envolver nenhum CPU*. A sincronização de gradientes acontece direto entre GPUs entre nós, bypassing completamente a stack de rede do sistema operacional.

No Azure, InfiniBand está disponível em:
- `Standard_ND96asr_v4` — 200 Gb/s InfiniBand (HDR)
- `Standard_ND96isr_H100_v5` — 400 Gb/s InfiniBand (NDR)

Pra training distribuído com NCCL (NVIDIA Collective Communications Library), InfiniBand entrega **10× ou mais throughput** comparado com TCP/IP sobre Ethernet. NCCL detecta e usa InfiniBand automaticamente quando disponível.

### Accelerated Networking

Pra VMs que não suportam InfiniBand (NC-series, NV-series, D/E/F-series), **Accelerated Networking** usa SR-IOV pra bypassar o virtual switch do host. Latência de rede cai de ~500 μs pra ~25 μs, e throughput chega no máximo da VM. Sem custo extra; verifique se está habilitado na NIC.

### Tabela comparativa de rede

| Feature | Throughput | Latência | Disponível Em | Use Case |
|---------|-----------|----------|---------------|----------|
| InfiniBand NDR | 400 Gb/s | < 2 μs | ND H100 v5 | Multi-node LLM training |
| InfiniBand HDR | 200 Gb/s | < 2 μs | ND A100 v4 | Training distribuído |
| Accelerated Networking | Até 100 Gbps | ~25 μs | Maioria D/E/F/N series | Inference, data pipelines |
| Ethernet padrão | Até 100 Gbps | ~500 μs | Todas VMs | Workloads gerais |

### Proximity placement groups

Deployar nós de training distribuído em **availability zones diferentes** adiciona latência cross-zone que pode reduzir throughput de training em **30-50%**. Pra jobs multi-nó, sempre use um **proximity placement group**:

```bash
# Criar proximity placement group
az ppg create \
  --resource-group rg-ai-training \
  --name ppg-training-cluster \
  --location eastus2 \
  --intent-vm-sizes Standard_ND96asr_v4

# Criar VMSS dentro do proximity placement group
az vmss create \
  --resource-group rg-ai-training \
  --name vmss-training \
  --image Ubuntu2204 \
  --vm-sku Standard_ND96asr_v4 \
  --instance-count 4 \
  --ppg ppg-training-cluster \
  --accelerated-networking true
```

**Dica de troubleshooting:** quando investigar training distribuído lento, verifique throughput de rede *antes* de culpar as GPUs. Rode `ib_write_bw` (teste de banda InfiniBand) entre nós. Se estiver significativamente abaixo dos 200 ou 400 Gb/s esperados, o problema é configuração de rede, não o código do modelo.

## Hands-on: crie sua primeira VM GPU

Hora de meter a mão na massa. Vamos provisionar uma VM GPU, instalar drivers NVIDIA, e validar que a GPU está operacional. Usaremos `Standard_NC4as_T4_v3`, a opção mais barata e perfeita pra aprender.

### Passo 0: defina variáveis

```bash
RESOURCE_GROUP="rg-ai-lab"
LOCATION="eastus2"
VM_NAME="vm-gpu-lab"
VM_SIZE="Standard_NC4as_T4_v3"
ADMIN_USER="azureuser"
```

### Passo 1: verifique quota

```bash
az vm list-skus \
  --location $LOCATION \
  --size $VM_SIZE \
  --resource-type virtualMachines \
  --query "[].{Name:name, Restrictions:restrictions[0].reasonCode}" \
  -o table
```

Se mostrar `NotAvailableForSubscription`, peça aumento de quota no portal.

### Passo 2: crie o resource group

```bash
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

### Passo 3: crie a VM GPU

```bash
az vm create \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --image Ubuntu2204 \
  --size $VM_SIZE \
  --admin-username $ADMIN_USER \
  --generate-ssh-keys \
  --accelerated-networking true \
  --public-ip-sku Standard
```

Isso provisiona uma VM Ubuntu 22.04 com uma NVIDIA T4, 4 vCPUs e 28 GiB de RAM.

### Passo 4: instale drivers NVIDIA (via VM Extension)

A VM Extension é o approach recomendado. Instala a versão correta do driver, assina o kernel module pra Secure Boot, e integra com Azure update management:

```bash
az vm extension set \
  --resource-group $RESOURCE_GROUP \
  --vm-name $VM_NAME \
  --name NvidiaGpuDriverLinux \
  --publisher Microsoft.HpcCompute \
  --version 1.6
```

Monitore o progresso (leva 5-10 minutos):

```bash
az vm extension show \
  --resource-group $RESOURCE_GROUP \
  --vm-name $VM_NAME \
  --name NvidiaGpuDriverLinux \
  --query "{Status:provisioningState, Message:instanceView.statuses[0].message}" \
  -o table
```

### Passo 5: valide a GPU

SSH na VM e confirme que a GPU é reconhecida:

```bash
ssh $ADMIN_USER@$(az vm show \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --show-details \
  --query publicIps -o tsv)
```

Uma vez conectado:

```bash
nvidia-smi
```

Deve aparecer uma Tesla T4 com ~15 GiB de memória disponível, versão do driver, e versão CUDA. Se `nvidia-smi` retornar "command not found", a extensão ainda não terminou de instalar.

### Passo 6: limpeza

GPU VMs são caras mesmo ociosas. Delete o resource group quando terminar:

```bash
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

> **Custo real:** Uma `Standard_NC4as_T4_v3` custa ~$0.53/hr. Gerenciável pra lab. Mas uma `Standard_ND96isr_H100_v5` custa ~$98/hr. Deixar uma rodando num fim de semana = **$4.700+**. Sempre configure [alertas de custo](https://learn.microsoft.com/azure/cost-management-billing/costs/cost-mgt-alerts-monitor-usage-spending) e políticas de auto-shutdown pra VMs GPU.

## Monitorando workloads GPU

GPU infrastructure precisa de observabilidade específica. Métricas tradicionais de CPU (load average, memory usage) não dizem nada sobre se a GPU está sendo utilizada ou morrendo de fome.

| Métrica | Ferramenta | O que te diz |
|---------|-----------|--------------|
| GPU utilization (%) | `nvidia-smi`, DCGM Exporter | GPU está computando ou ociosa? |
| GPU memory used (GiB) | `nvidia-smi`, DCGM Exporter | Perto de OOM (out-of-memory)? |
| GPU temperature (°C) | `nvidia-smi`, DCGM Exporter | Thermal throttling? GPUs reduzem clock acima de 83°C |
| Inference latency (P50/P95/P99) | App Insights, OpenTelemetry | Experiência do usuário, compliance com SLA |
| Token throughput (tokens/sec) | Application logs, Azure OpenAI metrics | Eficiência de model serving |

**Setup recomendado:** Deploy **NVIDIA DCGM Exporter** como DaemonSet nos node pools GPU do AKS. Ele expõe métricas GPU em formato Prometheus, que o **Azure Managed Prometheus** scrapa automaticamente. Combine com dashboards **Grafana** pré-prontos pra GPU utilization, memory, temperature e error rates.

## No próximo post

Agora que você sabe quais VMs provisionar e como conectar elas, é hora de olhar **dentro** da GPU. No próximo post, vamos fazer um deep dive em arquitetura GPU: hierarquia de memória CUDA, estratégias multi-GPU, o ecossistema de drivers, e como interpretar a saída do `nvidia-smi` como um pro. Você não precisa escrever CUDA kernels, mas entender o que acontece dentro do silício vai te fazer um troubleshooter melhor e um capacity planner mais eficiente.
