---
slug: "como-rag-funciona-da-teoria-ao-pipeline"
aliases:
  - "/posts/como-rag-funciona-da-teoria-ao-pipeline/"
title: "Como RAG funciona: da teoria ao pipeline"
description: "Retrieval-Augmented Generation desmontado em peças. Como conectar seus documentos internos a um LLM sem fine-tuning, com exemplos reais em Azure AI Search."
date: 2026-07-02T10:00:00-04:00
categories:
  - AI
  - Arquitetura
tags:
  - ai-engineering
  - rag
  - azure-ai-search
  - embeddings
  - retrieval
series:
  - "AI por dentro: de tokens a agents"
---

O VP de produto chega na daily: "Quero que o chatbot responda perguntas sobre nossa documentação interna. Tem 2000 páginas de runbooks, políticas, e procedimentos. O ChatGPT não sabe nada disso."

O time de ML responde: "Vamos implementar RAG."

Todo mundo concorda. Você fica com a tarefa de provisionar a infra. Mas antes de subir recursos, vale entender o que RAG realmente faz por dentro.

## O mapa pro profissional de infra

| Conceito RAG | O que faz | Equivalente em infra |
|--------------|-----------|---------------------|
| **Retrieval** | Buscar documentos relevantes | Query no search engine |
| **Augmentation** | Adicionar docs ao prompt do LLM | Montar o payload do request |
| **Generation** | LLM gera resposta usando o contexto | O response do modelo |
| **Chunking** | Dividir documentos em pedaços menores | Partition de dados, sharding |
| **Indexing pipeline** | Processar docs e gerar embeddings | ETL/data pipeline |
| **Hybrid search** | Combinar busca semântica + keyword | Usar CDN + origin server |

## O problema que RAG resolve

LLMs têm duas limitações fundamentais:

1. **Knowledge cutoff**: o modelo só sabe o que viu durante treinamento. Seus runbooks internos não estão lá.
2. **Context window finito**: mesmo que você pudesse colar 2000 páginas no prompt, não caberia (e seria absurdamente caro em tokens).

RAG resolve ambas: busca apenas os trechos relevantes e injeta no prompt. O modelo "vê" a informação necessária sem precisar ter sido treinado nela.

```
Sem RAG:
Usuário: "Qual o procedimento pra failover do banco?"
LLM: "Em geral, failover envolve..." (resposta genérica, pode estar errada)

Com RAG:
Usuário: "Qual o procedimento pra failover do banco?"
[Sistema busca nos runbooks → encontra o doc "DR-003: Failover PostgreSQL"]
LLM recebe: prompt + conteúdo do doc DR-003
LLM: "Segundo o procedimento DR-003, execute: 1. Verificar replicação..." (resposta específica)
```

## O pipeline completo

RAG tem duas fases: **indexação** (offline, periódica) e **query** (online, a cada pergunta).

### Fase 1: Indexação (offline)

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 210" width="100%" role="img" aria-labelledby="rag-indexing-title">
<title id="rag-indexing-title">Pipeline de indexação do RAG</title>
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<rect x="20" y="42" width="160" height="70" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
<text x="100" y="73.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Documentos</text>
<text x="100" y="88.5" text-anchor="middle" font-size="10" fill="#555555">(source)</text>
<rect x="240" y="42" width="160" height="70" rx="8" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<text x="320" y="73.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Chunking</text>
<text x="320" y="88.5" text-anchor="middle" font-size="10" fill="#555555">(split)</text>
<rect x="460" y="42" width="160" height="70" rx="8" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<text x="540" y="73.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Embedding</text>
<text x="540" y="88.5" text-anchor="middle" font-size="10" fill="#555555">(model)</text>
<rect x="680" y="42" width="160" height="70" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="760" y="73.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Vector DB</text>
<text x="760" y="88.5" text-anchor="middle" font-size="10" fill="#555555">(index)</text>
<line x1="186" y1="77" x2="246" y2="77" stroke="#666666" stroke-width="2.5" marker-end="url(#arrow)" />
<line x1="406" y1="77" x2="466" y2="77" stroke="#666666" stroke-width="2.5" marker-end="url(#arrow)" />
<line x1="626" y1="77" x2="686" y2="77" stroke="#666666" stroke-width="2.5" marker-end="url(#arrow)" />
<line x1="320" y1="112" x2="320" y2="138" stroke="#666666" stroke-width="2" />
<line x1="540" y1="112" x2="540" y2="138" stroke="#666666" stroke-width="2" />
<text x="320" y="160" text-anchor="middle" font-size="10" fill="#555555">Pedaços de</text>
<text x="320" y="176" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">500-1000 tokens</text>
<text x="540" y="160" text-anchor="middle" font-size="10" fill="#555555">Vetor pra</text>
<text x="540" y="176" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">cada pedaço</text>
</g>
</svg>

