---
slug: "orquestracao-multi-agentes-aks-openai-correlacao"
translationKey: "2026/07/21/multi-agent-orchestration-aks-openai-correlation"
title: "Orquestração Multi-Agentes: Correlacionando AKS e Azure OpenAI"
description: "Um orquestrador que combina o agente de diagnóstico AKS com o watchdog de tokens para responder 'alguém fez deploy?' automaticamente."
date: 2026-07-21T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - multi-agentes
  - aks
  - azure-openai
  - mcp
  - orquestracao
  - correlacao
series:
  - "MCP Agentes e Infraestrutura"
---

Até aqui, a série construiu duas coisas separadas: no post 1, um agent que fala com AKS via `aks-mcp` para diagnosticar o cluster; nos posts 2 e 3, um watchdog que observa o consumo de TPM no Azure OpenAI e decide o quão urgente um alerta deve ser. Os dois funcionam isoladamente, e isolados já entregam valor. Mas, separados, eles também deixam sem resposta a pergunta mais óbvia de todas: quando o consumo de tokens dispara do nada, a primeira coisa que qualquer SRE pergunta é "alguém fez deploy?". Hoje essa resposta ainda é manual, alguém olhando o alerta do watchdog em uma aba e o dashboard do AKS em outra.

Este post é sobre fechar esse último passo manual com um orquestrador.

O padrão aqui é supervisor-worker, ou, se você preferir o nome mais acadêmico, uma arquitetura hierárquica. Não é swarm: os sub-agents não ficam negociando entre si nem descobrindo trabalho dinamicamente. Existe um coordenador claro, com especialistas abaixo dele.

## O trigger muda

No post 3, quando o watchdog classificava um evento como `urgent`, a tool `send_priority_alert` ia direto para o Slack. Agora esse destino muda: em vez de notificar uma pessoa imediatamente, uma classificação `urgent` passa a acionar o orquestrador, e só então ele decide o que um humano deve ver, e quando.

```
 watchdog (post 3)
       │ classification = urgent
       ▼
 ┌─────────────────────────────┐
 │         ORCHESTRATOR          │
 └──────┬────────────────┬──────┘
        │                │
        ▼                ▼
 watchdog sub-agent    AKS sub-agent
 (token telemetry,     (aks-mcp: detectors,
  posts 2/3)             monitor, kubectl)
        │                │
        └───────┬────────┘
                ▼
       send_priority_alert
       (consolidated message,
        with cause hypothesis)
```

Cada sub-agent mantém exatamente o escopo que já tinha: o watchdog não ganhou acesso ao cluster, o agent de AKS não ganhou acesso à quota. O orquestrador é a única peça nova, e ele só tem acesso de leitura aos dois lados, além da mesma tool de notificação de sempre. Nenhuma nova capability de ação foi criada ao combiná-los; apenas a capacidade de correlacionar o que cada um já sabia isoladamente.

## Correlação na prática

Quando o orquestrador é disparado, ele pega o timestamp do início do spike de TPM (que o watchdog já calcula) e usa isso como âncora para perguntar ao sub-agent de AKS: "o que aconteceu no cluster nessa janela?" O sub-agent, com os componentes `kubectl` e `monitor` do `aks-mcp` já configurados como `readonly` desde o post 1, consulta eventos recentes e histórico de rollout.

```python
@mcp.tool()
def correlate_incident(token_spike_start: str, window_minutes: int = 15) -> dict:
    """Takes the start time of a token consumption spike and looks up
    cluster events (deploys, scaling, restarts) within the same time
    window. Returns candidate causes with their respective confidence
    level, never a single cause stated as certain."""
    cluster_events = aks_agent.get_recent_events(token_spike_start, window_minutes)
    return rank_candidates(cluster_events)
```

O resultado, em vez de dois alertas soltos chegando em canais diferentes, vira uma mensagem única: "TPM em 91% e subindo. Causa candidata: deploy do serviço `recommendation-api` às 14h01, que escalou de 3 para 12 réplicas via HPA. Cada réplica nova faz uma warmup call para o GPT-4o ao subir, o que coincide com o início do spike." Isso já não é mais "duas métricas cruzaram um threshold". É uma hipótese verificável, com evidência anexada.

## O novo risco que a correlação introduz

Este post adiciona uma dimensão nova de risco, porque ela existe: um modelo correlacionando eventos por proximidade temporal pode produzir uma narrativa plausível e errada. Dois eventos próximos no tempo não são necessariamente causa e efeito. Pode ser coincidência. Pode ser um terceiro fator que afetou ambos. É o clássico "correlação não prova causalidade", só que agora dito por um agent com o tom confiante de quem parece saber exatamente do que está falando.

