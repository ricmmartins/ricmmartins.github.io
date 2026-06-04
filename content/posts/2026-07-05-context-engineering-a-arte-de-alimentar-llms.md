---
slug: "context-engineering-a-arte-de-alimentar-llms"
aliases:
  - "/posts/context-engineering-a-arte-de-alimentar-llms/"
title: "Context engineering: a arte de alimentar LLMs"
description: "System prompts, few-shot examples, retrieval context, tool definitions. Como montar o input perfeito pra um LLM, explicado como quem monta payloads de API."
date: 2026-07-05T10:00:00-04:00
categories:
  - AI
  - Arquitetura
tags:
  - ai-engineering
  - context-engineering
  - prompts
  - llm
series:
  - "AI Engineering pra quem é de infra"
---

Você monta um RAG pipeline, conecta ao Azure OpenAI, e as respostas ficam... meh. Genéricas. Às vezes ignora o contexto que você enviou. Às vezes inventa coisas. O modelo é potente, mas o input que você manda determina 80% da qualidade do output.

Context engineering é a disciplina de montar esse input de forma que o modelo entregue exatamente o que você precisa. Não é "prompt engineering" (que virou buzzword). É engenharia de verdade: estrutura, constraints, trade-offs.

## O mapa pro profissional de infra

| Conceito | O que faz | Equivalente em infra |
|----------|-----------|---------------------|
| **System prompt** | Instruções persistentes pro modelo | Arquivo de configuração do serviço |
| **User message** | Input do usuário | O request HTTP |
| **Context window** | Espaço total disponível pra input + output | RAM do processo |
| **Few-shot examples** | Exemplos do formato desejado | Templates de resposta |
| **Tool definitions** | Funções que o modelo pode chamar | API contracts/OpenAPI specs |
| **Retrieval context** | Docs buscados via RAG | Dados do database no response |
| **Token budget** | Quanto espaço cada parte ocupa | Capacity planning |

## A anatomia de um request pra LLM

Todo request pra um LLM chat é um array de messages. Cada message tem um role e um content. A ordem importa.

```json
{
  "messages": [
    {"role": "system", "content": "...instruções do sistema..."},
    {"role": "user", "content": "primeira mensagem do user"},
    {"role": "assistant", "content": "resposta anterior do modelo"},
    {"role": "user", "content": "segunda mensagem do user"},
    {"role": "user", "content": "...com contexto RAG injetado..."}
  ],
  "temperature": 0.1,
  "max_tokens": 2000
}
```

Pensa nisso como montar o body de um POST request. A estrutura do payload determina o que o serviço retorna.

## Token budget: capacity planning do contexto

O context window é finito. GPT-4o tem 128K tokens, mas isso não significa que você deve usar tudo. Input tokens custam dinheiro e aumentam latência (attention é O(n²), lembra?).

A divisão típica:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 190" width="100%" role="img" aria-labelledby="context-window-title">
  <title id="context-window-title">Divisão do context window</title>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
    </marker>
  </defs>
  <g font-family="Segoe UI, Arial, sans-serif">
    <rect x="20" y="20" width="870" height="140" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
    <text x="420" y="46" text-anchor="middle" font-size="14" font-weight="bold" fill="#1f1f1f">Context Window (128K tokens)</text>

    <rect x="40" y="68" width="180" height="62" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
    <text x="130" y="95.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">System prompt</text>
    <text x="130" y="110.5" text-anchor="middle" font-size="10" fill="#555555">500-2000</text>

    <rect x="250" y="68" width="180" height="62" rx="6" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
    <text x="340" y="95.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Histórico</text>
    <text x="340" y="110.5" text-anchor="middle" font-size="10" fill="#555555">variável</text>

    <rect x="460" y="68" width="180" height="62" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
    <text x="550" y="95.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">RAG docs</text>
    <text x="550" y="110.5" text-anchor="middle" font-size="10" fill="#555555">2K-10K</text>

    <rect x="670" y="68" width="190" height="62" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
    <text x="765" y="95.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Output reserved</text>
    <text x="765" y="110.5" text-anchor="middle" font-size="10" fill="#555555">2K-4K</text>
  </g>
</svg>

Na prática, a maioria das aplicações usa 5-15% do context window. Usar mais que isso fica caro e a qualidade não melhora proporcionalmente (o modelo pode "se perder" em contextos muito grandes).

### Fazendo capacity planning

