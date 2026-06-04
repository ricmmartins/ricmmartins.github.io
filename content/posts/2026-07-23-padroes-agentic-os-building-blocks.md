---
slug: "padroes-agentic-os-building-blocks"
aliases:
  - "/posts/padroes-agentic-os-building-blocks/"
title: "Padrões agentic: os building blocks"
description: "Reflection, tool use, planning, multi-step reasoning. Os design patterns que compõem agents modernos, mapeados pra patterns de sistemas distribuídos que você já conhece."
date: 2026-07-23T10:00:00-04:00
categories:
  - AI
  - Arquitetura
tags:
  - ai-engineering
  - agents
  - design-patterns
  - arquitetura
series:
  - "AI Engineering pra quem é de infra"
---

Se agents são controllers (LLM + tools + loop), padrões agentic são os **design patterns** que esses controllers usam. Assim como em software tradicional você tem Observer, Strategy, Chain of Responsibility, em AI agents existem patterns recorrentes que resolvem problemas específicos.

Conhecer esses patterns poupa tempo. Em vez de inventar arquitetura pra cada caso, você combina blocos testados.

## O mapa pro profissional de infra

| Padrão Agentic | O que faz | Equivalente em infra |
|---------------|-----------|---------------------|
| **Reflection** | Agent revisa próprio output | Code review, lint automático |
| **Tool use** | Agent chama funções externas | Service mesh, API gateway |
| **Planning** | Agent decompõe tarefa em steps | CI/CD pipeline stages |
| **Multi-step reasoning** | Agent raciocina antes de agir | Runbook com decision tree |
| **Routing** | Direcionar pra agent especializado | Load balancer com content-based routing |
| **Parallelization** | Executar múltiplas ações em paralelo | Fan-out / fan-in |
| **Orchestrator-worker** | Central coordena workers | Controller + workers (Celery, K8s Jobs) |
| **Evaluator-optimizer** | Feedback loop pra melhorar output | Canary + metrics → rollback |

## Pattern 1: Reflection

O agent gera output, depois critica o próprio output e refina.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 150" width="100%" style="max-width:920px;height:auto" role="img" aria-labelledby="reflection-title reflection-desc">
  <title id="reflection-title">Pattern de reflection</title>
  <desc id="reflection-desc">Fluxo linear com Generate, Critic, Refine e Output.</desc>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
    </marker>
  </defs>
  <g font-family="Segoe UI, Arial, sans-serif">
    <g id="reflection-arrows" fill="none" stroke="#666666" stroke-width="2" marker-end="url(#arrow)">
      <line x1="200" y1="75" x2="248" y2="75" />
      <line x1="428" y1="75" x2="476" y2="75" />
      <line x1="656" y1="75" x2="704" y2="75" />
    </g>
    <g id="reflection-nodes">
      <rect x="20" y="40" width="180" height="70" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
      <rect x="248" y="40" width="180" height="70" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
      <rect x="476" y="40" width="180" height="70" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
      <rect x="704" y="40" width="180" height="70" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
      <text x="110" y="68" text-anchor="middle" font-size="12" font-weight="bold">Generate</text>
      <text x="110" y="87" text-anchor="middle" font-size="10" fill="#555">(draft)</text>
      <text x="338" y="68" text-anchor="middle" font-size="12" font-weight="bold">Critic</text>
      <text x="338" y="87" text-anchor="middle" font-size="10" fill="#555">(review)</text>
      <text x="566" y="68" text-anchor="middle" font-size="12" font-weight="bold">Refine</text>
      <text x="566" y="87" text-anchor="middle" font-size="10" fill="#555">(improve)</text>
      <text x="794" y="68" text-anchor="middle" font-size="12" font-weight="bold">Output</text>
      <text x="794" y="87" text-anchor="middle" font-size="10" fill="#555">(final)</text>
    </g>
  </g>
</svg>

### Implementação

```python
def reflection_pattern(task, max_reflections=2):
    # Step 1: gerar draft
    draft = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "Gere uma resposta completa."},
            {"role": "user", "content": task}
        ]
    ).choices[0].message.content
    
    # Step 2: criticar
    for i in range(max_reflections):
        critique = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": 
                 "Analise esta resposta criticamente. "
                 "Identifique erros factuais, gaps, e pontos que podem melhorar. "
                 "Se está boa, responda apenas 'APPROVED'."},
                {"role": "user", "content": f"Tarefa: {task}\n\nResposta:\n{draft}"}
            ]
        ).choices[0].message.content
        
        if "APPROVED" in critique:
            break
        
        # Step 3: refinar com base na crítica
        draft = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "Melhore a resposta com base no feedback."},
                {"role": "user", "content": f"Resposta original:\n{draft}\n\nFeedback:\n{critique}"}
            ]
        ).choices[0].message.content
    
    return draft
```

