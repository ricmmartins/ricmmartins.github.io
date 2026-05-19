---
slug: "system-design-twitter-feed-de-noticias-em-escala"
aliases:
  - "/posts/system-design-twitter-feed-de-noticias-em-escala/"
title: "System design: Twitter/X — feed de notícias em escala"
description: "Como projetar um sistema que entrega timelines personalizadas pra centenas de milhões de usuários, com fan-out inteligente, trending topics em tempo real, e caching agressivo."
date: 2026-05-28T10:00:00-04:00
categories:
  - Carreira
  - Arquitetura
tags:
  - system-design
  - entrevista
  - feed
  - fan-out
  - caching
  - arquitetura
series:
  - "System Design na Prática"
---

"Design a social media feed like Twitter."

Se YouTube é sobre **arquivos grandes**, WhatsApp sobre **entrega garantida**, e Uber sobre **dados em movimento**, Twitter é sobre o problema mais traiçoeiro de todos: **fan-out**. Um único tweet de alguém com 50 milhões de followers precisa aparecer na timeline de cada um deles — em segundos.

O que parece simples ("mostrar posts de quem eu sigo em ordem cronológica") se torna um monstro de engenharia quando a escala é:
- 500 milhões de tweets por dia
- Usuários com 1 a 100+ milhões de followers
- Timeline refresh a cada poucos segundos
- Trending topics detectados em tempo real

Esse é o sistema onde **a decisão entre push e pull define toda a arquitetura**.

Vamos aplicar o [framework](/posts/system-design-na-pratica-como-pensar-sistemas-em-escala/).

## Fase 1: Esclarecer requisitos

### Requisitos funcionais

| Funcionalidade | Detalhe |
|---------------|---------|
| Postar tweet | Texto (280 chars), imagens, vídeos |
| Home timeline | Feed com posts de quem você segue |
| Follow/Unfollow | Gerenciar quem você acompanha |
| Search | Buscar tweets por keywords |
| Trending topics | Top assuntos em tempo real |
| Like, Retweet, Reply | Interações com tweets |

### Requisitos não-funcionais

| Requisito | Target |
|-----------|--------|
| Escala | 400M DAU, 500M tweets/dia |
| Followers | Alguns usuários com 100M+ followers |
| Latência de timeline | < 200ms pra carregar feed |
| Latência de post | Tweet visível pra followers em < 5 segundos |
| Disponibilidade | 99.99% |
| Consistência | Eventual (ok se tweet aparece 2-3s depois, não precisa ser instantâneo) |

### Fora do escopo

- DMs (messaging, coberto no artigo do WhatsApp)
- Spaces (áudio ao vivo)
- Ads e monetização
- Verificação de conta
- Moderação de conteúdo

### O número que assusta

Elon Musk tem ~190 milhões de followers. Quando ele tweeta, o sistema precisa fazer essa mensagem **aparecer na timeline de 190 milhões de pessoas**. Se levar 1μs por timeline write, são 190 segundos só pra um tweet. Claramente, approach naive não funciona.

## Fase 2: Estimativas

### Tweets (write)

```
Tweets/dia: 500.000.000
Tweets/segundo: 500M / 86.400 ≈ 5.800/s (média)
Pico: ~15.000 tweets/s

Tamanho médio de tweet: ~1 KB (texto + metadata)
Com mídia (20% dos tweets têm imagem): média geral ~5 KB
Storage de tweets/dia: 500M × 5 KB = ~2.5 TB/dia
```

### Timeline reads

```
DAU: 400.000.000
Timeline refreshes/dia por user: ~20 (abre app, scroll, pull-to-refresh)
Total reads/dia: 400M × 20 = 8.000.000.000 (8 bilhões)
Reads/segundo: 8B / 86.400 ≈ 92.500/s
Pico: ~300.000 reads/s
```

**Ratio read/write: 92.500 / 5.800 ≈ 16:1.** Sistema extremamente read-heavy.

### Fan-out (o cálculo crítico)

```
Tweets/segundo: 5.800
Média de followers por autor: ~500 (mediana é baixa, média é puxada por celebridades)
Fan-out writes/segundo: 5.800 × 500 = 2.900.000/s

MAS: se incluir tweets de contas com milhões de followers:
  1 tweet de conta com 50M followers = 50M timeline writes
  Se 10 contas assim tweetam por minuto = 500M writes/minuto = 8.3M/s
```

