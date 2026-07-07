---
slug: "como-ai-agents-funcionam-por-dentro"
aliases:
  - "/posts/como-ai-agents-funcionam-por-dentro/"
title: "Como AI agents funcionam por dentro"
description: "O loop perceive-think-act desmontado. Como um LLM vira um agent que toma ações no mundo real, explicado pra quem entende de control loops e automação."
date: 2026-07-14T10:00:00-04:00
categories:
  - AI
  - Arquitetura
tags:
  - ai-engineering
  - agents
  - function-calling
  - automação
series:
  - "AI por dentro: de tokens a agents"
---

Terça-feira, 14h. Seu colega mostra um demo: ele pede pro "agent" verificar o status de 5 servidores, identificar qual tem mais CPU usage, e criar um ticket pra investigação. O agent faz tudo sozinho. Sem scripts. Sem runbooks.

Seu primeiro pensamento: "Isso é só um LLM chamando APIs, certo?"

Sim. E não. O conceito é simples. A parte trabalhosa é fazer isso funcionar com segurança e previsibilidade em produção. É aí que mora a engenharia de verdade.

## O mapa pro profissional de infra

| Conceito Agent | O que faz | Equivalente em infra |
|---------------|-----------|---------------------|
| **Agent** | Sistema autônomo que toma ações | Controller (Kubernetes controller, autoscaler) |
| **Tool** | Função que o agent pode chamar | API endpoint, CLI command |
| **Observation** | Resultado de uma ação | Output do comando, response da API |
| **Reasoning** | LLM decidindo próximo passo | Logic no controller loop |
| **Agent loop** | Ciclo: observar → pensar → agir → repetir | Control loop (reconcile loop no K8s) |
| **Planning** | Decompor tarefa em steps | Pipeline de CI/CD com stages |
| **Guardrails** | Limites do que o agent pode fazer | RBAC, policies |

## O que é um AI agent (sem buzzwords)

Um agent é um **LLM + tools + loop**. Ponto.

- O **LLM** decide o que fazer baseado no contexto
- As **tools** executam ações no mundo (APIs, databases, file system)
- O **loop** repete o ciclo até a tarefa estar completa

Se você já trabalhou com Kubernetes controllers, o pattern é idêntico:

```
Kubernetes Controller:
1. Observe estado atual (kubectl get)
2. Compare com estado desejado (spec)
3. Tome ação pra reconciliar (create/update/delete)
4. Repita

AI Agent:
1. Observe contexto (user request + resultados anteriores)
2. Raciocine sobre o que falta (LLM pensa)
3. Tome ação (chame uma tool)
4. Observe resultado
5. Repita até concluir
```

## O agent loop desmontado

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 770 370" width="100%" style="max-width:760px;height:auto" role="img" aria-labelledby="agent-loop-title agent-loop-desc">
<title id="agent-loop-title">Agent loop</title>
<desc id="agent-loop-desc">Fluxo Observe, Think, Act, Resultado, com condições de parada.</desc>
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
</marker>
</defs>
<rect x="20" y="20" width="720" height="320" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
<text x="380" y="48" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="bold" fill="#333333">AGENT LOOP</text>
<g id="loop-nodes" font-family="Segoe UI, Arial, sans-serif">
<g>
<rect x="60" y="78" width="120" height="64" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
<text x="120" y="106.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Observe</text>
<text x="120" y="121.5" text-anchor="middle" font-size="10" fill="#555">(input)</text>
</g>
<g>
<rect x="245" y="78" width="120" height="64" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="305" y="106.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">Think</text>
<text x="305" y="121.5" text-anchor="middle" font-size="10" fill="#555">(LLM)</text>
</g>
<g>
<rect x="430" y="78" width="120" height="64" rx="6" fill="#d5e8d4" stroke="#82b366" />
<text x="490" y="106.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Act</text>
<text x="490" y="121.5" text-anchor="middle" font-size="10" fill="#555">(tool)</text>
</g>
<g>
<rect x="245" y="188" width="150" height="64" rx="6" fill="#fff2cc" stroke="#d6b656" />
<text x="320" y="216.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">Resultado</text>
<text x="320" y="231.5" text-anchor="middle" font-size="10" fill="#555">Observação da tool</text>
</g>
<g>
<rect x="450" y="182" width="240" height="104" rx="8" fill="#f8cecc" stroke="#b85450" />
<text x="570" y="215.5" font-size="12" font-weight="bold" fill="#8a1c1c" text-anchor="middle">Condição de parada:</text>
<text x="570" y="230.5" font-size="10" fill="#555" text-anchor="middle">- Tarefa completa</text>
<text x="570" y="245.5" font-size="10" fill="#555" text-anchor="middle">- Limite de iterações atingido</text>
<text x="570" y="260.5" font-size="10" fill="#555" text-anchor="middle">- Erro irrecuperável</text>
</g>
</g>
<g id="loop-arrows" fill="none" stroke="#666666" stroke-width="2" marker-end="url(#arrow)">
<line x1="186" y1="110" x2="251" y2="110" />
<line x1="371" y1="110" x2="436" y2="110" />
<path d="M 435.5 145.3 L 364.4 191.3" />
<path d="M 256.6 185.1 L 172.9 139.1" />
</g>
</svg>

