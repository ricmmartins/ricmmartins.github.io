---
slug: "ai-use-cases-pra-infra-teams-aiops-e-alem"
translationKey: "2026/06/27/ai-use-cases-for-infra-teams-aiops-and-beyond"
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

Décimo terceiro post da série. No [anterior](/troubleshooting-playbook-os-incidentes-que-vao-te-acordar-as-2am/), a gente falou dos incidentes que arrancam você da cama. Agora a pergunta é outra: como usar AI pra melhorar o próprio trabalho de infraestrutura.

## Invertendo a lente

Nos últimos 12 posts, você montou infra pra AI: GPU, cluster, pipeline, segurança, monitoramento, custo. Beleza. Mas e usar AI no **seu** dia a dia? Análise de logs, detecção de anomalia, capacity planning, geração de IaC, apoio em incidentes. AIOps não é mágica e também não nasceu ontem. É só aplicar modelos e inferência em problemas operacionais que já consomem boa parte do seu tempo.

## Use case 1: análise de logs com LLMs

### O problema

Um cluster AKS com 50 microservices gera centenas de milhares de linhas de log por hora. Quando dá ruim, você sai fazendo grep, cruzando timestamp e montando timeline na unha. Com sorte leva meia hora. Sem sorte, vai embora a madrugada.

### A solução

LLM vai bem com texto não estruturado e correlação de padrões. Você pode mandar um bloco de logs pro Azure OpenAI com um prompt objetivo:

```python
import os
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint="https://aoai-prod.openai.azure.com/",
    api_version="2024-06-01",
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
)


def analyze_logs(log_block):
    response = client.chat.completions.create(
        model="gpt-4o-prod",
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
        max_tokens=1000,
    )
    return response.choices[0].message.content
```

### Quando isso funciona bem

- Post-mortem de incidente, resumindo 10 mil linhas em uma timeline útil
- Correlação entre serviços, quando o erro em A derruba B, C e D
- Comparação de padrão, tipo "isso aqui parece o incidente de março"

### Quando não trocar ferramenta especializada por LLM

- Alerting em tempo real: deixe isso com Azure Monitor, Prometheus e afins
- Compliance e auditoria: precisa de consulta estruturada e reproduzível, como KQL
- Volume muito alto: mandar tudo pro LLM fica caro e lento bem rápido

> **Custo:** uma investigação de logs com alguns milhares de tokens continua na faixa de centavos com GPT-4o. Faz sentido sob demanda. Não faz sentido em todo log o tempo todo.

## Use case 2: anomaly detection em métricas

### O problema

Threshold estático gera fadiga. CPU acima de 80% pode ser normal em deploy. Memória acima de 90% pode ser o padrão saudável daquele workload. O que interessa é desvio do comportamento normal, e não só cruzar um número arbitrário.

### A solução

O Azure Monitor já oferece threshold dinâmico em alertas de métrica:

```bash
# Regra de alerta com threshold dinâmico
az monitor metrics alert create \
  --name "gpu-host-cpu-anomaly" \
  --resource-group rg-ai-prod \
  --scopes "/subscriptions/{sub}/resourceGroups/rg-ai-prod/providers/Microsoft.Compute/virtualMachines/gpu-vm-01" \
  --condition "avg Percentage CPU > dynamic medium 3 of 5" \
  --action ag-oncall \
  --window-size 5m \
  --evaluation-frequency 1m \
  --description "CPU fora do padrão em host GPU"
```

Threshold dinâmico aprende a sazonalidade da carga e alerta quando o comportamento sai do esperado, não quando encosta num valor chutado seis meses atrás. Se você estiver olhando métrica de GPU via DCGM no Managed Prometheus, a ideia é a mesma, mas a implementação vai por recording rule e alert rule no Prometheus, não por alerta de métrica de VM.

### Métricas boas pra anomaly detection

| Métrica | Por que funciona bem | O que o threshold estático perde |
|---------|---------------------|----------------------------------|
| GPU utilization | Tem padrão sazonal forte em treino | Treino legítimo pode virar falso positivo |
| API latency P95 | Baseline costuma ser estável | O valor normal muda conforme a hora do dia |
| Error rate | Quase sempre fica perto de zero | 0,1% pode ser banal ou grave dependendo do volume |
| Token consumption | Acompanha uso real do serviço | Ajuda a separar crescimento orgânico de pico estranho |

