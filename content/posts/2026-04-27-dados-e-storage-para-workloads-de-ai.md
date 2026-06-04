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

Esse é o segundo post da série onde traduzo o mundo de AI para a linguagem de engenheiros de infraestrutura. No [primeiro post](/posts/ai-para-engenheiros-de-infraestrutura-por-que-ai-precisa-de-voce/), mostrei que AI é só mais um workload e que suas habilidades de infra já te preparam mais do que imagina.

Agora vamos falar do gargalo que **todo mundo ignora** e que acaba sendo o vilão escondido de performance em praticamente todo projeto de AI que já vi: **storage**.

## A ligação de meia-noite

Você fez tudo certo. O time de ML pediu um cluster GPU e você entregou: oito NVIDIA A100 em dois nós, rede de alta banda, drivers CUDA atualizados. Deploy impecável. O time começou o primeiro job de treinamento sexta às 18h e você foi pra casa tranquilo.

Seu celular toca à meia-noite. O lead de data science está frustrado: *"As GPUs não estão funcionando. O treinamento que deveria levar quatro horas nem terminou o primeiro epoch."*

Você acessa remotamente e puxa as métricas:

- **GPU utilization**: 12%
- **GPU memory**: um terço do total
- **Disk I/O**: 100%, throughput de leitura arrastando a 60 MB/s

O time armazenou 2 TB de imagens de treinamento num Blob Storage com Standard HDD, montado via SMB share básico. Sua arquitetura de storage está **matando de fome** o hardware mais caro do rack.

Essa história acontece em organizações toda semana. Times investem fortunas em GPUs pra descobrir que o pipeline de dados, a parte pela qual **nós** de infra somos responsáveis, é o verdadeiro gargalo.

## Por que tudo começa com dados

Toda sistema de AI, de um classificador simples até um LLM de trilhões de parâmetros, depende de uma fórmula:

**Dados + Modelo + Compute = AI**

Remove qualquer um dos três e não tem nada. Mas o insight que a maioria de nós perde no início é: dos três componentes, **dados são o que toca infraestrutura em cada estágio**. O modelo é código. Compute é provisionado e fica rodando. Mas dados precisam ser ingeridos, armazenados, preparados, servidos pro treinamento e entregues na inferência. E **cada um desses estágios é um problema de infraestrutura**.

| Conceito de Infra | Equivalente em AI | Por que importa |
|-------------------|-------------------|-----------------|
| Storage account / volume | Repositório de dataset | Onde os dados brutos vivem antes do modelo ver |
| Read throughput (MB/s) | Velocidade do data loader | Determina quão rápido as GPUs recebem batches de treinamento |
| IOPS | Amostras por segundo | Workloads de arquivos pequenos (imagens) precisam de IOPS alto |
| Storage tiers (Hot/Cool/Archive) | Estágios do ciclo de vida | Hot pra treino ativo, Cool pra datasets concluídos, Archive pra compliance |
| NFS/SMB mount | Acesso POSIX pra frameworks | PyTorch e TensorFlow esperam semântica de filesystem |
| Criptografia em repouso | Compliance de proteção de dados | Obrigatório pra PII, dados médicos e financeiros |

Se você já gerencia storage, rede e controle de acesso, você entende **70% do data stack de AI**. O que muda é a *intensidade*: workloads de AI empurram throughput de leitura, IOPS e I/O sequencial mais forte do que quase qualquer coisa que você já provisionou.

## Data starvation: o gargalo invisível

Aqui está a verdade contra-intuitiva sobre infra de AI: **a causa mais comum de baixa utilização de GPU não é um problema de GPU. É um problema de storage**.

Quando o data loader não consegue alimentar batches pra GPU rápido o suficiente, a GPU fica ociosa esperando dados. Isso se chama *data starvation*, e transforma seu cluster de GPU de R$ 150.000/mês num aquecedor de ambiente caro.

### Como diagnosticar

