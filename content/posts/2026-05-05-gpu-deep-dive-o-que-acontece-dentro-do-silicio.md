---
slug: "gpu-deep-dive-o-que-acontece-dentro-do-silicio"
aliases:
  - "/posts/gpu-deep-dive-o-que-acontece-dentro-do-silicio/"
title: "GPU deep dive: o que acontece dentro do silício"
description: "Por que um modelo de 14 GB não cabe numa GPU de 40 GB? Como ler nvidia-smi como um pro? Entenda arquitetura GPU, hierarquia de memória, estratégias multi-GPU e troubleshooting."
date: 2026-05-05T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - ai
  - infraestrutura
  - azure
  - gpu
  - nvidia
  - cuda
  - nvidia-smi
  - deepspeed
series:
  - "AI para Engenheiros de Infraestrutura"
---

Quarto post da série. No [anterior](/compute-para-ai-escolhendo-o-hardware-certo/), você aprendeu quais VMs GPU provisionar e como conectar elas. Agora vamos olhar **dentro** da GPU pra entender o que acontece no silício. Não pra escrever CUDA kernels, mas pra ser um troubleshooter melhor e ter conversas informadas com o time de ML.

## O ticket das 2 da manhã

Slack toca às 2 AM. O training job do time de ML crashou de novo. O erro é uma linha:

```
CUDA out of memory. Tried to allocate 2.00 GiB
```

O lead de data science está frustrado: *"O modelo tem 7 bilhões de parâmetros em FP16. Isso é só 14 GB. A A100 tem 40 GB de memória. Deveria ter 26 GB de sobra. O que está acontecendo?"*

Você entra via SSH, roda `nvidia-smi`, e vê memory usage em 100%. Mas a matemática não fecha: 14 GB de pesos não enchem 40 GB. A não ser que tenha outra coisa consumindo o resto. E tem. Model parameters são só **uma peça** do puzzle de memória. Gradientes, optimizer states e activations reclamam cada um sua fatia. Um "modelo de 14 GB" precisa de 90+ GB pra treinar com Adam full-precision.

Esse post te dá o conhecimento pra responder essa pergunta e dezenas parecidas.

## Arquitetura GPU pra engenheiros de infra

Você não precisa projetar circuitos. Mas precisa de um modelo mental do que está dentro da caixa, porque isso explica por que workloads se comportam como se comportam, por que certos erros aparecem, e por que certos SKUs são dramaticamente melhores que outros pro mesmo job.

### Streaming Multiprocessors (SMs)

Uma GPU é construída de unidades repetidas chamadas **Streaming Multiprocessors (SMs)**. Cada SM é um processador independente com seus próprios cores, cache e hardware de scheduling. A A100 tem 108 SMs. A H100 tem 132.

Pense em cada SM como um andar de fábrica pequeno e autocontido. Tem seus próprios operários (cores), armazenamento local (shared memory e registers), e seu próprio scheduler.

### CUDA Cores vs. Tensor Cores

Dentro de cada SM:

- **CUDA Cores**: processadores paralelos de propósito geral. A100 = 6.912, H100 = 16.896. Lidam com math de ponto flutuante e inteiros.
- **Tensor Cores**: unidades especializadas que fazem matrix-multiply-and-accumulate num único ciclo de clock. A100 = 432 (3ª gen), H100 = 528 (4ª gen). São o motivo pelo qual GPUs modernas dominam AI.

**Tradução infra ↔ AI:** GPU é como uma rodovia de 100 faixas onde cada faixa carrega operações de math simultaneamente. CPU é uma rodovia de 4 faixas onde cada faixa pode lidar com curvas, saídas e decisões complexas. Pra multiplicação de matrizes (a base de AI), você quer a rodovia.

### NVLink: a superhighway GPU-to-GPU

Quando tem múltiplas GPUs no mesmo nó, elas precisam se comunicar. PCIe dá uma conexão baseline (64 GB/s), mas pra training multi-GPU sério, você precisa de **NVLink**:

| GPU | NVLink Bandwidth (bidirecional) |
|-----|-------------------------------|
| A100 | 600 GB/s |
| H100 | 900 GB/s |
| B200 | 1.8 TB/s |

Verifique NVLink com:

```bash
nvidia-smi topo -m
```

Se mostrar `PIX` ou `PHB` entre GPUs ao invés de `NV#`, você está em PCIe, não NVLink. Confirme que está no SKU certo (ND-series) antes de debugar problemas de performance.

## Memória GPU: o recurso que você mais vai gerenciar