Isso é insustentável com fan-out puro. É por isso que o Twitter usa approach híbrido.

### Timeline storage

```
Cada timeline armazena últimos ~800 tweet IDs
400M users × 800 IDs × 8 bytes (int64) = ~2.5 TB
```

2.5 TB cabe em memória distribuída (Redis cluster).

## Fase 3: High-level design

### O dilema fundamental: Fan-out on Write vs Fan-out on Read

Esse é **O** trade-off central do Twitter. Vamos entender profundamente.

**Fan-out on Write (push model):**

Quando alguém tweeta, o sistema imediatamente escreve esse tweet na timeline de cada follower.

```
@alice tweeta (tem 1000 followers)
  → Escreve tweet_id na timeline de cada um dos 1000 followers
  → Quando follower abre app: timeline já está pronta, só ler

Prós: leitura instantânea (timeline pré-computada)
Contras: escrita é cara (N writes por tweet, onde N = followers)
```

**Fan-out on Read (pull model):**

Quando alguém abre o app, o sistema busca os tweets mais recentes de cada conta que ele segue.

```
@bob abre o app (segue 500 contas)
  → Sistema busca últimos tweets de cada uma das 500 contas
  → Merge + sort por timestamp
  → Retorna timeline

Prós: escrita é simples (só salvar o tweet uma vez)
Contras: leitura é cara (N queries por timeline load, onde N = following)
```

### A solução do Twitter: modelo híbrido

```
┌─────────────────────────────────────────────────────────────────────┐
│                          HYBRID FAN-OUT                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Usuário normal (< 500K followers):                                  │
│    → Fan-out on WRITE                                                 │
│    → Tweet é pushado pra timeline de cada follower                   │
│    → Read é O(1): timeline já está montada no cache                  │
│                                                                       │
│  Celebridade (> 500K followers):                                     │
│    → Fan-out on READ                                                  │
│    → Tweet é salvo, mas NÃO pushado                                  │
│    → Na hora do read: merge timeline pré-computada + tweets          │
│      recentes das celebridades que o user segue                      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Por que o threshold de ~500K?**

- Abaixo de 500K followers: fan-out on write é viável (500K writes é rápido)
- Acima de 500K: fan-out on write pra 50M+ timelines é lento e desperdiça recurso (muitos desses followers estão inativos)

Na prática, ~0.1% dos usuários são "celebridades". Mas esses 0.1% são responsáveis por ~30% do volume de fan-out.

### Arquitetura geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WRITE PATH (Tweet)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  User ──→ API Server ──→ Tweet Service ──→ Tweet Storage             │
│                               │                                       │
│                               ▼                                       │
│                        Fan-out Service                                 │
│                          │         │                                  │
│                          ▼         ▼                                  │
│              [normal user]    [celebrity]                              │
│              Push to Redis    Só armazena                              │
│              timelines        (merge no read)                         │
│                                                                       │
│                               │                                       │
│                               ▼                                       │
│                     Search Index (async)                               │
│                     Trending Service (async)                           │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         READ PATH (Timeline)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  User ──→ API Server ──→ Timeline Service                            │
│                               │                                       │
│                     ┌─────────┴──────────┐                           │
│                     ▼                    ▼                            │
│            Redis Timeline         Celebrity Tweet Cache               │
│            (pré-computada)        (últimos tweets de VIPs             │
│                     │              que este user segue)               │
│                     └─────────┬──────────┘                           │
│                               ▼                                       │
│                          Merge + Rank                                 │
│                               │                                       │
│                               ▼                                       │
│                      Hydrate (buscar tweet completo)                  │
│                               │                                       │
│                               ▼                                       │
│                          Response                                     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Componentes principais

| Componente | Responsabilidade |
|-----------|-----------------|
| **Tweet Service** | CRUD de tweets, validação, storage |
| **Fan-out Service** | Distribuir tweet_id pras timelines |
| **Timeline Service** | Montar e retornar timeline do user |
| **Timeline Cache (Redis)** | Timeline pré-computada por user |
| **Search Service** | Full-text search em tweets |
| **Trending Service** | Detectar assuntos em alta em tempo real |
| **Social Graph Service** | Quem segue quem |
| **Notification Service** | Mentions, likes, retweets |

## API Design

### Postar tweet

```
POST /v1/tweets
```

```json
// Request
{
  "content": "System Design na Prática - nova série no blog!",
  "media_ids": ["media_abc123"],
  "reply_to": null
}