## Use case 3: capacity planning preditivo

### O problema

Capacity planning clássico assume uso atual, projeta crescimento linear e coloca uma folga. Isso funciona em carga estável. Em AI, o normal é burst, campanha, demo de diretoria e comportamento nada linear.

### A solução

Use histórico de consumo e forecasting de série temporal pra prever quando a quota ou a capacidade vai apertar:

```kusto
// KQL: projetar consumo de tokens do Azure OpenAI para as próximas 4 semanas
let forecast_window = 28d;
AzureMetrics
| where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"
| where MetricName == "TokenTransaction"
| where TimeGenerated > ago(90d)
| summarize DailyTokens = sum(Total) by bin(TimeGenerated, 1d)
| make-series DailyTokens = avg(DailyTokens) default=0
    on TimeGenerated from startofday(ago(90d)) to startofday(now()) step 1d
| extend forecast = series_decompose_forecast(DailyTokens, toint(forecast_window / 1d))
| project TimeGenerated, DailyTokens, forecast
```

### Combinando com Azure OpenAI pra narrativa

Número por si só nem sempre move time nenhum. Uma explicação em português claro ajuda:

"Mantido o consumo atual de tokens, que está subindo 12% por semana, você esgota a folga de quota do deployment `gpt-4o` no East US em cerca de 18 dias. Próximos passos: pedir mais quota agora, reduzir o system prompt ou mandar overflow pra outra região."

## Use case 4: geração e revisão de IaC

### O problema

Escrever Bicep ou Terraform pra cluster com GPU é repetitivo e cheio de detalhe fácil de esquecer: extensão de driver, taint de node pool, network policy, quota, managed identity, private endpoint.

### A solução

GitHub Copilot no editor, ou Azure OpenAI como assistente de rascunho:

- **Geração:** "Crie um módulo Bicep pra um cluster AKS com node pool GPU NC24ads_A100_v4, DCGM exporter, managed identity e private endpoint pro ACR"
- **Revisão:** mande o IaC atual pra uma revisão contra checklist de segurança, custo e HA
- **Migração:** "Converta este ARM template pra Bicep mantendo a mesma funcionalidade"

### Validação continua sendo sua

AI gera. Você valida. Não aplique IaC gerado por AI sem:
1. Ler o output e entender o papel de cada recurso
2. Conferir contra a documentação oficial
3. Rodar `az deployment group what-if` no caso de Bicep ou `terraform plan` no caso de Terraform
4. Passar por code review de outra pessoa

## Use case 5: incident response assistido

### O problema

Às 2 da manhã, com sono e adrenalina, sua memória não está no auge. Quanto menos você depender dela, melhor.

### A solução

Runbook interativo com AI como copiloto:

1. O alerta dispara e um webhook chama uma Logic App
2. A Logic App coleta contexto, como logs recentes, métricas e mudanças recentes
3. O Azure OpenAI lê esse pacote e sugere diagnóstico e próximos comandos
4. O engenheiro de plantão recebe a sugestão no Teams ou no Slack

Não troca o engenheiro. Encurta o caminho entre o susto e a hipótese útil.

## Matriz de decisão: quando usar AI e quando ficar no tradicional

| Cenário | Use AI | Use ferramenta tradicional |
|---------|:---:|:---:|
| Análise ad-hoc de incidente | ✅ | |
| Alerting em tempo real | | ✅ (Azure Monitor) |
| Rascunho de IaC | ✅ | |
| Validação de compliance | | ✅ (Azure Policy) |
| Sumarização de post-mortem | ✅ | |
| Enforcement de RBAC | | ✅ (Entra ID) |
| Forecast de capacidade | ✅ (pra narrativa) | ✅ (pra números, KQL) |
| Detecção de anomalia | ✅ | ✅ |

A regra é simples: AI ajuda muito quando o trabalho envolve texto bagunçado, correlação de padrões ou rascunho. Ferramenta tradicional continua ganhando quando o requisito é enforcement, auditoria ou execução determinística.

## No próximo post

Use cases práticos cobertos. No próximo, a conversa sobe um nível: o **framework de adoção de AI**. Como sair do "vamos usar AI" e chegar numa plataforma governada, escalável e que não torra dinheiro em silêncio.
