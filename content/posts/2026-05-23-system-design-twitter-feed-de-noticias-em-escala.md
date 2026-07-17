---
slug: "system-design-twitter-feed-de-noticias-em-escala"
aliases:
  - "/posts/system-design-twitter-feed-de-noticias-em-escala/"
title: "System design: Twitter/X, feed de notícias em escala"
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

Se YouTube é sobre **arquivos grandes**, WhatsApp sobre **entrega garantida**, e Uber sobre **dados em movimento**, Twitter é sobre o problema mais traiçoeiro de todos: **fan-out**. Um único tweet de alguém com 50 milhões de followers precisa aparecer na timeline de cada um deles, em segundos.

No papel parece simples: "me mostra os posts de quem eu sigo em ordem cronológica". Em produção vira outro bicho quando a escala é:
- 500 milhões de tweets por dia
- Usuários com 1 a 100+ milhões de followers
- Timeline refresh a cada poucos segundos
- Trending topics detectados em tempo real

Esse é o sistema onde **a decisão entre push e pull define toda a arquitetura**.

Vamos aplicar o [framework](/posts/system-design-na-pratica-como-pensar-sistemas-em-escala/).

**tl;dr:** Twitter é o problema clássico de fan-out. O desenho que escala usa push para a maioria, pull para celebridades e cache pesado de timeline, tweet e social graph.

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

Elon Musk tem ~190 milhões de followers. Quando ele posta, o sistema precisa fazer essa mensagem aparecer na timeline de 190 milhões de pessoas. Mesmo assumindo um custo absurdamente otimista de 1μs por timeline write, você ainda gastaria 190 segundos. Não dá.

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 310" width="100%" style="max-width: 100%; height: auto;" role="img" aria-labelledby="twitter-hybrid-title">
<title id="twitter-hybrid-title">Diagrama do modelo híbrido de fan-out do Twitter</title>
<defs>
<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<rect x="20" y="20" width="750" height="260" rx="8" fill="#f5f5f5" stroke="#666666" />
<text x="390" y="46" font-size="14" font-weight="bold" text-anchor="middle" fill="#333333">HYBRID FAN-OUT</text>
<rect x="50" y="70" width="330" height="180" rx="8" fill="#d5e8d4" stroke="#82b366" />
<text x="215" y="141.5" font-size="12" font-weight="bold" fill="#1b5e20" text-anchor="middle">Usuário normal (&lt; 500K followers)</text>
<text x="215" y="156.5" font-size="10" fill="#555" text-anchor="middle">• Fan-out on WRITE</text>
<text x="215" y="171.5" font-size="10" fill="#555" text-anchor="middle">• Tweet é pushado pra timeline de cada follower</text>
<text x="215" y="186.5" font-size="10" fill="#555" text-anchor="middle">• Read é O(1): timeline já está montada no cache</text>
<rect x="410" y="70" width="330" height="180" rx="8" fill="#fff2cc" stroke="#d6b656" />
<text x="575" y="134" font-size="12" font-weight="bold" fill="#7c6200" text-anchor="middle">Celebridade (&gt; 500K followers)</text>
<text x="575" y="149" font-size="10" fill="#555" text-anchor="middle">• Fan-out on READ</text>
<text x="575" y="164" font-size="10" fill="#555" text-anchor="middle">• Tweet é salvo, mas NÃO pushado</text>
<text x="575" y="179" font-size="10" fill="#555" text-anchor="middle">• No read: merge timeline pré-computada + tweets</text>
<text x="575" y="194" font-size="10" fill="#555" text-anchor="middle">  recentes das celebridades que o user segue</text>
</g>
</svg>

**Por que o threshold de ~500K?**

- Abaixo de 500K followers: fan-out on write é viável (500K writes é rápido)
- Acima de 500K: fan-out on write pra 50M+ timelines é lento e desperdiça recurso (muitos desses followers estão inativos)

Na prática, ~0.1% dos usuários são "celebridades". Mas esses 0.1% são responsáveis por ~30% do volume de fan-out.