// Response (201 Created)
{
  "id": "tweet_789xyz",
  "author_id": "usr_ricardo",
  "content": "System Design na Prática - nova série no blog!",
  "media": [{"id": "media_abc123", "url": "https://cdn.example.com/..."}],
  "created_at": "2026-05-23T10:30:00Z",
  "metrics": {"likes": 0, "retweets": 0, "replies": 0}
}
```

### Home timeline

```
GET /v1/timeline/home?cursor=eyJ0cyI6MTcxNjQ1...&limit=20
```

```json
// Response (200 OK)
{
  "tweets": [
    {
      "id": "tweet_789xyz",
      "author": {"id": "usr_ricardo", "name": "Ricardo", "handle": "@ricardomartins"},
      "content": "System Design na Prática...",
      "created_at": "2026-05-23T10:30:00Z",
      "metrics": {"likes": 42, "retweets": 7, "replies": 3}
    }
  ],
  "next_cursor": "eyJ0cyI6MTcxNjQ0...",
  "has_more": true
}
```

### Search

```
GET /v1/search/tweets?q=system+design&cursor=...&limit=20
```

### Trending

```
GET /v1/trends?location=brazil
```

```json
{
  "trends": [
    {"name": "#SystemDesign", "tweet_count": 45200, "context": "Technology"},
    {"name": "ChatGPT", "tweet_count": 128000, "context": "Technology"},
    {"name": "#BBB26", "tweet_count": 890000, "context": "Entertainment"}
  ]
}
```

## Deep Dive 1: Fan-out Service

O Fan-out Service é o componente mais crítico e mais caro do sistema. Ele decide **como e quando** distribuir cada tweet.

### Fluxo detalhado

```
1. Tweet salvo no Tweet Storage
2. Evento publicado no Kafka: "new_tweet:{tweet_id}:{author_id}"
3. Fan-out Service consome o evento
4. Consulta Social Graph: "quem segue author_id?"
5. Classifica o autor:
   - Normal (< 500K followers) → fan-out on write
   - Celebrity (> 500K followers) → skip fan-out, só cachear tweet

6. Fan-out on write (usuário normal):
   Para cada follower_id:
     LPUSH timeline:{follower_id} tweet_id
     LTRIM timeline:{follower_id} 0 799  (manter só últimos 800)
```

### Otimizações de performance

**1. Batch processing:**

Não faz LPUSH um por um. Agrupa em batches de 1000:

```
followers = get_followers(author_id)  // ex: 50.000 followers
batches = chunk(followers, 1000)      // 50 batches de 1000

for batch in batches:
  pipeline = redis.pipeline()
  for follower_id in batch:
    pipeline.lpush(f"timeline:{follower_id}", tweet_id)
    pipeline.ltrim(f"timeline:{follower_id}", 0, 799)
  pipeline.execute()  // 1 round-trip pro Redis pra 1000 ops
```

Redis pipeline: 1000 operações em 1 round-trip em vez de 1000 round-trips. Reduz latência de fan-out de segundos pra milissegundos.

**2. Filtrar followers inativos:**

Não faz sentido escrever na timeline de alguém que não logou há 6 meses:

```
followers = get_followers(author_id)
active_followers = filter(followers, last_active < 30_days_ago)
// 50.000 followers → talvez 20.000 realmente ativos
```

Reduz fan-out em 50-70%. Followers inativos que voltam recebem timeline via fan-out on read.

**3. Workers paralelos com particionamento:**

Fan-out de um tweet com 100K followers não pode ser feito por 1 worker:

```
Kafka topic "fanout-jobs" com 64 partitions
Cada partition processa um subset de followers

Tweet do @ricardo (100K followers):
  Partition 0: followers[0:1562]
  Partition 1: followers[1563:3124]
  ...
  Partition 63: followers[98438:100000]

64 workers processam em paralelo → fan-out em < 1 segundo
```

### O Celebrity Problem em detalhe

Elon Musk tweeta. 190M followers. Fan-out on write:

```
190.000.000 Redis writes
A 100.000 writes/s por Redis cluster = 1.900 segundos = 31 minutos
```

31 minutos de delay é inaceitável. Além disso, 70% desses followers provavelmente não vai abrir o app hoje. Desperdício massivo de compute.

**Solução: Celebrity Tweet Cache**

```
1. Tweet do Elon é armazenado num cache separado: celebrity_tweets:{author_id}
2. Não faz fan-out
3. Quando user abre timeline:
   a. Busca timeline pré-computada do Redis (tweets de users normais)
   b. Busca quais celebridades este user segue
   c. Pra cada celebridade: busca últimos tweets do celebrity cache
   d. Merge todos os tweets por timestamp/ranking
   e. Retorna resultado final