Se guardar uma seção desse post, que seja essa. GPU memory, especificamente ficar sem ela, é o problema #1 que você vai troubleshootar em infra de AI.

### Hierarquia de memória

| Camada | A100 Spec | H100 Spec | Analogia |
|--------|-----------|-----------|----------|
| **HBM** (High Bandwidth Memory) | 40 ou 80 GB, 2 TB/s | 80 GB, 3.35 TB/s | RAM do sistema |
| **L2 Cache** | 40 MB | 50 MB | CPU L3 cache |
| **Shared Memory / L1** | Até 164 KB por SM | Até 256 KB por SM | CPU L1/L2 cache |
| **Registers** | 256 KB por SM | 256 KB por SM | Registradores CPU |

**HBM** é o que `nvidia-smi` reporta. É a "memória principal" da GPU, onde vivem model weights, dados de training e resultados intermediários.

### O que preenche a memória durante training

Quatro consumidores principais:

**1. Model Parameters (os pesos)**
Tamanho direto: parâmetros × bytes por parâmetro. 7B params em FP16 (2 bytes cada) = ~14 GB.

**2. Gradientes**
Um gradiente por parâmetro durante backpropagation. 7B × 2 bytes = mais ~14 GB.

**3. Optimizer States (o assassino escondido)**
O Adam optimizer mantém **dois valores adicionais** por parâmetro (momentum e variance), armazenados em FP32 independente da precisão do modelo. 7B × 4 bytes × 2 states = **~56 GB** só pro optimizer.

**4. Activations**
Resultados intermediários de cada camada, salvos no forward pass e consumidos no backpropagation. Dependem da arquitetura e do **batch size**.

### A matemática que salva seu fim de semana

```
Total GPU Memory ≈ Parameters + Gradients + Optimizer States + Activations
```

Pro modelo de 7B do ticket:

| Componente | Cálculo | Memória |
|-----------|---------|---------|
| Parameters (FP16) | 7B × 2 bytes | ~14 GB |
| Gradients (FP16) | 7B × 2 bytes | ~14 GB |
| Optimizer States (FP32, Adam) | 7B × 4 bytes × 2 | ~56 GB |
| Activations (varia) | Depende do batch size | ~8-20 GB |
| **Total** | | **~92-104 GB** |

Um "modelo de 14 GB" precisa de 90+ GB pra treinar. Uma A100-40GB nunca teve chance. Até uma A100-80GB fica apertada.

> **Regra prática:** quando um ML engineer diz "o modelo tem X gigabytes", quase sempre se refere ao tamanho dos parâmetros (o arquivo de checkpoint). Memória de training é **4-8× maior**. Multiplique por pelo menos 4× pra uma estimativa rápida com Adam.

**Gradient checkpointing** (activation recomputation) troca compute por memória: ao invés de salvar todas as activations no forward pass, salva só algumas e recomputa o resto no backpropagation. Reduz training speed em ~20-30% mas corta memória de activations em 60-80%.

## Precisão: trocando accuracy por velocidade e memória

| Formato | Bits | Bytes/param | Range | Use case |
|---------|------|-------------|-------|----------|
| **FP32** | 32 | 4 | ±3.4 × 10³⁸ | Full-precision training, master weights |
| **TF32** | 19* | 4 (stored) | = FP32 | Default A100+ pra matmul, transparente |
| **BF16** | 16 | 2 | ±3.4 × 10³⁸ | Preferido pra training (mesmo range do FP32) |
| **FP16** | 16 | 2 | ±65.504 | Training com loss scaling, inference |
| **INT8** | 8 | 1 | -128 a 127 | Inference quantizada |
| **INT4** | 4 | 0.5 | -8 a 7 | Inference agressivamente quantizada |

**BF16** é o sweet spot atual pra training. Mantém o mesmo range de expoente do FP32 mas usa metade da memória. A maioria dos pipelines modernos usa BF16.

**INT8/INT4** são pra inference. Um modelo treinado em BF16 pode ser quantizado pra INT8 ou INT4 após training, reduzindo memória drasticamente com leve perda de qualidade.

**Tradução infra ↔ AI:** Pense em precisão como qualidade JPEG. FP32 é o RAW (maior qualidade, maior arquivo). BF16 é JPEG de alta qualidade (imperceptivelmente diferente, metade do tamanho). INT4 é thumbnail (visivelmente lossy, mas carrega instantaneamente).

## Estratégias multi-GPU

Quando o modelo não cabe numa GPU ou o training leva dias:

### Data Parallelism (DP)

