---
slug: "como-projetar-um-ai-agent-do-zero"
aliases:
  - "/posts/como-projetar-um-ai-agent-do-zero/"
title: "Como projetar um AI agent do zero"
description: "Do requirement ao deploy. Escolhendo modelo, desenhando tools, definindo planning strategy e testando reliability. O guia de design pra quem já projetou sistemas."
date: 2026-07-17T10:00:00-04:00
categories:
  - AI
  - Arquitetura
tags:
  - ai-engineering
  - agents
  - design
  - arquitetura
series:
  - "AI por dentro: de tokens a agents"
---

No post anterior, eu destrinchei como agents funcionam: LLM, tools e loop. Agora a conversa muda de nível. O problema não é fazer um demo de 5 minutos. É projetar um agent que aguente produção, rode 24/7 e não precise de babá.

Continua sendo design de sistema, com as perguntas de sempre: quais são os requisitos, quais os failure modes, como escala e como monitora?

## As 5 decisões de design

Projetar um agent normalmente vira 5 decisões:

1. **Qual tarefa** o agent resolve?
2. **Quais tools** ele precisa?
3. **Qual modelo** usar?
4. **Qual estratégia de planning?**
5. **Como garantir reliability?**

Dá pra quebrar assim.

## Decisão 1: Escopo da tarefa

O erro mais comum é escopo amplo demais. "Um agent que resolve qualquer problema de infra" não funciona. Agents funcionam melhor quando têm escopo claro e ferramentas específicas.

### Bom escopo vs ruim

| Escopo ruim (amplo demais) | Escopo bom (focado) |
|---------------------------|---------------------|
| "Agent de operações genérico" | "Agent que diagnostica e remedia alertas de CPU alta" |
| "Agent que gerencia toda a infra" | "Agent que faz scaling de AKS node pools baseado em métricas" |
| "Assistente que responde tudo" | "Agent que classifica e roteia tickets de L1" |

### Framework pra definir escopo

```
1. Qual trigger inicia o agent? (alerta, request humano, schedule)
2. Quais inputs ele recebe? (métricas, logs, ticket text)
3. Quais ações ele pode tomar? (lista finita de tools)
4. Qual o resultado esperado? (ação executada, relatório, escalação)
5. Quando ele deve parar e pedir ajuda humana? (critérios claros)
```

Exemplo pra um "Agent de Triagem de Alertas":

```
Trigger: alerta do Azure Monitor
Inputs: nome do recurso, métrica, threshold, valor atual
Ações: verificar métricas, consultar runbook, executar remediação, escalar
Resultado: alerta remediado OU escalado com contexto
Para e pede ajuda: quando remediação falha 2x, quando envolve dados de cliente
```

## Decisão 2: Design de tools

Tools são a interface entre o agent e o mundo. Tool design ruim = agent ruim, independente do modelo.

### Princípios de design

**Granularidade certa**: nem genérica demais, nem específica demais.

```python
# Muito genérica (LLM vai se confundir):
{"name": "run_command", "description": "Executa qualquer comando no servidor"}

# Muito específica (precisa de milhares de tools):
{"name": "get_cpu_usage_web_prod_01", "description": "..."}

# Ideal (ação clara com parâmetros):
{"name": "get_server_metrics", 
 "description": "Retorna CPU, memória e disco de um servidor",
 "parameters": {"hostname": "string"}}
```

**Idempotência**: tools que podem ser chamadas múltiplas vezes sem efeitos colaterais indesejados.

```python
# Perigosa: tool que cria recurso sem checar se já existe
def create_alert_rule(name, metric, threshold):
    # Pode duplicar se agent chamar 2x
    az_monitor.create_rule(name, metric, threshold)

# Segura: idempotente
def ensure_alert_rule(name, metric, threshold):
    existing = az_monitor.get_rule(name)
    if existing:
        if existing.threshold != threshold:
            az_monitor.update_rule(name, metric, threshold)
        return {"status": "already_exists", "updated": existing.threshold != threshold}
    else:
        az_monitor.create_rule(name, metric, threshold)
        return {"status": "created"}
```