```

**Custo no read:** se user segue 5 celebridades, são 5 queries extras no celebrity cache. Com Redis, cada query leva <1ms. Overhead total: <5ms. Aceitável.

## Deep Dive 2: Timeline Service e Caching

### Timeline cache structure

```
Redis Key: timeline:{user_id}
Redis Type: List (LPUSH/LRANGE)
Content: últimos 800 tweet_ids (não o tweet completo)

Exemplo:
  timeline:usr_bob = [tweet_999, tweet_998, tweet_995, tweet_990, ...]
```

**Por que só IDs e não o tweet completo?**

1. **Economia de memória:** ID = 8 bytes. Tweet completo = ~1 KB. Diferença de 125x.
2. **Consistência:** se tweet é editado ou deletado, só precisa atualizar um lugar (tweet storage), não 50M timelines.
3. **Hydration:** na hora do read, buscar detalhes dos 20 tweets da página é rápido (multi-get no cache de tweets).

### Fluxo de read completo

```
1. GET /v1/timeline/home?limit=20

2. Timeline Service:
   a. LRANGE timeline:{user_id} 0 19 → [tweet_ids]
   b. Se user segue celebridades:
      celebrity_ids = get_celebrity_following(user_id)
      for celeb in celebrity_ids:
        LRANGE celebrity_tweets:{celeb} 0 4 → [more_tweet_ids]
   c. Merge + sort por timestamp (ou ranking score)
   d. Top 20 tweet_ids

3. Hydration:
   MGET tweet:{id1} tweet:{id2} ... tweet:{id20}
   → Retorna tweets completos (content, author, metrics)
   → Cache hit rate >99% pra tweets recentes

4. Response ao client
```

**Latência total:** ~5-15ms. Redis é absurdamente rápido pra esse tipo de workload.

### Cache warming pra novos usuários

Quando alguém cria uma conta e segue 200 pessoas, a timeline está vazia. Não dá pra esperar fan-out construir organicamente.

**Solução: cache warming assíncrono.**

```
User segue 200 contas
  → Trigger async job: "build initial timeline"
  → Busca últimos 800 tweets de todas as 200 contas (fan-out on read, uma vez)
  → Merge + sort
  → Popula timeline:{user_id} no Redis
  → A partir de agora, fan-out on write mantém atualizado
```

## Deep Dive 3: Social Graph

"Quem segue quem" parece simples, mas em escala de centenas de bilhões de relações é um problema próprio.

### Modelo de dados

```
Relação: follower_id → followee_id (direcional)

Total de relações: 400M users × média 500 following = ~200 bilhões de edges
```

200 bilhões de edges. Não cabe num PostgreSQL single-node.

### Storage options

| Opção | Prós | Contras |
|-------|------|---------|
| **Graph DB (Neo4j, TAO)** | Queries de grafo naturais | Escala limitada, operacional complexo |
| **Adjacency list em SQL sharded** | Simples, SQL familiar | Queries multi-hop são caras |
| **Redis (sets)** | Ultra-rápido, set operations nativas | Custo de memória alto |
| **Custom in-house (TAO do Facebook)** | Otimizado pro use case | Caro de construir |

**Twitter's approach: adjacency list sharded + Redis cache.**

```sql
-- Sharded por follower_id
CREATE TABLE follows (
    follower_id BIGINT,
    followee_id BIGINT,
    created_at TIMESTAMP,
    PRIMARY KEY (follower_id, followee_id)
);

-- Index reverso (sharded por followee_id)
CREATE TABLE followers (
    followee_id BIGINT,
    follower_id BIGINT,
    created_at TIMESTAMP,
    PRIMARY KEY (followee_id, follower_id)
);
```

Duas tabelas: uma pra "quem eu sigo" (follows), outra pra "quem me segue" (followers). Operação de follow escreve em ambas (eventual consistency entre shards é ok).

### Queries críticas

```
"Quem @alice segue?" (pra montar timeline)
→ SELECT followee_id FROM follows WHERE follower_id = 'alice'