**Documentos**: PDFs, wikis, runbooks, tickets, código. Qualquer coisa com texto.

**Chunking**: dividir documentos em pedaços que cabem no context window. Tipicamente 500-1000 tokens por chunk. Com overlap de 100-200 tokens entre chunks pra não perder contexto na fronteira.

**Embedding**: cada chunk vira um vetor via modelo de embedding (text-embedding-3-small, por exemplo).

**Vector DB**: vetores são armazenados no índice pra busca posterior.

### Fase 2: Query (online)

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1130 290" width="100%" role="img" aria-labelledby="rag-query-title">
<title id="rag-query-title">Pipeline de query do RAG</title>
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<rect x="20" y="42" width="160" height="70" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
<text x="100" y="73.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Pergunta</text>
<text x="100" y="88.5" text-anchor="middle" font-size="10" fill="#555555">do user</text>
<rect x="220" y="42" width="160" height="70" rx="8" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<text x="300" y="73.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Embedding</text>
<text x="300" y="88.5" text-anchor="middle" font-size="10" fill="#555555">(query)</text>
<rect x="420" y="42" width="160" height="70" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="500" y="73.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Vector DB</text>
<text x="500" y="88.5" text-anchor="middle" font-size="10" fill="#555555">(search)</text>
<rect x="620" y="42" width="160" height="70" rx="8" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<text x="700" y="73.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Top K</text>
<text x="700" y="88.5" text-anchor="middle" font-size="10" fill="#555555">chunks</text>
<rect x="610" y="170" width="190" height="86" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
<text x="705" y="194.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Prompt:</text>
<text x="705" y="209.5" text-anchor="middle" font-size="10" fill="#555555">sistema +</text>
<text x="705" y="224.5" text-anchor="middle" font-size="10" fill="#555555">chunks +</text>
<text x="705" y="239.5" text-anchor="middle" font-size="10" fill="#555555">pergunta</text>
<rect x="850" y="178" width="110" height="70" rx="8" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<text x="905" y="217" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">LLM</text>
<rect x="1000" y="178" width="100" height="70" rx="8" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<text x="1050" y="217" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Resposta</text>
<line x1="186" y1="77" x2="226" y2="77" stroke="#666666" stroke-width="2.5" marker-end="url(#arrow)" />
<line x1="386" y1="77" x2="426" y2="77" stroke="#666666" stroke-width="2.5" marker-end="url(#arrow)" />
<line x1="586" y1="77" x2="626" y2="77" stroke="#666666" stroke-width="2.5" marker-end="url(#arrow)" />
<line x1="701.5" y1="118" x2="703.6" y2="176" stroke="#666666" stroke-width="2.5" marker-end="url(#arrow)" />
<line x1="806" y1="213" x2="856" y2="213" stroke="#666666" stroke-width="2.5" marker-end="url(#arrow)" />
<line x1="966" y1="213" x2="1006" y2="213" stroke="#666666" stroke-width="2.5" marker-end="url(#arrow)" />
</g>
</svg>

1. Pergunta do usuário é transformada em embedding
2. Vector DB busca os K chunks mais similares (tipicamente 3-10)
3. Chunks são inseridos no prompt junto com a pergunta
4. LLM gera resposta baseada no contexto fornecido

## Implementação prática com Azure AI Search

Vamos montar um pipeline RAG básico. Azure AI Search é a opção managed mais completa porque oferece **hybrid search** (vector + keyword) que melhora significativamente a qualidade dos resultados.

### Passo 1: Criar os recursos

