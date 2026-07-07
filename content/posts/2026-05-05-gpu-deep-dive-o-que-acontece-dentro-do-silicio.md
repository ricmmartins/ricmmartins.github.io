---
slug: "gpu-deep-dive-o-que-acontece-dentro-do-silicio"
translationKey: "2026/05/22/gpu-deep-dive-what-happens-inside-the-silicon"
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

Quarto post da série. No [anterior](/compute-para-ai-escolhendo-o-hardware-certo/), você viu quais VMs GPU provisionar e como conectar elas. Agora a ideia é olhar **dentro** da GPU pra entender o que acontece no silício. Não pra escrever CUDA kernel, mas pra ser um troubleshooter melhor e conversar com o time de ML sem ficar no modo adivinhação.

## O ticket das 2 da manhã

Slack toca às 2 da manhã. O training job do time de ML caiu de novo. O erro é uma linha:

```
CUDA out of memory. Tried to allocate 2.00 GiB
```

O lead de data science está irritado: *"O modelo tem 7 bilhões de parâmetros em FP16. Isso é só 14 GB. A A100 tem 40 GB de memória. Deveria sobrar bastante. O que está acontecendo?"*

Você entra por SSH, roda `nvidia-smi` e vê memory usage em 100%. A conta não fecha se você olhar só pros pesos. O problema é que pesos são só uma parte da história. Gradientes, estados do otimizador, ativações e, em muitos casos, uma cópia FP32 dos pesos brigam pelo mesmo espaço.

Esse post existe pra resolver exatamente esse tipo de conversa.

## Arquitetura GPU pra engenheiros de infra

Você não precisa projetar circuito. Mas precisa de um modelo mental do que está dentro da caixa, porque isso explica por que certos workloads andam bem, por que outros engasgam e por que alguns SKUs rendem muito mais do que outros no mesmo código.

### Streaming Multiprocessors (SMs)

Uma GPU é construída em cima de unidades repetidas chamadas **Streaming Multiprocessors (SMs)**. Cada SM é um processador independente com seus próprios cores, cache e hardware de scheduling. A A100 tem 108 SMs. A H100 tem 132.

Pense em cada SM como um pequeno andar de fábrica. Ele tem seus operários, seu armazenamento local e seu próprio capataz decidindo a ordem do trabalho.

### CUDA Cores vs. Tensor Cores

Dentro de cada SM:

- **CUDA Cores**: processadores paralelos de propósito geral. A100 = 6.912, H100 = 16.896. Lidam com math de ponto flutuante e inteiros.
- **Tensor Cores**: unidades especializadas em matrix-multiply-and-accumulate. A100 = 432, H100 = 528. São elas que puxam boa parte do desempenho em AI.

**Tradução infra ↔ AI:** GPU é como uma rodovia enorme com dezenas de faixas fazendo a mesma operação ao mesmo tempo. CPU é uma rodovia bem menor, mas muito melhor em curvas, desvios e decisões. Pra multiplicação de matrizes, a rodovia larga ganha.

### NVLink: a highway GPU-to-GPU

Quando você tem múltiplas GPUs no mesmo nó, elas precisam trocar dados. PCIe resolve o básico, mas training multi-GPU sério quase sempre quer **NVLink**:

| GPU | NVLink bandwidth (bidirecional) |
|-----|---------------------------------|
| A100 | 600 GB/s |
| H100 | 900 GB/s |
| B200 | 1.8 TB/s |

Verifique NVLink com:

```bash
nvidia-smi topo -m
```

Se aparecer `PIX` ou `PHB` entre GPUs em vez de `NV#`, você está olhando pra um caminho via PCIe, não pra NVLink. Nessa hora vale conferir se o SKU escolhido realmente entrega a topologia que o time acha que comprou.

## Memória GPU: o recurso que você mais vai gerenciar

Se você só guardar uma seção desse post, guarda essa. GPU memory, e principalmente ficar sem ela, é o problema mais comum em infra de AI.

### Hierarquia de memória