**Retornos informativos**: o agent precisa do resultado pra decidir o próximo passo.

```python
# Retorno ruim (agent não sabe o que aconteceu):
def restart_service(service_name):
    os.system(f"systemctl restart {service_name}")
    return "done"

# Retorno bom (agent tem contexto pra próxima decisão):
def restart_service(service_name):
    result = subprocess.run(
        ["systemctl", "restart", service_name],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        # Verificar se realmente subiu
        status = subprocess.run(
            ["systemctl", "is-active", service_name],
            capture_output=True, text=True
        )
        return {
            "action": "restart",
            "service": service_name,
            "success": status.stdout.strip() == "active",
            "current_status": status.stdout.strip()
        }
    else:
        return {
            "action": "restart",
            "service": service_name,
            "success": False,
            "error": result.stderr
        }
```

### Quantas tools é demais?

| Número de tools | Comportamento típico |
|----------------|---------------------|
| 1-5 | Modelo costuma escolher bem |
| 6-15 | Ainda funciona bem com descriptions claras |
| 16-30 | Tools parecidas começam a colidir |
| 30+ | Vale separar por domínio ou fazer routing antes |

Se precisa de 30+ tools, considere **tool routing**: um primeiro passo que classifica a tarefa e seleciona um subset de tools relevantes.

## Decisão 3: Escolha do modelo

| Critério | Modelo maior (GPT-4o, Claude 3.5) | Modelo menor (GPT-4o-mini, Haiku) |
|----------|-----------------------------------|-----------------------------------|
| Tool selection | Mais margem em tarefas ambíguas | Boa quando a task é simples e o catálogo é pequeno |
| Raciocínio complexo | Melhor | Adequado pra tasks simples |
| Custo por iteração | Mais caro | Mais barato |
| Latência por iteração | Mais alta | Mais baixa |
| Quando usar | Tasks complexas, multi-step | Classificação, routing, tasks simples |

### Pattern: cascata de modelos

```python
def agent_with_cascade(task):
    """Usa modelo menor pra classificar, maior pra executar."""
    
    # Step 1: classificar complexidade (modelo barato)
    complexity = classify_task(task, model="gpt-4o-mini")
    
    if complexity == "simple":
        # Task simples: modelo menor resolve
        return run_agent(task, model="gpt-4o-mini", max_iterations=3)
    else:
        # Task complexa: modelo maior
        return run_agent(task, model="gpt-4o", max_iterations=10)
```

## Decisão 4: Estratégia de planning

Como o agent decompõe tarefas complexas em steps?

### No planning (ReAct puro)

O agent decide um step por vez. Simples, mas pode se perder em tarefas longas.

```
Agent: "Hmm, preciso verificar o servidor" → chama tool
Agent: "Ok, CPU alta. Preciso ver os processos" → chama tool
Agent: "Encontrei o processo. Vou reiniciar" → chama tool
```

Bom pra: tasks de 1-3 steps. Diagnosis simples.

### Plan-then-execute

O agent primeiro cria um plano, depois executa step by step.

```python
def agent_with_planning(task):
    # Step 1: criar plano
    plan = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": 
             "Crie um plano numerado para completar a tarefa. "
             "Cada step deve ser uma ação concreta. Max 5 steps."},
            {"role": "user", "content": task}
        ]
    )
    
    # Step 2: executar cada step do plano
    for step in parse_plan(plan):
        result = execute_step(step)
        if not result["success"]:
            # Replanejar se step falhou
            return replan(task, plan, step, result)
    
    return summarize_results()
```

Bom pra: tasks de 4-8 steps. Tasks previsíveis.

### Hierarchical planning

