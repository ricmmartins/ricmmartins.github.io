---
slug: "projetando-um-assistente-ai-pessoal"
aliases:
  - "/posts/projetando-um-assistente-ai-pessoal/"
title: "Projetando um assistente pessoal com IA"
description: "Um system design de ponta a ponta para um assistente com RAG, memória e ferramentas: requisitos, arquitetura, código, segurança, custo e deploy no Azure."
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
  - "AI por dentro: de tokens a agents"
---

Depois de 13 posts sobre os componentes de um sistema de IA, faltava colocá-los para trabalhar juntos. O projeto deste artigo é um assistente pessoal que responde perguntas sobre infraestrutura usando runbooks, documentação interna e ferramentas de monitoramento.

O desenho é próximo do que eu usaria numa entrevista de system design ou como ponto de partida para um design doc interno. Os exemplos de código são recortes, não uma aplicação pronta para copiar e colocar em produção.

## Requisitos

### O que o assistente precisa fazer

- Responder perguntas sobre infraestrutura baseado em documentação interna
- Executar diagnósticos básicos (métricas, logs, status)
- Manter contexto de conversa (memória de curto prazo)
- Aprender preferências do usuário ao longo do tempo (memória de longo prazo)
- Suportar múltiplos usuários simultaneamente

### Limites de operação

- Latência < 5s pra respostas simples, < 15s pra diagnósticos
- Disponibilidade 99.9% (pode degradar pra "sem tools" se backend cair)
- Custo alvo: ~ $600/mês pra 50 usuários ativos, com espaço pra otimizar
- Segurança: nunca expor secrets, respeitar RBAC

O custo é uma restrição de projeto, não uma promessa. Ele força escolhas explícitas sobre modelo, retenção de memória, tier do Search e quantidade de chamadas por pergunta.

## Arquitetura de alto nível

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 650" style="width:100%;height:auto" role="img" aria-label="Arquitetura de alto nível de um assistente pessoal com interface, API, núcleo do agente, RAG, memória, ferramentas e integrações">
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<rect x="170" y="20" width="640" height="70" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="490" y="49" text-anchor="middle" font-size="14" font-weight="bold" fill="#111111">INTERFACE</text>
<text x="490" y="68" text-anchor="middle" font-size="10" fill="#555555">Web, Slack ou Microsoft Teams</text>

<line x1="490" y1="90" x2="490" y2="120" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />

<rect x="170" y="120" width="640" height="90" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
<text x="490" y="148" text-anchor="middle" font-size="14" font-weight="bold" fill="#111111">API BACKEND</text>
<text x="490" y="167" text-anchor="middle" font-size="10" fill="#555555">FastAPI + WebSocket</text>
<text x="490" y="184" text-anchor="middle" font-size="10" fill="#555555">Entra ID | Sessões | Rate limiting | Streaming</text>

<line x1="490" y1="210" x2="490" y2="260" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />

<rect x="30" y="270" width="250" height="90" rx="8" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<text x="155" y="302" text-anchor="middle" font-size="13" font-weight="bold" fill="#111111">MOTOR RAG</text>
<text x="155" y="321" text-anchor="middle" font-size="10" fill="#555555">Azure AI Search</text>
<text x="155" y="338" text-anchor="middle" font-size="10" fill="#555555">Runbooks e documentação</text>

<rect x="340" y="260" width="300" height="100" rx="8" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<text x="490" y="295" text-anchor="middle" font-size="14" font-weight="bold" fill="#111111">NÚCLEO DO AGENTE</text>
<text x="490" y="316" text-anchor="middle" font-size="10" fill="#555555">LLM + orquestração</text>
<text x="490" y="334" text-anchor="middle" font-size="10" fill="#555555">Decide quando consultar contexto ou executar ferramentas</text>