"Quem segue @elon?" (pra fan-out)
→ SELECT follower_id FROM followers WHERE followee_id = 'elon'
  → 190M rows. Não dá pra buscar tudo de uma vez.
  → Paginação: cursor-based, processado em batches pelo fan-out service

"@alice segue @bob?" (pra mostrar botão follow/following)
→ EXISTS em follows(alice, bob) — O(1) com primary key
```

### Cache do Social Graph

O fan-out service precisa do graph constantemente. Ir no DB a cada tweet é caro.

```
Redis Set: following:{user_id} = {followee_1, followee_2, ...}
Redis Set: followers:{user_id} = {follower_1, follower_2, ...}

Pra users normais: set completo no Redis
Pra celebridades: não cachear followers (190M no Redis = ~1.5 GB só pra um user)
  → Usar streaming do DB (cursor-based scan)
```

## Deep Dive 4: Trending Topics

Detectar o que está "em alta" em tempo real. Parece simples, mas envolve stream processing em escala massiva.

### O que é "trending"?

Não é simplesmente "o assunto mais mencionado". É a **taxa de crescimento**. Um assunto com 1M de tweets/dia que está estável não é trending. Um assunto com 10K tweets que era zero há 1 hora **é trending**.

```
Trending score = (volume_atual - volume_baseline) / tempo
```

"Flamengo" sempre tem alto volume. Não é trending normalmente.
"Flamengo" com 10x o volume normal em 30 minutos = algum jogo ou notícia. É trending.

### Arquitetura do Trending Service

```
Todos os tweets
       │
       ▼
  Stream Processor (Kafka Streams / Flink)
       │
       ├── Extrai entidades: hashtags, mentions, keywords
       │
       ├── Conta frequência por janela de tempo (sliding window)
       │     └── Janelas: 5min, 15min, 1h, 4h
       │
       ├── Calcula taxa de crescimento vs baseline
       │     └── baseline = média dos últimos 7 dias pra aquela hora
       │
       ├── Filtra: remove spam, conteúdo proibido, ruído
       │
       └── Ranking: top N por região/país/global
              │
              ▼
       Trending Cache (Redis, TTL 1-5 min)
```

### Sliding window counting

**Problema:** contar exatamente quantas vezes "#SystemDesign" apareceu nos últimos 15 minutos, atualizado continuamente, pra milhões de hashtags.

**Solução: Count-Min Sketch + time buckets**

Count-Min Sketch é uma estrutura probabilística que conta frequências com uso mínimo de memória:

```
Time buckets de 1 minuto cada:
  bucket[14:30] = CountMinSketch (todas as hashtags nesse minuto)
  bucket[14:31] = CountMinSketch
  ...
  bucket[14:44] = CountMinSketch

Contagem dos últimos 15 min de "#SystemDesign":
  sum(bucket[14:30..14:44].count("#SystemDesign"))
```

Cada CountMinSketch usa ~1 MB pra tracking de milhões de hashtags com <1% erro. 15 buckets = 15 MB. Escala pra qualquer volume de tweets.

### Regionalização

Trending no Brasil ≠ trending nos EUA. O sistema particiona por geolocalização:

```
Tweet com geo = São Paulo
  → Conta em: trending:global, trending:brazil, trending:sao_paulo

User pede trends:
  GET /v1/trends?location=brazil
  → Retorna merge de trending:brazil (peso alto) + trending:global (peso baixo)
```

## Deep Dive 5: Search

### Requisitos de search

- Full-text search em 500M+ tweets/dia (corpus cresce ~2.5 TB/dia)
- Resultados em < 100ms
- Recency bias (tweets recentes são mais relevantes)
- Support pra filtros: from:user, since:date, has:media

### Arquitetura

```
Novo tweet
    │
    ▼
Kafka → Search Indexer → Elasticsearch Cluster
                              │
                              ├── Index recente (últimos 7 dias) — SSD, réplicas
                              └── Index histórico (> 7 dias) — HDD, menos réplicas

Search query
    │
    ▼
Search Service → Elasticsearch
    │
    ├── Query no index recente (prioridade)
    ├── Se precisa mais resultados: query no histórico
    │
    ▼
  Merge + Rank + Return