Decomposição recursiva: tarefa grande → subtarefas → sub-subtarefas.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 430" width="100%" style="max-width:940px;height:auto" role="img" aria-labelledby="hierarchical-planning-title hierarchical-planning-desc">
<title id="hierarchical-planning-title">Planejamento hierárquico de migração</title>
<desc id="hierarchical-planning-desc">Tarefa principal de migração de banco dividida em três subtarefas, cada uma com três passos.</desc>
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<g id="root-task">
<rect x="270" y="20" width="400" height="60" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="470" y="46.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Tarefa</text>
<text x="470" y="61.5" text-anchor="middle" font-size="10" fill="#555">Migrar o banco de dados pra nova região</text>
</g>
<g id="subtasks">
<g>
<rect x="40" y="120" width="240" height="60" rx="8" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<text x="160" y="146.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">Subtarefa 1</text>
<text x="160" y="161.5" text-anchor="middle" font-size="10" fill="#555">Verificar pré-requisitos</text>
</g>
<g>
<rect x="350" y="120" width="240" height="60" rx="8" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<text x="470" y="146.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">Subtarefa 2</text>
<text x="470" y="161.5" text-anchor="middle" font-size="10" fill="#555">Executar migração</text>
</g>
<g>
<rect x="660" y="120" width="240" height="60" rx="8" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<text x="780" y="146.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Subtarefa 3</text>
<text x="780" y="161.5" text-anchor="middle" font-size="10" fill="#555">Validar</text>
</g>
</g>
<g id="task-arrows" fill="none" stroke="#666666" stroke-width="2" marker-end="url(#arrow)">
<line x1="371.3" y1="81.8" x2="247.3" y2="121.8" />
<line x1="470" y1="86" x2="470" y2="126" />
<line x1="568.7" y1="81.8" x2="692.7" y2="121.8" />
<line x1="160" y1="186" x2="160" y2="226" />
<line x1="479.7" y1="185.8" x2="490.6" y2="225.8" />
<line x1="780" y1="186" x2="780" y2="226" />
</g>
<g id="subtask-1-steps">
<rect x="60" y="220" width="200" height="44" rx="6" fill="#f5f5f5" stroke="#666666" />
<rect x="60" y="304" width="230" height="44" rx="6" fill="#f5f5f5" stroke="#666666" />
<rect x="60" y="332" width="270" height="44" rx="6" fill="#f5f5f5" stroke="#666666" />
<text x="160" y="246" text-anchor="middle" font-size="12" font-weight="bold" fill="#333333">Checar replicação</text>
<text x="175" y="330" text-anchor="middle" font-size="12" font-weight="bold" fill="#333333">Verificar espaço em disco</text>
<text x="195" y="358" text-anchor="middle" font-size="12" font-weight="bold" fill="#333333">Confirmar janela de manutenção</text>
</g>
<g id="subtask-2-steps">
<rect x="370" y="220" width="250" height="44" rx="6" fill="#f5f5f5" stroke="#666666" />
<rect x="370" y="304" width="200" height="44" rx="6" fill="#f5f5f5" stroke="#666666" />
<rect x="370" y="332" width="200" height="44" rx="6" fill="#f5f5f5" stroke="#666666" />
<text x="495" y="246" text-anchor="middle" font-size="12" font-weight="bold" fill="#333333">Criar réplica na nova região</text>
<text x="470" y="330" text-anchor="middle" font-size="12" font-weight="bold" fill="#333333">Aguardar sync</text>
<text x="470" y="358" text-anchor="middle" font-size="12" font-weight="bold" fill="#333333">Fazer cutover</text>
</g>
<g id="subtask-3-steps">
<rect x="680" y="220" width="200" height="44" rx="6" fill="#f5f5f5" stroke="#666666" />
<rect x="680" y="304" width="200" height="44" rx="6" fill="#f5f5f5" stroke="#666666" />
<rect x="680" y="332" width="200" height="44" rx="6" fill="#f5f5f5" stroke="#666666" />
<text x="780" y="246" text-anchor="middle" font-size="12" font-weight="bold" fill="#333333">Testar conectividade</text>
<text x="780" y="330" text-anchor="middle" font-size="12" font-weight="bold" fill="#333333">Verificar integridade</text>
<text x="780" y="358" text-anchor="middle" font-size="12" font-weight="bold" fill="#333333">Atualizar DNS</text>
</g>
</g>
</svg>