### Arquitetura geral

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 910 808" width="100%" style="max-width: 100%; height: auto;" role="img" aria-labelledby="twitter-paths-title">
<title id="twitter-paths-title">Diagrama dos caminhos de escrita e leitura da timeline do Twitter</title>
<defs>
<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<rect x="20" y="20" width="860" height="320" rx="8" fill="#f5f5f5" stroke="#666666" />
<text x="450" y="46" font-size="14" font-weight="bold" text-anchor="middle" fill="#333333">WRITE PATH (Tweet)</text>
<rect x="50" y="78" width="120" height="48" rx="6" fill="#f5f5f5" stroke="#666666" />
<text x="110" y="106" font-size="12" font-weight="bold" text-anchor="middle" fill="#333333">User</text>
<rect x="210" y="78" width="120" height="48" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
<text x="270" y="106" font-size="12" font-weight="bold" text-anchor="middle" fill="#1a3a5c">API Server</text>
<rect x="370" y="78" width="140" height="48" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="440" y="106" font-size="12" font-weight="bold" text-anchor="middle" fill="#4a235a">Tweet Service</text>
<rect x="550" y="78" width="150" height="48" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
<text x="625" y="106" font-size="12" font-weight="bold" text-anchor="middle" fill="#1a3a5c">Tweet Storage</text>
<rect x="360" y="166" width="160" height="48" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="440" y="194" font-size="12" font-weight="bold" text-anchor="middle" fill="#4a235a">Fan-out Service</text>
<rect x="40" y="245" width="180" height="56" rx="6" fill="#d5e8d4" stroke="#82b366" />
<text x="130" y="269.5" font-size="12" font-weight="bold" text-anchor="middle" fill="#1b5e20">Normal user</text>
<text x="130" y="284.5" font-size="10" fill="#555" text-anchor="middle">Push to Redis timelines</text>
<rect x="250" y="245" width="150" height="56" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="325" y="269.5" font-size="12" font-weight="bold" text-anchor="middle" fill="#4a235a">Search Index</text>
<text x="325" y="284.5" font-size="10" fill="#555" text-anchor="middle">async</text>
<rect x="430" y="245" width="160" height="56" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="510" y="269.5" font-size="12" font-weight="bold" text-anchor="middle" fill="#4a235a">Trending Service</text>
<text x="510" y="284.5" font-size="10" fill="#555" text-anchor="middle">async</text>
<rect x="620" y="245" width="210" height="56" rx="6" fill="#fff2cc" stroke="#d6b656" />
<text x="725" y="269.5" font-size="12" font-weight="bold" text-anchor="middle" fill="#7c6200">Celebrity</text>
<text x="725" y="284.5" font-size="10" fill="#555" text-anchor="middle">Só armazena (merge no read)</text>
<line x1="176" y1="102" x2="216" y2="102" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="336" y1="102" x2="376" y2="102" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="516" y1="102" x2="556" y2="102" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="440" y1="132" x2="440" y2="172" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="380" y1="214" x2="190" y2="245" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="420" y1="214" x2="325" y2="245" stroke="#666666" stroke-width="2" stroke-dasharray="4 4" marker-end="url(#arrow)" />
<line x1="460" y1="214" x2="510" y2="245" stroke="#666666" stroke-width="2" stroke-dasharray="4 4" marker-end="url(#arrow)" />
<line x1="500" y1="214" x2="650" y2="245" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<rect x="20" y="360" width="860" height="418" rx="8" fill="#f5f5f5" stroke="#666666" />
<text x="450" y="386" font-size="14" font-weight="bold" text-anchor="middle" fill="#333333">READ PATH (Timeline)</text>
<rect x="50" y="420" width="120" height="48" rx="6" fill="#f5f5f5" stroke="#666666" />
<text x="110" y="448" font-size="12" font-weight="bold" text-anchor="middle" fill="#333333">User</text>
<rect x="210" y="420" width="120" height="48" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
<text x="270" y="448" font-size="12" font-weight="bold" text-anchor="middle" fill="#1a3a5c">API Server</text>
<rect x="370" y="420" width="160" height="48" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="450" y="448" font-size="12" font-weight="bold" text-anchor="middle" fill="#4a235a">Timeline Service</text>
<rect x="210" y="510" width="220" height="62" rx="6" fill="#d5e8d4" stroke="#82b366" />
<text x="320" y="537.5" font-size="12" font-weight="bold" text-anchor="middle" fill="#1b5e20">Redis Timeline</text>
<text x="320" y="552.5" font-size="10" fill="#555" text-anchor="middle">(pré-computada)</text>
<rect x="500" y="510" width="300" height="62" rx="6" fill="#fff2cc" stroke="#d6b656" />
<text x="650" y="537.5" font-size="12" font-weight="bold" text-anchor="middle" fill="#7c6200">Celebrity Tweet Cache</text>
<text x="650" y="552.5" font-size="10" fill="#555" text-anchor="middle">últimos tweets de VIPs que este user segue</text>
<rect x="360" y="612" width="180" height="48" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="450" y="640" font-size="12" font-weight="bold" text-anchor="middle" fill="#4a235a">Merge + Rank</text>
<rect x="340" y="700" width="280" height="48" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
<text x="480" y="728" font-size="12" font-weight="bold" text-anchor="middle" fill="#1a3a5c">Hydrate (buscar tweet completo)</text>
<line x1="176" y1="444" x2="216" y2="444" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="336" y1="444" x2="376" y2="444" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="413" y1="471.6" x2="356.7" y2="513.6" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="504.9" y1="470.6" x2="591.5" y2="512.6" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="367.3" y1="575.5" x2="422" y2="615.5" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="579.3" y1="574.6" x2="495.1" y2="614.6" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="460.1" y1="665.7" x2="473.8" y2="705.7" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<text x="480" y="728" font-size="12" font-weight="bold" text-anchor="middle" fill="#1f1f1f">Response</text>
</g>
</svg>

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