```

### Indexação em real-time

Tweets precisam ser buscáveis **segundos** após serem postados (diferente de Google que pode levar horas pra indexar uma página).

```
Kafka consumer (search indexer):
  1. Consome tweet do topic
  2. Tokeniza: extrai palavras, hashtags, mentions
  3. Index no Elasticsearch com near-real-time refresh (1 segundo)
```

Elasticsearch com `refresh_interval: 1s` garante que tweets são buscáveis dentro de 1-2 segundos após postagem.

### Ranking de search results

Não é só text match. Relevância considera:

```
score = text_relevance (BM25)
      × recency_boost (tweets recentes rankeiam melhor)
      × engagement_signal (likes, retweets amplificam)
      × author_authority (verified, follower count)
      × personalization (seus interesses, quem você segue)
```

## Deep Dive 6: Engagement counters (likes, retweets)

### O problema

Tweet viral: 1 milhão de likes em 1 hora = ~280 likes/segundo **pra um único tweet**. Se fizer `UPDATE tweets SET likes = likes + 1 WHERE id = X` pra cada like, o row fica permanentemente locked.

### Solução: write-behind counters

```
Like event
    │
    ▼
Redis: INCR tweet_likes:{tweet_id}   (instantâneo, in-memory)
    │
    ▼ (async, batched, a cada 5-10 segundos)
Persistence job: UPDATE tweets SET likes = {redis_value} WHERE id = X
```

O counter "real" vive no Redis. O banco é atualizado periodicamente em batch. Se Redis crashar, perde no máximo 5-10 segundos de likes (aceitável — counter não precisa ser exato em tempo real).

### Exibição ao usuário

"42.3K likes" — ninguém nota se são 42.300 ou 42.347. Contadores de engagement podem ser **aproximados** na exibição. Isso permite caching agressivo do tweet sem invalidar a cada like.

```
Cache policy pra tweet com métricas:
  < 100 likes: atualiza em real-time (baixo volume)
  100-10K likes: atualiza a cada 30 segundos
  > 10K likes: atualiza a cada 5 minutos (ninguém nota diferença)
```

## Database Design

### Tweet Storage (principal)

```sql
CREATE TABLE tweets (
    id BIGINT PRIMARY KEY,  -- Snowflake ID (timestamp-encoded)
    author_id BIGINT NOT NULL,
    content VARCHAR(280),
    media_urls JSONB,
    reply_to_id BIGINT,
    retweet_of_id BIGINT,
    like_count INT DEFAULT 0,
    retweet_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    created_at TIMESTAMP,
    
    INDEX idx_author (author_id, created_at DESC)
);
```

**Snowflake ID:** IDs únicos gerados com timestamp embutido. Permite:
- Ordenação cronológica sem campo separado de timestamp
- Geração distribuída sem coordenação central
- Unicidade global sem auto-increment centralizado

Estrutura do Snowflake ID (64 bits):
```
| 41 bits: timestamp (ms) | 10 bits: machine ID | 12 bits: sequence |
|       ~69 anos           |    1024 machines    |   4096 IDs/ms    |
```

### Sharding strategy

**Shard por tweet_id (hash):**
- ✅ Distribuição uniforme
- ✅ Lookup por ID é O(1)
- ❌ "Todos tweets do user X" precisa scatter-gather

**Na prática:** shard por tweet_id + secondary index (author_id → tweet_ids) mantido separadamente. O secondary index pode ser outro sharded service ou Elasticsearch.

### Timeline Cache

```
Redis Cluster (128+ shards):
  Key: timeline:{user_id}
  Type: List
  Content: últimos 800 tweet_ids
  Memory per user: 800 × 8 bytes = 6.4 KB
  Total: 400M × 6.4 KB = ~2.5 TB

Tweet Cache:
  Key: tweet:{tweet_id}
  Type: Hash
  Content: tweet completo serializado (~1 KB)
  Hot tweets (últimas 24h): ~500M × 1 KB = 500 GB
```

Total Redis footprint: ~3 TB. Distribuído em cluster de ~100 nodes (32 GB cada com overhead).

## Handling de cenários edge

### Tweet deletado após fan-out

Tweet foi pushado pra 50K timelines e depois o autor deleta.

**Solução: lazy deletion.**

```
1. Marca tweet como deleted no Tweet Storage
2. NÃO remove das 50K timelines (seria fan-out de delete — caro)
3. Na hora do read, durante hydration:
   - Se tweet está deleted → skip, não mostra
   - Timeline fica com "buraco" que é ignorado
