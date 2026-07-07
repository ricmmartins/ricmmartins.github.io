---
slug: "compute-para-ai-escolhendo-o-hardware-certo"
translationKey: "2026/05/18/compute-for-ai-choosing-the-right-hardware"
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

Terceiro post da série onde traduzo AI pra linguagem de quem vive infraestrutura. No [post anterior](/dados-e-storage-para-workloads-de-ai/), falamos do gargalo escondido de storage. Hoje a conversa é sobre **compute**.

A diferença não está em comprar a GPU mais cara da prateleira. Está em escolher a GPU certa e ligar tudo do jeito certo.

## A história que você não quer viver

O time de ML pede "um cluster GPU pra treinamento". Você faz o que qualquer engenheiro de infra faria num primeiro impulso: provisiona oito `Standard_D16s_v5`. Dezesseis vCPUs cada, 64 GiB de RAM, SSD premium. No papel, parece muita coisa.

O time lança o script de treinamento. Barra de progresso: estimativa de conclusão em **47 horas**. CPUs a 100%, rede mal registra tráfego e ninguém está feliz.

Aí um colega sugere dois nós `Standard_ND96asr_v4`, cada um com oito GPUs A100 conectadas por InfiniBand HDR de 200 Gb/s. Mesmo training job, mesmo dataset, mesmo código. O job termina em **90 minutos**.

A diferença não é só ter GPU. É como elas conversam entre si dentro do nó, como sincronizam gradientes entre nós e como o dado flui sem a CPU virar gargalo. Compute pra AI é muito menos sobre força bruta e muito mais sobre combinação de hardware, topologia e rede.

## Training vs. inference: dois mundos diferentes

Antes de escolher qualquer SKU, você precisa saber que workload vai rodar. Training e inference parecem parentes próximos, mas o perfil de infraestrutura muda bastante.

| Dimensão | Training | Inference |
|----------|----------|-----------|
| **Padrão de workload** | Batch, roda por horas, dias ou semanas | Online, respostas em milissegundos ou segundos |
| **Demanda de GPU** | Satura praticamente todos os recursos disponíveis | Muitas vezes roda numa GPU só, e às vezes em CPU |
| **Pressão de memória** | GPU memory-bound (pesos, gradientes, optimizer states) | Latência e bandwidth da memória costumam mandar mais do que FLOPS |
| **Eixo de scaling** | Scale *up* (GPUs maiores, mais nós) | Scale *out* (mais réplicas atrás de load balancer) |
| **Modelo de custo** | Custo total do job (horas × GPUs × preço por hora) | Custo por request (latência × throughput × preço) |
| **Impacto de falha** | Restart do último checkpoint, horas perdidas | Request perdido, retry em milissegundos |
| **Sensibilidade à rede** | Alta: sincronização de gradientes o tempo todo | Moderada: payloads menores, foco em latência |

**Tradução infra ↔ AI:** pense em **training** como um job batch pesado, tipo reindexar um data warehouse gigante. Pense em **inference** como um endpoint de API de alta demanda. Os padrões de infra continuam sendo os mesmos. Só mudam as peças do hardware.

### Quando CPU basta

Nem todo workload de AI precisa de GPU. Cenários leves de inference, como modelos pequenos de classificação, geração de embeddings pra search e deploy em edge, costumam rodar bem em VMs `Standard_D` ou `Standard_F`. Se o modelo cabe folgado na RAM e o requisito de latência passa de 50 ms, vale benchmark em CPU antes de sair queimando quota de GPU.

**Dica prática:** antes de provisionar qualquer coisa, pergunte ao time de ML duas coisas: (1) "estamos treinando ou servindo?" e (2) "qual o tamanho do modelo em parâmetros?" Um modelo de 350 milhões de parâmetros muitas vezes roda inference em CPU se a latência permitir. Um de 70 bilhões não.

## Por que GPUs dominam AI

Uma CPU moderna de servidor tem algumas dezenas de cores otimizados pra lógica complexa e branching. Uma GPU como a NVIDIA H100 tem **16.896 CUDA cores** e **528 Tensor Cores**, todos desenhados pra uma tarefa muito específica: multiplicar matrizes em paralelo.