Cópia completa do modelo em cada GPU. Cada GPU processa um batch diferente. Após cada step, GPUs sincronizam gradientes via **all-reduce**. Escala quase linearmente: 8 GPUs ≈ 8× throughput.

Catch: cada GPU precisa segurar o modelo inteiro + gradientes + optimizer states.

### DeepSpeed ZeRO: o destruidor de limites de memória

| Stage | O que é particionado | Economia por GPU | Overhead de comunicação |
|-------|---------------------|-----------------|------------------------|
| **ZeRO-1** | Optimizer states | ~4× redução em memória de optimizer | Mínimo |
| **ZeRO-2** | Optimizer states + Gradients | Economia adicional de gradientes | Moderado |
| **ZeRO-3** | Optimizer + Gradients + Parameters | Tudo sharded, máxima economia | Maior |

Voltando ao exemplo de 7B: training com Adam numa GPU = ~92 GB. Com 8 GPUs e ZeRO-3, cada GPU segura só ⅛ de tudo: ~11-13 GB por GPU, mais activations. O modelo que não cabia numa A100-80GB agora treina confortável em oito A100-40GB.

### FSDP (Fully Sharded Data Parallel)

Resposta nativa do PyTorch ao ZeRO-3. Mesma capacidade (full sharding de parameters, gradients, optimizer states), integrado direto na API de distributed training do PyTorch. De perspectiva de infra, FSDP e ZeRO-3 têm requirements similares.

### Pipeline Parallelism (PP)

Divide as camadas do modelo sequencialmente entre GPUs: GPU 0 = camadas 1-10, GPU 1 = camadas 11-20, etc. Cada GPU segura só uma fração dos parâmetros. Desvantagem: **pipeline bubbles** (GPUs esperando dados).

### Tensor Parallelism (TP)

O mais granular: divide camadas individuais entre GPUs. **Requer NVLink obrigatoriamente**. Rodar TP sobre PCIe é tecnicamente possível mas praticamente inútil.

### 3D Parallelism (modelos 100B+)

Combina os três:
- **TP** dentro do nó (sobre NVLink)
- **PP** entre poucos nós
- **DP** (com ZeRO) entre muitos nós

É como GPT-4 e LLaMA 3 são treinados.

| Model Size | Estratégia | GPUs | Rede necessária |
|-----------|-----------|------|----------------|
| < 1B params | GPU única ou DP | 1-8 | PCIe OK |
| 1-10B params | DP + ZeRO-2 | 4-16 | NVLink preferido |
| 10-70B params | ZeRO-3 / FSDP | 8-64 | NVLink + InfiniBand |
| 70-200B+ params | 3D Parallelism | 64-512+ | NVLink + InfiniBand obrigatório |

## A stack de software NVIDIA

Cada sessão de debugging de GPU acaba em compatibilidade de software. A stack é em camadas onde cada nível depende do abaixo:

```
Código do modelo (script de training)
    ↓
Framework (PyTorch 2.x, TensorFlow, JAX)
    ↓
cuDNN (primitivas DL otimizadas) + NCCL (multi-GPU)
    ↓
CUDA Toolkit (libraries, runtime, compiler)
    ↓
NVIDIA Driver (kernel module → hardware GPU)
    ↓
Hardware GPU (A100, H100, etc.)
```

Mismatch em qualquer nível = problemas que vão de mensagens de erro crípticas a crashes silenciosos.

**O escape hatch dos containers:** Use imagens NVIDIA NGC (`nvcr.io/nvidia/pytorch`) que empacotam uma combinação testada de driver API, CUDA, cuDNN, NCCL e framework:

```bash
# Pull container oficial NVIDIA PyTorch (releases mensais)
docker pull nvcr.io/nvidia/pytorch:24.05-py3

# Rodar com acesso GPU
docker run --gpus all -it nvcr.io/nvidia/pytorch:24.05-py3
```

**Dica de troubleshooting:** Sempre colete três versões primeiro:

```bash
# Versão do driver + max CUDA suportada
nvidia-smi

# CUDA Toolkit instalado
nvcc --version

# CUDA que o PyTorch foi compilado contra
python -c "import torch; print(torch.version.cuda)"
```

Mismatch entre qualquer uma dessas = causa mais provável do problema.

## Lendo nvidia-smi como um pro

`nvidia-smi` é o `top` do mundo GPU. Saída típica:

```
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 535.161.08    Driver Version: 535.161.08    CUDA Version: 12.2               |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |          Memory-Usage  | GPU-Util  Compute M. |
|=========================================+========================+======================|
|   0  NVIDIA A100-SXM4-80GB         On   | 00000001:00:00.0  Off  |                    0 |
| N/A   42C    P0              72W / 400W |  71458MiB / 81920MiB   |     94%      Default |
+-----------------------------------------+------------------------+----------------------+
```