4. Eventualmente, background job limpa IDs deletados das timelines
```

### User dá unfollow — timeline contaminated

Bob parou de seguir Alice. Mas tweets dela ainda estão na timeline do Bob.

**Solução: tombstone + filter no read.**

```
1. Remove follow relationship
2. Na hora do read:
   - Se tweet.author_id NÃO está em following:{user_id} → skip
3. Background job limpa tweets do unfollowed da timeline (async, low priority)
```

### Thundering herd: tweet viral

Tweet é retweetado por uma celebridade. Milhões de pessoas abrem ao mesmo tempo.

```
1M requests/s pra tweet:{viral_id}
  → Redis hot key problem (um key recebe todo o tráfego)
```

**Soluções:**
1. **Local cache:** cada API server cacheia tweets hot por 1-5 segundos. 1M requests → 100 servers × 10K/s local cache hit.
2. **Key replication:** replicar hot keys em múltiplos Redis slots: `tweet:{id}:replica_0`, `tweet:{id}:replica_1`, etc.
3. **Read-through com jitter:** se cache miss, adiciona random delay (0-100ms) antes de ir no backend pra evitar stampede simultâneo.

### Novo follower de celebridade

Alice (1M followers) começa a seguir Elon (190M followers). A timeline dela precisa incluir tweets do Elon.

```
1. Alice segue Elon
2. Elon é celebrity → sem fan-out on write
3. Timeline service sabe que Alice segue celebrity "elon"
4. No próximo read, inclui tweets recentes do celebrity_tweets:elon no merge
5. Sem necessidade de reprocessar timeline inteira
```

## Trade-offs e decisões

| Decisão | Alternativa | Por que essa escolha |
|---------|-------------|---------------------|
| Híbrido (push normal + pull celebrity) | Push pra todos | Fan-out de 190M é impossível em real-time |
| Timeline como lista de IDs | Timeline com tweets completos | 125x menos memória, consistência de updates |
| Redis Cluster (timeline) | Cassandra/DynamoDB | Latência <1ms pra 300K reads/s |
| Snowflake IDs | UUID/auto-increment | Temporal ordering + distributed generation |
| Count-Min Sketch (trending) | Exact counting | Memória O(1) vs O(N), ~99% accuracy |
| Write-behind counters (likes) | Direct DB update | Evita row locking em tweet viral |
| Lazy deletion | Immediate fan-out delete | Delete é tão caro quanto post (N writes) |
| Elasticsearch (search) | Full-text in SQL | Real-time indexing, BM25 ranking, escala |
| Shard por tweet_id | Shard por author_id | Distribuição uniforme, evita hot shards |

## Como escalar além

1. **Algorithmic timeline:** ML ranking em vez de cronológico puro. Mostra tweets "relevantes" primeiro baseado em engajamento predito. (O que Twitter/X faz hoje com o "For You")
2. **Edge caching:** CDN pra timelines de celebridades (são as mesmas pra todos os followers)
3. **Tweet embedding:** vector search pra "tweets parecidos", recommendations
4. **Real-time ML pra spam:** classificar tweets como spam em <100ms antes de indexar
5. **Multi-media transcoding:** como YouTube, mas pra vídeos curtos no feed

## Resumo

| Componente | Tecnologia | Motivo |
|-----------|-----------|--------|
| Tweet storage | PostgreSQL/MySQL sharded | Relacional, Snowflake ID ordering |
| Timeline cache | Redis Cluster (~3 TB) | <1ms reads, 300K req/s |
| Fan-out | Kafka + Worker pools | Async, paralelo, batch processing |
| Social graph | Sharded SQL + Redis Sets | Adjacency list + fast lookups |
| Search | Elasticsearch (real-time) | Full-text, 1s indexing, BM25 |
| Trending | Kafka Streams + Count-Min Sketch | Stream processing, memória O(1) |
| Counters (likes) | Redis INCR + async persistence | Handles viral spikes |
| Media | Blob Storage + CDN | Imagens/vídeos pesados offloaded |
| ID generation | Snowflake | Distributed, time-ordered, unique |

---

*Esse é o quinto artigo da série [System Design na Prática](/series/system-design-na-prática/). No próximo e último, vamos projetar um URL Shortener — o sistema "simples" que esconde complexidade surpreendente em hashing, read optimization, e analytics em tempo real.*
