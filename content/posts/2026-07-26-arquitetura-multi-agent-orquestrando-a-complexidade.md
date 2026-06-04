---
slug: "arquitetura-multi-agent-orquestrando-a-complexidade"
aliases:
  - "/posts/arquitetura-multi-agent-orquestrando-a-complexidade/"
title: "Arquitetura multi-agent: orquestrando a complexidade"
description: "Quando um agent não basta. Como múltiplos agents colaboram, se comunicam e dividem trabalho, explicado como quem já desenhou microservices."
date: 2026-07-26T10:00:00-04:00
categories:
  - AI
  - Arquitetura
tags:
  - ai-engineering
  - multi-agent
  - orquestracao
  - arquitetura
series:
  - "AI Engineering pra quem é de infra"
---

Um agent sozinho é como um microserviço monolítico. Resolve tudo, mas fica complexo demais. Quando a tarefa cresce, você precisa de especialização. Múltiplos agents, cada um expert no seu domínio, colaborando.

Se você já migrou de monolito pra microservices, o raciocínio é o mesmo. As perguntas são as mesmas. Como se comunicam? Quem coordena? O que acontece quando um falha? Qual o overhead de coordenação?

## O mapa pro profissional de infra

| Conceito Multi-Agent | O que faz | Equivalente em infra |
|---------------------|-----------|---------------------|
| **Orchestrator** | Coordena agents, delega tarefas | API Gateway, Workflow engine |
| **Worker agent** | Executa tarefas específicas | Microserviço |
| **Message passing** | Comunicação entre agents | Message queue (Service Bus) |
| **Shared state** | Dados compartilhados entre agents | Database, Redis |
| **Handoff** | Transferir contexto entre agents | Request forwarding |
| **Supervisor** | Monitora e intervém quando algo falha | Kubernetes controller, watchdog |
| **Consensus** | Múltiplos agents concordam numa decisão | Raft, quorum |

## Quando usar multi-agent

| Cenário | Single agent | Multi-agent |
|---------|-------------|-------------|
| Task de 3-5 steps num domínio | Ideal | Overkill |
| Task que cruza múltiplos domínios (DB + rede + app) | Fica confuso | Ideal |
| Task onde diferentes partes precisam de tools diferentes | Tools demais | Separação natural |
| Task onde precisas de "second opinion" | Possível (reflection) | Mais robusto |
| Task com trabalho paralelizável | Limitado | Escala melhor |

Regra prática: se você precisa de mais de 15 tools num único agent, provavelmente precisa de multi-agent.

## Topologias de multi-agent

### 1. Orchestrator-Workers (Hub and Spoke)

Um agent central coordena. Workers executam e reportam.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 780 274" style="width:100%;height:auto" role="img" aria-label="Topologia orchestrator-workers com um orquestrador e três agentes especialistas">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
    </marker>
  </defs>
  <g font-family="Segoe UI, Arial, sans-serif">
    <rect x="290" y="20" width="200" height="72" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
    <text x="390" y="52.5" text-anchor="middle" font-size="14" font-weight="bold" fill="#111111">Orchestrator</text>
    <text x="390" y="67.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">(coordena)</text>
    <path d="M 284 56 V 131.5 H 186 V 207" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
    <path d="M 390 98 V 131 H 390 V 164" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
    <path d="M 496 56 V 131.5 H 594 V 207" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
    <rect x="40" y="170" width="140" height="74" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
    <text x="110" y="203.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">DB Agent</text>
    <text x="110" y="218.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">5 tools</text>
    <rect x="320" y="170" width="140" height="74" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
    <text x="390" y="203.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Net Agent</text>
    <text x="390" y="218.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">5 tools</text>
    <rect x="600" y="170" width="140" height="74" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
    <text x="670" y="203.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">K8s Agent</text>
    <text x="670" y="218.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">5 tools</text>
  </g>
</svg>

```python
import json

class MultiAgentOrchestrator:
    def __init__(self):
        self.agents = {
            "database": Agent(
                system_prompt="Especialista em PostgreSQL, MySQL, Cosmos DB.",
                tools=DB_TOOLS,
            ),
            "network": Agent(
                system_prompt="Especialista em DNS, firewall, VPN, load balancers.",
                tools=NET_TOOLS,
            ),
            "kubernetes": Agent(
                system_prompt="Especialista em AKS, pods, deployments, networking K8s.",
                tools=K8S_TOOLS,
            ),
        }
    
    def run(self, task):
        # Orchestrator analisa e decompõe
        plan = self.plan(task)
        
        results = []
        for step in plan["steps"]:
            agent = self.agents[step["assigned_to"]]
            result = agent.execute(step["task"])
            results.append({
                "step": step,
                "result": result,
                "agent": step["assigned_to"],
            })
            
            # Orchestrator pode re-planejar baseado em resultados
            if self.needs_replanning(plan, results):
                plan = self.replan(task, plan, results)
        
        # Consolidar resultados de todos os agents
        return self.synthesize(task, results)
    
    def plan(self, task):
        response = client.chat.completions.create(
            model="gpt-4o",
            temperature=0,
            messages=[
                {"role": "system", "content": """
Você é o orquestrador. Decomponha a tarefa em steps e atribua cada step
ao agent mais adequado.

Agents disponíveis:
- database: problemas com bancos de dados
- network: problemas de rede e conectividade
- kubernetes: problemas com clusters K8s

Retorne JSON válido no formato:
{"steps": [{"task": "...", "assigned_to": "database|network|kubernetes", "depends_on": []}]}
"""},
                {"role": "user", "content": task},
            ],
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
```