| Camada | A100 Spec | H100 Spec | Analogia |
|--------|-----------|-----------|----------|
| **HBM** (High Bandwidth Memory) | 40 GB: ~1.6 TB/s, 80 GB: ~2.0 TB/s | 80 GB, 3.35 TB/s | RAM do sistema |
| **L2 Cache** | 40 MB | 50 MB | CPU L3 cache |
| **Shared Memory / L1** | Até 164 KB por SM | Até 256 KB por SM | CPU L1/L2 cache |
| **Registers** | 256 KB por SM | 256 KB por SM | Registradores CPU |

**HBM** é o que o `nvidia-smi` mostra. É a memória principal da GPU, onde vivem pesos do modelo, batches, ativações e resultados intermediários.

### O que preenche a memória durante training

Cinco consumidores principais:

**1. Model Parameters (os pesos)**
Tamanho direto: parâmetros × bytes por parâmetro. 7B params em FP16 = ~14 GB.

**2. Gradients**
Um gradiente por parâmetro durante backpropagation. 7B × 2 bytes = mais ~14 GB.

**3. Master Weights**
Em muitos pipelines de mixed precision, o framework mantém uma cópia FP32 dos pesos. 7B × 4 bytes = **~28 GB**.

**4. Optimizer States**
Adam ou AdamW mantêm dois estados por parâmetro, geralmente em FP32. 7B × 4 bytes × 2 = **~56 GB**.

**5. Activations**
Resultados intermediários salvos no forward pass e reaproveitados no backward. Essa parte varia com arquitetura, sequência e **batch size**.

### A matemática que salva seu fim de semana

```
Total GPU Memory ≈ Parameters + Gradients + Master Weights + Optimizer States + Activations
```

Pro modelo de 7B do ticket:

| Componente | Cálculo | Memória |
|-----------|---------|---------|
| Parameters (FP16) | 7B × 2 bytes | ~14 GB |
| Gradients (FP16) | 7B × 2 bytes | ~14 GB |
| Master Weights (FP32) | 7B × 4 bytes | ~28 GB |
| Optimizer States (FP32, AdamW) | 7B × 4 bytes × 2 | ~56 GB |
| Activations (varia) | Depende do batch size | ~8-20 GB |
| **Total** | | **~120-132 GB** |

Um "modelo de 14 GB" não pede 14 GB pra treinar. Nesse cenário ele pede mais de 120 GB. A100-40GB está fora do jogo desde o começo. Mesmo A100-80GB fica apertada.

> **Regra prática:** quando um ML engineer diz "o modelo tem X gigabytes", quase sempre ele está falando do checkpoint. Pra training com Adam ou AdamW, eu começo chutando algo entre **6x e 8x** o tamanho dos pesos e depois ajusto pelo batch size e pelas otimizações do framework.

**Gradient checkpointing** troca compute por memória. Em vez de guardar todas as ativações do forward, o framework salva menos coisa e recomputa parte do caminho no backward. Isso costuma reduzir memória de ativações bastante, com uma penalidade de tempo de treino que varia conforme o modelo.

## Precisão: trocando memória e throughput por fidelidade numérica

| Formato | Bits | Bytes/param | Range | Use case |
|---------|------|-------------|-------|----------|
| **FP32** | 32 | 4 | ±3.4 × 10³⁸ | Full-precision training, master weights |
| **TF32** | 19* | 4 (armazenado) | = FP32 | Default em A100+ pra matmul |
| **BF16** | 16 | 2 | ±3.4 × 10³⁸ | Preferido pra training |
| **FP16** | 16 | 2 | ±65.504 | Training com loss scaling, inference |
| **INT8** | 8 | 1 | -128 a 127 | Inference quantizada |
| **INT4** | 4 | 0.5 | -8 a 7 | Inference agressivamente quantizada |

**BF16** virou o ponto de equilíbrio mais comum no training moderno. Ele mantém o range do FP32 e corta a memória pela metade.

**INT8** e **INT4** entram mais na fase de inference. Você treina em BF16 ou FP16, depois quantiza pra reduzir memória e aumentar throughput, aceitando alguma perda de qualidade.

**Tradução infra ↔ AI:** pensa em precisão como formato de imagem. FP32 é o RAW. BF16 é um JPEG de alta qualidade. INT4 já é thumbnail. Em cada etapa você decide se quer mais fidelidade ou mais velocidade.

## Estratégias multi-GPU

Quando o modelo não cabe numa GPU, ou quando o training levaria dias demais, entra o mundo multi-GPU.