Bom pra: tasks complexas de 10+ steps. Requer agent mais sofisticado.

## Decisão 5: Reliability

Agents falham. LLMs alucinam, tools retornam erros, tasks levam mais steps que o esperado. Design pra falha.

### Retry com backoff

```python
import time

def execute_tool_with_retry(tool_name, args, max_retries=3):
    for attempt in range(max_retries):
        try:
            result = execute_tool(tool_name, args)
            if result.get("error"):
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # exponential backoff
                    continue
            return result
        except Exception as e:
            if attempt == max_retries - 1:
                return {"error": str(e), "failed_after": max_retries}
            time.sleep(2 ** attempt)
```

### Fallback humano

```python
def run_agent_with_fallback(task, confidence_threshold=0.7):
    result = run_agent(task)
    
    # Se o agent não está confiante, escala pra humano
    confidence = evaluate_confidence(result)
    if confidence < confidence_threshold:
        notify_human(
            task=task,
            agent_result=result,
            confidence=confidence,
            reason="Agent não confiante na solução"
        )
        return {"status": "escalated", "reason": "low_confidence"}
    
    return result
```

### Observabilidade

```python
import logging
import time

def run_agent_with_telemetry(task):
    trace_id = generate_trace_id()
    start_time = time.time()
    iterations = 0
    total_tokens = 0
    tools_called = []
    
    # ... agent loop ...
    
    # Log structured
    logging.info("agent_task_complete", extra={
        "trace_id": trace_id,
        "task": task[:100],
        "iterations": iterations,
        "total_tokens": total_tokens,
        "tools_called": tools_called,
        "duration_ms": (time.time() - start_time) * 1000,
        "success": True
    })
```

## Template: Agent de diagnóstico de alertas

Juntando tudo, um agent completo pra diagnosticar alertas:

```python
SYSTEM_PROMPT = """Você é um agent de diagnóstico de infraestrutura.

Quando receber um alerta:
1. Colete métricas do recurso afetado
2. Verifique se há procedimento documentado (runbook)
3. Se houver procedimento simples e seguro, execute
4. Se não houver ou for arriscado, escale pra equipe L2

Regras:
- NUNCA execute ações destrutivas (delete, deallocate) sem aprovação
- Se após 3 ações o problema persistir, escale
- Sempre documente o que fez no ticket
"""

TOOLS = [
    tool_get_metrics,       # Read-only, safe
    tool_get_logs,          # Read-only, safe
    tool_search_runbook,    # Read-only, safe
    tool_restart_service,   # Requires approval if production
    tool_scale_resource,    # Requires approval
    tool_create_ticket,     # Safe (write, but non-destructive)
    tool_escalate,          # Safe (notification)
]

GUARDRAILS = {
    "max_iterations": 8,
    "max_cost_usd": 0.25,
    "approval_required": ["restart_service", "scale_resource"],
    "forbidden_in_production": ["delete_resource"],
    "escalation_after_failures": 2
}
```

## O que levar pra segunda-feira

- **Comece com escopo pequeno.** Um agent que faz uma coisa bem vale mais do que um agent que tenta fazer tudo e erra metade.
- **Tool design pesa mais do que parece.** Tools idempotentes, com retornos informativos e descriptions claras.
- **Modelo maior não é sempre melhor.** GPT-4o-mini pra tasks simples, GPT-4o pra tasks que requerem raciocínio.
- **Planning strategy depende da complexidade.** ReAct pra 1-3 steps, plan-then-execute pra 4-8, hierarchical pra 10+.
- **Design pra falha desde o dia 1.** Retries, fallback humano, limits de iteração, observabilidade.

O próximo post entra num ponto que separa demo de sistema útil: **memória, estado e consistência**.

## Leitura complementar

- [How to Design an AI Agent](https://lnkd.in/dGUknFw3) (Neo Kim, System Design Newsletter)
- [Building effective agents (Anthropic)](https://docs.anthropic.com/en/docs/build-with-claude/agent-patterns)
- [Azure AI Agent Service](https://learn.microsoft.com/azure/ai-services/agents/overview)