**Prós**: controle centralizado, fácil de auditar, clara separação de responsabilidades.
**Contras**: orchestrator é single point of failure, overhead de coordenação.

### 2. Pipeline (Chain)

Agents em sequência. Output de um é input do próximo.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 165" style="width:100%;height:auto" role="img" aria-label="Pipeline de quatro estágios: collector, analyzer, planner e executor">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
    </marker>
  </defs>
  <g font-family="Segoe UI, Arial, sans-serif">
    <rect x="30" y="40" width="160" height="84" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
    <text x="110" y="78.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Collector</text>
    <text x="110" y="93.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">(gather)</text>
    <line x1="196" y1="82" x2="246" y2="82" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
    <rect x="240" y="40" width="160" height="84" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
    <text x="320" y="78.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Analyzer</text>
    <text x="320" y="93.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">(diagnose)</text>
    <line x1="406" y1="82" x2="456" y2="82" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
    <rect x="450" y="40" width="160" height="84" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
    <text x="530" y="78.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Planner</text>
    <text x="530" y="93.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">(decide)</text>
    <line x1="616" y1="82" x2="666" y2="82" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
    <rect x="660" y="40" width="160" height="84" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
    <text x="740" y="78.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Executor</text>
    <text x="740" y="93.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">(act)</text>
  </g>
</svg>

```python
def pipeline_agents(alert):
    # Stage 1: coletar informações
    context = collector_agent.run(
        f"Colete métricas, logs e status de: {alert['resource']}"
    )
    
    # Stage 2: analisar
    diagnosis = analyzer_agent.run(
        f"Analise e identifique causa raiz:\nDados: {context}"
    )
    
    # Stage 3: planejar remediação
    plan = planner_agent.run(
        f"Crie plano de remediação:\nDiagnóstico: {diagnosis}"
    )
    
    # Stage 4: executar (com approval se necessário)
    if plan["risk"] == "high":
        await_human_approval(plan)
    
    result = executor_agent.run(
        f"Execute o plano: {plan}"
    )
    
    return result
```

**Prós**: simples de entender e debugar, cada stage é testável isoladamente.
**Contras**: latência acumula (4 LLM calls em série), se stage 1 erra, propaga o erro.

### 3. Debate / Consensus

Múltiplos agents analisam o mesmo problema e chegam a um consenso. Reduz hallucination.

```python
import json

def debate_pattern(question, num_agents=3):
    """Múltiplos agents respondem, depois debatem até consenso."""
    
    # Round 1: respostas independentes
    responses = []
    for i in range(num_agents):
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": f"Você é o analista {i + 1}. Responda independentemente."},
                {"role": "user", "content": question},
            ],
            temperature=0.7,
        )
        responses.append(response.choices[0].message.content)
    
    # Round 2: cada agent vê as respostas dos outros e revisa
    revised = []
    for i, original in enumerate(responses):
        others = [reply for j, reply in enumerate(responses) if j != i]
        revision = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "Revise sua resposta considerando as análises dos colegas. "
                    "Se concordar, mantenha. Se discordar, argumente por quê.",
                },
                {
                    "role": "user",
                    "content": f"Sua resposta: {original}\nRespostas dos colegas: {json.dumps(others, ensure_ascii=False)}",
                },
            ],
        )
        revised.append(revision.choices[0].message.content)
    
    # Round 3: sintetizar consenso
    final = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "Sintetize o consenso dos analistas. Destaque onde concordam e onde divergem."},
            {"role": "user", "content": f"Análises finais:\n{json.dumps(revised, ensure_ascii=False)}"},
        ],
    )
    
    return final.choices[0].message.content
```

**Quando usar**: decisões de alto risco (vai deletar dados? vai escalar incidente?). O overhead de 3x o custo se justifica quando o erro custa mais.

### 4. Supervisory (com escalação)

Um supervisor monitora workers e intervém quando necessário.

```python
class SupervisoryArchitecture:
    def __init__(self):
        self.worker = WorkerAgent()
        self.supervisor = SupervisorAgent()
        self.max_interventions = 3
    
    def run(self, task):
        interventions = 0
        
        while interventions < self.max_interventions:
            # Worker tenta resolver
            result = self.worker.attempt(task)
            
            # Supervisor avalia
            assessment = self.supervisor.assess(task, result)
            
            if assessment["approved"]:
                return result
            elif assessment["action"] == "retry_with_guidance":
                # Supervisor dá orientação pro worker
                task = f"{task}\n\nGuidance: {assessment['guidance']}"
                interventions += 1
            elif assessment["action"] == "escalate":
                return self.escalate_to_human(task, result, assessment)
            elif assessment["action"] == "takeover":
                # Supervisor resolve ele mesmo
                return self.supervisor.solve(task)
        
        return self.escalate_to_human(task, result, "max_interventions_reached")
```

