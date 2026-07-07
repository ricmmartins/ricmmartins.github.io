---
slug: "dados-e-storage-para-workloads-de-ai"
translationKey: "2026/05/14/data-and-storage-for-ai-workloads"
aliases:
  - "/posts/dados-e-storage-para-workloads-de-ai/"
title: "Dados e storage para workloads de AI: o gargalo que ninguém vê"
description: "GPU cara parada esperando disco lento é o problema #1 em infra de AI. Aprenda a diagnosticar data starvation, escolher o storage certo e montar um pipeline que mantém as GPUs alimentadas."
date: 2026-04-27T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - ai
  - infraestrutura
  - azure
  - storage
  - gpu
  - blobfuse2
  - azcopy
series:
  - "AI para Engenheiros de Infraestrutura"
---

Esse é o segundo post da série onde traduzo o mundo de AI pra linguagem de engenheiros de infraestrutura. No [primeiro post](/posts/ai-para-engenheiros-de-infraestrutura-por-que-ai-precisa-de-voce/), mostrei que AI é só mais um workload e que suas habilidades de infra já te deixam bem mais perto desse mundo do que parece.

Agora é hora de falar do gargalo que quase todo mundo descobre tarde demais: **storage**.

## A ligação de meia-noite

Você fez tudo certo. O time de ML pediu um cluster GPU e você entregou: oito NVIDIA A100 em dois nós, rede de alta banda, drivers CUDA atualizados. Deploy impecável. O time começou o primeiro job de treinamento sexta às 18h e você foi pra casa tranquilo.

Seu celular toca à meia-noite. O lead de data science está irritado: *"As GPUs não estão funcionando. O treinamento que deveria levar quatro horas nem terminou o primeiro epoch."*

Você acessa remotamente e puxa as métricas:

- **GPU utilization**: 12%
- **GPU memory**: um terço do total
- **Disk I/O**: 100%, throughput de leitura arrastando a 60 MB/s

O time colocou 2 TB de imagens de treinamento num Azure Files Standard montado via SMB. Sua camada de storage está **matando de fome** o hardware mais caro do ambiente.

Essa história se repete toda semana. Times investem pesado em GPU e descobrem depois que o pipeline de dados, justamente a parte pela qual **nós** de infra respondemos, é o gargalo real.

## Por que tudo começa com dados

Todo sistema de AI, de um classificador simples até um LLM de trilhões de parâmetros, depende da mesma conta:

**Dados + Modelo + Compute = AI**

Tira qualquer um dos três e não sobra nada. O ponto que muita gente demora pra enxergar é outro: dos três componentes, **dados são o que encosta em infraestrutura o tempo inteiro**. O modelo é código. Compute você provisiona e deixa rodando. Já os dados precisam ser ingeridos, armazenados, preparados, servidos pro treinamento e entregues na inferência. Cada etapa dessas cai no seu colo.

| Conceito de infra | Equivalente em AI | Por que importa |
|-------------------|-------------------|-----------------|
| Storage account / volume | Repositório de dataset | Onde os dados brutos vivem antes do modelo ver |
| Read throughput (MB/s) | Velocidade do data loader | Determina quão rápido as GPUs recebem batches de treinamento |
| IOPS | Amostras por segundo | Workloads com arquivos pequenos, como imagens, pedem IOPS alto |
| Storage tiers (Hot/Cool/Archive) | Estágios do ciclo de vida | Hot pra treino ativo, Cool pra datasets concluídos, Archive pra compliance |
| NFS/SMB mount | Acesso POSIX pra frameworks | PyTorch e TensorFlow esperam semântica de filesystem |
| Criptografia em repouso | Compliance de proteção de dados | Obrigatório pra PII, dados médicos e financeiros |

Se você já gerencia storage, rede e controle de acesso, você entende uma boa parte do data stack de AI. O que muda é a intensidade. Workloads de AI apertam throughput de leitura, IOPS e I/O sequencial com uma força que poucas aplicações tradicionais conseguem imitar.

