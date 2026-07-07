---
slug: "azure-openai-em-producao-tokens-throughput-e-alta-disponibilidade"
translationKey: "2026/06/19/azure-openai-in-production-tokens-throughput-and-high-availability"
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

Décimo primeiro post da série. No [anterior](/platform-ops-construindo-uma-plataforma-ai-self-service/), a gente montou a plataforma de AI self-service com multi-tenancy e scheduling. Agora vem o serviço que todo mundo quer usar: Azure OpenAI, e como rodar isso sem tomar 429 na cara.

## O 429 que mudou tudo

Seu time lançou um chatbot interno com GPT-4o na segunda-feira. No dia 1 foi só demo pra liderança e elogio no Slack. No dia 3 apareceu o primeiro "o bot tá lento". No dia 5, 30% dos requests já estavam voltando com HTTP 429. Você abre o Azure Monitor e dá de cara com o teto de 80K TPM.

A reação do time de data science costuma ser previsível: "aumenta o limite". Às vezes resolve. Muitas vezes não. Aumento de quota não sai na hora, e mais TPM não conserta prompt ruim, system prompt inchado ou retry mal escrito martelando o mesmo endpoint até throttling virar fila, timeout e confusão.

Antes de pedir mais capacidade, vale entender como o Azure OpenAI mede, limita e cobra esse serviço.

## Tokens: a unidade que manda

Token é um pedaço de palavra. LLM não processa texto caractere por caractere. Ele quebra o texto em subpalavras. Em inglês, 1 token costuma ficar perto de 4 caracteres ou 0,75 palavra. Em português a conta muda um pouco, mas a ordem de grandeza é parecida.

**Tudo no Azure OpenAI gira em torno de tokens:** cobrança, throughput, janela de contexto e rate limiting.

```
Total Tokens = System Prompt + User Input + Output (completion)
```

Num chatbot típico, você pode ter 500 tokens de system prompt, 300 de entrada e 800 de resposta. Isso dá 1.600 tokens por request. Multiplica isso por usuários concorrentes e requests por minuto. A necessidade real de throughput aparece daí.

**Tradução infra ↔ AI:** tokens são os pacotes desse mundo. TPM é seu teto de throughput por minuto. RPM é o limite de chamadas. O raciocínio operacional é o mesmo. Só mudam as unidades.

### Context windows

| Modelo | Context Window |
|--------|---------------|
| GPT-4o | 128K tokens |
| GPT-4o-mini | 128K tokens |
| GPT-4 Turbo | 128K tokens |
| GPT-3.5 Turbo | 16K tokens |

Janela de contexto grande não é convite pra lotar tudo. Um request de 100K tokens consome o mesmo TPM que 62 requests de 1.600 tokens.

## Tipos de deployment: a decisão arquitetural

| Característica | Standard | Global Standard | Provisioned (PTU) |
|---------------|----------|-----------------|-------------------|
| **Cobrança** | Paga por token | Paga por token | Custo fixo mensal por PTU |
| **Throughput** | Limitado por quota (TPM/RPM) | Limitado por quota, com defaults maiores | Capacidade reservada |
| **Latência** | Variável, infra compartilhada | Variável, com roteamento da Microsoft | Mais previsível |
| **Residência de dados** | Região única | A Microsoft escolhe a região | Região única |
| **Throttling** | 429 ao estourar quota | 429 ao estourar quota | Sem 429 enquanto o tráfego ficar dentro da capacidade comprada |
| **Melhor pra** | Dev, teste e carga variável | Apps globais sem restrição de residência | Produção com SLA |

O Data Zone Standard fica no meio do caminho entre Standard e Global Standard. Continua sendo pay-per-token e sujeito a quota, mas mantém o tráfego dentro da geografia escolhida em vez de sair roteando globalmente.

### Quando usar cada um

1. **Carga variável, volume baixo, experimento?** Use Standard ou Global Standard.
2. **Precisa mais quota e não tem restrição de residência?** Use Global Standard.
3. **Precisa manter dados dentro de uma geografia, como US ou EU?** Use Data Zone Standard.
4. **Produção com SLA e volume alto de forma constante?** Use Provisioned.
5. **Produção crítica com rota de escape?** Use PTU como primário e Standard como overflow.

### Criando deployments via CLI

