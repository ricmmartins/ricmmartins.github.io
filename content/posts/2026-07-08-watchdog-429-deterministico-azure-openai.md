---
slug: "watchdog-429-deterministico-azure-openai"
translationKey: "2026/07/08/deterministic-429-watchdog-azure-openai"
title: "Construindo um Watchdog 429 Determinístico para Azure OpenAI"
description: "Um servidor MCP que detecta tendências de consumo de tokens antes do 429 acontecer — sem LLM, só métricas e um cron job."
date: 2026-07-08T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - azure-openai
  - monitoramento
  - mcp
  - terraform
  - sre
  - throttling
series:
  - "MCP Agentes e Infraestrutura"
---

No post anterior eu expliquei o que é MCP e como um agent decide sozinho a sequência de chamadas a partir das tools que tem disponíveis. Agora vamos construir um caso de uso real, pequeno o bastante para terminar em um fim de semana: um MCP server que observa o consumo de tokens do seu deployment de Azure OpenAI / AI Foundry e avisa no Slack ou por email **antes** do 429 acontecer — e não depois, quando o cliente já engoliu o erro em produção.

## Por que isso é mais sutil do que parece

A primeira reação de quem nunca sofreu com 429 costuma ser: "fácil, é só medir o uso e comparar com a quota". O problema é que TPM (tokens per minute) e RPM (requests per minute) no Azure OpenAI são avaliados em janelas **deslizantes**, em intervalos curtos — normalmente de 1 a 10 segundos — e não como uma média suave ao longo do minuto. Isso significa que você pode estourar o limite mesmo ficando "dentro da quota" no agregado, simplesmente porque as requisições chegaram em burst em vez de distribuídas no tempo. É por isso que tanta equipe relata 429 "mesmo dentro do limite documentado": o problema não é o volume total, e sim a distribuição ao longo do tempo.

A resposta padrão da indústria é retry com exponential backoff e jitter, respeitando o header `retry-after-ms` que a própria API já devolve. Isso é necessário, mas é reativo — o cliente já sentiu o erro. O que queremos aqui é a camada anterior: enxergar a tendência de consumo subindo em direção ao limite e agir antes de o primeiro 429 sequer disparar.

## O que o Azure já resolve sem você escrever uma linha de código

Antes de construir qualquer coisa, vale ser honesto sobre quanto desse problema a plataforma já resolve sozinha. O Azure OpenAI expõe métricas nativas no Azure Monitor por deployment — os nomes reais da API são `TokenTransaction` (tokens processados), `AzureOpenAIRequests` (total de chamadas), `ProcessedPromptTokens`, `GeneratedTokens` e as métricas de latência, todas filtráveis pela dimensão `ModelDeploymentName`. Um alerta simples por threshold — "avise quando `TokenTransaction` passar de X tokens em 1 minuto" — não precisa de agent, MCP nem código algum. É um `azurerm_monitor_metric_alert` apontando para um `azurerm_monitor_action_group` com email e webhook do Slack, resolvido em Terraform puro:

```hcl
resource "azurerm_monitor_action_group" "ia_oncall" {
  name                = "ag-ia-oncall"
  resource_group_name = azurerm_resource_group.ia.name
  short_name          = "iaoncall"

  email_receiver {
    name          = "sre-team"
    email_address = "sre-ai@yourcompany.com"
  }

  webhook_receiver {
    name        = "slack-webhook"
    service_uri = var.slack_webhook_url
  }
}

resource "azurerm_monitor_metric_alert" "tpm_80pct" {
  name                = "alert-tpm-80pct-gpt4o"
  resource_group_name = azurerm_resource_group.ia.name
  scopes              = [azurerm_cognitive_account.openai.id]
  description         = "TokenTransaction crossed 80% of configured TPM on the gpt-4o-prod deployment"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.CognitiveServices/accounts"
    metric_name      = "TokenTransaction"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 200000 # 80% of a 250k TPM deployment — adjust to yours

    dimension {
      name     = "ModelDeploymentName"
      operator = "Include"
      values   = ["gpt-4o-prod"]
    }
  }

  action {
    action_group_id = azurerm_monitor_action_group.ia_oncall.id
  }
}
```