## Data starvation: o gargalo invisível

Aqui está a parte contra-intuitiva: **a causa mais comum de baixa utilização de GPU não é a GPU. É o storage**.

Quando o data loader não entrega batches rápido o bastante, a GPU fica parada esperando dados. Isso se chama *data starvation*. Na prática, seu cluster de GPU vira um aquecedor caro.

### Como diagnosticar

Se um data scientist reportar GPU utilization estranhamente baixa, **olhe pro storage antes de olhar pra qualquer outra coisa**. Na maioria dos casos, o problema cai em um destes cenários:

1. Dados de treinamento em **Standard HDD** ou em um share Standard subdimensionado
2. Mount remoto **sem cache**
3. Cache do BlobFuse2 apontando pro **disco do sistema operacional** em vez do NVMe local

Sinais clássicos de data starvation:

```bash
# GPU utilization: se está abaixo de 80% durante treinamento, suspeite do storage
nvidia-smi dmon -s u -d 5

# Disk I/O: se está a 100% com GPU baixa, o padrão é bem conhecido
iostat -x 1 5

# Rede, se o dataset está remoto: throughput real vs capacidade
sar -n DEV 1 5
```

O padrão de diagnóstico costuma ser esse:

| GPU Util | CPU Util | Disk I/O | Diagnóstico |
|----------|----------|----------|-------------|
| Baixa | Baixa | Alto | **Data starvation**: storage não entrega dados rápido o bastante |
| Baixa | Alta | Baixo | Preprocessing de CPU virou gargalo |
| Alta | Alta | Alto | Tudo funcionando como deveria, sistema balanceado |
| Baixa | Baixa | Baixo | Problema no código do modelo ou batch size mal ajustado |

> **Regra de ouro**: um ajuste de storage feito em cinco minutos pode derrubar horas do tempo total de treino. Comece por aí.

## Escolhendo o storage certo: a matriz de decisão

Essa é a decisão de maior impacto na performance de um workload de AI. O mapa, em geral, é este:

| Storage | Melhor pra | Throughput | Latência | Custo | Não use quando |
|---------|-----------|------------|----------|-------|----------------|
| **Blob Storage** | Datasets, artefatos, checkpoints | Até 60 Gbps por conta | Moderada (ms) | Baixo (~$0.018/GB/mês) | Precisa de POSIX nativo sem mount |
| **Data Lake Gen2** | Pipelines analíticos, datasets versionados | Até 60 Gbps por conta | Moderada (ms) | Baixo | Workload simples que não precisa de ACLs granulares |
| **NVMe local** | Scratch de treinamento, cache do data loader | 3 a 7 GB/s por disco | Ultra-baixa (μs) | Incluído na VM | Precisa de persistência: dados somem na desalocação |
| **Azure Files (NFS)** | Datasets compartilhados entre nós | Até 10 Gbps (premium) | Baixa a moderada | Moderado | Workload single-node onde NVMe local basta |
| **Azure Files (SMB)** | Compatibilidade legacy, Windows | Até 4 Gbps (premium) | Moderada | Moderado | Treinamento Linux de alta performance |
| **Cosmos DB** | Feature stores, inferência em tempo real | N/A (baseado em request) | Single-digit ms | Mais alto | Armazenar datasets brutos de treinamento |

O padrão de produção mais comum é uma **abordagem de duas camadas**: dados brutos em Blob Storage ou Data Lake Gen2 pela durabilidade e pelo custo, depois staging dos dados quentes em NVMe local pela performance.

**Blob é seu warehouse. NVMe é sua bancada de trabalho.**

> **Nunca use o hot path do treino em Standard HDD.** Os limites de IOPS e throughput ficam muito abaixo do que GPUs modernas pedem. Uma A100 consegue consumir dados mais rápido do que um share Standard ou um disco Standard HDD entrega.

