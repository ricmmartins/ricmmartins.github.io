---
slug: "projetando-um-assistente-ai-pessoal"
aliases:
  - "/posts/projetando-um-assistente-ai-pessoal/"
title: "Projetando um assistente AI pessoal"
description: "System design completo de um chat assistant com RAG, memória e tools. Do requirement ao deploy, como exercício prático que junta tudo que cobrimos na série."
date: 2026-08-01T10:00:00-04:00
categories:
  - AI
  - Arquitetura
tags:
  - ai-engineering
  - chat-assistant
  - design
  - rag
  - projeto-pratico
series:
  - "AI Engineering pra quem é de infra"
---

Você leu 13 posts dessa série. Agora vamos juntar tudo num projeto real: um assistente AI pessoal que responde perguntas sobre sua infraestrutura usando seus runbooks, documentação interna, e ferramentas de monitoramento.

Não é um toy project. É um system design completo, do tipo que você faria numa entrevista ou num design doc interno.

## Requirements

**Funcional:**
- Responder perguntas sobre infraestrutura baseado em documentação interna
- Executar diagnósticos básicos (métricas, logs, status)
- Manter contexto de conversa (memória de curto prazo)
- Aprender preferências do usuário ao longo do tempo (memória de longo prazo)
- Suportar múltiplos usuários simultaneamente

**Não-funcional:**
- Latência < 5s pra respostas simples, < 15s pra diagnósticos
- Disponibilidade 99.9% (pode degradar pra "sem tools" se backend cair)
- Custo alvo: ~ $600/mês pra 50 usuários ativos, com espaço pra otimizar
- Segurança: nunca expor secrets, respeitar RBAC

## Arquitetura de alto nível

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 556" style="width:100%;height:auto" role="img" aria-label="Arquitetura de alto nível de um assistente pessoal com frontend, backend, RAG, agent core, memória e integrações">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
    </marker>
  </defs>
  <g font-family="Segoe UI, Arial, sans-serif">
    <rect x="170" y="20" width="620" height="76" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
    <text x="480" y="54.5" text-anchor="middle" font-size="14" font-weight="bold" fill="#111111">FRONTEND</text>
    <text x="480" y="69.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">Web UI (chat interface) ou Slack/Teams integration</text>
    <line x1="480" y1="102" x2="480" y2="146" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
    <text x="480" y="166.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">WebSocket/HTTP</text>
    <rect x="150" y="140" width="660" height="120" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
    <text x="480" y="181.5" text-anchor="middle" font-size="14" font-weight="bold" fill="#111111">BACKEND API</text>
    <text x="480" y="196.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">FastAPI + WebSocket</text>
    <text x="480" y="211.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">- Auth (Entra ID)</text>
    <text x="480" y="226.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">- Session management</text>
    <text x="480" y="241.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">- Rate limiting</text>
    <path d="M 144 200 V 284 H 276 V 368" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
    <path d="M 480 266 V 290 H 480 V 314" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
    <path d="M 816 200 H 730 V 368 H 644" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
    <rect x="50" y="320" width="220" height="96" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
    <text x="160" y="357" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">RAG Engine</text>
    <text x="160" y="372" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">Azure AI Search</text>
    <text x="160" y="387" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">(docs index)</text>
    <rect x="370" y="320" width="220" height="96" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
    <text x="480" y="357" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Agent Core</text>
    <text x="480" y="372" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">LLM + Tools</text>
    <text x="480" y="387" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">(GPT-4o)</text>
    <rect x="650" y="320" width="280" height="96" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
    <text x="790" y="357" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Memory Service</text>
    <text x="790" y="372" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">Short-term: Redis</text>
    <text x="790" y="387" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">Long-term: Cosmos DB</text>
    <path d="M 364 368 V 433 H 256 V 498" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
    <path d="M 480 422 V 443 H 480 V 464" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
    <path d="M 596 368 V 433 H 694 V 498" stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)" />
    <rect x="80" y="470" width="170" height="56" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
    <text x="165" y="494.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Azure Monitor</text>
    <text x="165" y="509.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">(metrics)</text>
    <rect x="405" y="470" width="150" height="56" rx="6" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
    <text x="480" y="494.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">K8s API</text>
    <text x="480" y="509.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">(pods)</text>
    <rect x="700" y="470" width="190" height="56" rx="6" fill="#f8cecc" stroke="#b85450" stroke-width="2" />
    <text x="795" y="494.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">Ticket System</text>
    <text x="795" y="509.5" text-anchor="middle" font-size="10" font-weight="normal" fill="#555555">(create)</text>
  </g>