```bash
# Criar resource group
az group create --name rg-rag-demo --location eastus2

# Criar Azure AI Search
az search service create \
  --name rag-demo-search \
  --resource-group rg-rag-demo \
  --sku standard \
  --partition-count 1 \
  --replica-count 1

# Criar Azure OpenAI (pra embeddings e chat)
az cognitiveservices account create \
  --name rag-demo-openai \
  --resource-group rg-rag-demo \
  --kind OpenAI \
  --sku S0 \
  --location eastus2

# Deploy do modelo de embedding
az cognitiveservices account deployment create \
  --name rag-demo-openai \
  --resource-group rg-rag-demo \
  --deployment-name text-embedding-3-small \
  --model-name text-embedding-3-small \
  --model-version "1" \
  --model-format OpenAI \
  --sku-capacity 1 \
  --sku-name Standard

# Deploy do modelo de chat
az cognitiveservices account deployment create \
  --name rag-demo-openai \
  --resource-group rg-rag-demo \
  --deployment-name gpt-4o \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-capacity 1 \
  --sku-name Standard
```

### Passo 2: Criar o índice com suporte a vector + text

```bash
# Criar índice via REST API
az rest --method PUT \
  --url "https://rag-demo-search.search.windows.net/indexes/runbooks?api-version=2024-07-01" \
  --headers "Content-Type=application/json" "api-key=<admin-key>" \
  --body '{
    "name": "runbooks",
    "fields": [
      {"name": "id", "type": "Edm.String", "key": true, "filterable": true},
      {"name": "title", "type": "Edm.String", "searchable": true},
      {"name": "content", "type": "Edm.String", "searchable": true},
      {"name": "source_file", "type": "Edm.String", "filterable": true},
      {"name": "chunk_index", "type": "Edm.Int32", "filterable": true},
      {"name": "embedding", "type": "Collection(Edm.Single)",
       "searchable": true, "retrievable": false, "stored": false,
       "dimensions": 1536, "vectorSearchProfile": "rag-profile"}
    ],
    "vectorSearch": {
      "algorithms": [{"name": "hnsw-config", "kind": "hnsw", 
        "hnswParameters": {"m": 4, "efConstruction": 400, "efSearch": 500, "metric": "cosine"}}],
      "profiles": [{"name": "rag-profile", "algorithm": "hnsw-config"}]
    }
  }'
```

### Passo 3: Chunking e indexação (Python)

```python
import os
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from openai import AzureOpenAI

# Configuração
search_client = SearchClient(
    endpoint="https://rag-demo-search.search.windows.net",
    index_name="runbooks",
    credential=AzureKeyCredential(os.environ["SEARCH_KEY"])
)

openai_client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-06-01"
)

def chunk_text(text, chunk_size=800, overlap=200):
    """Divide texto em chunks com overlap."""
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start = end - overlap
    return chunks

def get_embedding(text):
    """Gera embedding via Azure OpenAI."""
    response = openai_client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

def index_document(file_path, title):
    """Processa e indexa um documento."""
    with open(file_path, "r") as f:
        content = f.read()
    
    chunks = chunk_text(content)
    documents = []
    
    for i, chunk in enumerate(chunks):
        doc = {
            "id": f"{os.path.basename(file_path)}-{i}",
            "title": title,
            "content": chunk,
            "source_file": file_path,
            "chunk_index": i,
            "embedding": get_embedding(chunk)
        }
        documents.append(doc)
    
    search_client.upload_documents(documents=documents)
    print(f"Indexado: {title} ({len(chunks)} chunks)")
```

### Passo 4: Query com hybrid search

```python
from azure.search.documents.models import VectorizedQuery

def rag_query(question, top_k=5):
    """Busca documentos relevantes e gera resposta."""
    
    question_vector = get_embedding(question)

    # Hybrid search: vector + keyword
    results = search_client.search(
        search_text=question,  # keyword search
        vector_queries=[
            VectorizedQuery(
                vector=question_vector,
                k_nearest_neighbors=top_k,
                fields="embedding",
                kind="vector"
            )
        ],
        top=top_k
    )
    
    # Montar contexto com os chunks encontrados
    context_parts = []
    for result in results:
        context_parts.append(f"[{result['title']}]\n{result['content']}")
    
    context = "\n\n---\n\n".join(context_parts)
    
    # Gerar resposta com o LLM
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": 
             "Responda a pergunta usando APENAS o contexto fornecido. "
             "Se a informação não estiver no contexto, diga que não encontrou."},
            {"role": "user", "content": 
             f"Contexto:\n{context}\n\nPergunta: {question}"}
        ],
        temperature=0.1
    )
    
    return response.choices[0].message.content
```

