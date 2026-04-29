---
slug: "ai-use-cases-pra-infra-teams-aiops-e-alem"
aliases:
  - "/posts/ai-use-cases-pra-infra-teams-aiops-e-alem/"
title: "AI use cases pra infra teams: AIOps e além"
description: "AI não é só pra data scientists. Análise de logs com LLMs, anomaly detection, capacity planning preditivo, IaC generation e como usar AI pra melhorar o seu trabalho de infra."
date: 2026-06-10T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - ai
  - infraestrutura
  - azure
  - aiops
  - copilot
  - anomaly-detection
  - capacity-planning
series:
  - "AI para Engenheiros de Infraestrutura"
---

Décimo terceiro post da série. No [anterior](/troubleshooting-playbook-os-incidentes-que-vao-te-acordar-as-2am/), diagnosticamos os incidentes que acordam a gente de madrugada. Agora algo diferente: como usar AI pra melhorar o trabalho de infraestrutura em si.

## Inversão de perspectiva

Nos últimos 12 posts, você construiu infra pra AI: GPUs, clusters, pipelines, segurança, monitoramento, cost management. Você virou expert em prover compute pra data scientists.

Mas e usar AI pro **seu** trabalho? Análise de logs, detecção de anomalias, capacity planning, geração de IaC, incident response automatizado. AIOps não é buzzword novo; é a aplicação prática do que você já entende (modelos, inference, tokens) no seu dia a dia operacional.

## Use case 1: análise de logs com LLMs

### O problema

Um cluster AKS com 50 microservices gera centenas de milhares de log entries por hora. Quando acontece um incidente, você grep por erros, correlaciona timestamps, e tenta construir a timeline manualmente. Com sorte, leva 30 minutos. Sem sorte, horas.

### A solução

LLMs são bons em processar texto não estruturado e extrair padrões. Mande um bloco de logs pra Azure OpenAI com um prompt bem construído:

```python
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint="https://aoai-prod.openai.azure.com/",
    api_version="2024-06-01"
)

def analyze_logs(log_block):
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": """You are an SRE analyzing Kubernetes logs.
Given a block of logs, identify:
1. The root cause event (first error in the chain)
2. Cascading failures triggered by it
3. Affected services
4. Suggested remediation
Be specific about timestamps and service names."""},
            {"role": "user", "content": f"Analyze these logs:\n\n{log_block}"}
        ],
        max_tokens=1000
    )
    return response.choices[0].message.content
```

### Quando isso funciona bem

- Incident post-mortem: resumir 10.000 linhas de log em timeline concisa
- Correlação cross-service: identificar que erro em Service A causou cascade em B, C, D
- Pattern matching: "esses logs se parecem com o incidente de março passado"

### Quando não substituir ferramentas especializadas

- Real-time alerting: use Azure Monitor alerts, não LLM inference
- Compliance e auditoria: precisa de structured queries reproduzíveis (KQL)
- Volume muito alto: enviar todos os logs pra LLM é caro e lento

> **Custo:** Um bloco de 5.000 tokens de logs (prompt + analysis) custa ~$0.015 com GPT-4o. Razoável pra incident response sob demanda. Não razoável pra processar todo log entry automaticamente.

## Use case 2: anomaly detection em métricas

### O problema

Alertas baseados em threshold estático geram fadiga. CPU > 80%? Pode ser normal durante deploy. Memory > 90%? Talvez seja o padrão estável do workload. Você precisa detectar anomalias relativas ao comportamento usual, não absolutas.

### A solução

Azure Monitor tem anomaly detection nativo usando ML:

```bash
# Alert rule com dynamic thresholds
az monitor metrics alert create \
  --name "gpu-util-anomaly" \
  --resource-group rg-ai-prod \
  --scopes "/subscriptions/{sub}/resourceGroups/rg-ai-prod/providers/Microsoft.Compute/virtualMachines/gpu-vm-01" \
  --condition "avg DCGM_FI_DEV_GPU_UTIL > dynamic medium of 3 violations out of 5 aggregated points" \
  --action-group ag-oncall \
  --description "GPU utilization anomaly detected"
```

Dynamic thresholds aprendem o padrão sazonal do workload (horário de pico, batch jobs noturnos, weekends quietos) e alertam quando o comportamento desvia do esperado, não quando cruza um número arbitrário.

### Métricas boas pra anomaly detection