### Data Parallelism (DP)

Você replica o modelo inteiro em cada GPU. Cada GPU processa um batch diferente. Depois de cada step, as GPUs sincronizam gradientes via **all-reduce**. Em workload bem balanceado, o ganho pode chegar perto do linear.

O lado ruim é óbvio: cada GPU precisa segurar o modelo inteiro, os gradientes e os estados do otimizador.

### DeepSpeed ZeRO: o destruidor de limites de memória

| Stage | O que é particionado | Efeito prático |
|-------|----------------------|----------------|
| **ZeRO-1** | Optimizer states e, em muitos casos, master weights | Corta a parte mais cara da memória persistente |
| **ZeRO-2** | Optimizer states + gradients | Reduz também a fatia de gradientes |
| **ZeRO-3** | Optimizer states + gradients + parameters | Sharda praticamente tudo que era replicado |

Voltando ao exemplo de 7B: training com AdamW numa GPU pede mais de 120 GB. Com 8 GPUs e ZeRO-3, a parte persistente cai pra algo perto de **14 GB por GPU**. Some ativações e você ainda fica, dependendo do batch, na faixa de **22 a 34 GB por GPU**. Agora uma A100-40GB já passa a fazer sentido.

### FSDP (Fully Sharded Data Parallel)

FSDP é a resposta nativa do PyTorch pro mesmo problema. A lógica é parecida com ZeRO-3: particionar parâmetros, gradientes e estados do otimizador. Do ponto de vista de infra, os requisitos são muito próximos.

### Pipeline Parallelism (PP)

Aqui você divide o modelo por camadas: GPU 0 fica com um pedaço, GPU 1 com outro, e assim por diante. Cada GPU segura só uma fração dos pesos. O problema é que aparecem **pipeline bubbles**, quando parte das GPUs fica esperando dado passar pela fila.

### Tensor Parallelism (TP)

Esse é o nível mais granular. Você divide a própria camada entre GPUs. Funciona muito bem quando a interconexão é rápida. **NVLink aqui deixa de ser luxo e vira requisito prático**.

### 3D Parallelism (modelos 100B+)

Combina os três:
- **TP** dentro do nó
- **PP** entre poucos nós
- **DP** com ZeRO entre muitos nós

É o tipo de composição que aparece em LLMs gigantes.

| Model Size | Estratégia | GPUs | Rede necessária |
|-----------|-----------|------|----------------|
| < 1B params | GPU única ou DP | 1-8 | PCIe OK |
| 1-10B params | DP + ZeRO-2 | 4-16 | NVLink preferido |
| 10-70B params | ZeRO-3 / FSDP | 8-64 | NVLink + InfiniBand |
| 70-200B+ params | 3D Parallelism | 64-512+ | NVLink + InfiniBand obrigatórios |

## A stack de software NVIDIA

Boa parte das sessões de debugging de GPU termina em compatibilidade de software. A stack é em camadas, e cada camada depende da de baixo:

```
Código do modelo (script de training)
    ↓
Framework (PyTorch 2.x, TensorFlow, JAX)
    ↓
cuDNN (primitivas DL otimizadas) + NCCL (multi-GPU)
    ↓
CUDA Toolkit (libraries, runtime, compiler)
    ↓
NVIDIA Driver (kernel module -> hardware GPU)
    ↓
Hardware GPU (A100, H100, etc.)
```

Se alguma peça sai do lugar, você vê desde mensagem críptica até crash silencioso.

**O escape hatch dos containers:** imagens NVIDIA NGC, como `nvcr.io/nvidia/pytorch`, já empacotam uma combinação testada de driver API, CUDA, cuDNN, NCCL e framework:

```bash
# Pull container oficial NVIDIA PyTorch (releases mensais)
docker pull nvcr.io/nvidia/pytorch:24.05-py3

# Rodar com acesso GPU
docker run --gpus all -it nvcr.io/nvidia/pytorch:24.05-py3
```

**Dica de troubleshooting:** as três versões que eu sempre coleto primeiro são estas:

```bash
# Versão do driver + max CUDA suportada
nvidia-smi

# CUDA Toolkit instalado
nvcc --version

# CUDA que o PyTorch foi compilado contra
python -c "import torch; print(torch.version.cuda)"
```

