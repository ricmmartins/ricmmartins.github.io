---
slug: "ai-agents-memoria-estado-e-consistencia"
aliases:
  - "/posts/ai-agents-memoria-estado-e-consistencia/"
title: "AI agents: memória, estado e consistência"
description: "Short-term, long-term, episodic memory. Como agents mantêm contexto entre interações e os trade-offs de persistência que todo engenheiro de sistemas conhece."
date: 2026-07-20T10:00:00-04:00
categories:
  - AI
  - Arquitetura
tags:
  - ai-engineering
  - agents
  - memoria
  - estado
  - consistencia
series:
  - "AI Engineering pra quem é de infra"
---

Seu agent de diagnóstico funciona perfeitamente pra uma interação. Mas quando o mesmo alerta volta na semana seguinte, ele começa do zero. Não lembra que já investigou, não lembra que a causa raiz era aquele cronjob que estoura memória toda quarta-feira às 3h da manhã.

Agentes sem memória são como um engenheiro que perde o caderno toda segunda-feira. Competente, mas incapaz de aprender com o passado.

## O mapa pro profissional de infra

| Conceito de Memória | O que faz | Equivalente em infra |
|--------------------|-----------|---------------------|
| **Short-term memory** | Contexto da conversa atual | Buffer de request (dados in-flight) |
| **Long-term memory** | Informações que persistem entre sessões | Database, persistent storage |
| **Episodic memory** | Lembranças de interações passadas | Logs, audit trail |
| **Semantic memory** | Conhecimento geral acumulado | Knowledge base, wiki |
| **Working memory** | O que está "ativo" na cabeça do agent | Cache, working set |
| **State** | Configuração atual do agent | Estado do pod, configmap |
| **Consistency** | Garantia de que memória é correta | Consistency model do banco |

## Por que memória é difícil em agents

LLMs são **stateless**. Cada request é independente. O modelo não "lembra" nada entre chamadas. Toda memória é simulada via contexto.

```
Request 1: [system_prompt + mensagem_1] → resposta_1
Request 2: [system_prompt + mensagem_1 + resposta_1 + mensagem_2] → resposta_2
Request 3: [system_prompt + msg_1 + resp_1 + msg_2 + resp_2 + msg_3] → resposta_3
```

Percebe o problema? O contexto cresce a cada interação. Em algum momento, estoura o context window. É como se toda vez que você precisa lembrar de algo, tivesse que reler todos os seus logs desde o início.

## Tipos de memória

### 1. Short-term memory (contexto da conversa)

É simplesmente o histórico de mensagens na conversa atual. Vive no context window do LLM.

```python
class ShortTermMemory:
    def __init__(self, max_tokens=50000):
        self.messages = []
        self.max_tokens = max_tokens
    
    def add(self, role, content):
        self.messages.append({"role": role, "content": content})
        self._trim_if_needed()
    
    def _trim_if_needed(self):
        """Remove mensagens antigas quando context fica grande."""
        total = sum(count_tokens(m["content"]) for m in self.messages)
        while total > self.max_tokens and len(self.messages) > 2:
            # Mantém system prompt (primeiro) e última mensagem
            removed = self.messages.pop(1)  # Remove a segunda mais antiga
            total -= count_tokens(removed["content"])
    
    def get_messages(self):
        return self.messages
```

**Trade-offs:**
- Simples e determinístico
- Limitado pelo context window
- Se trimma demais, perde contexto importante
- Custo escala linearmente com tamanho

### 2. Long-term memory (persiste entre sessões)

Informações que o agent deve lembrar "pra sempre". Tipicamente em banco de dados ou vector store.