## Comunicação entre agents

### Message passing (structured)

```python
from dataclasses import dataclass
from datetime import datetime

@dataclass
class AgentMessage:
    sender: str
    receiver: str
    type: str  # "request", "response", "notification"
    content: dict
    correlation_id: str
    timestamp: datetime

# Exemplo de troca
msg1 = AgentMessage(
    sender="orchestrator",
    receiver="db_agent",
    type="request",
    content={"task": "Verificar replicação do PostgreSQL em db-prod-01"},
    correlation_id="task-2024-001",
    timestamp=datetime.now(),
)
```

### Shared blackboard

Todos os agents lêem e escrevem num "quadro" compartilhado.

```python
import asyncio
from datetime import datetime

class Blackboard:
    def __init__(self):
        self.facts = {}  # {"server_cpu": 87.5, "diagnosis": "memory_leak"}
        self.lock = asyncio.Lock()
    
    async def write(self, agent_id, key, value, confidence=1.0):
        async with self.lock:
            self.facts[key] = {
                "value": value,
                "written_by": agent_id,
                "confidence": confidence,
                "timestamp": datetime.now(),
            }
    
    async def read(self, key):
        async with self.lock:
            return self.facts.get(key)
    
    async def get_all_facts(self):
        async with self.lock:
            return dict(self.facts)
```

## Failure modes e como lidar

| Failure mode | Causa | Mitigação |
|-------------|-------|-----------|
| Infinite delegation | Orchestrator delega de volta pro mesmo agent | Limit de delegation depth |
| Contradictory outputs | Workers discordam | Consensus pattern ou supervisor tiebreaker |
| Context loss in handoff | Info se perde entre agents | Structured messages com contexto completo |
| Cascading failures | Worker falha, orchestrator falha ao lidar | Circuit breaker, timeout por agent |
| Cost explosion | Muitos agents × muitas iterações | Budget cap por task, early termination |

```python
from datetime import datetime, timedelta
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half-open"

class AgentCircuitBreaker:
    def __init__(self, failure_threshold=3, reset_timeout=60):
        self.failures = 0
        self.threshold = failure_threshold
        self.state = CircuitState.CLOSED
        self.opened_at = None
        self.reset_timeout = timedelta(seconds=reset_timeout)
    
    def call(self, agent, task):
        if self.state == CircuitState.OPEN:
            if self.opened_at and datetime.now() - self.opened_at >= self.reset_timeout:
                self.state = CircuitState.HALF_OPEN
            else:
                return {"error": "Agent circuit breaker open", "fallback": True}
        
        try:
            result = agent.run(task)
        except Exception:
            self.failures += 1
            self.opened_at = datetime.now()
            if self.state == CircuitState.HALF_OPEN or self.failures >= self.threshold:
                self.state = CircuitState.OPEN
            raise
        else:
            self.failures = 0
            self.opened_at = None
            self.state = CircuitState.CLOSED
            return result
```

## Custo e latência de multi-agent

| Topologia | Custo vs single agent | Latência vs single agent |
|-----------|----------------------|-------------------------|
| Orchestrator + 2 workers | 3-5x | 2-3x (sequencial) ou 1.5x (paralelo) |
| Pipeline 4 stages | 4-6x | 4x (tudo em série) |
| Debate 3 agents | 7-10x | 3x (rounds sequenciais) |
| Supervisor + worker | 2-3x | 1.5-2x |

Multi-agent é caro. Use quando a qualidade e confiabilidade justificam o overhead. Pra task simples de 3 steps, single agent com boas tools é melhor e mais barato.

## O que levar pra segunda-feira

- **Multi-agent = microservices pra AI.** Mesmos trade-offs: mais flexível, mais complexo, mais overhead de coordenação.
- **Orchestrator-Workers é o pattern mais comum** e mais fácil de implementar. Comece por aí.
- **Pipeline é ideal quando stages são claras** e o output de um é input do próximo.
- **Debate/Consensus justifica o custo** apenas pra decisões de alto impacto.
- **Failure modes são reais.** Circuit breakers, timeouts, budgets. Trate agents como serviços distribuídos.
- **Custo escala multiplicativamente.** 3 agents × 5 iterações cada = 15x o custo de uma chamada simples.

No próximo post, vamos falar de **MCP (Model Context Protocol)**: o protocolo que padroniza como agents se conectam a ferramentas e dados externos.

## Leitura complementar

- [Multi-Agent Architecture Explained](https://lnkd.in/dAM4u9Si) (Neo Kim, System Design Newsletter)
- [AutoGen: Enabling Next-Gen LLM Applications](https://microsoft.github.io/autogen/)
- [CrewAI: Framework for orchestrating role-playing AI agents](https://www.crewai.com/)