### Implementação básica

```python
import os
import json
from openai import AzureOpenAI

deployment_name = os.environ["AZURE_OPENAI_DEPLOYMENT"]

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-06-01"
)

# Definir tools disponíveis
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_server_metrics",
            "description": "Retorna métricas de CPU, memória e disco de um servidor",
            "parameters": {
                "type": "object",
                "properties": {
                    "hostname": {"type": "string", "description": "Nome do servidor"}
                },
                "required": ["hostname"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_ticket",
            "description": "Cria um ticket de investigação no sistema de ITSM",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                    "description": {"type": "string"}
                },
                "required": ["title", "severity", "description"]
            }
        }
    }
]

# Implementação das tools (a parte que executa de verdade)
def execute_tool(name, arguments):
    if name == "get_server_metrics":
        # Na vida real: query Azure Monitor, Prometheus, etc.
        return {"cpu": 87.5, "memory": 62.0, "disk": 45.0}
    elif name == "create_ticket":
        # Na vida real: POST pro ServiceNow, Jira, etc.
        return {"ticket_id": "INC-2024-4521", "status": "created"}

def run_agent(user_request, max_iterations=10):
    """Loop principal do agent."""
    messages = [
        {"role": "system", "content": 
         "Você é um agente de operações de infraestrutura. "
         "Use as ferramentas disponíveis pra completar a tarefa. "
         "Quando terminar, responda com o resultado final."},
        {"role": "user", "content": user_request}
    ]
    
    for i in range(max_iterations):
        # Think: LLM decide o que fazer
        response = client.chat.completions.create(
            model=deployment_name,
            messages=messages,
            tools=tools,
            temperature=0
        )
        
        choice = response.choices[0]
        message = choice.message
        
        # Se o modelo decidiu responder (tarefa completa)
        if choice.finish_reason == "stop":
            return message.content
        
        # Se o modelo quer chamar uma tool
        if choice.finish_reason == "tool_calls" and message.tool_calls:
            # Adicionar a decisão do modelo ao histórico
            messages.append(message)
            
            # Executar cada tool chamada
            for tool_call in message.tool_calls:
                args = json.loads(tool_call.function.arguments)
                result = execute_tool(tool_call.function.name, args)
                
                # Adicionar resultado ao histórico
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": tool_call.function.name,
                    "content": json.dumps(result)
                })
            continue

        raise RuntimeError(f"finish_reason inesperado: {choice.finish_reason}")
    
    return "Limite de iterações atingido sem completar a tarefa."
```

## ReAct: o pattern mais comum

**ReAct (Reasoning + Acting)** é o padrão em que o agent alterna entre decidir o próximo passo e chamar tools. No paper original, esse raciocínio aparece em texto. Em produção, muita gente não expõe esse texto inteiro ao usuário. Guarda um scratchpad interno, logs estruturados ou só a sequência de tool calls.

Exemplo didático:

```
User: "Qual servidor da pool web-prod está com mais CPU?"

Agent (pensando): "Preciso verificar métricas de cada servidor na pool web-prod. 
                   Vou consultar web-prod-01, web-prod-02 e web-prod-03."

Agent (ação): get_server_metrics("web-prod-01") → {"cpu": 45.2, ...}
Agent (ação): get_server_metrics("web-prod-02") → {"cpu": 87.5, ...}
Agent (ação): get_server_metrics("web-prod-03") → {"cpu": 23.1, ...}

Agent (pensando): "web-prod-02 está com 87.5% de CPU, acima dos outros. 
                   Vale abrir um ticket."

Agent (ação): create_ticket(title="CPU alta em web-prod-02", 
                            severity="medium", ...)

Agent (resposta final): "web-prod-02 está com 87.5% de CPU. 
                         Criei o ticket INC-2024-4521 pra investigação."
```

Cada iteração do loop consome tokens. Um agent que precisa de 5 tool calls volta ao modelo pelo menos 6 vezes: uma pra cada decisão e outra pra fechar a resposta. Isso bate direto em latência e custo.

## Tools: o vocabulário do agent

Tools são o que dão poder ao agent. Sem tools, é só um chatbot. Com tools, vira automação inteligente.

### Princípios de boas tool definitions

**1. Nomes descritivos e sem ambiguidade**
```
Ruim:  "query" (query o quê?)
Bom:   "get_server_metrics" (claro o que faz)
```

**2. Descriptions que o LLM entende**
```
Ruim:  "Gets stuff from the monitoring system"
Bom:   "Retorna métricas atuais (CPU %, memória %, disco %) de um servidor 
        pelo hostname. Use quando precisar verificar saúde de um servidor."
```

