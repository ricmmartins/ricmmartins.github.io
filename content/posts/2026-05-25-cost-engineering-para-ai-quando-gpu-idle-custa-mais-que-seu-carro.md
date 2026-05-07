---
slug: "cost-engineering-para-ai-quando-gpu-idle-custa-mais-que-seu-carro"
translationKey: "2026/06/11/cost-engineering-for-ai-when-idle-gpus-cost-more-than-your-car"
aliases:
  - "/posts/cost-engineering-para-ai-quando-gpu-idle-custa-mais-que-seu-carro/"
title: "Cost engineering para AI: quando GPU idle custa mais que seu carro"
description: "GPU idle num fim de semana custa R$25.000. Spot VMs, PTU vs pay-per-token, right-sizing, tagging e FinOps pra manter o CFO feliz sem frear inovação."
date: 2026-05-25T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - ai
  - infraestrutura
  - azure
  - finops
  - custos
  - spot-vms
  - reserved-instances
  - azure-openai
series:
  - "AI para Engenheiros de Infraestrutura"
---

Nono post da série. No [anterior](/seguranca-para-ai-ameacas-que-seu-firewall-nao-pega/), blindamos a plataforma contra prompt injection e data leakage. Agora: como não falir no processo.

## A segunda-feira de R$650.000

Segunda de manhã. Café na mão, e-mail do financeiro no subject line: "URGENTE: fatura Azure $127.000, explicar." Forecast era $42.000. Dois VMs ND96isr_H100_v5, provisionados três semanas atrás pra um "experimento rápido", nunca desligados. A ~$98/hora cada, rodando 24/7 por três semanas: $33.000 em GPU parada. Ninguém usando. Ninguém lembrava que existiam.

Não é hipotético. Variações dessa história acontecem todo mês em organizações ao redor do mundo. O ML engineer que provisionou não era negligente; ele estava iterando rápido (que é exatamente o que você quer). A falha foi sistêmica: sem política de auto-shutdown, sem alertas de budget, sem tags ligando os VMs a um projeto ou dono.

## Por que cost engineering pra AI é diferente

| Fator | Infra tradicional | AI workloads |
|-------|-------------------|--------------|
| **Custo por VM** | ~$0.19/hora (D4s_v5) | ~$98/hora (ND96isr_H100_v5) |
| **VM idle no fim de semana** | ~$9 | ~$4.700 |
| **Padrão de uso** | Steady-state | Bursty (0 → 64 GPUs → 0) |
| **Pricing model** | Por hora/segundo | Por hora + por token |
| **Margem de erro** | Centenas de dólares | Dezenas de milhares |

**Tradução infra ↔ AI:** GPU idle é como deixar todas as luzes de um estádio ligadas depois do jogo. A conta de energia é enorme, ninguém se beneficia, e o fix é um timer simples. Mas alguém precisa instalar o timer antes do primeiro jogo.

## Fórmulas de custo

### Training (GPU VMs)

```
Training Cost = (GPU count × Horas × Preço/GPU-hora) + Storage + Networking
```

**Exemplo: fine-tuning de modelo 7B**

| Componente | Cálculo | Custo |
|-----------|---------|-------|
| Compute | 2× A100 × 18h × $3.67/h | $132 |
| Storage | 500 GB Premium SSD × 18h | ~$2.50 |
| Networking | Negligível (single VM) | ~$0 |
| **Total** | | **~$135** |

**Exemplo: pre-training de modelo 70B**

| Componente | Cálculo | Custo |
|-----------|---------|-------|
| Compute | 8 VMs × 72h × $98/h (8× H100 cada) | $56.448 |
| Storage | 10 TB × 72h | ~$85 |
| **Total** | | **~$56.533** |

A diferença ilustra por que right-sizing importa. Provisionar H100s pra um job que roda bem em A100s não desperdiça dinheiro; desperdiça 3-4x o dinheiro.

### Inference (Azure OpenAI, pay-per-token)

```
Inference Cost = Requests × Avg Tokens/Request × Preço por 1K Tokens
```

**Exemplo: chatbot com GPT-4o (10K requests/dia)**

| Componente | Cálculo | Custo |
|-----------|---------|-------|
| Input tokens | 10.000 req × 800 tokens × $0.0025/1K | $20/dia |
| Output tokens | 10.000 req × 400 tokens × $0.01/1K | $40/dia |
| **Mensal** | $60/dia × 30 | **~$1.800/mês** |

**Mesmo chatbot com GPT-4o-mini:**

| Componente | Cálculo | Custo |
|-----------|---------|-------|
| Input tokens | 10.000 req × 800 tokens × $0.00015/1K | $1.20/dia |
| Output tokens | 10.000 req × 400 tokens × $0.0006/1K | $2.40/dia |
| **Mensal** | $3.60/dia × 30 | **~$108/mês** |

Redução de 94%. Pra muitos cenários de suporte ao cliente, GPT-4o-mini entrega qualidade aceitável. A diferença paga o salário de alguém.

## Modelos de compra

| Fator | Pay-as-you-go | Reserved 1 ano | Reserved 3 anos | Spot VMs |
|-------|--------------|----------------|-----------------|----------|
| **Desconto** | 0% (baseline) | ~30-40% | ~50-60% | ~60-90% |
| **Compromisso** | Nenhum | 1 ano | 3 anos | Nenhum |
| **Risco de eviction** | Nenhum | Nenhum | Nenhum | Alto |
| **Melhor pra** | Experimentação | Inference estável | Training clusters long-term | Training fault-tolerant |
| **Previsibilidade** | Baixa | Alta | Alta | Baixa |

> **Não reserve antes de ter dados.** Espere 2-3 meses de utilização real antes de commitar reserved instances. Muitas organizações reservam cedo demais e acabam pagando por GPUs que não usam.