Na prática, workloads de AI passam boa parte do tempo fazendo multiplicação de matrizes. Cada camada de uma rede neural multiplica uma matriz de entrada por uma de pesos, soma um bias e aplica uma função de ativação. A CPU faz isso com poucos núcleos bem versáteis. A GPU faz milhares dessas operações ao mesmo tempo.

**Tradução infra ↔ AI:** pense na GPU como uma SmartNIC que descarrega do host um trabalho pesadíssimo. O CPU orquestra. A GPU faz a matemática dura.

### CUDA Cores vs. Tensor Cores

Nem todos os cores de GPU são iguais:

- **CUDA cores** são processadores paralelos de propósito geral, usados pra ponto flutuante e inteiros
- **Tensor Cores** são unidades especializadas em operações de matriz, especialmente em precisões como FP16 e BF16

Pra workloads de AI em FP16 ou BF16, que é o normal hoje, Tensor Cores costumam ser o que mais pesa no throughput real. Quando for comparar placas, olhe além da contagem de CUDA cores.

## Famílias de VMs GPU no Azure: a matriz de decisão

Escolher a família certa de VM GPU é a decisão com mais impacto no resultado do workload. Acertar significa terminar no prazo e dentro do budget. Errar significa pagar caro pra esperar mais do que precisava.

| Família | SKU Exemplo | GPUs | GPU Mem | Interconexão | Melhor Para | ~Custo/hr |
|---------|-------------|------|---------|--------------|-------------|-----------|
| **NC T4 v3** | `Standard_NC4as_T4_v3` | 1× T4 | 16 GiB | Ethernet | Inference custo-eficiente, light training, dev/test | $0.53 |
| **NC T4 v3** | `Standard_NC64as_T4_v3` | 4× T4 | 64 GiB | Ethernet | Multi-model inference, batch scoring | $4.35 |
| **ND A100 v4** | `Standard_ND96asr_v4` | 8× A100 40GB | 320 GiB | 8× 200 Gb/s InfiniBand | Training distribuído, fine-tuning de modelos grandes | $27.20 |
| **ND H100 v5** | `Standard_ND96isr_H100_v5` | 8× H100 80GB | 640 GiB | 8× 400 Gb/s InfiniBand | Training de ponta, LLMs, NCCL-optimized | $98.32 |
| **NV A10 v5** | `Standard_NV36ads_A10_v5` | 1× A10 (full) | 24 GiB | Ethernet | Visualização, AI leve, dev/test | $3.20 |
| **NV A10 v5** | `Standard_NV6ads_A10_v5` | ⅙× A10 | 4 GiB | Ethernet | GPU fracionada pra workloads pequenos | $0.45 |
| **D/E/F series** | `Standard_D16s_v5` | Nenhuma | - | Accelerated Networking | Pré-processamento, data pipelines, CPU inference | $0.77 |

*Preços aproximados pay-as-you-go em East US para Linux. Sempre confira no [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/).*

> **Cuidado:** a **ND-series original** (`ND6s`, `ND12s`, `ND24s`, `ND24rs`) foi aposentada em setembro de 2023. Se você achar template Terraform antigo ou blog post com esses SKUs, o deploy vai falhar. Pra training distribuído no Azure atual, os nomes que aparecem com mais frequência são `Standard_ND96asr_v4` e `Standard_ND96isr_H100_v5`.

### Como escolher

**Pra inference:** comece com `Standard_NC4as_T4_v3`. A T4 continua sendo um ótimo ponto de entrada: suporta INT8 e FP16, tem Tensor Cores e custa uma fração da A100. Se o modelo cabe em 16 GiB de GPU memory, eu começaria aqui.

**Pra training:** o tamanho do modelo manda na decisão. Fine-tuning de um modelo com menos de 10B parâmetros? Um nó `Standard_ND96asr_v4` com oito A100s pode bastar. Training de modelo 70B+ do zero? A conversa já vira múltiplos nós `Standard_ND96isr_H100_v5` ligados por InfiniBand, normalmente com DeepSpeed ou PyTorch FSDP.

**Pra dev/test:** use `Standard_NV6ads_A10_v5` ou CPU pura. Não queime quota de ND-series em notebook esquecendo aba aberta.

**Verifique disponibilidade antes de tudo:**

```bash
az vm list-skus \
  --location eastus2 \
  --resource-type virtualMachines \
  --query "[?contains(name,'Standard_N')].{Name:name, Zones:locationInfo[0].zones, Restrictions:restrictions[0].reasonCode}" \
  -o table
```