Só isso já cobre o caso mais comum, sem agent, sem MCP e sem código para manter. O Terraform completo, incluindo `azurerm_cognitive_account` e `azurerm_cognitive_deployment` referenciados acima, está no repositório companion da série (link no post 5).

Ainda assim, vale a pena construir o MCP server por cima disso porque esse alerta nativo **não** faz algumas coisas importantes: ele dispara uma vez quando cruza o threshold, mas não enxerga a inclinação da curva (subindo rápido versus estabilizando), não compara com o padrão histórico para o mesmo horário e não consolida TPM, RPM e error rate em uma única mensagem com contexto. Para isso, a tool precisa consultar a série temporal e calcular trend — e é aí que entra código.

## A arquitetura

O servidor expõe um conjunto deliberadamente pequeno de tools, dividido em dois grupos que não se misturam: leitura de telemetria e notificação. Nada com poder de agir sobre o próprio recurso — nenhuma tool que aumente quota ou redistribua tráfego sozinha. Isso é intencional, e eu explico por quê mais adiante.

```
 ┌─────────────────────────────┐
 │            HOST              │   Claude / agent runtime / simple cron
 └──────────────┬────────────────┘
                 │ MCP (stdio or HTTP)
                 ▼
 ┌─────────────────────────────┐
 │     MCP SERVER: watchdog429   │
 │  get_token_usage_trend        │
 │  get_token_usage_history      │
 │  send_slack_alert             │
 │  send_priority_alert          │
 └──────────────┬────────────────┘
                 ▼
   Azure Monitor (TokenTransaction, AzureOpenAIRequests)
```

A tool central é `get_token_usage_trend`. Ela consulta a API de métricas do Azure Monitor para o recurso do Azure OpenAI — via o pacote oficial `azure-monitor-query` (`MetricsQueryClient`) —, puxa `TokenTransaction` em uma janela curta (por exemplo, os últimos 5 minutos em buckets de 1 minuto, filtrando por `ModelDeploymentName`) e devolve a porcentagem do TPM configurado que já foi consumida, junto com a inclinação da curva — não só "quanto", mas "em que velocidade está subindo".

```python
# pip install mcp azure-monitor-query azure-identity
from datetime import timedelta
from mcp.server.fastmcp import FastMCP
from azure.monitor.query import MetricsQueryClient
from azure.identity import DefaultAzureCredential

mcp = FastMCP("watchdog429")
metrics_client = MetricsQueryClient(DefaultAzureCredential())

OPENAI_RESOURCE_ID = os.environ["OPENAI_RESOURCE_ID"]

@mcp.tool()
def get_token_usage_trend(deployment_name: str, window_minutes: int = 5) -> dict:
    """Returns the percentage of TPM consumed over the last N minutes for the
    given deployment, plus the trend (rising/stable/falling). Uses the native
    TokenTransaction Azure Monitor metric, filtered by the ModelDeploymentName
    dimension. Performs no action on the deployment itself."""
    response = metrics_client.query_resource(
        resource_uri=OPENAI_RESOURCE_ID,
        metric_names=["TokenTransaction"],
        timespan=timedelta(minutes=window_minutes),
        granularity=timedelta(minutes=1),
        filter=f"ModelDeploymentName eq '{deployment_name}'",
    )
    series = [p.total or 0 for p in response.metrics[0].timeseries[0].data]
    tpm_limit = get_configured_tpm(deployment_name)  # comes from your Terraform/inventory
    pct_used = sum(series) / tpm_limit
    trend = "rising" if series[-1] > series[0] else "stable"
    return {"deployment_name": deployment_name, "pct_of_tpm": pct_used, "trend": trend, "window_minutes": window_minutes}

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

E a tool de notificação é propositalmente burra — ela não decide nada, só transmite o que mandarem:

```python
@mcp.tool()
def send_slack_alert(channel: str, message: str) -> str:
    """Sends a message to a Slack channel. Doesn't decide the content,
    just transmits it. The decision to alert belongs to whoever calls this tool."""
    httpx.post(SLACK_WEBHOOK_URL, json={"channel": channel, "text": message}, timeout=10)
    return "sent"
