---
slug: "monitoramento-e-observabilidade-para-ai"
aliases:
  - "/posts/monitoramento-e-observabilidade-para-ai/"
title: "Monitoramento e observabilidade para AI: quando o dashboard verde mente"
description: "Infra saudável não significa modelo funcionando. Model drift, GPU metrics, Azure OpenAI throttling e as 6 dimensões de observabilidade que você precisa cobrir."
date: 2026-05-17T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - ai
  - infraestrutura
  - azure
  - monitoramento
  - prometheus
  - grafana
  - opentelemetry
  - azure-openai
series:
  - "AI para Engenheiros de Infraestrutura"
---

Sétimo post da série. No [anterior](/mlops-ciclo-de-vida-do-modelo-pra-quem-e-de-infra/), colocamos modelos em produção com pipelines CI/CD. Agora: como saber se estão saudáveis?

## A falha silenciosa

Seu endpoint Azure OpenAI retorna 200 OK em todo request. Latência normal, P95 abaixo de 800ms. CPU e memória dentro dos thresholds. Kubernetes mostra pods saudáveis, sem restarts. Por toda métrica de infra que você confia, o sistema está perfeito.

Mas os tickets de suporte não param. Usuários reportam que o chatbot "dá respostas piores". Respostas fluentes mas factualmente erradas. Alucinações aumentaram, sumarizações perdem pontos chave, sugestões de código introduzem bugs sutis.

Você puxa o monitoring stack. Azure Monitor: verde. Application Insights: verde. Grafana: tudo verde. Parede de métricas saudáveis enquanto o sistema está ativamente falhando seus usuários.

O problema? **Model drift**. Um fine-tuning recente introduziu regressão na qualidade. As saídas degradaram gradualmente em duas semanas, mas nenhum alerta disparou porque você monitora métricas de **infraestrutura**, não de **AI**. Seu stack de observabilidade foi construído pra workloads tradicionais onde "o servidor está up e respondendo" = "o sistema está funcionando". Em AI, um modelo pode estar rodando perfeitamente e mesmo assim estar **errado**.

## As 6 dimensões de observabilidade AI

Monitoramento tradicional cobre compute, rede e storage. Necessário mas insuficiente pra AI.

| # | Dimensão | O que monitorar | Prioridade |
|---|----------|----------------|-----------|
| 1 | **Compute (GPU)** | Utilização, memória, temperatura, ECC errors | P0 |
| 2 | **Custo** | GPU spend, tokens consumidos, custo por inference | P0 |
| 3 | **Modelo** | Accuracy, drift, latência, error rates | P1 |
| 4 | **Segurança** | Prompt injection, data exfiltration, consumo anômalo | P1 |
| 5 | **Rede** | InfiniBand health, cross-node latency, throughput | P2 |
| 6 | **Data** | Pipeline freshness, qualidade, falhas de ingestão | P2 |

**Tradução infra ↔ AI:** Monitorar um web server é acompanhar CPU, memória, disco e rede. Monitorar um workload de AI é como monitorar um web server, um banco de dados, um sistema de billing e um departamento de QA simultaneamente. O modelo não apenas consome recursos; ele produz outputs que têm uma dimensão de **corretude** que infra tradicional não tem.

## GPU monitoring: o fundamento

### DCGM Exporter no AKS

NVIDIA DCGM Exporter roda como DaemonSet (um pod por nó GPU) e expõe métricas em formato Prometheus:

```bash
# Adicionar repo Helm da NVIDIA
helm repo add nvidia https://nvidia.github.io/dcgm-exporter/helm-charts
helm repo update

# Instalar DCGM Exporter como DaemonSet nos nós GPU
helm install dcgm-exporter nvidia/dcgm-exporter \
  --namespace gpu-monitoring \
  --create-namespace \
  --set nodeSelector."agentpool"="gpu"
```

### Azure Managed Prometheus

Elimina necessidade de rodar seu próprio Prometheus server:

```bash
# Habilitar Azure Monitor managed Prometheus
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --enable-azure-monitor-metrics

# Verificar se está habilitado
az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query "azureMonitorProfile.metrics.enabled"
```

Managed Prometheus descobre e scrapa DCGM Exporter pods automaticamente via Kubernetes service discovery. Não precisa configurar scrape targets manualmente.

### Métricas GPU e thresholds de alerta