<rect x="700" y="270" width="250" height="90" rx="8" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<text x="825" y="302" text-anchor="middle" font-size="13" font-weight="bold" fill="#111111">SERVIÇO DE MEMÓRIA</text>
<text x="825" y="321" text-anchor="middle" font-size="10" fill="#555555">Curto prazo: Redis</text>
<text x="825" y="338" text-anchor="middle" font-size="10" fill="#555555">Longo prazo: Cosmos DB</text>

<line x1="280" y1="315" x2="340" y2="315" stroke="#666666" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)" />
<line x1="640" y1="315" x2="700" y2="315" stroke="#666666" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)" />

<line x1="490" y1="360" x2="490" y2="420" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />

<rect x="340" y="420" width="300" height="75" rx="8" fill="#e8f0fe" stroke="#4285f4" stroke-width="2" />
<text x="490" y="448" text-anchor="middle" font-size="13" font-weight="bold" fill="#111111">CAMADA DE FERRAMENTAS</text>
<text x="490" y="467" text-anchor="middle" font-size="10" fill="#555555">Leitura automática | Escrita com confirmação</text>
<text x="490" y="483" text-anchor="middle" font-size="10" fill="#555555">Validação de parâmetros e trilha de auditoria</text>

<line x1="490" y1="495" x2="490" y2="525" stroke="#666666" stroke-width="2" />
<line x1="155" y1="525" x2="825" y2="525" stroke="#666666" stroke-width="2" />
<line x1="155" y1="525" x2="155" y2="555" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="490" y1="525" x2="490" y2="555" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="825" y1="525" x2="825" y2="555" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />

<rect x="40" y="555" width="230" height="65" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="155" y="583" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">AZURE MONITOR</text>
<text x="155" y="601" text-anchor="middle" font-size="10" fill="#555555">Métricas e logs</text>

<rect x="375" y="555" width="230" height="65" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
<text x="490" y="583" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">API DO KUBERNETES</text>
<text x="490" y="601" text-anchor="middle" font-size="10" fill="#555555">Pods e eventos</text>

<rect x="710" y="555" width="230" height="65" rx="8" fill="#f8cecc" stroke="#b85450" stroke-width="2" />
<text x="825" y="583" text-anchor="middle" font-size="12" font-weight="bold" fill="#111111">SISTEMA DE TICKETS</text>
<text x="825" y="601" text-anchor="middle" font-size="10" fill="#555555">Criação de incidentes</text>
</g>
</svg>

O backend autentica o usuário e controla a sessão, mas não decide como responder. Essa responsabilidade fica no núcleo do agente. RAG e memória fornecem contexto; a camada de ferramentas é a única parte autorizada a tocar sistemas externos.

Essa separação evita que uma decisão do modelo vire uma ação sem controle. Consultas de leitura podem rodar automaticamente. Qualquer operação de escrita, como abrir um incidente, precisa de confirmação explícita, validação de parâmetros e registro de auditoria.

> **Sobre os exemplos:** os trechos abaixo mostram as partes relevantes do design. Helpers como `_extract_title()`, `_agent_loop()` e `get_allowed_doc_paths()` foram omitidos para manter o foco na arquitetura.

## Componente 1: motor RAG (documentação)

O RAG recupera os trechos de runbooks e documentação que ajudam a responder cada pergunta. Ele também aplica o filtro de acesso antes de devolver qualquer conteúdo ao modelo.

### Pipeline de indexação