Redis pipeline: 1000 operações no mesmo round-trip em vez de 1000 round-trips separados. Isso derruba bastante a latência do fan-out e reduz chatter de rede.

**2. Filtrar followers inativos:**

Não faz sentido escrever na timeline de alguém que não logou há 6 meses:

```
followers = get_followers(author_id)
active_followers = filter(followers, last_active >= now() - 30_days)
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

**Latência de backend:** algo como 5-15ms quando os caches batem. Com rede, auth e serialização, ainda sobra folga pra ficar abaixo do orçamento de 200ms.

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
→ EXISTS em follows(alice, bob): O(1) com primary key
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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 580" width="100%" style="max-width: 860px; height: auto;" role="img" aria-labelledby="twitter-trending-title">
<title id="twitter-trending-title">Diagrama do pipeline de trending topics</title>
<defs>
<marker id="arr-trend" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="#555" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<!-- Todos os tweets -->
<rect x="300" y="20" width="300" height="55" rx="6" fill="#ffffff" stroke="#999" stroke-width="1.5"/>
<text x="450" y="52" font-size="13" font-weight="bold" text-anchor="middle" fill="#333">Todos os tweets</text>
<!-- Arrow -->
<line x1="450" y1="75" x2="450" y2="108" stroke="#555" stroke-width="2" marker-end="url(#arr-trend)"/>
<!-- Stream Processor -->
<rect x="220" y="110" width="460" height="55" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2"/>
<text x="450" y="143" font-size="13" font-weight="bold" text-anchor="middle" fill="#4a235a">Stream Processor (Kafka Streams / Flink)</text>
<!-- Arrow -->
<line x1="450" y1="165" x2="450" y2="198" stroke="#555" stroke-width="2" marker-end="url(#arr-trend)"/>
<!-- Container: Etapas -->
<rect x="100" y="200" width="700" height="275" rx="10" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2"/>
<text x="450" y="230" font-size="14" font-weight="bold" text-anchor="middle" fill="#1a3a5c">Etapas do processamento</text>
<!-- Step 1 -->
<rect x="140" y="245" width="620" height="38" rx="6" fill="#ffffff" stroke="#aaa" stroke-width="1"/>
<text x="450" y="269" font-size="11" text-anchor="middle" fill="#333">Extrai entidades: hashtags, mentions, keywords</text>
<!-- Step 2 -->
<rect x="140" y="295" width="620" height="48" rx="6" fill="#ffffff" stroke="#aaa" stroke-width="1"/>
<text x="450" y="316" font-size="11" text-anchor="middle" fill="#333">Conta frequência por janela de tempo (sliding window)</text>
<text x="450" y="333" font-size="10" text-anchor="middle" fill="#555">Janelas: 5min, 15min, 1h, 4h</text>
<!-- Step 3 -->
<rect x="140" y="355" width="620" height="48" rx="6" fill="#ffffff" stroke="#aaa" stroke-width="1"/>
<text x="450" y="376" font-size="11" text-anchor="middle" fill="#333">Calcula taxa de crescimento vs baseline</text>
<text x="450" y="393" font-size="10" text-anchor="middle" fill="#555">baseline = média dos últimos 7 dias pra aquela hora</text>
<!-- Step 4 -->
<rect x="140" y="415" width="620" height="38" rx="6" fill="#ffffff" stroke="#aaa" stroke-width="1"/>
<text x="450" y="439" font-size="11" text-anchor="middle" fill="#333">Filtra: remove spam, conteúdo proibido, ruído</text>
<!-- Arrow + label -->
<line x1="450" y1="475" x2="450" y2="508" stroke="#555" stroke-width="2" marker-end="url(#arr-trend)"/>
<text x="450" y="498" font-size="10" text-anchor="middle" fill="#555">Ranking: top N por região / país / global</text>
<!-- Trending Cache -->
<rect x="240" y="510" width="420" height="50" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2"/>
<text x="450" y="540" font-size="13" font-weight="bold" text-anchor="middle" fill="#1b5e20">Trending Cache (Redis, TTL 1-5 min)</text>
</g>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1070 420" width="100%" style="max-width: 100%; height: auto;" role="img" aria-labelledby="twitter-search-title">
<title id="twitter-search-title">Diagrama do fluxo de indexação e busca do Twitter</title>
<defs>
<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<rect x="40" y="34" width="120" height="48" rx="6" fill="#f5f5f5" stroke="#666666" />
<text x="100" y="62" font-size="12" font-weight="bold" text-anchor="middle" fill="#333333">Novo tweet</text>
<rect x="210" y="34" width="110" height="48" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="265" y="62" font-size="12" font-weight="bold" text-anchor="middle" fill="#4a235a">Kafka</text>
<rect x="370" y="34" width="150" height="48" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="445" y="62" font-size="12" font-weight="bold" text-anchor="middle" fill="#4a235a">Search Indexer</text>
<rect x="540" y="20" width="325" height="184" rx="8" fill="#dae8fc" stroke="#6c8ebf" />
<text x="680" y="46" font-size="14" font-weight="bold" text-anchor="middle" fill="#1a3a5c">Elasticsearch Cluster</text>
<rect x="565" y="70" width="270" height="32" rx="6" fill="#d5e8d4" stroke="#82b366" />
<text x="700" y="82.5" font-size="12" font-weight="bold" text-anchor="middle" fill="#1b5e20">Index recente (últimos 7 dias)</text>
<text x="700" y="97.5" font-size="10" fill="#555" text-anchor="middle">SSD, réplicas</text>
<rect x="565" y="142" width="240" height="40" rx="6" fill="#fff2cc" stroke="#d6b656" />
<text x="685" y="157" font-size="12" font-weight="bold" text-anchor="middle" fill="#7c6200">Index histórico (&gt; 7 dias)</text>
<text x="685" y="172" font-size="10" fill="#555" text-anchor="middle">HDD, menos réplicas</text>
<line x1="166" y1="58" x2="216" y2="58" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="326" y1="58" x2="376" y2="58" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="526" y1="66.9" x2="571" y2="71.8" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<rect x="40" y="260" width="130" height="48" rx="6" fill="#f5f5f5" stroke="#666666" />
<text x="105" y="288" font-size="12" font-weight="bold" text-anchor="middle" fill="#333333">Search query</text>
<rect x="220" y="260" width="150" height="48" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="295" y="288" font-size="12" font-weight="bold" text-anchor="middle" fill="#4a235a">Search Service</text>
<path d="M 176 284 H 195 V 284 H 214" fill="none" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<path d="M 376 284 H 450 V 322 H 524" fill="none" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="684.3" y1="180" x2="680.9" y2="294" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<rect x="500" y="214" width="540" height="34" rx="6" fill="#fff2cc" stroke="#d6b656" />
<text x="770" y="235" font-size="10" fill="#555" text-anchor="middle">Query no index recente primeiro; se precisar mais resultados, consulta o histórico</text>
<rect x="530" y="288" width="300" height="68" rx="6" fill="#d5e8d4" stroke="#82b366" />
<text x="680" y="318.5" font-size="12" font-weight="bold" text-anchor="middle" fill="#1b5e20">Merge + Rank + Return</text>
<text x="680" y="333.5" font-size="10" fill="#555" text-anchor="middle">Combina resultados, reordena e responde</text>
</g>
</svg>

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

Tweet viral: 1 milhão de likes em 1 hora = ~280 likes/segundo **pra um único tweet**. Se fizer `UPDATE tweets SET likes = likes + 1 WHERE id = X` pra cada like, esse row vira um hotspot de contenção.

### Solução: write-behind counters

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 282" width="100%" style="max-width: 100%; height: auto;" role="img" aria-labelledby="twitter-likes-title">
<title id="twitter-likes-title">Diagrama da persistência assíncrona de likes</title>
<defs>
<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<rect x="280" y="20" width="200" height="48" rx="6" fill="#f5f5f5" stroke="#666666" />
<text x="380" y="48" font-size="12" font-weight="bold" text-anchor="middle" fill="#333333">Like event</text>
<rect x="170" y="108" width="420" height="58" rx="6" fill="#d5e8d4" stroke="#82b366" />
<text x="380" y="126" font-size="12" font-weight="bold" text-anchor="middle" fill="#1b5e20">Redis: INCR tweet_likes:{tweet_id}</text>
<text x="380" y="141" font-size="10" fill="#555" text-anchor="middle">instantâneo, in-memory</text>
<rect x="80" y="206" width="600" height="46" rx="6" fill="#fff2cc" stroke="#d6b656" />
<text x="380" y="233" font-size="10" fill="#555" text-anchor="middle">Persistence job: UPDATE tweets SET likes = {redis_value} WHERE id = X</text>
<line x1="380" y1="74" x2="380" y2="114" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="380" y1="172" x2="380" y2="212" stroke="#666666" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#arrow)" />
<text x="380" y="156" font-size="10" fill="#555" text-anchor="middle">async, batched, a cada 5-10 segundos</text>
</g>
</svg>

O counter "real" vive no Redis. O banco é atualizado periodicamente em batch. Se Redis crashar, perde no máximo 5-10 segundos de likes (aceitável; counter não precisa ser exato em tempo real).

### Exibição ao usuário

"42.3K likes": ninguém nota se são 42.300 ou 42.347. Contadores de engagement podem ser **aproximados** na exibição. Isso permite caching agressivo do tweet sem invalidar a cada like.

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
    created_at TIMESTAMP
);

CREATE INDEX idx_tweets_author_created_at ON tweets (author_id, created_at DESC);
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

Total Redis footprint: algo na casa de 3 TB. Na prática isso vira um cluster com mais de 100 nodes quando você coloca réplica, overhead e folga operacional na conta.

## Handling de cenários edge

### Tweet deletado após fan-out

Tweet foi pushado pra 50K timelines e depois o autor deleta.

**Solução: lazy deletion.**

```
1. Marca tweet como deleted no Tweet Storage
2. NÃO remove das 50K timelines (seria um fan-out de delete caro)
3. Na hora do read, durante hydration:
   - Se tweet está deleted → skip, não mostra
   - Timeline fica com "buraco" que é ignorado
4. Eventualmente, background job limpa IDs deletados das timelines
```

### User dá unfollow: timeline contaminated

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
2. **Edge caching:** CDN pra mídia e payloads de tweets quentes. A timeline em si continua sendo personalizada demais pra tratar como conteúdo igual pra todo mundo.
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

Se a pergunta vier como "Design a social media feed like Twitter.", o fechamento precisa voltar ao fan-out: push para usuários normais, pull para celebridades e timeline hidratada via cache.

## Leitura complementar

- [Kafka Streams documentation](https://kafka.apache.org/documentation/streams/)
- [Elasticsearch guide](https://www.elastic.co/guide/)

---

*Esse é o quinto artigo da série [System Design na Prática](/series/system-design-na-prática/). No próximo e último, vamos projetar um URL Shortener: o sistema "simples" que esconde complexidade surpreendente em hashing, read optimization, e analytics em tempo real.*