Se a coluna `Restrictions` mostrar `NotAvailableForSubscription`, você provavelmente precisa pedir aumento de quota em **Subscriptions → Usage + quotas**.

## Clustering: quando uma VM não basta

Existem três motivos clássicos pra distribuir um workload de AI: o modelo não cabe na memória de uma GPU, o training demora demais em um único nó ou a inference precisa servir mais requests do que uma VM aguenta. Cada caso leva a uma estratégia diferente.

| Plataforma | Melhor Para | Suporte GPU | Scaling | Complexidade |
|------------|-------------|-------------|---------|--------------|
| **AKS** | Inference em escala, microservices | GPU node pools, device plugin, taints | HPA + Cluster Autoscaler | Média |
| **Azure Machine Learning** | Experiment tracking, managed training | Managed compute clusters, auto-provisioning | Built-in, job-based | Baixa |
| **VMSS** | GPU workloads homogêneos, batch | Custom images com drivers pré-instalados | Autoscaling por instância | Baixa-Média |
| **Ray / DeepSpeed / Horovod** | Frameworks de training distribuído | Rodam em cima de AKS ou VMs | Gerenciado pelo framework | Alta |

### AKS pra workloads GPU

AKS é a plataforma mais comum pra servir modelos de AI em escala. Se você estiver usando **GPU node pools self-managed**, precisa acertar três peças: o **taint no node pool**, o **NVIDIA device plugin** e as **tolerations nos pods**. Se estiver usando **AKS-managed GPU node pools**, o AKS já instala e mantém driver, device plugin e exporter de métricas pra você.

AKS aplica um taint em pools GPU pra workloads comuns não caírem em nós caros:

```
sku=gpu:NoSchedule
```

Seus pods GPU precisam de um toleration correspondente e devem pedir GPU explicitamente:

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

No modelo self-managed, o NVIDIA device plugin roda como DaemonSet nos nós GPU e expõe `nvidia.com/gpu` como recurso schedulável pro Kubernetes. Sem ele, o scheduler nem enxerga que existe GPU no nó.

> **Cuidado:** o taint de GPU no AKS é `sku=gpu:NoSchedule`, **não** `nvidia.com/gpu`. Muita documentação antiga usa a key errada. O resultado é pod em `Pending` e perda de tempo na troubleshooting call.

## Rede: o multiplicador escondido

Tem uma coisa que costuma surpreender quem chega em AI vindo de infra tradicional: **a rede frequentemente vira gargalo antes da GPU**. Em training distribuído, GPUs sincronizam gradientes depois de cada forward-backward pass. Com oito GPUs por nó e vários nós no cluster, isso gera dezenas de gigabytes de tráfego em poucos segundos. Se a rede não acompanha, as GPUs ficam ociosas esperando.

### InfiniBand e RDMA

**InfiniBand** habilita **RDMA (Remote Direct Memory Access)**. Na prática, isso permite que os dados trafeguem sem passar pelo caminho clássico de CPU + kernel, o que derruba latência e libera host pra fazer o que importa.

No Azure, InfiniBand aparece em:
- `Standard_ND96asr_v4`: 8 links HDR de 200 Gb/s
- `Standard_ND96isr_H100_v5`: 8 links NDR de 400 Gb/s

Pra training distribuído com NCCL, isso pode render múltiplos de throughput quando comparado com TCP/IP sobre Ethernet. Quando o ambiente está bem configurado, o NCCL usa InfiniBand automaticamente.

### Accelerated Networking

Pra VMs que não têm InfiniBand, como NC-series, NV-series e boa parte das D/E/F-series, **Accelerated Networking** usa SR-IOV pra pular o virtual switch do host. A latência cai bastante e o throughput chega perto do limite da VM. Não custa extra. Só confira se está habilitado.

### Tabela comparativa de rede

| Feature | Throughput | Latência | Disponível Em | Use Case |
|---------|-----------|----------|---------------|----------|
| InfiniBand NDR | 400 Gb/s por GPU | < 2 μs | ND H100 v5 | Multi-node LLM training |
| InfiniBand HDR | 200 Gb/s por GPU | < 2 μs | ND A100 v4 | Training distribuído |
| Accelerated Networking | Até 100 Gbps | ~25 μs | Maioria das séries D/E/F/N | Inference, data pipelines |
| Ethernet padrão | Até 100 Gbps | ~500 μs | Todas as VMs | Workloads gerais |