```python
import tiktoken

def calcular_budget(system_prompt, historico, rag_chunks, max_output=2000):
    """Calcula uso do context window."""
    enc = tiktoken.encoding_for_model("gpt-4o")
    
    tokens_system = len(enc.encode(system_prompt))
    tokens_historico = sum(len(enc.encode(m["content"])) for m in historico)
    tokens_rag = sum(len(enc.encode(c)) for c in rag_chunks)
    tokens_output = max_output
    
    total = tokens_system + tokens_historico + tokens_rag + tokens_output
    limite = 128000
    
    print(f"System prompt: {tokens_system:,} tokens ({tokens_system/limite*100:.1f}%)")
    print(f"Histórico:     {tokens_historico:,} tokens ({tokens_historico/limite*100:.1f}%)")
    print(f"RAG context:   {tokens_rag:,} tokens ({tokens_rag/limite*100:.1f}%)")
    print(f"Output buffer: {tokens_output:,} tokens ({tokens_output/limite*100:.1f}%)")
    print(f"─────────────────────────────")
    print(f"Total:         {total:,} / {limite:,} ({total/limite*100:.1f}%)")
    
    if total > limite:
        print("⚠️  OVERFLOW: precisa reduzir contexto!")
    
    return total
```

## System prompt: a configuração do serviço

O system prompt é a parte mais importante e mais negligenciada. É onde você define persona, constraints, formato de output, e regras de segurança.

### Princípios de um bom system prompt

**1. Seja específico sobre o papel**

```
Ruim:  "Você é um assistente útil."
Bom:   "Você é um assistente técnico pra engenheiros de infraestrutura 
        na empresa Acme. Responda perguntas sobre nossos runbooks e 
        procedimentos operacionais. Se a informação não estiver nos 
        documentos fornecidos, diga claramente que não encontrou."
```

**2. Defina constraints explícitas**

```
- Responda APENAS com base nos documentos fornecidos no contexto.
- Se não encontrar a informação, responda: "Não encontrei essa informação nos runbooks disponíveis."
- Nunca invente procedimentos ou comandos.
- Inclua o nome do documento fonte na resposta.
- Formato: resposta direta, depois os passos se aplicável.
```

**3. Dê exemplos do formato desejado (few-shot)**

```
Exemplo:
Pergunta: "Como reiniciar o serviço de DNS?"
Resposta: Segundo o runbook NET-007 (DNS Management), o procedimento é:
1. Conectar ao servidor ns1.acme.corp via SSH
2. Executar: sudo systemctl restart named
3. Verificar: dig @localhost acme.corp
Se o serviço não subir, escalar para L3 conforme SOP-001.
```

**4. Lide com edge cases**

```
Se o usuário pedir algo que envolve acesso root ou mudanças em produção:
- Confirme que ele tem aprovação no change management
- Inclua o aviso: "Este procedimento requer change request aprovado"
```

## Few-shot examples: mostrando em vez de explicando

Ao invés de descrever o formato de output em palavras, mostre exemplos. O modelo aprende padrões muito bem dessa forma.

```json
{
  "messages": [
    {"role": "system", "content": "Classifique tickets de suporte em categorias."},
    {"role": "user", "content": "Não consigo acessar o VPN desde ontem"},
    {"role": "assistant", "content": "{\"categoria\": \"rede\", \"prioridade\": \"alta\", \"componente\": \"vpn\"}"},
    {"role": "user", "content": "Preciso de mais espaço no meu home directory"},
    {"role": "assistant", "content": "{\"categoria\": \"storage\", \"prioridade\": \"baixa\", \"componente\": \"nfs\"}"},
    {"role": "user", "content": "O Jenkins não está buildando, erro de permissão no Docker socket"}
  ]
}
```

Três exemplos é geralmente suficiente. Mais que cinco raramente melhora o resultado e custa tokens.

## Retrieval context: o que mandar e como

Quando você implementa RAG (post anterior), os chunks recuperados viram parte do context. A forma como você formata esses chunks importa.

### Formato ruim

```
Contexto: failover postgresql verificar replicação select pg_last_wal_receive_lsn executar pg_promote no standby atualizar dns apontar pra novo primário verificar conexões de aplicação
```

### Formato bom

```
--- Documento: DR-003 - Failover PostgreSQL (atualizado: 2024-11-15) ---

Pré-requisitos:
- Replicação streaming ativa (verificar com pg_stat_replication)
- Standby com lag < 1MB

Procedimento:
1. Verificar que o primário está realmente indisponível (não é só rede)
2. No standby: SELECT pg_promote();
3. Atualizar DNS: db-primary.acme.corp → IP do novo primário
4. Verificar conexões: SELECT count(*) FROM pg_stat_activity;

Rollback: se o primário original voltar, ele entra como standby via pg_rewind.

---
```

Estrutura clara, metadata (nome do doc, data), formatação que o modelo consegue parsear. O modelo entende melhor quando o contexto é bem organizado.

## Tool definitions: dando mãos ao modelo

Function calling (ou tool use) permite que o modelo "chame funções" em vez de só gerar texto. Você define ferramentas disponíveis e o modelo decide quando e como usá-las.