## O padrão recomendado: Blob + NVMe + BlobFuse2

A maioria dos frameworks de ML, como PyTorch e TensorFlow, espera dados de treinamento acessíveis por um caminho de filesystem. **BlobFuse2** é o driver que monta containers do Azure Blob Storage como diretório local em Linux.

O BlobFuse2 tem dois modos de cache, e aqui vale escolher com cuidado:

- **File cache**: baixa o arquivo inteiro pro cache local antes de atender leituras. É o modo que faz mais sentido pra treinamento, porque o dataset costuma ser relido em múltiplos epochs.
- **Block cache (streaming)**: lê em blocos sem baixar o arquivo completo. Faz mais sentido pra preprocessing ou inferência em arquivos grandes.

### Montar com file cache pra treinamento

```bash
# Cria diretório de cache no storage rápido local (NVMe temp disk)
sudo mkdir -p /mnt/resource/blobfuse2cache
sudo chown $(whoami) /mnt/resource/blobfuse2cache

# Cria ponto de montagem
sudo mkdir -p /mnt/training-data

# Monta com file cache
sudo blobfuse2 mount /mnt/training-data \
  --config-file=./config.yaml \
  --tmp-path=/mnt/resource/blobfuse2cache
```

### Preload: dados prontos antes do treinamento começar

```bash
# Monta com preload: baixa dados pro cache no momento da montagem
sudo blobfuse2 mount /mnt/training-data \
  --config-file=./config.yaml \
  --tmp-path=/mnt/resource/blobfuse2cache \
  --preload
```

> **Atenção**: `--preload` deixa o mount read-only. Pra dataset de treino isso costuma ser ótimo. Só não use esse mesmo mount no caminho onde você precisa escrever checkpoints.

> **Dica**: aponte `--tmp-path` pro disco NVMe local da VM, normalmente `/mnt/resource` em VMs Azure com waagent, e não pro disco do sistema operacional. É ali que você consegue a menor latência possível. Em VMs da série ND, o temp disk local costuma entregar alguns GB/s de leitura.

### AzCopy pra ingestão de dados em massa

Quando você precisa mover datasets grandes pro Azure, ou entre storage accounts, AzCopy costuma ser o caminho mais rápido. Ele paraleliza transferências, faz retry automático e retoma uploads interrompidos.

```bash
# Login com Microsoft Entra ID
azcopy login

# Copia um diretório inteiro de dataset pro Blob Storage
azcopy copy './local-dataset/' \
  "https://${STORAGE_ACCOUNT}.blob.core.windows.net/training-data/v1/" \
  --recursive

# Copia entre storage accounts (server-side, sem download local)
azcopy copy \
  "https://<source-account>.blob.core.windows.net/<container>" \
  "https://<dest-account>.blob.core.windows.net/<container>" \
  --recursive
```

> **Dica**: use `--cap-mbps` quando quiser limitar throughput no horário comercial e liberar tudo à noite.

## Segurança: embutida, não colada depois

Workloads de AI mexem com alguns dos dados mais sensíveis da organização: registros de clientes, imagens médicas, transações financeiras, corpora de texto proprietário.

Três regras eu trato como inegociáveis:

**1. Managed identities + RBAC, sempre.**

Esqueça storage account keys. São estáticas, compartilháveis e chatas de rotacionar. Managed identities ficam presas a recursos específicos, rotacionam sozinhas e ainda deixam trilha de auditoria.

```bash
# Atribui Storage Blob Data Reader pra managed identity de uma VM
az role assignment create \
  --role "Storage Blob Data Reader" \
  --assignee-object-id <managed-identity-principal-id> \
  --assignee-principal-type ServicePrincipal \
  --scope "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<account>"
```

**2. Classifique antes de ingerir.**