### Proximity placement groups

Espalhar nós de training distribuído em availability zones diferentes adiciona latência cross-zone e pode derrubar o throughput de treino. Pra jobs multi-nó, use **proximity placement group** sempre que a arquitetura permitir:

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
  --admin-username azureuser \
  --generate-ssh-keys \
  --ppg ppg-training-cluster \
  --accelerated-networking true
```

**Dica de troubleshooting:** quando investigar training distribuído lento, meça a rede antes de culpar a GPU. Rode `ib_write_bw` entre nós. Se estiver muito abaixo do esperado, o problema costuma estar na configuração da malha, não no código do modelo.

## Hands-on: crie sua primeira VM GPU

Hora de meter a mão na massa. Vamos subir uma VM GPU, instalar o driver NVIDIA e validar se a placa está viva. Vou usar `Standard_NC4as_T4_v3`, que é a opção mais barata pra laboratório.

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

A VM Extension é o jeito mais simples de instalar o driver certo sem ficar montando script de bootstrap na mão:

```bash
az vm extension set \
  --resource-group $RESOURCE_GROUP \
  --vm-name $VM_NAME \
  --name NvidiaGpuDriverLinux \
  --publisher Microsoft.HpcCompute \
  --enable-auto-upgrade true
```

Monitore o progresso, porque isso leva alguns minutos:

```bash
az vm extension show \
  --resource-group $RESOURCE_GROUP \
  --vm-name $VM_NAME \
  --name NvidiaGpuDriverLinux \
  --instance-view \
  --query "{ProvisioningState:provisioningState, Status:statuses[0].displayStatus}" \
  -o table
```

### Passo 5: valide a GPU

SSH na VM e confirme que a GPU foi reconhecida:

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

Você deve ver uma Tesla T4, versão do driver e memória total próxima de 16 GiB. Se `nvidia-smi` retornar algo como driver ausente ou comando não encontrado, a extensão ainda não terminou de instalar.

### Passo 6: limpeza

GPU VM parada custa dinheiro do mesmo jeito. Delete o resource group quando terminar:

```bash
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

> **Custo real:** uma `Standard_NC4as_T4_v3` custa cerca de $0.53 por hora. Tranquilo pra laboratório. Já uma `Standard_ND96isr_H100_v5` custa cerca de $98 por hora. Deixar uma dessas ligada por um fim de semana passa fácil de $4.700. Configure [alertas de custo](https://learn.microsoft.com/azure/cost-management-billing/costs/cost-mgt-alerts-monitor-usage-spending) e políticas de auto-shutdown.

## Monitorando workloads GPU

GPU infrastructure pede observabilidade própria. Métricas tradicionais de CPU não dizem quase nada sobre se a GPU está trabalhando de verdade ou esperando dado chegar.

| Métrica | Ferramenta | O que te diz |
|---------|-----------|--------------|
| GPU utilization (%) | `nvidia-smi`, DCGM Exporter | GPU está computando ou parada? |
| GPU memory used (GiB) | `nvidia-smi`, DCGM Exporter | Está perto de OOM? |
| GPU temperature (°C) | `nvidia-smi`, DCGM Exporter | Tem thermal throttling? |
| Inference latency (P50/P95/P99) | App Insights, OpenTelemetry | Experiência do usuário e SLA |
| Token throughput (tokens/sec) | Application logs, métricas da aplicação | Eficiência do model serving |

**Setup recomendado:** rode **NVIDIA DCGM Exporter** nos pools GPU e mande isso pra Prometheus ou Azure Managed Prometheus. Daí é Grafana, dashboard e correlação com o resto do ambiente, como qualquer outro serviço sério.

## No próximo post

Agora que você sabe quais VMs provisionar e como conectar tudo, faz sentido olhar **dentro** da GPU. No próximo post eu vou falar de hierarquia de memória CUDA, estratégias multi-GPU, stack de drivers e leitura de `nvidia-smi` sem chute. Você não precisa escrever CUDA kernel. Mas entender o que acontece dentro do silício te transforma num troubleshooter bem melhor.