| Métrica | Por que funciona bem | O que threshold estático perde |
|---------|---------------------|------------------------------|
| GPU utilization | Padrão sazonal forte (training schedule) | Training legítimo triggeraria alerta |
| API latency P95 | Baseline estável com desvios significativos | Valor normal varia por hora do dia |
| Error rate | Quase zero normalmente, qualquer spike importa | 0.1% pode ser normal ou catastrófico dependendo do volume |
| Token consumption | Correlacionado com uso real | Crescimento orgânico vs spike anômalo |

## Use case 3: capacity planning preditivo

### O problema

Capacity planning tradicional: olhar uso atual, projetar crescimento linear, adicionar margem. Funciona pra workloads estáveis. Não funciona pra AI, onde uso é bursty e crescimento é imprevisível.

### A solução

Use dados históricos de consumo com time series forecasting pra prever quando vai bater em quotas ou capacity limits:

```kusto
// KQL: projetar consumo de GPU quota pras próximas 4 semanas
let forecast_window = 28d;
AzureMetrics
| where ResourceProvider == "MICROSOFT.COMPUTE"
| where MetricName == "Percentage CPU" // proxy pra GPU utilization
| where TimeGenerated > ago(90d)
| summarize AvgUsage = avg(Average) by bin(TimeGenerated, 1d)
| make-series Usage = avg(AvgUsage) default=0 on TimeGenerated step 1d
| extend forecast = series_decompose_forecast(Usage, toint(forecast_window / 1d))
| project TimeGenerated, Usage, forecast
```

### Combinando com Azure OpenAI pra narrativa

Forecast numérico é útil mas não actionável sem contexto. Use LLM pra gerar recomendação legível:

"Based on current GPU consumption trends (+12% week-over-week), you'll exceed the NC24ads_A100_v4 quota in East US within 18 days. Recommended actions: (1) request quota increase now (takes 3-5 business days), (2) evaluate moving batch workloads to West US where utilization is 40% lower."

## Use case 4: IaC generation e review

### O problema

Escrever Bicep/Terraform pra GPU clusters é repetitivo e error-prone. Lembrar todos os parâmetros de NVIDIA driver extension, node pool taints, network policies, resource quotas.

### A solução

GitHub Copilot no editor ou Azure OpenAI pra gerar templates:

- **Geração:** "Crie um módulo Bicep pra AKS cluster com node pool GPU NC24ads_A100_v4, DCGM exporter, managed identity, private endpoint pra ACR"
- **Review:** Submeta IaC existente pra AI revisar contra best practices (checklist de segurança, cost optimization, HA)
- **Migração:** "Converta esse ARM template pra Bicep mantendo a mesma funcionalidade"

### Validação continua sendo sua

AI gera, mas você valida. Nunca aplique IaC gerado por AI sem:
1. Ler o output e entender o que cada recurso faz
2. Validar contra documentação oficial (Azure CLI reference, Bicep docs)
3. Rodar `az deployment group what-if` antes de qualquer apply
4. Code review por outro engineer

## Use case 5: incident response assistido

### O problema

Às 2AM, com sono e adrenalina, você precisa diagnosticar rápido. Quanto menos depender de memória, melhor.

### A solução

Runbooks interativos com AI como co-pilot:

1. Alerta dispara → webhook chama Logic App
2. Logic App coleta contexto: últimos logs, métricas, changes recentes
3. Azure OpenAI analisa contexto e sugere diagnóstico + próximos comandos
4. Engenheiro de plantão recebe sugestão no Teams/Slack

Não substitui o engineer. Reduz tempo de diagnóstico quando você está operando com 30% da capacidade cognitiva às 2AM.

## Decision matrix: quando usar AI vs. ferramentas tradicionais

| Cenário | Use AI | Use ferramenta tradicional |
|---------|:---:|:---:|
| Análise ad-hoc de incidente | ✅ | |
| Alerting real-time | | ✅ (Azure Monitor) |
| Geração de IaC draft | ✅ | |
| Validação de compliance | | ✅ (Azure Policy) |
| Sumarização de post-mortem | ✅ | |
| Enforcement de RBAC | | ✅ (Entra ID) |
| Capacity forecasting | ✅ (pra narrativa) | ✅ (pra números, KQL) |
| Anomaly detection | ✅ (dynamic thresholds) | ✅ (se threshold estático basta) |

A regra: AI é excelente pra tarefas que requerem interpretação de texto não estruturado, detecção de padrões complexos e geração de drafts. Ferramentas tradicionais são melhores pra enforcement, auditoria e ações determinísticas.

## No próximo post

Use cases práticos cobertos. No próximo, subimos de nível: o **framework de adoção AI** pra organizações. Como ir de "vamos usar AI" pra uma plataforma governada, escalável e cost-effective, fase por fase.