Antes de qualquer dado entrar no pipeline de treinamento, responda a pergunta chata: é público, interno, confidencial ou restrito? Sua arquitetura de storage precisa refletir isso com isolamento de rede, criptografia e controles de acesso.

**3. Combata shadow data sprawl.**

Data scientist adora copiar dado pra máquina local, drive compartilhado ou storage account paralela pra um "teste rápido". Use Azure Policy pra restringir criação de storage accounts e Microsoft Purview pra localizar cópias fora dos lugares aprovados.

## Mãos na massa: storage otimizado pra AI de ponta a ponta

Vamos montar um fluxo completo: provisionar, transferir, montar e validar. Todos os comandos usam `--auth-mode login`. Nada de storage key largada em script.

### 1. Cria a storage account com Data Lake Gen2

```bash
RESOURCE_GROUP="rg-ai-training"
LOCATION="eastus2"
STORAGE_ACCOUNT="staitraining$(openssl rand -hex 4)"

az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --enable-hierarchical-namespace true \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false
```

### 2. Configura RBAC (sem keys)

```bash
USER_OBJECT_ID=$(az ad signed-in-user show --query id -o tsv)

az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee-object-id $USER_OBJECT_ID \
  --assignee-principal-type User \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT"
```

> Role assignments levam um ou dois minutos pra propagar. Espere isso antes de seguir.

### 3. Cria container e transfere dados

```bash
az storage container create \
  --account-name $STORAGE_ACCOUNT \
  --name training-data \
  --auth-mode login

# Pra datasets grandes, use AzCopy
azcopy login
azcopy copy './local-dataset/' \
  "https://${STORAGE_ACCOUNT}.blob.core.windows.net/training-data/v1/" \
  --recursive
```

### 4. Monta com BlobFuse2 e cache em NVMe

```bash
sudo mkdir -p /mnt/resource/blobfuse2cache
sudo chown $(whoami) /mnt/resource/blobfuse2cache
sudo mkdir -p /mnt/training-data

sudo blobfuse2 mount /mnt/training-data \
  --config-file=./config.yaml \
  --tmp-path=/mnt/resource/blobfuse2cache \
  --preload
```

### 5. Valida que o pipeline está alimentando as GPUs

```bash
# Verifica que os dados estão acessíveis
ls /mnt/training-data/v1/ | head -20

# Durante o treinamento, monitora GPU vs I/O
nvidia-smi dmon -s u -d 5 &
iostat -x 1 5
```

Se `nvidia-smi` mostrar GPU util acima de 80% e `iostat` não estiver batendo 100% o tempo todo, seu pipeline de dados está no caminho certo.

## Checklist de saída

Antes de entregar storage pra um workload de AI:

- [ ] A camada quente do treino usa **NVMe local, Premium SSD ou cache local bem dimensionado**
- [ ] O cache do BlobFuse2 aponta pro **NVMe local** (`/mnt/resource`), não pro disco do sistema operacional
- [ ] O acesso usa **managed identity + RBAC**, sem storage keys
- [ ] Os dados foram classificados **antes** de entrar no pipeline
- [ ] O storage foi pensado pra **10x o tamanho atual** do dataset
- [ ] Existem alertas de **throughput e IOPS** configurados
- [ ] Os checkpoints voltam pro **Blob Storage** pra garantir durabilidade

## No próximo post

Agora que você entende como os dados fluem por um sistema de AI, e como suas decisões de storage mudam direto a performance do treinamento, faz sentido olhar pro compute que consome tudo isso. No próximo post eu vou falar sobre **GPUs, famílias de VMs e arquitetura de cluster**, e por que storage bem resolvido é só metade da história.

O livro completo está disponível de graça em [ai4infra.com](https://ai4infra.com).

---

*Esse post faz parte da série **AI para Engenheiros de Infraestrutura**, baseada no livro [AI for Infrastructure Professionals](https://ai4infra.com). Novos posts toda semana.*
