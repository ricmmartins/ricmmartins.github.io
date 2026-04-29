---
slug: "azure-openai-em-producao-tokens-throughput-e-alta-disponibilidade"
aliases:
  - "/posts/azure-openai-em-producao-tokens-throughput-e-alta-disponibilidade/"
title: "Azure OpenAI em produção: tokens, throughput e alta disponibilidade"
description: "HTTP 429 não é bug, é capacity planning ruim. Deployment types, PTU vs Standard, multi-região, retry patterns e como não derrubar seu chatbot no launch day."
date: 2026-06-02T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - ai
  - infraestrutura
  - azure
  - azure-openai
  - ptu
  - rate-limiting
  - alta-disponibilidade
series:
  - "AI para Engenheiros de Infraestrutura"
---

Décimo primeiro post da série. No [anterior](/platform-ops-construindo-uma-plataforma-ai-self-service/), construímos a plataforma AI self-service com multi-tenancy e scheduling. Agora: o serviço que todo mundo quer consumir, Azure OpenAI, e como operá-lo sem tomar 429 na cara.

## O 429 que mudou tudo

Seu time lançou um chatbot GPT-4o interno na segunda-feira. Dia 1: smooth sailing, demos pra liderança, Slack cheio de elogios. Dia 3: "o bot tá lento". Dia 5: 30% dos requests retornam HTTP 429. Você abre Azure Monitor e descobre que está batendo no teto de 80K TPM.

A resposta do time de data science? "Aumenta o limite." Mas não é tão simples. Quota increases não são instantâneos, e jogar mais TPM no problema não resolve o design subjacente. Alguns requests consomem 4.000 tokens pra uma pergunta que caberia em 200. O system prompt tem 1.800 tokens, copiado de um blog post e nunca enxugado. Retry logic martela o endpoint sem backoff, transformando throttling em cascading failure.

O que você precisa não é um pipe maior. Precisa entender como Azure OpenAI mede, limita e cobra por capacidade.

## Tokens: a unidade fundamental

Token é um pedaço de palavra. LLMs não processam texto character por character; quebram em subwords. Em inglês, 1 token ≈ 4 caracteres ≈ 0.75 palavras. Em português, é similar.

**Tudo em Azure OpenAI é medido em tokens:** billing, throughput limits, context windows, rate limiting.

```
Total Tokens = System Prompt + User Input + Output (completion)
```

Chatbot típico: 500 tokens (system) + 300 (user) + 800 (response) = 1.600 tokens/request. Multiplique por users concorrentes e requests por minuto: esse é seu throughput requirement.

**Tradução infra ↔ AI:** Tokens são o payload de pacotes do mundo AI. TPM é seu bandwidth ceiling (throughput por minuto). RPM é seu packets-per-second limit. Mesmo raciocínio diagnóstico, unidades diferentes.

### Context windows

| Modelo | Context Window |
|--------|---------------|
| GPT-4o | 128K tokens |
| GPT-4o-mini | 128K tokens |
| GPT-4 Turbo | 128K tokens |
| GPT-3.5 Turbo | 16K tokens |

Context window grande não significa que você deve encher. Um request de 100K tokens consome o mesmo TPM que 62 requests de 1.600 tokens.

## Deployment types: a decisão arquitetural

| Característica | Standard | Global Standard | Provisioned (PTU) |
|---------------|----------|-----------------|-------------------|
| **Billing** | Pay per token | Pay per token | Custo fixo mensal por PTU |
| **Throughput** | Quota-limited (TPM/RPM) | Quota-limited, defaults maiores | Capacidade reservada garantida |
| **Latência** | Variável (infra compartilhada) | Variável (Microsoft-routed) | Previsível, baixa variância |
| **Data residency** | Single region | Microsoft seleciona região | Single region |
| **Throttling** | 429 quando quota excedida | 429 quando quota excedida | Sem throttling dentro da capacidade |
| **Melhor pra** | Dev/test, workloads variáveis | Apps globais, sem restrição de residência | Produção, apps com SLA |

### Quando usar cada um

1. **Variável, baixo volume, experimental?** → Standard ou Global Standard
2. **Precisa quotas maiores, sem restrição de data residency?** → Global Standard
3. **Data residency dentro de uma geografia (US, EU)?** → Data Zone
4. **Produção com SLA, volume consistentemente alto?** → Provisioned (PTU)
5. **Produção crítica com overflow?** → PTU primary + Standard overflow

### Criando deployments via CLI