**Quando usar**: code generation, respostas longas, análise técnica. Sempre que o custo de um erro é alto o suficiente pra justificar 2-3x mais tokens.

**Cuidado**: reflection pode entrar em loop. O critic pode ser mais exigente que necessário e nunca aprovar. Limite as iterações.

## Pattern 2: Tool use (já cobrimos em posts anteriores)

Agent decide quais tools chamar e em que ordem. É o pattern mais fundamental e já exploramos em detalhes nos posts 8 e 9.

Resumo rápido do que importa:

- Cada tool é uma função com input/output definidos
- O LLM decide quando e qual tool chamar
- Resultado da tool volta pro LLM como observação
- Loop até tarefa completa ou limite atingido

## Pattern 3: Planning

Agent cria um plano antes de executar. Diferente de ReAct (decide step by step), planning cria overview primeiro.

```python
def planning_pattern(task, tools):
    # Step 1: criar plano
    plan = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"""
Crie um plano pra resolver a tarefa. Formato:
1. [AÇÃO] descrição - usando tool X
2. [AÇÃO] descrição - usando tool Y
3. [VERIFICAÇÃO] confirmar resultado
4. [RESPOSTA] consolidar e responder

Tools disponíveis: {[t['function']['name'] for t in tools]}
"""},
            {"role": "user", "content": task}
        ]
    ).choices[0].message.content
    
    # Step 2: executar cada step do plano
    results = []
    for step in parse_plan_steps(plan):
        if step["type"] == "AÇÃO":
            result = execute_tool(step["tool"], step["args"])
            results.append(result)
            
            # Replanejar se step falhou
            if not result.get("success", True):
                plan = replan(task, plan, step, result)
        
        elif step["type"] == "VERIFICAÇÃO":
            if not verify(step["condition"], results):
                # Voltar e tentar abordagem diferente
                plan = replan(task, plan, step, "verification_failed")
    
    # Step 3: consolidar
    return summarize(task, plan, results)
```

**Vantagem sobre ReAct**: mais previsível, mais fácil de auditar ("veja, ele planejou 4 steps antes de executar").

**Desvantagem**: plano pode ficar outdated se step 2 muda o contexto de forma inesperada. Precisa de re-planning.

## Pattern 4: Routing

Nem toda tarefa vai pro mesmo agent/modelo. Routing classifica a tarefa e direciona pro handler certo.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 280" width="100%" style="max-width:760px;height:auto" role="img" aria-labelledby="routing-title routing-desc">
  <title id="routing-title">Pattern de routing</title>
  <desc id="routing-desc">Router Agent classifica a tarefa e direciona para Agent DB, Agent Net ou Agent K8s.</desc>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
    </marker>
  </defs>
  <g font-family="Segoe UI, Arial, sans-serif">
    <g id="routing-core">
      <rect x="255" y="30" width="250" height="74" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
      <text x="380" y="60" text-anchor="middle" font-size="12" font-weight="bold">Router Agent</text>
      <text x="380" y="80" text-anchor="middle" font-size="10" fill="#555">(classifica)</text>
    </g>
    <g id="routing-arrows" fill="none" stroke="#666666" stroke-width="2" marker-end="url(#arrow)">
      <path d="M 380 104 L 380 140 L 135 140 L 135 174" />
      <path d="M 380 104 L 380 174" />
      <path d="M 380 104 L 380 140 L 625 140 L 625 174" />
    </g>
    <g id="routing-targets">
      <rect x="40" y="174" width="190" height="72" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
      <rect x="285" y="174" width="190" height="72" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
      <rect x="530" y="174" width="190" height="72" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
      <text x="135" y="203" text-anchor="middle" font-size="12" font-weight="bold">Agent DB</text>
      <text x="135" y="222" text-anchor="middle" font-size="10" fill="#555">(database)</text>
      <text x="380" y="203" text-anchor="middle" font-size="12" font-weight="bold">Agent Net</text>
      <text x="380" y="222" text-anchor="middle" font-size="10" fill="#555">(network)</text>
      <text x="625" y="203" text-anchor="middle" font-size="12" font-weight="bold">Agent K8s</text>
      <text x="625" y="222" text-anchor="middle" font-size="10" fill="#555">(cluster)</text>
    </g>
  </g>