### Campos que importam

| Campo | O que significa | Saudável (training) | Problemático |
|-------|----------------|---------------------|-------------|
| **GPU-Util** | % de compute ativo | 85-100% | Abaixo de 50% |
| **Memory-Usage** | HBM usada | 70-95% | 100% (OOM) ou < 30% (subutilizada) |
| **Temp** | Temperatura °C | 35-75°C | Acima de 83°C (throttling) |
| **Pwr:Usage/Cap** | Consumo vs. limite | 60-90% do cap | Abaixo de 30% (ociosa) |
| **Perf** | Performance state | P0 | P2+ durante job ativo |
| **ECC Errors** | Erros de memória | 0 | Qualquer valor > 0 |
| **Persistence-M** | Driver persistente | On | Off (adiciona latência) |

### Comandos essenciais

```bash
# Snapshot básico (90% do uso)
nvidia-smi

# Monitoramento contínuo (refresh a cada 5s)
nvidia-smi -l 5

# Output CSV pra scripting e dashboards
nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,utilization.memory,memory.total,memory.used --format=csv

# Monitoramento compacto real-time
nvidia-smi dmon -s u

# Topologia GPU: verificar NVLink
nvidia-smi topo -m

# Checar erros ECC (saúde do hardware)
nvidia-smi --query-gpu=ecc.errors.uncorrected.volatile.total --format=csv

# Listar processos GPU
nvidia-smi pmon -s u -c 1
```

## Os 7 problemas de GPU que você vai encontrar

### 1. CUDA Out of Memory (OOM)

```
RuntimeError: CUDA out of memory. Tried to allocate 2.00 GiB
```

**Fixes (em ordem):** reduzir batch size → habilitar gradient checkpointing → ZeRO-2/3 → mixed precision BF16 → GPU maior.

### 2. CUDA Version Mismatch

```
CUDA error: no kernel image is available for execution on the device
```

**Fix:** verificar as 3 versões (driver, toolkit, framework). Usar container NGC com versões testadas juntas.

### 3. GPU Not Found

```
NVIDIA-SMI has failed because it couldn't communicate with the NVIDIA driver.
```

**Fix:** verificar SKU da VM (NC/ND/NV?), checar status da VM Extension, reboot, reinstalar driver.

### 4. ECC Errors (falha de hardware)

```bash
nvidia-smi --query-gpu=ecc.errors.uncorrected.volatile.total --format=csv
# Se retornar > 0: abrir ticket no Azure para replacement
```

GPUs não suportam live migration no Azure. Expect downtime.

### 5. Thermal Throttling

Temp acima de 83°C, perf state cai de P0 pra P2/P3, throughput cai 20-40%. Em cloud, é problema do Azure. Documente e abra ticket.

### 6. Low GPU Utilization

GPU-Util < 50% durante training ativo = **data starvation**. Fixes: aumentar DataLoader `num_workers`, `pin_memory=True`, cache em NVMe local, formatos otimizados (WebDataset, TFRecord).

### 7. NVLink Not Detected

`nvidia-smi topo -m` mostra `PHB`/`PIX` ao invés de `NV#`. Verificar se está em ND-series (NC/NV não têm NVLink).

## Gerações de GPU no Azure

| Geração | GPU | Azure VM | HBM | NVLink | InfiniBand |
|---------|-----|----------|-----|--------|------------|
| Volta (2017) | V100 | NC v3 | 16/32 GB | Não | Não |
| Ampere (2020) | A100 | ND A100 v4 | 40/80 GB | 600 GB/s | 200 Gb/s |
| Hopper (2022) | H100 | ND H100 v5 | 80 GB | 900 GB/s | 400 Gb/s |
| Blackwell (2024) | B200 | ND GB200 v6 | 192 GB | 1.8 TB/s | 400 Gb/s |

Cada geração dobra HBM bandwidth e introduz novo formato de precisão: Ampere trouxe TF32 e structured sparsity, Hopper trouxe FP8 e Transformer Engine, Blackwell traz FP4 e 192 GB de HBM por GPU.

## No próximo post

Agora que você entende o que acontece dentro da GPU (arquitetura, memória, software stack, debugging), é hora de automatizar tudo ao redor. No próximo post: **Infrastructure as Code pra AI**, como templatear clusters GPU, endpoints de inference e pipelines de training de forma reproduzível, versionada e auditável.