```bash
# Criar o recurso Azure OpenAI
az cognitiveservices account create \
  --name aoai-prod \
  --resource-group rg-ai-prod \
  --kind OpenAI \
  --sku S0 \
  --location eastus \
  --yes

# Criar um deployment Standard (pay-per-token)
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

No deployment Standard, `sku-capacity` representa o TPM em milhares. `80` significa 80K TPM.

> **Throughput de PTU varia.** Não existe uma conta fixa de TPM por PTU. Isso depende do modelo, do tamanho do prompt e do tamanho da resposta. Use o [Azure OpenAI capacity calculator](https://oai.azure.com/portal/calculator) com seu tráfego real e valide com load test antes de fechar arquitetura.

## Rate limiting: entendendo os dois eixos

O Azure OpenAI aplica dois limites independentes:

- **TPM** (Tokens Per Minute): total de tokens de entrada e saída processados por minuto
- **RPM** (Requests Per Minute): quantidade de chamadas por minuto, independentemente do tamanho

Você pode estourar TPM com poucos requests grandes, como RAG com documento longo, ou RPM com muitos requests pequenos, como classificação linha a linha. O tratamento é diferente em cada caso.

### Como checar o uso

```bash
az cognitiveservices account list-usage \
  --name aoai-prod \
  --resource-group rg-ai-prod \
  --output table
```

A quota é distribuída por subscription, região e modelo ou tipo de deployment. Você reparte esse pool entre deployments. A visão de controle ajuda, mas o comportamento ao vivo aparece mesmo nos headers das respostas 429.

## O padrão de retry correto (e o errado)

O erro mais comum é retry imediato em loop apertado. Isso pega um throttle pontual e transforma em tempestade.

```python
import random
import time
import openai


def call_with_backoff(client, messages, max_retries=5):
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(
                model="gpt-4o-prod",
                messages=messages,
            )
        except openai.RateLimitError as e:
            if attempt == max_retries - 1:
                raise
            headers = e.response.headers
            retry_after_ms = headers.get("retry-after-ms")
            if retry_after_ms is not None:
                wait = float(retry_after_ms) / 1000
            else:
                wait = float(headers.get("Retry-After", 1))
            wait += random.uniform(0, 1)
            time.sleep(wait)
```

**Respeite sempre `Retry-After` ou `retry-after-ms`** e coloque jitter aleatório. Sem isso, todos os clientes voltam ao mesmo tempo e você cria o próprio problema.

### Content filtering também consome capacidade

Filtro de conteúdo é uma coisa, rate limiting é outra, mas na operação eles aparecem no mesmo painel. Um prompt bloqueado pode retornar `400` com `content_filter`. Uma resposta gerada pode parar com `finish_reason=content_filter`. Em ambos os casos, houve trabalho até aquele ponto. Vale acompanhar chamadas filtradas junto com 429, e não como se fosse um detalhe sem relação com capacidade.

## Alta disponibilidade: múltiplos deployments

Em produção, não dependa de um deployment só, nem de uma região só.

### Arquitetura com APIM como gateway

Azure API Management na frente de vários deployments Azure OpenAI:

1. **Primário:** deployment PTU em East US, com capacidade reservada
2. **Secundário:** deployment Standard em West US, pra overflow
3. **Terciário:** Global Standard, como rota final de contingência

O APIM consegue orquestrar isso, mas só se você escrever a policy. Trate 429 e 5xx como lógica explícita de gateway, não como failover mágico.

### Monitoramento de capacidade

```bash
az monitor metrics list \
  --resource "/subscriptions/{sub}/resourceGroups/rg-ai-prod/providers/Microsoft.CognitiveServices/accounts/aoai-prod" \
  --metrics "TokenTransaction" \
  --interval PT1M \
  --aggregation Total \
  --filter "ModelDeploymentName eq 'gpt-4o-prod'"
```

### Alertas que importam

| Métrica | Threshold | Ação |
|---------|-----------|------|
| TPM usage > 80% | Sustentado por 5 min | Reavaliar capacidade ou roteamento |
| HTTP 429 rate > 1% | Sustentado por 2 min | Ativar overflow |
| TTFT P95 > 3s | Sustentado por 5 min | Investigar capacidade |
| Error rate > 5% | Imediato | Abrir incidente |

## Otimização de custo e performance

### Prompt caching

Nos modelos que suportam prompt caching, prefixos repetidos saem por preço menor. Se o seu system prompt é estável, coloque a parte fixa primeiro e mantenha o texto idêntico entre requests.

### Roteamento entre modelos

Nem todo request precisa do modelo mais capaz, e mais caro.

| Tipo de request | Modelo | Justificativa |
|-----------------|--------|---------------|
| FAQ simples, classificação | GPT-4o-mini | Custa uma fração do preço e costuma dar conta |
| Sumarização curta | GPT-4o-mini | Qualidade suficiente pra texto simples |
| Raciocínio mais pesado | GPT-4o | Vale pagar pelo modelo maior |
| Geração de código | GPT-4o | Precisão costuma pesar mais que custo |

Um roteador simples, baseado em tamanho de input, intenção ou um classificador barato na frente, já costuma cortar uma parte bem relevante da conta.

## No próximo post

Azure OpenAI agora está com HA, retry decente e roteamento entre modelos sem gastar dinheiro por esporte. No próximo vem o **playbook de troubleshooting**: NVIDIA driver quebrado, CUDA OOM, pod preso em Pending e picos de latência que parecem mistério até você abrir os logs.