| Métrica | DCGM Name | Warning | Critical | Significa |
|---------|-----------|---------|----------|-----------|
| GPU Utilization | `DCGM_FI_DEV_GPU_UTIL` | < 30% sustentado | < 10% sustentado | Desperdício de spend |
| GPU Memory Used | `DCGM_FI_DEV_FB_USED` | > 85% | > 95% | Risco de OOM |
| GPU Temperature | `DCGM_FI_DEV_GPU_TEMP` | > 78°C | > 83°C | Thermal throttling |
| ECC Errors | `DCGM_FI_DEV_ECC_DBE_VOL_TOTAL` | > 0 | > 0 | Hardware degradando |

> **Nuance:** Low GPU utilization nem sempre é problema. Workloads de inference latency-sensitive intencionalmente mantêm utilização baixa pra manter respostas rápidas. Verifique se o workload otimiza pra throughput (training, alta utilização esperada) ou latência (inference, moderada OK).

## Monitoramento Azure OpenAI

### Métricas-chave

| Métrica | O que é | Quando investigar |
|---------|---------|-------------------|
| **TPM** (Tokens Per Minute) | Throughput contra capacity alocada | > 80% sustentado do limite |
| **RPM** (Requests Per Minute) | Calls individuais independente de tokens | Muitos requests pequenos saturando antes de TPM |
| **TTFT** (Time to First Token) | Latência percebida pra streaming | > 2 segundos (sente lento pro usuário) |
| **HTTP 429 Rate** | Sinal de throttling | > 1% sustentado |

**Tradução infra ↔ AI:** TPM limits são como bandwidth throttling. RPM limits são como connection-rate limiting. Token budgets são equivalente AI de data transfer quotas.

### Habilitar diagnostic logging

```bash
az monitor diagnostic-settings create \
  --resource "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.CognitiveServices/accounts/myAOAI" \
  --name "aoai-diagnostics" \
  --workspace "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.OperationalInsights/workspaces/myWorkspace" \
  --logs '[{"category":"RequestResponse","enabled":true},{"category":"Audit","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

> **Cuidado com volume:** Um deployment processando 1.000 RPM gera ~1.4 milhão de log entries por dia. Configure retention policies no Log Analytics: 30 dias pra debugging operacional, mais pra compliance.

## Observabilidade na aplicação

### OpenTelemetry pra distributed tracing

Aplicações AI modernas envolvem múltiplos serviços: API gateway, preprocessing, embedding, vector search, LLM inference, post-processing. OpenTelemetry segue um request por todo o pipeline:

```python
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry import trace

configure_azure_monitor()
tracer = trace.get_tracer("inference-pipeline")

def process_request(user_query):
    with tracer.start_as_current_span("inference-pipeline") as span:
        with tracer.start_as_current_span("generate-embedding"):
            embedding = embed(user_query)

        with tracer.start_as_current_span("vector-search"):
            context = search(embedding, top_k=5)

        with tracer.start_as_current_span("llm-inference") as llm_span:
            response = generate(user_query, context)
            llm_span.set_attribute("tokens.prompt", response.usage.prompt_tokens)
            llm_span.set_attribute("tokens.completion", response.usage.completion_tokens)

        return response
```

### Métricas custom pra AI

- **Inference latency percentiles** (P50, P95, P99): P50 = experiência típica, P95/P99 = tail latency
- **Tokens per second**: throughput de LLM inference. Caindo = memory pressure ou degradação
- **Queue depth**: requests esperando GPU. Crescendo com throughput estável = precisa scale out
- **Cache hit rate**: pra semantic caching. Hit rate alto = menos latência e custo

### Structured logging (obrigatório)

```python
import logging
import json

class StructuredFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "service": getattr(record, "service", "inference-api"),
            "model_version": getattr(record, "model_version", "unknown"),
            "request_id": getattr(record, "request_id", None),
            "tokens_used": getattr(record, "tokens_used", None),
            "latency_ms": getattr(record, "latency_ms", None),
        }
        return json.dumps(log_entry)
```

Sempre logue model version e deployment name com toda trace e métrica. Quando deploar nova versão e latência subir 40%, você precisa correlacionar.

## No próximo post

Com monitoring cobrindo as 6 dimensões, vamos falar de **segurança pra AI**: prompt injection, data leakage, managed identities, private endpoints e as ameaças que seu WAF não vai pegar.