Se elas não combinam, você já tem um suspeito forte.

## Lendo nvidia-smi como um pro

`nvidia-smi` é o `top` do mundo GPU. Saída típica:

```
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 535.161.08    Driver Version: 535.161.08    CUDA Version: 12.2               |
|-----------------------------------------+------------------------+----------------------|
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
| **Memory-Usage** | HBM usada | 70-95% | 100% com OOM ou muito baixa com GPU ociosa |
| **Temp** | Temperatura °C | 35-75°C | Acima de 83°C |
| **Pwr:Usage/Cap** | Consumo vs. limite | 60-90% do cap | Muito baixo com job ativo |
| **Perf** | Performance state | P0 | P2+ durante job ativo |
| **ECC Errors** | Erros de memória | 0 | Qualquer valor > 0 |
| **Persistence-M** | Driver persistente | On | Off em hosts dedicados a GPU |

### Comandos essenciais

```bash
# Snapshot básico (90% do uso)
nvidia-smi

# Monitoramento contínuo (refresh a cada 5s)
nvidia-smi -l 5

# Output CSV pra scripting e dashboards
nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,utilization.memory,memory.total,memory.used --format=csv

# Monitoramento compacto em tempo real
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

**Fixes, em ordem prática:** reduzir batch size -> habilitar gradient checkpointing -> ZeRO-2 ou ZeRO-3 -> BF16 / mixed precision -> GPU maior.

### 2. CUDA Version Mismatch

```
CUDA error: no kernel image is available for execution on the device
```

**Fix:** conferir driver, toolkit e framework. Se a combinação estiver torta, use um container NGC conhecido.

### 3. GPU Not Found

```
NVIDIA-SMI has failed because it couldn't communicate with the NVIDIA driver.
```

**Fix:** verifique SKU da VM, status da VM Extension, reboot e, se necessário, reinstalação do driver.

### 4. ECC Errors (falha de hardware)

```bash
nvidia-smi --query-gpu=ecc.errors.uncorrected.volatile.total --format=csv
# Se retornar > 0: abrir ticket no Azure para replacement
```

Em cloud isso costuma terminar em manutenção ou substituição do host. Conte com downtime.

### 5. Thermal Throttling

Temperatura acima de 83°C, perf state caindo de P0 pra P2 ou P3, throughput indo embora. Em cloud, isso geralmente vira chamado pro provedor.

### 6. Low GPU Utilization

GPU-Util abaixo de 50% durante training ativo quase sempre aponta pra **data starvation**. Fixes comuns: aumentar `DataLoader.num_workers`, usar `pin_memory=True`, mover cache pra NVMe local e revisar formato do dataset.

### 7. NVLink Not Detected

`nvidia-smi topo -m` mostra `PHB` ou `PIX` em vez de `NV#`. Vale revisar se o ambiente está em ND-series mesmo. NC e NV não entregam a mesma topologia.

## Gerações de GPU no Azure

| Geração | GPU | Azure VM | HBM | NVLink | InfiniBand |
|---------|-----|----------|-----|--------|------------|
| Volta (2017) | V100 | NC v3 / ND v2 | 16/32 GB | Depende do SKU | Depende do SKU |
| Ampere (2020) | A100 | ND A100 v4 / NC A100 v4 | 40/80 GB | 600 GB/s | 200 Gb/s nas famílias ND |
| Hopper (2022) | H100 | ND H100 v5 | 80 GB | 900 GB/s | 400 Gb/s |
| Blackwell (2024) | B200 / GB200 | Novas famílias chegando ao Azure, confirme a região | até 192 GB | até 1.8 TB/s | 400 Gb/s |

Cada geração trouxe mais bandwidth de memória e novos formatos de precisão. Ampere colocou TF32 no jogo. Hopper trouxe FP8 e Transformer Engine. Blackwell empurra isso ainda mais, com mais memória por GPU e foco claro em modelos gigantes.

## No próximo post

Agora que você entende o que acontece dentro da GPU, incluindo arquitetura, memória, stack de software e debugging, faz sentido automatizar o resto. No próximo post eu vou falar sobre **Infrastructure as Code pra AI**: como templatear clusters GPU, endpoints de inference e pipelines de training de forma reproduzível, versionada e auditável.