</svg>

## Componente 1: RAG Engine (documentação)

Pra responder perguntas sobre runbooks e documentação interna.

### Pipeline de indexação

```python
# indexer.py - roda em schedule (diário ou on-push)
import os
from datetime import datetime, timezone
from pathlib import Path

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchIndexingBufferedSender
from openai import AzureOpenAI


class DocumentIndexer:
    def __init__(self):
        self.search_client = SearchIndexingBufferedSender(
            endpoint=os.environ["SEARCH_ENDPOINT"],
            index_name="infra-docs",
            credential=AzureKeyCredential(os.environ["SEARCH_KEY"]),
        )
        self.openai = AzureOpenAI(
            azure_endpoint=os.environ["OPENAI_ENDPOINT"],
            api_key=os.environ["OPENAI_KEY"],
            api_version="2024-06-01",
        )

    def index_directory(self, docs_path: str):
        """Indexa todos os .md do diretório de docs."""
        docs_dir = Path(docs_path)

        for md_file in docs_dir.rglob("*.md"):
            content = md_file.read_text(encoding="utf-8")
            title = self._extract_title(content)
            chunks = self._chunk_by_sections(content)

            for i, chunk in enumerate(chunks):
                doc = {
                    "id": f"{md_file.stem}-{i}",
                    "title": title,
                    "content": chunk["text"],
                    "section": chunk["heading"],
                    "source_file": str(md_file.relative_to(docs_dir)),
                    "embedding": self._embed(chunk["text"]),
                    "last_updated": datetime.fromtimestamp(
                        md_file.stat().st_mtime, tz=timezone.utc
                    ).isoformat(),
                }
                self.search_client.upload_documents([doc])

        self.search_client.flush()

    def _chunk_by_sections(self, markdown_text: str) -> list[dict]:
        """Divide por headers markdown, mantendo hierarquia."""
        chunks = []
        current_heading = ""
        current_text = []

        for line in markdown_text.split("\n"):
            if line.startswith("## ") or line.startswith("### "):
                if current_text:
                    chunks.append(
                        {
                            "heading": current_heading,
                            "text": "\n".join(current_text),
                        }
                    )
                current_heading = line.lstrip("# ").strip()
                current_text = [line]
            else:
                current_text.append(line)

        if current_text:
            chunks.append({"heading": current_heading, "text": "\n".join(current_text)})

        return chunks

    def _embed(self, text: str) -> list[float]:
        response = self.openai.embeddings.create(
            input=[text[:8000]],
            model="text-embedding-3-small",
        )
        return response.data[0].embedding
```

### Query com hybrid search

```python
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery
from openai import AzureOpenAI


class RAGEngine:
    def __init__(self):
        self.search_client = SearchClient(
            endpoint=os.environ["SEARCH_ENDPOINT"],
            index_name="infra-docs",
            credential=AzureKeyCredential(os.environ["SEARCH_KEY"]),
        )
        self.openai = AzureOpenAI(
            azure_endpoint=os.environ["OPENAI_ENDPOINT"],
            api_key=os.environ["OPENAI_KEY"],
            api_version="2024-06-01",
        )

    def search(self, query: str, user_context: dict | None = None, top_k: int = 5):
        """Busca docs relevantes com filtering por permissão."""
        filter_expr = None
        if user_context and user_context.get("team"):
            allowed_paths = get_allowed_doc_paths(user_context["team"])
            filter_expr = " or ".join(
                f"source_file eq '{path}'" for path in allowed_paths
            )

        query_vector = self._embed(query)
        vector_query = VectorizedQuery(
            vector=query_vector,
            k_nearest_neighbors=top_k,
            fields="embedding",
            kind="vector",
            exhaustive=True,
        )

        results = self.search_client.search(
            search_text=query,
            vector_queries=[vector_query],
            filter=filter_expr,
            select=["title", "content", "source_file", "section"],
            top=top_k,
        )

        return [
            {
                "title": item["title"],
                "content": item["content"],
                "source": item["source_file"],
                "score": item["@search.score"],
            }
            for item in results
        ]

    def _embed(self, text: str) -> list[float]:
        response = self.openai.embeddings.create(
            input=[text],
            model="text-embedding-3-small",
        )
        return response.data[0].embedding
```