</svg>

```python
def routing_pattern(task):
    # Classificar com modelo leve (barato e rápido)
    classification = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": """
Classifique a tarefa em uma categoria:
- database: problemas com SQL, replicação, backup, performance de queries
- network: conectividade, DNS, firewall, VPN, load balancer
- kubernetes: pods, deployments, services, ingress, node issues
- general: outros

Responda APENAS com a categoria."""},
            {"role": "user", "content": task}
        ]
    ).choices[0].message.content.strip().lower()
    
    # Rotear pra agent especializado
    agents = {
        "database": DatabaseAgent(tools=DB_TOOLS),
        "network": NetworkAgent(tools=NET_TOOLS),
        "kubernetes": K8sAgent(tools=K8S_TOOLS),
        "general": GeneralAgent(tools=ALL_TOOLS),
    }
    
    agent = agents.get(classification, agents["general"])
    return agent.run(task)
```

**Quando usar**: quando você tem domínios distintos com tools diferentes. Reduz confusão do modelo (menos tools por agent = melhor accuracy de seleção).

## Pattern 5: Parallelization

Executar múltiplas ações independentes ao mesmo tempo. Fan-out e fan-in.

```python
import asyncio
import json

async def parallelization_pattern(task, servers):
    """Verificar múltiplos servidores em paralelo."""
    
    # Fan-out: lançar verificações em paralelo
    tasks = [check_server(server) for server in servers]
    raw_results = await asyncio.gather(*tasks, return_exceptions=True)
    
    results = []
    for server, result in zip(servers, raw_results):
        if isinstance(result, Exception):
            results.append({
                "server": server,
                "success": False,
                "error": str(result),
            })
        else:
            results.append(result)
    
    # Fan-in: consolidar resultados
    summary = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "Analise os resultados e identifique problemas."},
            {"role": "user", "content": f"Resultados de {len(servers)} servidores:\n{json.dumps(results, indent=2, default=str)}"},
        ],
    ).choices[0].message.content
    
    return summary
```

**Quando usar**: tasks onde múltiplas verificações são independentes. Verificar N servidores, buscar em múltiplas fontes, validar múltiplas condições.

**Cuidado**: rate limits. Se cada check chama Azure OpenAI, você pode bater no TPM limit com fan-out agressivo.

## Pattern 6: Evaluator-optimizer loop

O output é avaliado e, se não atender critérios, volta pro agent melhorar. Diferente de Reflection (auto-crítica), aqui o evaluator pode ser um sistema separado.

```python
def evaluator_optimizer(task, quality_threshold=0.8):
    for attempt in range(3):
        # Gerar
        output = agent.run(task)
        
        # Avaliar (pode ser outro modelo, regras, ou humano)
        score = evaluate(output, criteria={
            "correctness": "informação factual correta?",
            "completeness": "respondeu tudo que foi perguntado?",
            "actionable": "inclui steps concretos?"
        })
        
        if score >= quality_threshold:
            return output
        
        # Otimizar: dar feedback pro agent e tentar de novo
        feedback = generate_feedback(output, score)
        task = f"{task}\n\nFeedback da tentativa anterior: {feedback}"
    
    # Se não atingiu qualidade em 3 tentativas, entrega o melhor
    return output
```

## Pattern 7: Orchestrator-worker

Um agent central (orchestrator) coordena múltiplos workers especializados. O orchestrator não executa, ele delega e consolida.

```python
class Orchestrator:
    def __init__(self):
        self.workers = {
            "researcher": ResearchWorker(),
            "executor": ExecutorWorker(),
            "validator": ValidatorWorker(),
        }
    
    def run(self, task):
        # Orquestrador decompõe a tarefa
        plan = self.decompose(task)
        
        results = {}
        for step in plan:
            worker = self.workers[step["worker"]]
            result = worker.execute(step["sub_task"])
            results[step["id"]] = result
            
            # Orquestrador decide próximo passo baseado no resultado
            if not result["success"]:
                # Pode re-assignar, escalar, ou adaptar
                recovery = self.decide_recovery(step, result)
                if recovery == "retry_different_worker":
                    result = self.workers["executor"].execute(step["sub_task"])
                elif recovery == "escalate":
                    return self.escalate(task, results)
        
        return self.consolidate(results)
```

## Combinando patterns