A mitigação não é tentar deixar o modelo "mais certo". É nunca permitir que a saída dele vire uma afirmação categórica. A tool `correlate_incident` foi desenhada deliberadamente para devolver candidatos com nível de confiança, não uma causa única, e a mensagem final no Slack precisa preservar isso: "causa candidata", não "a causa foi". A pessoa que recebe o alerta continua responsável por decidir se a hipótese faz sentido; o agent economizou o trabalho de juntar os dados, não o julgamento final.

## O que continua igual (e por que isso importa)

Um inventário rápido do que não mudou, porque é fácil, ao introduzir um orquestrador, relaxar guardrails por conveniência: nenhum dos três agents, watchdog, sub-agent de AKS e orquestrador, ganhou tools para agir em produção. O orquestrador não consegue fazer rollback do deploy que ele mesmo sinalizou como causa candidata, não consegue aumentar quota, não consegue reiniciar nada. Ele lê dois sistemas já existentes em modo read-only e escreve em uma única tool de notificação, também já existente. A composição não abriu um novo caminho de escrita em produção. O risco novo aqui é interpretação errada, não poder extra de mutação.

Sobre a própria orquestração: para este caso, não há necessidade alguma de um protocolo agent-to-agent como A2A, que eu mencionei brevemente no post 1. Os dois sub-agents pertencem ao mesmo time, ao mesmo sistema, e o orquestrador simplesmente chama cada um como chamaria uma função. Não existe negociação entre partes independentes aqui. A2A faz sentido quando os agents pertencem a domínios administrativos diferentes; dentro do seu time de SRE, um orquestrador chamando sub-agents já resolve sem introduzir complexidade extra.

## Custo e latência: os trade-offs que ninguém pergunta até a conta chegar

O desenho em camadas dos posts anteriores importa aqui: o cron de um minuto continua barato e sem LLM. O watchdog com raciocínio só roda quando o threshold é cruzado. E agora o orquestrador só roda depois que o watchdog já classificou algo como `urgent`; ou seja, a chamada mais cara da cadeia inteira, duas consultas a sub-agents mais uma correlação, só acontece no evento mais raro de todos. Cada camada filtra antes de entregar para a próxima, mais cara. É o mesmo princípio por trás de qualquer pipeline de alerting bem desenhado, com a diferença de que aqui cada camada também acrescenta um pouco mais de contexto à decisão.

Latência adiciona alguns segundos extras antes de o alerta final sair, em comparação com um ping genérico instantâneo no Slack. Para um incidente real, trocar alguns segundos por uma hipótese de causa pronta costuma ser um bom trade-off; mas continua sendo um trade-off, e vale medir isso em vez de assumir.

## Próximo da série

1. ✅ MCP e agents: o 101
2. ✅ O watchdog 429 determinístico
3. ✅ Dando autonomia de decisão com guardrails
4. ✅ Este post: um orquestrador correlacionando AKS e consumo de tokens
5. Governança base para agents no Microsoft Foundry

Com quatro agents diferentes rodando (watchdog, sub-agent de AKS, orquestrador e o agent do post 1 que continua podendo ser chamado sozinho), a pergunta que sobra deixa de ser técnica e vira governança: quem sabe que esses agents existem, quem decide quais tools cada um recebe, e como você audita isso seis meses depois, quando ninguém mais lembra por que o orquestrador foi configurado daquele jeito. Esse é exatamente o assunto do próximo post.

---

*Este é o post 4 da série "MCP, Agentes e Times de Agentes para Engenheiros de Infraestrutura":*

1. [MCP e Agentes 101](/mcp-e-agentes-101-para-engenheiros-de-infra/)
2. [O Watchdog 429 Determinístico](/watchdog-429-deterministico-azure-openai/)
3. [De Script a Agente](/watchdog-agente-autonomia-decisao-guardrails/)
4. **[Orquestração Multi-Agentes](/orquestracao-multi-agentes-aks-openai-correlacao/)**
5. [Governança no Microsoft Foundry](/governanca-agentes-microsoft-foundry/)

*Repositório companion: [agentic-infra-handbook](https://github.com/ricmmartins/agentic-infra-handbook)*

*Read this post in [English](https://rmmartins.com/2026/07/21/multi-agent-orchestration-aks-openai-correlation/).*