## Componente 2: Agent Core

O cérebro do assistente. Recebe a pergunta, decide se precisa de RAG, tools, ou ambos.

```python
from openai import AsyncAzureOpenAI


class AssistantAgent:
    def __init__(self, rag_engine, memory_service, tools):
        self.rag = rag_engine
        self.memory = memory_service
        self.tools = tools
        self.client = AsyncAzureOpenAI(
            azure_endpoint=os.environ["OPENAI_ENDPOINT"],
            api_key=os.environ["OPENAI_KEY"],
            api_version="2024-06-01",
        )

    async def respond(self, user_id: str, message: str, session_id: str):
        short_term = await self.memory.get_conversation(session_id)
        long_term = await self.memory.recall_relevant(user_id, message)
        rag_context = self.rag.search(message, top_k=3)

        messages = self._build_messages(
            user_message=message,
            conversation_history=short_term,
            user_memories=long_term,
            rag_docs=rag_context,
        )

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=self.tools,
            temperature=0.1,
        )

        final_response = await self._agent_loop(response, messages, max_iter=5)
        await self.memory.save_turn(session_id, message, final_response)
        await self.memory.maybe_store_long_term(user_id, message, final_response)
        return final_response

    def _build_messages(self, user_message, conversation_history, user_memories, rag_docs):
        system_prompt = """Você é um assistente de infraestrutura da empresa Acme.

Regras:
- Responda baseado nos documentos fornecidos e resultados de ferramentas.
- Se não sabe, diga "não encontrei nos runbooks".
- Inclua referência ao documento fonte quando aplicável.
- Se o problema requer ação, sugira os steps mas peça confirmação antes de executar.
- Seja direto. Comandos primeiro, explicação depois.
"""

        messages = [{"role": "system", "content": system_prompt}]

        if user_memories:
            mem_text = "\n".join(f"- {memory['content']}" for memory in user_memories)
            messages.append(
                {
                    "role": "system",
                    "content": f"Contexto do histórico deste usuário:\n{mem_text}",
                }
            )

        messages.extend(conversation_history[-10:])

        rag_text = ""
        if rag_docs:
            rag_text = "\n\nDocumentos relevantes:\n"
            for doc in rag_docs:
                rag_text += f"\n[{doc['source']}] {doc['title']}:\n{doc['content']}\n"

        messages.append({"role": "user", "content": f"{user_message}{rag_text}"})
        return messages
```

## Componente 3: Memory Service