Na prática, agents sofisticados combinam múltiplos patterns:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 360" width="100%" style="max-width:900px;height:auto" role="img" aria-labelledby="combined-patterns-title combined-patterns-desc">
  <title id="combined-patterns-title">Combinação de patterns agentic</title>
  <desc id="combined-patterns-desc">Fluxo em cascata com Routing, Planning, Tool use, Reflection e Evaluator.</desc>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
    </marker>
  </defs>
  <g font-family="Segoe UI, Arial, sans-serif">
    <g id="combined-arrows" fill="none" stroke="#666666" stroke-width="2" marker-end="url(#arrow)">
      <path d="M 170 70 L 220 70 L 220 122 L 290 122" />
      <path d="M 430 122 L 480 122 L 480 174 L 550 174" />
      <path d="M 690 174 L 710 174 L 710 226" />
      <path d="M 810 258 L 810 278" />
    </g>
    <g id="combined-steps">
      <rect x="30" y="38" width="140" height="64" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
      <rect x="290" y="90" width="140" height="64" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
      <rect x="550" y="142" width="140" height="64" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
      <rect x="710" y="194" width="160" height="64" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
      <rect x="710" y="278" width="160" height="64" rx="6" fill="#f8cecc" stroke="#b85450" stroke-width="2" />
      <text x="100" y="64" text-anchor="middle" font-size="12" font-weight="bold">Routing</text>
      <text x="100" y="83" text-anchor="middle" font-size="10" fill="#555">seleciona agent</text>
      <text x="100" y="96" text-anchor="middle" font-size="10" fill="#555">especializado</text>
      <text x="360" y="116" text-anchor="middle" font-size="12" font-weight="bold">Planning</text>
      <text x="360" y="135" text-anchor="middle" font-size="10" fill="#555">cria plano</text>
      <text x="620" y="168" text-anchor="middle" font-size="12" font-weight="bold">Tool use</text>
      <text x="620" y="187" text-anchor="middle" font-size="10" fill="#555">executa cada step</text>
      <text x="790" y="220" text-anchor="middle" font-size="12" font-weight="bold">Reflection</text>
      <text x="790" y="239" text-anchor="middle" font-size="10" fill="#555">valida output</text>
      <text x="790" y="252" text-anchor="middle" font-size="10" fill="#555">de cada step</text>
      <text x="790" y="304" text-anchor="middle" font-size="12" font-weight="bold">Evaluator</text>
      <text x="790" y="323" text-anchor="middle" font-size="10" fill="#555">verifica qualidade</text>
      <text x="790" y="336" text-anchor="middle" font-size="10" fill="#555">final</text>
    </g>
  </g>
</svg>

Mas começa simples. Um agent com Tool Use + Planning já resolve 80% dos cases. Adicione Reflection quando erros forem caros. Adicione Routing quando tiver domínios distintos.

## Custo comparativo dos patterns

| Pattern | Overhead de tokens | Quando vale o custo |
|---------|-------------------|---------------------|
| Tool use (básico) | 1x (baseline) | Sempre |
| Reflection (1 iter) | 2-3x | Outputs que precisam de accuracy alta |
| Planning | 1.5x | Tasks com 4+ steps |
| Routing | +200-500 tokens | Múltiplos domínios, 10+ tools total |
| Parallelization | N × custo_individual | Tasks independentes, latência importa |
| Evaluator-optimizer | 2-4x | Outputs que vão pro cliente/produção |
| Orchestrator-worker | 3-5x | Tasks complexas, multi-domínio |

## O que levar pra segunda-feira

- **Patterns são building blocks.** Não precisa inventar arquitetura from scratch. Combine patterns testados.
- **Comece com Tool Use + Planning.** Adicione complexidade só quando precisar.
- **Reflection é o melhor custo-benefício** pra melhorar qualidade sem mudar infra.
- **Routing reduz complexidade** dando menos tools pra cada agent especializado.
- **Parallelization é obvious win** quando tem N tasks independentes. Mas respeite rate limits.
- **Cada pattern multiplicar o custo.** Reflection triplica tokens. Orchestrator quintuplica. Faça as contas.

No próximo post, vamos escalar: **arquitetura multi-agent**, onde múltiplos agents colaboram em sistemas complexos.

## Leitura complementar

- [Agentic Patterns Explained](https://lnkd.in/dfsAsc7c) (Neo Kim, System Design Newsletter)
- [Building effective agents (Anthropic)](https://docs.anthropic.com/en/docs/build-with-claude/agent-patterns)
- [Andrew Ng on Agentic Design Patterns](https://www.deeplearning.ai/the-batch/how-agents-can-improve-llm-performance/)