Se um data scientist reportar que a GPU utilization está suspeitamente baixa, **verifique o storage antes de investigar qualquer outra coisa**. Nove em cada dez vezes, o problema é um desses:

1. Dados de treinamento em **Standard HDD**
2. Mount remoto **sem cache**
3. Cache do BlobFuse2 apontando pro **disco do OS** em vez do NVMe local

Sinais clássicos de data starvation:

```bash
# GPU utilization: se está abaixo de 80% durante treinamento, é quase certeza storage
nvidia-smi dmon -s u -d 5

# Disk I/O: se está a 100% com GPU baixa, gargalo clássico
iostat -x 1 5

# Rede (se o dataset está remoto): throughput real vs capacidade
sar -n DEV 1 5
```

O padrão de diagnóstico é simples:

| GPU Util | CPU Util | Disk I/O | Diagnóstico |
|----------|----------|----------|-------------|
| Baixa | Baixa | Alto | **Data starvation**: storage não alimenta dados rápido o bastante |
| Baixa | Alta | Baixo | Preprocessing de CPU é gargalo (data augmentation pesada) |
| Alta | Alta | Alto | Tudo funcionando bem, sistema balanceado |
| Baixa | Baixa | Baixo | Problema no código do modelo ou batch size errado |

> ⚠️ **Regra de ouro**: Um fix de storage de cinco minutos pode transformar um treinamento de três dias num treinamento overnight. Sempre comece pelo storage.

## Escolhendo o storage certo: a matriz de decisão

Essa é a decisão mais impactante que você vai tomar pra performance de workloads de AI. Aqui está o mapa:

| Storage | Melhor pra | Throughput | Latência | Custo | Não use quando |
|---------|-----------|------------|----------|-------|----------------|
| **Blob Storage** | Datasets, artefatos, checkpoints | Até 60 Gbps/conta | Moderada (ms) | Baixo (~$0.018/GB/mês) | Precisa de POSIX nativo sem mount |
| **Data Lake Gen2** | Pipelines analíticos, datasets versionados | Até 60 Gbps/conta | Moderada (ms) | Baixo | Workload simples que não precisa de ACLs granulares |
| **NVMe local** | Scratch de treinamento, cache do data loader | 3-7 GB/s por disco | Ultra-baixa (μs) | Incluído na VM | Precisa de persistência: dados perdidos na desalocação |
| **Azure Files (NFS)** | Datasets compartilhados entre nós | Até 10 Gbps (premium) | Baixa-moderada | Moderado | Workload single-node onde NVMe local basta |
| **Azure Files (SMB)** | Compatibilidade legacy, Windows | Até 4 Gbps (premium) | Moderada | Moderado | Treinamento em Linux de alta performance |
| **Cosmos DB** | Feature stores, inferência real-time | N/A (baseado em request) | Single-digit ms | Mais alto | Armazenar datasets brutos de treinamento |

O padrão de produção mais comum é uma **abordagem de duas camadas**: armazene datasets brutos em Blob Storage ou Data Lake Gen2 pra durabilidade e custo, depois faça staging dos dados ativos pra NVMe local pra performance.

**Blob é seu warehouse. NVMe é sua bancada de trabalho.**

> ⚠️ **Nunca use Standard HDD pra treino.** Os limites de IOPS e throughput são ordens de magnitude abaixo do que GPUs precisam. Uma única A100 pode consumir dados mais rápido do que uma storage account com Standard HDD consegue servir.

## O padrão recomendado: Blob + NVMe + BlobFuse2

A maioria dos frameworks de ML (PyTorch, TensorFlow) espera dados de treinamento acessíveis por um caminho de filesystem. **BlobFuse2** é o driver de filesystem virtual que monta containers do Azure Blob Storage como um diretório local em Linux.

O BlobFuse2 tem dois modos de cache, e escolher o certo importa:

- **File cache**: Baixa arquivos inteiros pra um cache local antes de servir leituras. **Use pra treinamento**: datasets são lidos repetidamente em múltiplos epochs.
- **Block cache (streaming)**: Faz stream em chunks sem baixar o arquivo completo. Use pra preprocessing ou inferência em arquivos grandes de mídia.

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