```python
import json
import os
from datetime import datetime, timezone
from uuid import uuid4

import redis.asyncio as redis
from azure.cosmos.aio import CosmosClient
from openai import AsyncAzureOpenAI


class MemoryService:
    def __init__(self):
        self.redis = redis.from_url(
            os.environ["AZURE_REDIS_CONNECTIONSTRING"],
            decode_responses=True,
        )
        self.cosmos_client = CosmosClient.from_connection_string(
            os.environ["COSMOS_CONNECTION_STRING"]
        )
        self.database = self.cosmos_client.get_database_client("assistant")
        self.memories = self.database.get_container_client("user-memory")
        self.client = AsyncAzureOpenAI(
            azure_endpoint=os.environ["OPENAI_ENDPOINT"],
            api_key=os.environ["OPENAI_KEY"],
            api_version="2024-06-01",
        )

    async def get_conversation(self, session_id: str):
        data = await self.redis.get(f"session:{session_id}")
        return json.loads(data) if data else []

    async def save_turn(self, session_id: str, user_msg: str, assistant_msg: str):
        conv = await self.get_conversation(session_id)
        conv.append({"role": "user", "content": user_msg})
        conv.append({"role": "assistant", "content": assistant_msg})

        if len(conv) > 40:
            conv = conv[-40:]

        await self.redis.set(f"session:{session_id}", json.dumps(conv), ex=3600)

    async def recall_relevant(self, user_id: str, query: str, top_k: int = 3):
        query_embedding = await self._embed(query)
        sql = f"""
        SELECT TOP {top_k}
            c.id,
            c.content,
            VectorDistance(c.embedding, @embedding) AS similarity
        FROM c
        WHERE c.user_id = @user_id
        ORDER BY VectorDistance(c.embedding, @embedding)
        """

        results = []
        async for item in self.memories.query_items(
            query=sql,
            parameters=[
                {"name": "@user_id", "value": user_id},
                {"name": "@embedding", "value": query_embedding},
            ],
            enable_cross_partition_query=True,
        ):
            results.append(item)

        return [item for item in results if item["similarity"] > 0.7]

    async def maybe_store_long_term(self, user_id, user_msg, assistant_msg):
        should_store = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Analise a conversa. Se contém um FATO novo sobre a infraestrutura ou uma PREFERÊNCIA do usuário que vale lembrar no futuro, extraia. Se não, responda 'NONE'.",
                },
                {
                    "role": "user",
                    "content": f"User: {user_msg}\nAssistant: {assistant_msg}",
                },
            ],
        )

        fact = (should_store.choices[0].message.content or "").strip()
        if fact and fact != "NONE":
            await self.memories.upsert_item(
                {
                    "id": str(uuid4()),
                    "user_id": user_id,
                    "content": fact,
                    "embedding": await self._embed(fact),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )

    async def _embed(self, text: str) -> list[float]:
        response = await self.client.embeddings.create(
            model="text-embedding-3-small",
            input=[text[:8000]],
        )
        return response.data[0].embedding
```

## Componente 4: Tools do assistente

```python
ASSISTANT_TOOLS = [
    # Read-only (sempre disponíveis)
    {
        "type": "function",
        "function": {
            "name": "get_resource_metrics",
            "description": "Retorna métricas de um recurso Azure (CPU, memória, requests, errors)",
            "parameters": {
                "type": "object",
                "properties": {
                    "resource_name": {"type": "string"},
                    "metric": {"type": "string", "enum": ["cpu", "memory", "requests", "errors", "latency"]},
                    "timespan": {"type": "string", "default": "PT1H"}
                },
                "required": ["resource_name", "metric"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_pod_status",
            "description": "Lista pods com status e restarts em um namespace AKS",
            "parameters": {
                "type": "object",
                "properties": {
                    "namespace": {"type": "string"},
                    "label_selector": {"type": "string", "description": "Ex: app=api-server"}
                },
                "required": ["namespace"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_logs",
            "description": "Retorna logs recentes de um container/serviço",
            "parameters": {
                "type": "object",
                "properties": {
                    "resource": {"type": "string"},
                    "lines": {"type": "integer", "default": 50},
                    "filter": {"type": "string", "description": "Filtro KQL opcional"}
                },
                "required": ["resource"]
            }
        }
    },
    # Write (requerem confirmação)
    {
        "type": "function",
        "function": {
            "name": "create_incident",
            "description": "Cria incidente no sistema de ITSM. USE APENAS quando solicitado pelo usuário.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "severity": {"type": "string", "enum": ["P1", "P2", "P3", "P4"]},
                    "description": {"type": "string"},
                    "assigned_team": {"type": "string"}
                },
                "required": ["title", "severity", "description"]
            }
        }
    }
]
```

## Infra e deploy