```python
from datetime import datetime, timedelta

class LongTermMemory:
    def __init__(self, db_connection, embedding_client):
        self.db = db_connection
        self.embedder = embedding_client
    
    def store(self, content, metadata=None):
        """Salva informação na memória de longo prazo."""
        embedding = self.embedder.embed(content)
        self.db.insert({
            "content": content,
            "embedding": embedding,
            "metadata": metadata or {},
            "created_at": datetime.now(),
            "access_count": 0,
        })
    
    def recall(self, query, top_k=5):
        """Busca memórias relevantes pra query atual."""
        query_embedding = self.embedder.embed(query)
        results = self.db.vector_search(
            query_embedding,
            top_k=top_k,
            min_similarity=0.7,
        )
        
        # Atualizar access_count (memórias usadas ficam "mais fortes")
        for result in results:
            self.db.increment(result["id"], "access_count")
        
        return results
    
    def forget(self, older_than_days=90, min_access=0):
        """Remove memórias antigas e nunca acessadas."""
        cutoff = datetime.now() - timedelta(days=older_than_days)
        self.db.delete_where(
            "created_at < ? AND access_count <= ?",
            [cutoff, min_access],
        )
```

**Exemplos de o que guardar:**
- "O servidor web-prod-02 tem um memory leak no Java que precisa de restart semanal"
- "O usuário Ricardo prefere respostas curtas com comandos diretos"
- "Alertas de CPU em batch-workers-* são normais entre 02:00-04:00 (jobs de ETL)"

### 3. Episodic memory (o que aconteceu antes)

Lembranças estruturadas de interações passadas. Como um log de incidentes que o agent pode consultar.

```python
import json
from datetime import datetime

class EpisodicMemory:
    def __init__(self, db, embedding_client):
        self.db = db
        self.embedder = embedding_client
    
    def record_episode(self, trigger, actions, outcome, lessons):
        """Registra um episódio completo."""
        self.db.insert("episodes", {
            "trigger": trigger,
            "actions": json.dumps(actions),
            "outcome": outcome,  # "resolved", "escalated", "failed"
            "lessons": lessons,
            "timestamp": datetime.now(),
            "embedding": self.embedder.embed(f"{trigger} {outcome} {lessons}"),
        })
    
    def find_similar_episodes(self, current_situation, top_k=3):
        """Busca episódios similares ao cenário atual."""
        return self.db.vector_search(
            self.embedder.embed(current_situation),
            table="episodes",
            top_k=top_k,
        )
```

**Uso no agent loop:**

```python
def agent_with_episodic_memory(task, episodic_memory, system_prompt):
    # Antes de agir, consultar episódios similares
    similar = episodic_memory.find_similar_episodes(task)
    augmented_prompt = system_prompt
    
    if similar:
        context = "Episódios anteriores similares:\n"
        for episode in similar:
            context += f"- Situação: {episode['trigger']}\n"
            context += f"  Resultado: {episode['outcome']}\n"
            context += f"  Lição: {episode['lessons']}\n\n"
        
        # Adicionar ao system prompt
        augmented_prompt = f"{system_prompt}\n\n{context}"
    
    # Executar agent normalmente...
    result = run_agent(task, augmented_prompt)
    
    # Depois: registrar o que aconteceu
    episodic_memory.record_episode(
        trigger=task,
        actions=result["actions_taken"],
        outcome=result["outcome"],
        lessons=result.get("lessons", ""),
    )
```

### 4. Semantic memory (conhecimento geral)

Base de conhecimento do agent. Runbooks, documentação, policies. Geralmente implementado via RAG.

A diferença de episodic: semantic é "o que eu sei" (fatos), episodic é "o que eu vivi" (experiências).

## Gerenciamento de estado

Além de memória (o que o agent lembra), existe **estado** (em que ponto da tarefa ele está).

### State machine pra agents