> 💡 **Sempre** aponte `--tmp-path` pro disco NVMe local da VM (`/mnt/resource` em VMs Azure), não pro disco do OS. Isso dá ao cache do BlobFuse2 a menor latência possível. Em GPU VMs da série ND, o temp disk local entrega 3-7 GB/s de throughput de leitura.

### AzCopy pra ingestão de dados em massa

Quando você precisa mover datasets grandes pro Azure (ou entre storage accounts), AzCopy é a opção mais rápida. Suporta transfers paralelas, retries automáticos e retoma uploads interrompidos.

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

> 💡 Use `--cap-mbps` pra limitar throughput durante horário comercial e liberar velocidade total à noite.

## Segurança: embutida, não adicionada depois

Workloads de AI lidam com alguns dos dados mais sensíveis da organização: registros de clientes, imagens médicas, transações financeiras, corpora de texto proprietário.

Três regras inegociáveis:

**1. Managed identities + RBAC, sempre.**

Esqueça storage account keys. São estáticas, compartilháveis e difíceis de rotacionar. Managed identities são vinculadas a recursos específicos, rotacionadas automaticamente e auditáveis.

```bash
# Atribui Storage Blob Data Reader pra managed identity de uma VM
az role assignment create \
  --role "Storage Blob Data Reader" \
  --assignee <managed-identity-principal-id> \
  --scope "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<account>"
```

**2. Classifique antes de ingerir.**

Antes de qualquer dado entrar num pipeline de treinamento: é público, interno, confidencial ou restrito? Sua arquitetura de storage precisa enforçar essas classificações com isolamento de rede, criptografia e controles de acesso.

**3. Combata shadow data sprawl.**

Data scientists frequentemente copiam dados pra máquinas locais, drives compartilhados ou storage accounts não gerenciadas pra "experimentos rápidos". Use Azure Policy pra restringir criação de storage accounts e Microsoft Purview pra escanear cópias fora dos locais aprovados.

## Mãos na massa: storage otimizado pra AI de ponta a ponta

Vamos montar um fluxo completo: provisionar, transferir, montar e validar. Todos os comandos usam `--auth-mode login`: sem storage keys.

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

### 2. Configura RBAC (sem keys!)

```bash
az ad signed-in-user show --query id -o tsv | az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee @- \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT"
```

> Role assignments levam 1-2 minutos pra propagar. Espere antes de prosseguir.

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

Se `nvidia-smi` mostrar GPU util acima de 80% e `iostat` não estiver a 100%, seu pipeline de dados está saudável.

## Checklist de saída

Antes de entregar storage pra um workload de AI:

- [ ] Storage é **Premium SSD ou NVMe** (nunca Standard HDD pra treinamento)
- [ ] BlobFuse2 cache aponta pro **NVMe local** (`/mnt/resource`), não pro disco do OS
- [ ] Acesso via **managed identity + RBAC**, sem storage keys
- [ ] Dados classificados **antes** de entrar no pipeline
- [ ] Storage dimensionado pra **10× o tamanho atual** (datasets multiplicam com augmentation e versionamento)
- [ ] Alertas de **throughput e IOPS** configurados
- [ ] Checkpoints escrevendo de volta pro **Blob Storage** pra durabilidade

## No próximo post

Agora que você entende como dados fluem por sistemas de AI e por que suas decisões de storage determinam diretamente a performance de treinamento, é hora de olhar pro compute que consome todos esses dados. Vou falar sobre **GPUs, famílias de VMs e arquitetura de cluster**, e por que a camada de storage bem afinada é só metade da equação.

O livro completo está disponível de graça em [ai4infra.com](https://ai4infra.com).

---

*Esse post faz parte da série **AI para Engenheiros de Infraestrutura**, baseada no livro [AI for Infrastructure Professionals](https://ai4infra.com). Novos posts toda semana.*