```python
# indexer.py - roda em schedule (diário ou on-push)
import os
from datetime import datetime, timezone
from pathlib import Path

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from azure.search.documents import SearchIndexingBufferedSender
from openai import AzureOpenAI


class DocumentIndexer:
    def __init__(self):
        self.search_client = SearchIndexingBufferedSender(
            endpoint=os.environ["SEARCH_ENDPOINT"],
            index_name="infra-docs",
            credential=DefaultAzureCredential(),
        )
        self.openai = AzureOpenAI(
            azure_endpoint=os.environ["OPENAI_ENDPOINT"],
            azure_ad_token_provider=get_bearer_token_provider(
                DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
            ),
            api_version="2025-04-01-preview",
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
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery
from openai import AzureOpenAI


class RAGEngine:
    def __init__(self):
        self.search_client = SearchClient(
            endpoint=os.environ["SEARCH_ENDPOINT"],
            index_name="infra-docs",
            credential=DefaultAzureCredential(),
        )
        self.openai = AzureOpenAI(
            azure_endpoint=os.environ["OPENAI_ENDPOINT"],
            azure_ad_token_provider=get_bearer_token_provider(
                DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
            ),
            api_version="2025-04-01-preview",
        )

    def search(self, query: str, user_context: dict | None = None, top_k: int = 5):
        """Busca docs relevantes com filtro por permissão."""
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

## Componente 2: núcleo do agente

O Agent Core recebe a pergunta e coordena o restante do sistema. Ele decide quanto contexto recuperar, quando chamar uma ferramenta e quando responder sem fazer nenhuma das duas coisas.

```python
from azure.identity.aio import DefaultAzureCredential, get_bearer_token_provider
from openai import AsyncAzureOpenAI