**3. Parameters com constraints claros**
```python
{
    "severity": {
        "type": "string",
        "enum": ["low", "medium", "high", "critical"],
        "description": "low: informativo. medium: investigar em 24h. "
                      "high: investigar imediatamente. critical: incidente ativo."
    }
}
```

**4. Documente quando usar E quando NÃO usar**
```
"Use esta ferramenta para verificar status de servidores em produção. 
 NÃO use para servidores de desenvolvimento (use get_dev_server_status)."
```

## Quanto custa um agent em produção?

Dá pra estimar sem chute. Conte tokens por chamada e multiplique pelo preço do modelo.

| Componente | Tokens típicos por chamada | Observação |
|-----------|----------------------------|------------|
| System prompt | ~200 input tokens | Reaparece em toda iteração |
| Tool definitions (5 tools) | ~1000 input tokens | Schema grande pesa |
| Histórico | ~500-3000 input tokens | Cresce a cada volta do loop |
| Resposta / decisão do modelo | ~100-500 output tokens | Tool call ou resposta final |

Se você assumir um modelo na faixa de US$5 por milhão de input tokens e US$15 por milhão de output tokens, um fluxo com 5 iterações e algo perto de 8000 input + 1500 output tokens sai por volta de **US$0.0625 por tarefa**.

Em 1000 execuções por dia, isso dá algo perto de US$62.50/dia. Prompt caching, respostas mais curtas e menos iterações derrubam esse número. Tool schema inchado e histórico longo fazem o contrário.

## Guardrails: quando o agent pode matar produção

Um agent com acesso a `kubectl delete` ou `az vm deallocate` pode causar desastre. Guardrails são essenciais.

### Tipos de guardrails

**1. Tool-level permissions**
```python
# Classificar tools por risco
SAFE_TOOLS = ["get_server_metrics", "list_pods", "get_logs", "create_ticket"]
APPROVAL_REQUIRED = ["restart_service", "scale_resource"]
FORBIDDEN = ["delete_namespace", "deallocate_vm"]

def execute_with_guardrails(tool_name, args, user_role):
    if tool_name in FORBIDDEN:
        return {"error": "Ação bloqueada por policy"}
    
    if tool_name in APPROVAL_REQUIRED:
        approval = request_human_approval(tool_name, args)
        if not approval:
            return {"error": "Ação não aprovada"}
    
    return execute_tool(tool_name, args)
```

**2. Iteration limits**
```python
MAX_ITERATIONS = 10  # Nunca deixe o agent rodar infinitamente
MAX_COST = 0.50      # Budget máximo por task em dólares
```

**3. Output validation**
```python
# Validar que o agent não está hallucinating tool calls
def validate_tool_call(tool_name, args):
    if tool_name not in KNOWN_TOOLS:
        raise ValueError(f"Tool desconhecida: {tool_name}")
    
    # Validar que hostname existe antes de executar
    if "hostname" in args:
        if not is_valid_hostname(args["hostname"]):
            return {"error": f"Servidor {args['hostname']} não encontrado"}
```

## Agent vs automation script: quando usar qual

| Cenário | Agent | Script/Automation |
|---------|-------|-------------------|
| Tarefa bem definida, steps fixos | Overkill | Ideal |
| Tarefa com decisões baseadas em contexto | Ideal | Rígido demais |
| Precisa lidar com edge cases imprevistos | Ideal | Quebraria |
| Precisa ser auditável passo a passo | Mais difícil | Logs claros |
| Custo importa muito | Mais caro (tokens) | Barato |
| Confiabilidade 99.99% | Ainda não | Possível |

Regra prática: se você consegue cobrir quase tudo com script, escreva o script. Agent faz mais sentido quando o espaço de decisão é grande demais pra modelar com if/else sem virar um monstro.

## O que levar pra segunda-feira

- **Agent = LLM + tools + loop.** É um controller pattern que você já conhece, com um LLM no lugar da lógica hardcoded.
- **Tools são o que definem o poder do agent.** Um agent é tão bom quanto as ferramentas que tem acesso.
- **Guardrails não são opcionais em produção.** Classifique tools por risco, implemente aprovação humana pra ações destrutivas, limite iterações.
- **Custo escala com complexidade da tarefa.** Cada iteração do loop custa tokens. Poucas voltas ficam baratas. Histórico longo e muitas tools fazem a conta subir rápido.
- **Não use agents onde um script resolve.** Agents adicionam incerteza. Use-os onde a flexibilidade justifica o trade-off.

O próximo post entra em **como projetar um AI agent do zero**: escolhas de arquitetura, tool design e estratégias de planning.

## Leitura complementar

- [How AI Agents Work](https://lnkd.in/dU8CK7-b) (Neo Kim, System Design Newsletter)
- [Azure OpenAI function calling](https://learn.microsoft.com/azure/ai-services/openai/how-to/function-calling)
- [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