```bash
# Infraestrutura necessária
az group create --name rg-ai-assistant --location eastus2

# Azure OpenAI (GPT-4o + embeddings)
az cognitiveservices account create \
  --name ai-assistant-openai \
  --resource-group rg-ai-assistant \
  --kind OpenAI \
  --sku S0 \
  --location eastus2

# Azure AI Search (RAG)
az search service create \
  --name ai-assistant-search \
  --resource-group rg-ai-assistant \
  --location eastus2 \
  --sku standard

# Redis (short-term memory)
az redis create \
  --name ai-assistant-cache \
  --resource-group rg-ai-assistant \
  --location eastus2 \
  --sku Standard \
  --vm-size c1

# Cosmos DB for NoSQL (long-term memory + vector)
# Serverless e vector search não combinam hoje. Se quiser vector search, use throughput provisionado/autoscale.
az cosmosdb create \
  --name ai-assistant-cosmos \
  --resource-group rg-ai-assistant \
  --locations regionName=eastus2 failoverPriority=0 isZoneRedundant=False \
  --capabilities EnableNoSQLVectorSearch

# Container Apps environment
az containerapp env create \
  --name ai-assistant-env \
  --resource-group rg-ai-assistant \
  --location eastus2

# Container Apps (backend API)
az containerapp create \
  --name ai-assistant-api \
  --resource-group rg-ai-assistant \
  --environment ai-assistant-env \
  --image acr.azurecr.io/ai-assistant:latest \
  --registry-server acr.azurecr.io \
  --ingress external \
  --target-port 8000 \
  --cpu 1 \
  --memory 2.0Gi \
  --min-replicas 1 \
  --max-replicas 5
```

### Estimativa de custo

| Componente | SKU | Custo/mês |
|-----------|-----|-----------|
| Azure OpenAI (GPT-4o) | Pay-per-token | ~$150 (50 users × 20 queries/dia) |
| Azure OpenAI (embedding) | Pay-per-token | ~$5 |
| Azure AI Search | Standard S1 | ~$250 |
| Redis | Standard C1 | ~$80 |
| Cosmos DB for NoSQL | Provisioned throughput com vector search | ~$60-120 |
| Container Apps | 1-5 replicas | ~$30-100 |
| **Total** | | **~$575-705/mês** |

Pra otimizar:
- Use GPT-4o-mini pra classificação, memory extraction e caminho padrão quando a tarefa for simples
- Cache respostas pra perguntas repetidas no Redis
- Azure AI Search Basic em vez de Standard se < 15 indexes ($75 vs $250)
- Se a meta for ficar abaixo de $500/mês, esse é o primeiro corte que eu faria: modelo menor no caminho feliz + Search Basic quando couber

## Monitoring e observabilidade

```python
# Métricas do assistente
import time
from dataclasses import dataclass

@dataclass
class AssistantMetrics:
    total_queries: int = 0
    avg_latency_ms: float = 0
    tool_calls_per_query: float = 0
    rag_hit_rate: float = 0  # % queries que usaram RAG
    escalation_rate: float = 0  # % que disse "não sei"
    cost_per_query: float = 0
    
    def log_query(self, latency_ms, tools_used, rag_used, escalated, cost):
        self.total_queries += 1
        # Rolling average
        self.avg_latency_ms = (self.avg_latency_ms * (self.total_queries - 1) + latency_ms) / self.total_queries
        # ... atualizar demais métricas
```

## O que levar pra segunda-feira

- **O design é composição dos conceitos da série.** RAG (post 4), context engineering (post 5), agent loop (post 8), memory (post 10), tools (post 9).
- **Comece simples.** RAG + LLM sem tools já entrega 70% do valor. Adicione tools depois.
- **Custo é controlável.** Modelo menor pra tasks simples, caching, rate limiting.
- **Memória diferencia um chatbot de um assistente.** Short-term pra conversa, long-term pra preferências e fatos.
- **Security from day 1.** RBAC nos docs, auth no API, validação nas tools.

No próximo e último post da série, vamos falar de **AI Coding Workflow**: como usar AI no seu dia a dia como profissional de infraestrutura.

## Leitura complementar

- [Design Personal AI Chat Assistant](https://lnkd.in/d9KG99zV) (Neo Kim, System Design Newsletter)
- [Azure OpenAI on your data](https://learn.microsoft.com/azure/ai-services/openai/concepts/use-your-data)
- [Build a copilot with Azure AI Studio](https://learn.microsoft.com/azure/ai-studio/tutorials/deploy-copilot-ai-studio)