```bash
# Criar recurso Azure OpenAI
az cognitiveservices account create \
  --name aoai-prod \
  --resource-group rg-ai-prod \
  --kind OpenAI \
  --sku S0 \
  --location eastus

# Deployment Standard (pay-per-token)
az cognitiveservices account deployment create \
  --name aoai-prod \
  --resource-group rg-ai-prod \
  --deployment-name gpt-4o-prod \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-name "Standard" \
  --sku-capacity 80
```

O `sku-capacity` em Standard é o TPM (em milhares). 80 = 80K TPM.

> **PTU throughput varia.** Não existe um número fixo de TPM por PTU. Depende do modelo, comprimento de prompt e comprimento de response. Sempre use o [Azure OpenAI capacity calculator](https://oai.azure.com/portal/calculator) com seus padrões reais de tráfego e valide com load testing antes de commitar.

## Rate limiting: entendendo os dois eixos

Azure OpenAI enforça dois limites independentes:

- **TPM** (Tokens Per Minute): total de tokens (input + output) processados
- **RPM** (Requests Per Minute): número de API calls, independente de tokens

Você pode bater TPM com poucos requests grandes (RAG com documentos longos) ou RPM com muitos requests pequenos (classificação de uma linha). São constraints diferentes que precisam de soluções diferentes.

### Verificar rate limits do deployment

```bash
az cognitiveservices account deployment show \
  --name aoai-prod \
  --resource-group rg-ai-prod \
  --deployment-name gpt-4o-prod \
  --query "properties.rateLimits"
```

## Retry pattern correto (e o errado)

O erro mais comum: retry imediato em loop apertado. Transforma throttling pontual em storm que derruba o sistema.

```python
import time
import random
import openai

def call_with_backoff(client, messages, max_retries=5):
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(
                model="gpt-4o",
                messages=messages
            )
        except openai.RateLimitError as e:
            if attempt == max_retries - 1:
                raise
            retry_after = int(e.response.headers.get("Retry-After", 1))
            wait = retry_after + random.uniform(0, 1)
            time.sleep(wait)
```

**Sempre respeite o header `Retry-After`** e adicione jitter aleatório pra evitar thundering herd (todos os clients retrying no mesmo instante).

## Alta disponibilidade: multi-deployment

Pra produção, nunca dependa de um único deployment em uma única região.

### Arquitetura com APIM como gateway

Azure API Management na frente de múltiplos deployments Azure OpenAI:

1. **Primary:** PTU deployment em East US (capacidade garantida, sem 429s)
2. **Secondary:** Standard deployment em West US (overflow, pay-per-token)
3. **Tertiary:** Global Standard (catch-all quando primários estão pressionados)

APIM faz o routing baseado em disponibilidade e rate limit headers. Se primary retorna 429, redireciona pra secondary automaticamente.

### Monitoramento de capacidade

```bash
# Métricas de token transaction
az monitor metrics list \
  --resource "/subscriptions/{sub}/resourceGroups/rg-ai-prod/providers/Microsoft.CognitiveServices/accounts/aoai-prod" \
  --metric "TokenTransaction" \
  --interval PT1M \
  --aggregation Total \
  --filter "ModelDeploymentName eq 'gpt-4o-prod'"
```

### Alertas que importam

| Métrica | Threshold | Ação |
|---------|-----------|------|
| TPM usage > 80% | Sustained 5 min | Avaliar scale ou routing |
| HTTP 429 rate > 1% | Sustained 2 min | Ativar overflow deployment |
| TTFT P95 > 3s | Sustained 5 min | Investigar capacidade |
| Error rate > 5% | Immediate | Incident response |

## Otimização de custo e performance

### Prompt caching

Azure OpenAI suporta cache automático pra prefixos repetidos. Se seu system prompt é idêntico em todos os requests (e deveria ser), tokens cached cobram preço reduzido. Estruture prompts com a parte estática primeiro.

### Multi-model routing

Nem todo request precisa do modelo mais capaz (e mais caro). Roteie:

| Tipo de request | Modelo | Justificativa |
|-----------------|--------|---------------|
| FAQ simples, classificação | GPT-4o-mini | 94% mais barato, qualidade suficiente |
| Sumarização curta | GPT-4o-mini | Boa qualidade pra textos simples |
| Reasoning complexo | GPT-4o | Precisa do modelo completo |
| Geração de código | GPT-4o | Accuracy importa mais que custo |

Um router simples (baseado em comprimento do input, presença de keywords, ou classificação rápida) pode cortar custos de inference em 50-80%.

## No próximo post

Azure OpenAI operando com HA, retry correto e multi-model routing. No próximo: o **playbook de troubleshooting**. Os cenários reais que geram pages às 2 da manhã: NVIDIA driver crash, CUDA OOM, pods stuck em Pending e inference latency spikes.