## Chunking: a decisão mais subestimada

Chunking parece simples ("divide o texto em pedaços"), mas a estratégia de chunking afeta diretamente a qualidade das respostas.

| Estratégia | Como funciona | Prós | Contras |
|-----------|--------------|------|---------|
| **Fixed size** | Divide a cada N tokens | Simples, previsível | Pode cortar no meio de uma frase |
| **Sentence-based** | Divide em sentenças completas | Mantém coerência | Chunks de tamanho variável |
| **Semantic** | Agrupa por tópico/seção | Melhor contexto | Mais complexo, precisa de modelo |
| **Document structure** | Usa headers/sections do doc | Respeita estrutura original | Depende de docs bem formatados |
| **Overlap** | Chunks compartilham N tokens nas bordas | Não perde contexto na fronteira | Mais storage, mais tokens indexados |

Regra prática: comece com fixed size (800 tokens) + overlap (200 tokens). Refine depois baseado nos resultados.

## Hybrid search: por que keyword + vector é melhor que vector sozinho

Busca puramente vetorial tem um problema: termos técnicos específicos (nomes de serviços, códigos de erro, IDs) às vezes não são bem capturados por embeddings. "ERR_AKS_NODEPOOL_SCALE_FAILED" pode ter embedding parecido com qualquer erro de AKS, mas você quer o documento que menciona exatamente esse código.

Hybrid search combina:
- **Vector search**: encontra documentos semanticamente relacionados
- **Keyword search (BM25)**: encontra documentos com termos exatos

Azure AI Search faz isso nativamente e combina os scores com **Reciprocal Rank Fusion (RRF)**.

## Custos em produção

| Componente | Custo aproximado | Escala com |
|-----------|-----------------|-----------|
| Azure AI Search (Standard S1) | ~$250/mês por search unit | Número de documentos e queries |
| Embedding generation (indexação) | ~$0.02 por 1M tokens de input | Volume de documentos |
| Embedding generation (query) | Negligível | Queries são curtas |
| LLM (GPT-4o Global Standard) | ~$2.50/1M input, ~$7.50/1M output | Número de queries |
| Storage (embeddings) | Incluído no Search | Dimensão × quantidade |

Pra 10.000 documentos (~50MB de texto), indexar custa ~$5 em embeddings. Servir 1000 queries/dia com 5 chunks cada, ~$15/dia em tokens de LLM.

## Problemas comuns e como resolver

**"O modelo está alucinando mesmo com RAG"**
- Chunks recuperados não são relevantes (problema de retrieval, não de generation)
- Temperature muito alta (baixe pra 0-0.2 pra tarefas factuais)
- System prompt fraco (instrua explicitamente: "responda APENAS com base no contexto")

**"As respostas são genéricas demais"**
- Chunks muito grandes (perde especificidade)
- Top-K muito alto (muitos chunks irrelevantes diluem o sinal)
- Falta de metadata filtering (não está filtrando por categoria/data)

**"Indexação demora muito"**
- Batch as chamadas de embedding (Azure OpenAI aceita até 2048 inputs por request)
- Paralelizar com cuidado no rate limit
- Considere embedding models menores pra prototipação (text-embedding-3-small vs large)

## O que levar pra segunda-feira

- **RAG não é mágica.** É search + LLM. Se o search retorna lixo, o LLM responde com lixo contextualizado.
- **Chunking importa mais do que parece.** Invista tempo testando estratégias diferentes pro seu tipo de documento.
- **Hybrid search > vector-only.** Sempre. Especialmente com documentação técnica cheia de termos específicos.
- **Monitore retrieval separado de generation.** Se o modelo erra, primeiro verifique se os chunks corretos estão sendo recuperados.
- **Custo escala com queries, não com documentos.** Indexar é barato. Servir milhares de requests com GPT-4o é onde o custo vive.

No próximo post, vamos falar de **Context Engineering**. Agora que você sabe como buscar informação (RAG), vamos aprender como montar o prompt ideal pra extrair o melhor do modelo.

## Leitura complementar

- [How RAG Works](https://lnkd.in/dbAUacYW) (Neo Kim, System Design Newsletter)
- [Azure AI Search: Retrieval Augmented Generation](https://learn.microsoft.com/azure/search/retrieval-augmented-generation-overview)
- [OpenAI Cookbook: RAG best practices](https://cookbook.openai.com/)
