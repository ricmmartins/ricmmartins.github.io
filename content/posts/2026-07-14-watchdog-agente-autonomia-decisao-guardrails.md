---
slug: "watchdog-agente-autonomia-decisao-guardrails"
translationKey: "2026/07/14/agentic-watchdog-decision-autonomy-guardrails"
title: "De Script a Agente: Dando Autonomia de Decisão ao Watchdog"
description: "Adicionando uma camada de raciocínio ao watchdog 429 para distinguir um spike benigno de batch de um agente descontrolado — com guardrails explícitos."
date: 2026-07-14T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - agentes-ia
  - azure-openai
  - mcp
  - guardrails
  - sre
  - alert-fatigue
series:
  - "MCP Agentes e Infraestrutura"
---

No post anterior, o watchdog de quota do Azure OpenAI era um script com `if pct_of_tpm > 0.8: alert`. Funciona, mas carrega um problema que qualquer pessoa que já configurou alerta de monitoramento conhece de cor: threshold fixo não entende contexto. Um batch job que sempre consome 90% de TPM por 10 minutos no fechamento do mês e depois volta ao normal é, para o script, o mesmo evento que algum agent solto no ambiente entrando em loop e queimando tokens sem parar. Os dois cruzam o mesmo threshold; só um deles merece acordar alguém.

Este post é sobre fechar essa lacuna — dar ao watchdog uma camada de raciocínio, sem abrir mão de nenhum dos guardrails que já definimos.

## O que muda (e o que não muda)

O que **não** muda: o servidor continua apenas lendo telemetria e apenas escrevendo em canais de notificação. Nenhuma nova tool para agir sobre o recurso. Essa fronteira estava certa no post 2 e continua certa agora — dar autonomia sobre *como alertar* é uma coisa; dar autonomia para *agir no recurso de produção* é outra completamente diferente, e eu não recomendaria a segunda sem um nível de maturidade operacional bem maior do que dois posts de blog conseguem garantir.

O que muda é o que acontece entre detectar o threshold e decidir a resposta. Duas novas tools entram no servidor:

```python
@mcp.tool()
def get_token_usage_history(deployment_name: str, days_back: int = 30) -> dict:
    """Returns the deployment's consumption pattern over the last N days,
    aggregated by day of week and hour of day, for comparison against
    the current spike."""
    response = _get_metrics_client().query_resource(
        resource_uri=OPENAI_RESOURCE_ID,
        metric_names=["TokenTransaction"],
        timespan=timedelta(days=days_back),
        granularity=timedelta(hours=1),
        filter=f"ModelDeploymentName eq '{deployment_name}'",
    )
    # aggregates by weekday-hour and returns avg/max per bucket
    ...

@mcp.tool()
def send_priority_alert(channel: str, message: str, priority: Literal["info", "warning", "urgent"]) -> str:
    """Sends an alert with a priority level: 'info' (normal channel, no
    mention), 'warning' (normal channel, with context), or 'urgent'
    (mentions the on-call group). The priority choice belongs to whoever
    calls this tool, not to this function."""
    prefix = {"info": "ℹ️", "warning": "⚠️", "urgent": "🚨 @oncall-ai"}[priority]
    httpx.post(SLACK_WEBHOOK_URL, json={"channel": channel, "text": f"{prefix} {message}"}, timeout=10)
    return "sent"
```

(`mcp` aqui é a mesma instância de `FastMCP` criada no post 2 — essas duas tools entram no mesmo servidor `watchdog429`, não em um servidor separado.)

A primeira dá ao agent uma linha de base para comparação: "isso já aconteceu neste mesmo horário antes?" A segunda separa o ato de notificar do nível de urgência — a camada de raciocínio decide o nível, não a tool.

## Onde o modelo entra (e onde não entra)

Aqui está o ponto operacional mais importante deste post: **o modelo não roda a cada minuto**. O script determinístico do post 2 continua sendo o poller — ele roda no cron, uma vez por minuto, a custo zero de LLM, e só dispara uma chamada de modelo quando o threshold é cruzado. Colocar um LLM no loop em toda iteração de monitoramento é gastar dinheiro em um caminho que, na esmagadora maioria do tempo, não precisa de raciocínio algum — só vale pagar o custo da chamada de modelo nos minutos em que o threshold realmente foi cruzado.

```
 cron (1x/min, zero LLM cost)
       │
       ▼
 get_token_usage_trend > 0.8 ?  ──no──▶  loop continues
       │ yes
       ▼
 invoke the agent (1 model call)
       │
       ▼
 get_token_usage_history + reasoning
       │
       ▼
 send_priority_alert(priority = info | warning | urgent)
```

O system prompt do agent continua pequeno e direto — ele não precisa de muito mais do que isto:

```
You are an Azure OpenAI quota watchdog. You were triggered because TPM
consumption passed 80%. Your only decision is the alert's priority
level: info, warning, or urgent.

Use get_token_usage_history to compare the current spike against the
pattern from the last 30 days at the same day of week and time.

- If the current pattern is consistent with past spikes at this same time: info.
- If it's an unprecedented spike but the curve is leveling off: warning.
- If it's an unprecedented spike AND the curve keeps climbing fast: urgent.

You have no tool that can act on the deployment. Your only possible
output is calling send_priority_alert exactly once.
```