```python
import json
from datetime import datetime
from enum import Enum

class InvalidTransition(Exception):
    pass

class AgentState(Enum):
    IDLE = "idle"
    INVESTIGATING = "investigating"
    AWAITING_APPROVAL = "awaiting_approval"
    EXECUTING = "executing"
    VALIDATING = "validating"
    COMPLETED = "completed"
    FAILED = "failed"
    ESCALATED = "escalated"

class StatefulAgent:
    def __init__(self, agent_id, db):
        self.agent_id = agent_id
        self.db = db
        self.state = AgentState.IDLE
        self.context = {}  # dados acumulados durante a task
    
    def transition(self, new_state, reason=""):
        """Transição de estado com validação."""
        valid_transitions = {
            AgentState.IDLE: [AgentState.INVESTIGATING],
            AgentState.INVESTIGATING: [
                AgentState.AWAITING_APPROVAL,
                AgentState.EXECUTING,
                AgentState.FAILED,
                AgentState.ESCALATED,
                AgentState.COMPLETED,
            ],
            AgentState.AWAITING_APPROVAL: [AgentState.EXECUTING, AgentState.FAILED, AgentState.ESCALATED],
            AgentState.EXECUTING: [AgentState.VALIDATING, AgentState.FAILED, AgentState.ESCALATED],
            AgentState.VALIDATING: [
                AgentState.COMPLETED,
                AgentState.INVESTIGATING,
                AgentState.FAILED,
                AgentState.ESCALATED,
            ],
            AgentState.FAILED: [AgentState.INVESTIGATING, AgentState.ESCALATED],
            AgentState.COMPLETED: [],
            AgentState.ESCALATED: [],
        }
        
        if new_state not in valid_transitions.get(self.state, []):
            raise InvalidTransition(f"{self.state.value} -> {new_state.value} não é válida")
        
        previous_state = self.state
        self.state = new_state
        self._persist_state()
        self._emit_event(previous_state, new_state, reason)
    
    def _persist_state(self):
        """Salva estado pra recovery em caso de crash."""
        self.db.upsert("agent_states", {
            "agent_id": self.agent_id,
            "state": self.state.value,
            "context": json.dumps(self.context),
            "updated_at": datetime.now(),
        })
    
    def _emit_event(self, old_state, new_state, reason):
        print(f"[{self.agent_id}] {old_state.value} -> {new_state.value}: {reason}")
```

### Recovery de estado

Se o agent crasheia no meio de uma task, precisa retomar de onde parou. Mesma lógica de checkpointing em pipelines de dados.

```python
import json

def recover_agent(agent_id, db):
    """Retoma agent de onde parou após crash/restart."""
    saved = db.get("agent_states", agent_id)
    
    if not saved:
        return create_new_agent(agent_id)
    
    agent = StatefulAgent(agent_id, db)
    agent.state = AgentState(saved["state"])
    agent.context = json.loads(saved["context"] or "{}")
    
    # Decidir o que fazer baseado no estado salvo
    if agent.state == AgentState.INVESTIGATING:
        return resume_investigation(agent)
    if agent.state == AgentState.AWAITING_APPROVAL:
        return check_approval(agent)
    if agent.state == AgentState.EXECUTING:
        # Perigoso! Validar se ação foi completada ou não
        return verify_execution_status(agent)
    if agent.state == AgentState.VALIDATING:
        return resume_validation(agent)
    
    return agent
```

## Consistência: o problema mais difícil

Memória em agents tem os mesmos problemas de consistência que bancos de dados distribuídos.

### Problemas reais

**Memória contradição**: o agent lembrou que "servidor X tem 16GB RAM" de uma interação antiga, mas o servidor foi upgraded pra 32GB.

**Stale memory**: episódio anterior diz "reiniciar o nginx resolve", mas a arquitetura mudou e agora é containerizado.

**Memory corruption**: o agent "aprende" algo errado de uma interação com hallucination e usa essa informação errada no futuro.

### Estratégias de mitigação

```python
from datetime import datetime, timedelta

class ConsistentMemory:
    def __init__(self):
        self.store = {}
    
    def store_with_ttl(self, key, value, ttl_hours=168):
        """Memórias expiram. Fatos de infra mudam."""
        now = datetime.now()
        self.store[key] = {
            "value": value,
            "stored_at": now,
            "expires_at": now + timedelta(hours=ttl_hours),
            "confidence": 1.0,
            "source": "observation",  # ou "inferred", "told_by_user"
        }
    
    def recall_with_freshness(self, key):
        """Retorna memória com indicação de confiança."""
        entry = self.store.get(key)
        if not entry:
            return None
        
        if datetime.now() >= entry["expires_at"]:
            del self.store[key]
            return None
        
        # Decay confidence over time
        age_hours = (datetime.now() - entry["stored_at"]).total_seconds() / 3600
        freshness = max(0.3, 1.0 - (age_hours / (168 * 2)))
        
        return {
            "value": entry["value"],
            "confidence": entry["confidence"] * freshness,
            "age_hours": age_hours,
            "warning": "Informação pode estar desatualizada" if freshness < 0.5 else None,
        }
    
    def invalidate_on_conflict(self, key, new_observation, ttl_hours=168):
        """Se observação contradiz memória, invalida."""
        existing = self.store.get(key)
        if existing and existing["value"] != new_observation:
            now = datetime.now()
            self.store[key] = {
                "value": new_observation,
                "stored_at": now,
                "expires_at": now + timedelta(hours=ttl_hours),
                "confidence": 0.9,
                "source": "observation",
                "previous_value": existing["value"],
            }
            return {"conflict_detected": True, "old": existing["value"], "new": new_observation}
        
        return {"conflict_detected": False}
```