```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_server_status",
        "description": "Retorna o status atual de um servidor pelo hostname",
        "parameters": {
          "type": "object",
          "properties": {
            "hostname": {
              "type": "string",
              "description": "Nome do servidor (ex: web-prod-01)"
            }
          },
          "required": ["hostname"]
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "create_incident",
        "description": "Cria um incidente no PagerDuty",
        "parameters": {
          "type": "object",
          "properties": {
            "severity": {"type": "string", "enum": ["P1", "P2", "P3", "P4"]},
            "title": {"type": "string"},
            "service": {"type": "string"}
          },
          "required": ["severity", "title", "service"]
        }
      }
    }
  ]
}
```

Cada tool definition consome tokens do context window. Uma definição típica usa 100-300 tokens. Com 20 tools, são 2000-6000 tokens só de definições. Isso é capacity planning: quanto mais ferramentas você dá ao modelo, menos espaço sobra pra contexto e output.

## Técnicas avançadas

### Chain of Thought (CoT)

Instruir o modelo a "pensar passo a passo" antes de responder. Melhora accuracy em problemas que requerem raciocínio.

```
System prompt:
"Ao analisar problemas de infraestrutura, primeiro liste as possíveis causas,
depois elimine uma a uma com base nos sintomas, e só então dê a recomendação."
```

### Output structured (JSON mode)

Quando precisa parsear a resposta programaticamente:

```bash
curl -X POST "$AZURE_OPENAI_ENDPOINT/openai/deployments/gpt-4o/chat/completions?api-version=2024-06-01" \
  -H "Content-Type: application/json" \
  -H "api-key: $AZURE_OPENAI_KEY" \
  -d '{
    "messages": [
      {"role": "system", "content": "Analise o log e retorne um JSON com: severity, component, root_cause, action"},
      {"role": "user", "content": "Error: OOMKilled pod api-server-7f8d9 in namespace production. Memory limit 512Mi exceeded."}
    ],
    "response_format": {"type": "json_object"},
    "temperature": 0
  }'
```

Resposta:
```json
{
  "severity": "high",
  "component": "api-server",
  "root_cause": "Pod excedeu memory limit de 512Mi",
  "action": "Aumentar memory limit ou investigar memory leak"
}
```

### Prompt caching

Modelos recentes suportam caching do prefix do prompt. Se o system prompt + tool definitions são iguais entre requests, o modelo reutiliza o processamento. Isso reduz latência e custo.

```
Request 1: [system_prompt + tools + user_msg_1] → cache miss (processa tudo)
Request 2: [system_prompt + tools + user_msg_2] → cache hit no prefix (só processa user_msg_2)
```

Azure OpenAI aplica isso automaticamente. Quanto mais estável for o começo do seu prompt, mais cache hits você tem.

## Anti-patterns: o que não fazer

**Prompt gigante com tudo junto**
```
Ruim: um system prompt de 5000 tokens cobrindo todos os cenários possíveis
Bom: system prompt enxuto (500-1000 tokens) + RAG pra trazer contexto relevante on-demand
```

**Ignorar o max_tokens**
```
Ruim: não definir max_tokens (modelo pode gerar respostas enormes)
Bom: max_tokens: 1000-2000 pra respostas típicas, 4000 pra respostas longas
```

**Confiar que "o modelo vai entender"**
```
Ruim: "Responda bem."
Bom: "Responda em no máximo 3 parágrafos. Inclua o comando exato. 
      Indique o risco (baixo/médio/alto)."
```

**Não versionar system prompts**
```
Ruim: editar o prompt direto no código
Bom: system prompts em arquivos versionados, com changelog
```

## Monitorando qualidade do contexto

Depois de colocar em produção, monitore:

- **Context utilization**: % do context window usado por request (se muito baixo, pode estar subaproveitando; se muito alto, pode truncar)
- **RAG retrieval score**: relevância dos chunks recuperados (sample manual periodicamente)
- **Hallucination rate**: respostas que contêm informação não presente no contexto
- **Token cost per query**: tendência de crescimento (historico de conversa cresce)

## O que levar pra segunda-feira

- **Context engineering é o maior alavanca de qualidade** que você tem sem retreinar o modelo. Antes de trocar pra modelo maior ou mais caro, otimize o input.
- **System prompt é configuração, não código**. Versione, teste, faça A/B. Mudanças no system prompt mudam o comportamento tanto quanto mudanças no código.
- **Token budget é capacity planning.** Trate o context window como RAM: finito, caro, e precisa de gerenciamento.
- **Few-shot > descrição.** Mostrar exemplos funciona melhor que explicar em palavras o que você quer.
- **Ferramentas custam tokens.** Cada tool definition ocupa espaço. Só exponha as tools relevantes pro contexto atual.

No próximo post, vamos falar de **LLM Evals**: como medir se o modelo está respondendo bem. Porque sem métricas, context engineering é achismo.

## Leitura complementar

- [Context Engineering 101](https://lnkd.in/d4WNwfqY) (Neo Kim, System Design Newsletter)
- [Azure OpenAI prompt engineering best practices](https://learn.microsoft.com/azure/ai-services/openai/concepts/prompt-engineering)
- [Anthropic: Prompt engineering guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering)