```

## A versão mais simples que já funciona

Para este post, o "agent" pode começar como um script rodando em cron a cada minuto, sem LLM algum no loop: chama `get_token_usage_trend`, e se `pct_of_tpm > 0.8`, chama `send_slack_alert`. Isso já resolve 80% do problema prático, e é o que eu recomendaria colocar no ar primeiro — antes de botar um modelo para decidir qualquer coisa, prove que a telemetria e o alerta realmente funcionam.

```python
trend = get_token_usage_trend("gpt-4o-prod", window_minutes=5)
if trend["pct_of_tpm"] > 0.8 and trend["trend"] == "rising":
    send_slack_alert("#oncall-ai", f"Deployment gpt-4o-prod at {trend['pct_of_tpm']:.0%} of TPM and rising")
```

Perceba que isso nem precisa de um MCP host de verdade — é só um script chamando as mesmas funções que o servidor expõe. O ganho de empacotar isso como MCP aparece depois, quando você quiser que um agent mais generalista (o mesmo que já investiga o cluster AKS do post anterior) enxergue essa telemetria também, sem que você precise escrever uma integração nova para cada consumidor.

## Onde isso fica interessante (e onde também mora o perigo)

A versão com threshold fixo (80%, 90%, tanto faz) tem um problema clássico de monitoramento: ela não consegue diferenciar um spike legítimo de fim de mês — um batch job que sempre consome 90% da quota por 10 minutos e depois volta ao normal — de algum agent solto no ambiente entrando em loop e queimando tokens sem parar, exatamente o cenário do post anterior. Ambos cruzam o mesmo threshold; só um deles merece acordar alguém.

É aí que entra a próxima peça da série: dar ao monitor uma camada de raciocínio em vez de um `if` fixo, para que ele compare o padrão atual com o histórico recente antes de decidir entre um "heads-up no Slack" e um page de verdade. Esse é o tema do próximo post — sair de um script determinístico para um agent que de fato decide, com os guardrails certos para essa decisão não sair do controle.

Por enquanto, o guardrail mais importante já está no desenho: o servidor **só lê telemetria e só escreve em canais de notificação**. Ele não tem — e não deveria ter — nenhuma tool capaz de alterar quota, redistribuir tráfego entre regiões ou reiniciar deployment. Antes de esse agent ganhar qualquer poder de agir sobre o recurso, ele precisa primeiro provar, em produção, que sabe separar ruído de sinal. Esse é o post 3.

## Próximo da série

1. ✅ MCP e agents — o 101 (com o exemplo do AKS-MCP)
2. ✅ Este post — o servidor que detecta tendências de 429 antes que elas aconteçam
3. De script a agent: dando autonomia de decisão ao watchdog, com guardrails explícitos contra alert fatigue
4. Times de agents na prática: combinando o diagnóstico de AKS com o watchdog de quota em um único orquestrador
5. Governança base para agents no Microsoft Foundry

Se você quiser testar a versão puramente em script antes mesmo de encostar em MCP, são literalmente as duas funções acima e um cron job — comece por aí.

---

*Este é o post 2 da série "MCP, Agentes e Times de Agentes para Engenheiros de Infraestrutura":*

1. [MCP e Agentes 101](/mcp-e-agentes-101-para-engenheiros-de-infra/)
2. **[O Watchdog 429 Determinístico](/watchdog-429-deterministico-azure-openai/)**
3. [De Script a Agente](/watchdog-agente-autonomia-decisao-guardrails/)
4. [Orquestração Multi-Agentes](/orquestracao-multi-agentes-aks-openai-correlacao/)
5. [Governança no Microsoft Foundry](/governanca-agentes-microsoft-foundry/)

*Repositório companion: [agentic-infra-handbook](https://github.com/ricmmartins/agentic-infra-handbook)*

*Read this post in [English](https://rmmartins.com/2026/07/08/deterministic-429-watchdog-azure-openai/).*