## Patterns de memória em produção

### 1. Summarization (comprimir histórico)

Quando a conversa fica longa, resumir interações anteriores em vez de manter o histórico completo.

```python
def summarize_old_context(messages, keep_recent=5):
    """Resume mensagens antigas, mantém recentes intactas."""
    if len(messages) <= keep_recent + 1:  # +1 pro system prompt
        return messages
    
    old_messages = messages[1:-keep_recent]  # Exclui system prompt e recentes
    
    summary = client.chat.completions.create(
        model="gpt-4o-mini",  # Modelo barato pra summarization
        messages=[
            {"role": "system", "content": "Resuma a conversa abaixo em 3-5 bullet points, mantendo fatos importantes e decisões tomadas."},
            {"role": "user", "content": format_messages(old_messages)}
        ]
    ).choices[0].message.content
    
    # Montar novo contexto: system + resumo + recentes
    return [
        messages[0],  # system prompt
        {"role": "system", "content": f"Resumo da conversa anterior:\n{summary}"},
        *messages[-keep_recent:]
    ]
```

### 2. Memory as RAG

Tratar todas as memórias como documentos num vector store. O agent "lembra" buscando semanticamente.

```python
from datetime import datetime

def agent_with_memory_rag(task, memory_store):
    # Buscar memórias relevantes pra tarefa atual
    relevant_memories = memory_store.search(task, top_k=5, min_score=0.75)
    
    memory_context = ""
    if relevant_memories:
        memory_context = "\n\nMemórias relevantes de interações anteriores:\n"
        for mem in relevant_memories:
            age = (datetime.now() - mem["created_at"]).days
            memory_context += f"- [{age} dias atrás] {mem['content']}\n"
    
    system_prompt = BASE_PROMPT + memory_context
    return run_agent(task, system_prompt)
```

### 3. Structured memory (key-value com categories)

```python
MEMORY_SCHEMA = {
    "server_facts": {
        # hostname → fatos sobre o servidor
        "web-prod-02": {"ram": "32GB", "known_issues": ["memory leak no Java app"]},
    },
    "procedures": {
        # situação → o que fazer
        "cpu_alta_batch_workers": "Normal entre 02:00-04:00 (ETL). Ignorar.",
    },
    "user_preferences": {
        # user → preferências
        "ricardo": {"verbosity": "low", "preferred_format": "commands_first"},
    }
}
```

## O que levar pra segunda-feira

- **LLMs são stateless.** Toda memória é construída por você. Sem infra de memória, o agent começa do zero toda vez.
- **Short-term é trivial** (histórico de mensagens). Long-term e episodic requerem infra real (vector DB + persistence).
- **Memória envelhece.** Fatos de infra mudam. Implemente TTL e decay de confiança.
- **State recovery é essencial pra produção.** Agents que crasham no meio de uma ação precisam retomar com segurança.
- **Consistência é difícil.** Memórias podem estar erradas ou desatualizadas. Preferir observação recente sobre memória antiga.

No próximo post, vamos falar de **padrões agentic**: os building blocks que combinam pra criar agents mais sofisticados.

## Leitura complementar

- [AI Agents: Memory, State & Consistency](https://lnkd.in/du_8AkYM) (Neo Kim, System Design Newsletter)
- [MemGPT: Towards LLMs as Operating Systems](https://arxiv.org/abs/2310.08560)
- [LangChain Memory documentation](https://python.langchain.com/docs/concepts/memory/)