Repare na última linha: ela existe para reforçar, no próprio prompt, o limite que já está embutido na arquitetura. É redundância intencional — o guardrail real é a ausência da tool; o prompt é só a segunda camada.

**Onde isso roda de verdade**: o cron do post 2 e a etapa condicional de invocar o modelo cabem tranquilamente em um Azure Container Apps Job com trigger agendado para uma vez por minuto — ele sobe um container Python, executa `get_token_usage_trend`, decide se vai invocar o modelo e encerra. Nada de servidor permanentemente ligado, nada de VM para manter. A managed identity do job (`azurerm_user_assigned_identity` + um `azurerm_role_assignment` com a role `Monitoring Reader` na Cognitive Services account) substitui qualquer API key fixa — o Terraform completo está no repositório companion da série.

## Dois cenários lado a lado

**Cenário A** — último dia útil do mês, 23h, TPM em 87%. O agent chama `get_token_usage_history`, vê que esse mesmo deployment bate 80-90% todo fechamento de mês nesse horário há seis meses seguidos e sempre volta ao normal em menos de 15 minutos. Decisão: `info`. Uma mensagem no canal, sem menção, sem page.

**Cenário B** — terça-feira aleatória, 14h, TPM em 84% e subindo rápido nos últimos três minutos. O agent consulta o histórico, não encontra nenhum padrão parecido para esse dia da semana ou horário, e a curva não mostra sinal de estabilização. Decisão: `urgent`. Mesma tool, prioridade diferente, e desta vez alguém realmente recebe page.

A diferença entre os dois cenários não estava em nenhum threshold fixo — estava em comparar o presente com o histórico, que é exatamente o tipo de julgamento que um `if` simples não lida bem e que um agent lida razoavelmente bem, desde que as tools certas estejam disponíveis.

## Os guardrails extras que esta etapa exige

Dar autonomia de decisão, ainda que só sobre o nível do alerta, abre uma categoria nova de risco que o script puro não tinha: alert fatigue ao contrário. Um agent mal calibrado pode alertar demais (tudo vira `urgent` e o time aprende a ignorar) ou alertar de menos (um incidente real é classificado como `info` porque o histórico coincidiu por acaso). Três coisas resolvem a maior parte disso.

Primeiro, um rate limit no próprio alerta — no máximo N chamadas para `send_priority_alert` por hora, independentemente do que o agent decidir, para impedir que uma reavaliação a cada minuto vire uma enxurrada. Segundo, logar cada decisão junto com o raciocínio que o modelo devolveu, não só o resultado — é isso que permite, num retro depois de um incidente, responder "por que isso foi classificado como info" sem chute. Terceiro, revisão humana periódica das decisões classificadas como `info`: não para aprovar uma a uma em tempo real (isso destruiria o benefício da automação), mas para auditar em lote, semanalmente, se o padrão de classificação continua fazendo sentido.

Vale notar uma diferença em relação ao risco do post 1: lá, os dados que alimentavam o raciocínio do agent vinham de fora (logs, que podem ser adulterados). Aqui, a entrada são métricas numéricas do próprio Azure Monitor — a superfície de prompt injection é praticamente inexistente, porque não há texto arbitrário de terceiros entrando no contexto. Nem todo agent tem o mesmo perfil de risco, e vale mapear isso caso a caso em vez de aplicar o mesmo checklist para tudo.

## Próximo da série

1. ✅ MCP e agents — o 101
2. ✅ O watchdog 429 determinístico
3. ✅ Este post — dando autonomia de decisão com guardrails
4. Times de agents na prática: um orquestrador combinando o diagnóstico de AKS do post 1 com este watchdog, para correlacionar automaticamente "o consumo de tokens disparou" com "houve deploy recente no cluster"
5. Governança base para agents no Microsoft Foundry

O próximo passo natural é parar de tratar esses dois agents como projetos isolados e ver o que acontece quando um orquestrador enxerga os dois ao mesmo tempo — que é exatamente o ponto em que "time de agents" deixa de ser conceito de slide e vira uma ferramenta real de debugging.

---

*Este é o post 3 da série "MCP, Agentes e Times de Agentes para Engenheiros de Infraestrutura":*

1. [MCP e Agentes 101](/mcp-e-agentes-101-para-engenheiros-de-infra/)
2. [O Watchdog 429 Determinístico](/watchdog-429-deterministico-azure-openai/)
3. **[De Script a Agente](/watchdog-agente-autonomia-decisao-guardrails/)**
4. [Orquestração Multi-Agentes](/orquestracao-multi-agentes-aks-openai-correlacao/)
5. [Governança no Microsoft Foundry](/governanca-agentes-microsoft-foundry/)

*Repositório companion: [agentic-infra-handbook](https://github.com/ricmmartins/agentic-infra-handbook)*

*Read this post in [English](https://rmmartins.com/2026/07/14/agentic-watchdog-decision-autonomy-guardrails/).*