class AssistantAgent:
    def __init__(self, rag_engine, memory_service, tools):
        self.rag = rag_engine
        self.memory = memory_service
        self.tools = tools
        self.client = AsyncAzureOpenAI(
            azure_endpoint=os.environ["OPENAI_ENDPOINT"],
            azure_ad_token_provider=get_bearer_token_provider(
                DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
            ),
            api_version="2025-04-01-preview",
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

## Componente 3: serviço de memória

Memória de conversa e memória de longo prazo resolvem problemas diferentes. O Redis guarda o histórico recente da sessão. O Cosmos DB mantém apenas fatos e preferências que podem ser úteis em conversas futuras.

```python
import json
import os
from datetime import datetime, timezone
from uuid import uuid4

import redis.asyncio as redis
from azure.cosmos.aio import CosmosClient
from azure.identity.aio import DefaultAzureCredential, get_bearer_token_provider
from openai import AsyncAzureOpenAI


class MemoryService:
    def __init__(self):
        self.redis = redis.from_url(
            os.environ["AZURE_REDIS_CONNECTIONSTRING"],
            decode_responses=True,
        )
        self.cosmos_client = CosmosClient(
            url=os.environ["COSMOS_ENDPOINT"],
            credential=DefaultAzureCredential(),
        )
        self.database = self.cosmos_client.get_database_client("assistant")
        self.memories = self.database.get_container_client("user-memory")
        self.client = AsyncAzureOpenAI(
            azure_endpoint=os.environ["OPENAI_ENDPOINT"],
            azure_ad_token_provider=get_bearer_token_provider(
                DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
            ),
            api_version="2025-04-01-preview",
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
            VectorDistance(c.embedding, @embedding) AS distance
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

        # Em VectorDistance, menor é melhor. O threshold exato depende da métrica escolhida.
        return [item for item in results if item["distance"] < 0.35]

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

## Componente 4: ferramentas do assistente

As ferramentas de leitura ficam disponíveis durante a investigação. Ferramentas que alteram estado exigem confirmação do usuário antes da execução, mesmo quando o modelo já tem todos os parâmetros.

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

## Infraestrutura e deploy

Os comandos abaixo montam a base do ambiente. Em produção, atribua à identidade do Container App somente as permissões de data plane necessárias, como `Cognitive Services OpenAI User`, `Search Index Data Reader`, `Cosmos DB Built-in Data Contributor` e `Monitoring Reader`. A identidade que executa a indexação precisa de `Search Index Data Contributor`.

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
# Serverless e vector search não combinam hoje. Se quiser vector search, use throughput provisionado ou autoscale.
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

# Registry pra imagem do backend
az acr create \
  --name aiassistantacr \
  --resource-group rg-ai-assistant \
  --sku Basic

az acr build \
  --registry aiassistantacr \
  --image ai-assistant:latest .

# Container Apps (backend API)
az containerapp create \
  --name ai-assistant-api \
  --resource-group rg-ai-assistant \
  --environment ai-assistant-env \
  --image aiassistantacr.azurecr.io/ai-assistant:latest \
  --ingress external \
  --target-port 8000 \
  --cpu 1 \
  --memory 2.0Gi \
  --min-replicas 1 \
  --max-replicas 5 \
  --system-assigned

ACR_ID=$(az acr show --name aiassistantacr --resource-group rg-ai-assistant --query id -o tsv)
PRINCIPAL_ID=$(az containerapp show --name ai-assistant-api --resource-group rg-ai-assistant --query identity.principalId -o tsv)

az role assignment create \
  --assignee-object-id "$PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role AcrPull \
  --scope "$ACR_ID"

az containerapp registry set \
  --name ai-assistant-api \
  --resource-group rg-ai-assistant \
  --server aiassistantacr.azurecr.io \
  --identity system
```

### Estimativa de custo

Esta tabela serve como ordem de grandeza para o cenário descrito. Preço de modelo, região, retenção e volume de tokens mudam a conta; valide os valores no Azure Pricing Calculator antes de aprovar orçamento.

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

## Monitoramento e observabilidade

Eu começaria com estas métricas. Elas mostram custo e qualidade da resposta, além da saúde tradicional da API.

| Métrica | Por que importa | Alerta se |
|---------|----------------|-----------|
| Latência p95 | UX degrada acima de 8s | > 10s por 5min |
| Token cost/query | Budget burn rate | > $0.15/query (média) |
| RAG hit rate | Se cai, docs estão desatualizados | < 60% em 1h |
| Escalation rate | "Não sei" frequente = gap no knowledge | > 30% em 1h |
| Tool error rate | Integração quebrada | > 5% em 15min |

Implementação com OpenTelemetry (funciona com Azure Monitor via OTLP exporter):

```python
import os
import time

from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader

reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint=os.environ["OTEL_ENDPOINT"])
)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)
meter = metrics.get_meter("ai-assistant")

query_duration = meter.create_histogram("assistant.query.duration_ms")
query_cost = meter.create_histogram("assistant.query.cost_usd")
rag_hits = meter.create_counter("assistant.rag.hits")
rag_misses = meter.create_counter("assistant.rag.misses")
tool_errors = meter.create_counter("assistant.tools.errors")


async def respond_with_telemetry(agent, user_id, message, session_id):
    start = time.perf_counter()
    tracer = trace.get_tracer("ai-assistant")

    with tracer.start_as_current_span("assistant.respond") as span:
        span.set_attribute("user_id", user_id)
        response = await agent.respond(user_id, message, session_id)
        duration_ms = (time.perf_counter() - start) * 1000
        query_duration.record(duration_ms, {"model": "gpt-4o"})

    return response
```

## Uma ordem prática de implementação

1. Comece com RAG e respostas somente leitura. Isso já testa ingestão, permissões, qualidade de recuperação e custo por pergunta.
2. Adicione uma ferramenta de diagnóstico, também somente leitura, e acompanhe erros e latência antes de integrar outros sistemas.
3. Coloque memória de curto prazo quando a conversa realmente precisar de continuidade. Só grave memória de longo prazo quando houver um caso claro para reutilizar aquele fato.
4. Deixe ferramentas de escrita por último. Exija confirmação, aplique RBAC e registre quem pediu, o que foi executado e qual foi o resultado.

No próximo e último post da série, vamos falar de **AI Coding Workflow**: como usar IA no seu dia a dia como profissional de infraestrutura.

## Leitura complementar

- [Design Personal AI Chat Assistant](https://lnkd.in/d9KG99zV) (Neo Kim, System Design Newsletter)
- [Azure OpenAI on your data](https://learn.microsoft.com/azure/ai-services/openai/concepts/use-your-data)
- [Build a copilot with Azure AI Studio](https://learn.microsoft.com/azure/ai-studio/tutorials/deploy-copilot-ai-studio)