## Spot VMs: 60-90% de desconto com um porém

Azure Spot VMs oferecem o mesmo hardware GPU com desconto brutal, mas Azure pode reclamar com 30 segundos de aviso. Funciona quando seu framework suporta **checkpoint-and-resume**.

### Quando Spot é seguro

- Framework salva estado periodicamente (weights, optimizer state, epoch atual)
- Checkpoints vão pra storage durável (Blob Storage, não disco local)
- Exemplos: PyTorch Lightning (`ModelCheckpoint`), DeepSpeed (checkpointing automático), Hugging Face Transformers (`save_steps` + `resume_from_checkpoint`)

### Quando Spot não é seguro

- Deadline inegociável (evictions repetidas podem atrasar)
- Checkpointing não implementado (cada eviction reinicia do zero, pode custar mais que pay-as-you-go)
- Jobs muito curtos (< 1 hora; overhead de checkpoint/resume não compensa)
- Inference em produção (precisa de garantias de disponibilidade)

### Economia real

| Cenário | Pay-as-you-go | Spot (70% desc.) | Economia |
|---------|--------------|------------------|----------|
| 8× A100, 72 horas | $1.958 | $587 | $1.371 |
| 8× H100, 72 horas | $7.056 | $2.117 | $4.939 |

> **Checkpoint frequency:** Se training custa $50/hora, checkpoint a cada 15 minutos limita re-work a $12.50 por eviction. E o checkpoint precisa ir pra Blob Storage, não disco local (que é perdido na eviction).

## Right-sizing: não use H100 quando T4 resolve

| Workload | SKU recomendado | Por quê |
|----------|----------------|---------|
| Inference (modelos ≤13B) | NC-series T4 | 16 GB memória, custo-efetivo |
| Inference (modelos 13B-70B) | NC-series A100 | 80 GB memória, bom throughput |
| Fine-tuning (modelos ≤13B) | NC-series A100 (1-2 GPUs) | Suficiente com LoRA/QLoRA |
| Fine-tuning (modelos 70B+) | ND-series A100 (8 GPUs) | Precisa multi-GPU + NVLink |
| Pre-training | ND-series H100 | Throughput máximo, NVLink + InfiniBand |

### Auto-shutdown pra dev/test (obrigatório)

```bash
# Verificar VMs GPU sem auto-shutdown em subscriptions de dev
az vm auto-shutdown show \
  --resource-group rg-ai-dev \
  --name gpu-vm-experiment-01

# Configurar auto-shutdown às 19:00 local
az vm auto-shutdown \
  --resource-group rg-ai-dev \
  --name gpu-vm-experiment-01 \
  --time 1900
```

Um ND96isr_H100_v5 rodando de sexta à noite até segunda de manhã: ~$4.700. Auto-shutdown elimina isso completamente.

## Azure OpenAI: Standard vs PTU

| Fator | Standard (pay-per-token) | Provisioned Throughput (PTU) |
|-------|--------------------------|------------------------------|
| **Pricing** | Por 1K tokens consumidos | Taxa fixa horária/mensal |
| **Compromisso** | Nenhum | Mensal ou anual |
| **Melhor pra** | Tráfego variável/imprevisível | Tráfego alto e constante |
| **Latência** | Compartilhada (variável) | Dedicada (consistente) |
| **Custo alto volume** | Escala linear (caro) | Amortizado (mais barato) |
| **Scale to zero** | Sim | Não (mínimo PTU) |

**Regra geral:** Se seu deployment Standard está consistentemente acima de 60-70% da capacidade que um PTU proveria, PTU tipicamente fica mais barato.

### Otimizações de tokens

- **Prompt caching:** Azure OpenAI suporta cache automático pra prefixos repetidos. System prompt estático no início = tokens cached a preço reduzido
- **System prompts mais curtos:** Um prompt de 3.000 tokens que poderia ser 800 desperdiça 2.200 tokens por request. A 10.000 req/dia com GPT-4o = ~$55/dia em tokens desnecessários
- **`max_tokens`:** Se a app precisa de respostas de 200 palavras, não permita 2.000 tokens
- **Multi-model routing:** Queries simples (classificação, extração, FAQ) pro GPT-4o-mini, complexas pro GPT-4o. Routing bem implementado corta 50-80% dos custos

## FinOps: tagging obrigatório

Todo recurso AI precisa no mínimo:

| Tag | Propósito | Exemplo |
|-----|-----------|---------|
| `project` | Atribuição de custo | `project:chatbot-v2` |
| `team` | Responsável | `team:ml-engineering` |
| `environment` | Lifecycle | `environment:dev` |
| `owner` | Pessoa accountable | `owner:joao.silva` |
| `expected-end-date` | Quando descomissionar | `expected-end-date:2026-06-15` |

```bash
# Encontrar VMs GPU sem tag obrigatória
az resource list \
  --resource-type Microsoft.Compute/virtualMachines \
  --query "[?contains(properties.hardwareProfile.vmSize, 'Standard_N') && !contains(keys(tags), 'owner')].[name, resourceGroup]" \
  --output table
```

### Budget alerts (configure antes de provisionar)

```bash
# Criar budget com alerta em 80% e 100%
az consumption budget create \
  --budget-name "ai-gpu-monthly" \
  --amount 50000 \
  --category Cost \
  --time-grain Monthly \
  --start-date 2026-01-01 \
  --end-date 2026-12-31 \
  --resource-group rg-ai-prod
```

## No próximo post

Dinheiro sob controle. No próximo, vamos falar de **platform ops**: como sair do modo "provisionador de GPU sob demanda" e construir uma plataforma AI self-service com multi-tenancy, quotas, filas de GPU e governança.
