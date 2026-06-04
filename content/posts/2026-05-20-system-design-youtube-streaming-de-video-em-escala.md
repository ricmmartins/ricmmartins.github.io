---
slug: "system-design-youtube-streaming-de-video-em-escala"
aliases:
  - "/posts/system-design-youtube-streaming-de-video-em-escala/"
title: "System design: YouTube - streaming de vídeo em escala"
description: "Como projetar uma plataforma de vídeo que processa 500 horas de upload por minuto e entrega o primeiro frame em menos de 500ms. CDN, transcoding, adaptive bitrate, e pre-signed URLs na prática."
date: 2026-05-22T10:00:00-04:00
categories:
  - Carreira
  - Arquitetura
tags:
  - system-design
  - entrevista
  - streaming
  - cdn
  - arquitetura
series:
  - "System Design na Prática"
---

"Design a video-sharing platform like YouTube."

Essa é possivelmente a pergunta de system design mais clássica que existe. E o motivo é simples: um sistema de vídeo toca em **quase todo conceito importante**: upload de arquivos grandes, processamento assíncrono, storage massivo, CDN global, adaptive streaming, e leitura pesada com caching agressivo.

Nesse artigo, vamos aplicar o [framework do post anterior](/posts/system-design-na-pratica-como-pensar-sistemas-em-escala/) pra projetar uma plataforma de vídeo do zero. Não vou fingir que estamos inventando o YouTube. Vou explicar **por que** cada decisão arquitetural faz sentido no contexto de escala real.

## Fase 1: Esclarecer requisitos

Antes de desenhar qualquer coisa, precisamos entender o problema. Numa entrevista, essas são as perguntas que você faria:

### Requisitos funcionais

| Funcionalidade | Detalhe |
|---------------|---------|
| Upload de vídeo | Usuário envia arquivo de até 256 GB |
| Streaming de vídeo | Playback com qualidade adaptativa |
| Busca | Encontrar vídeos por título e descrição |
| Progresso | Salvar/retomar de onde parou |

### Requisitos não-funcionais

| Requisito | Target |
|-----------|--------|
| Escala | 1 milhão de uploads/dia, 100 milhões de DAU |
| Latência de streaming | Primeiro frame em < 500ms |
| Tempo de processamento | Upload disponível em 10-30 minutos |
| Disponibilidade | 99.9% (< 9 horas de downtime/ano) |
| Consistência | Eventual (upload não precisa aparecer instantaneamente) |
| Ratio leitura/escrita | ~100:1 (100 views pra cada upload) |

### Fora do escopo

- Livestreaming (arquitetura diferente: RTMP, ultra-low latency)
- Sistema de recomendação (ML pipeline separado)
- Comentários e likes (outro bounded context)
- Monetização/ads

**Por que esse scoping importa:** o entrevistador quer ver que você sabe **conter a complexidade**. Projetar YouTube completo em 45 minutos é impossível. Projetar o core de upload + streaming + busca é viável e demonstra profundidade.

## Fase 2: Estimativas (back-of-the-envelope)

### Upload (write path)

```
Uploads/dia: 1.000.000
Uploads/segundo: 1M / 86.400 ≈ 12/s (média)
Pico: 12 × 3 = ~36/s

Tamanho médio de vídeo: 500 MB (antes de transcoding)
Storage bruto/dia: 1M × 500 MB = 500 TB/dia
Storage bruto/ano: 500 TB × 365 = ~180 PB/ano
```

180 petabytes por ano só de vídeo bruto. Isso sem contar as múltiplas resoluções geradas pelo transcoding.

### Streaming (read path)

```
DAU: 100.000.000
Vídeos assistidos/dia por usuário: ~5
Total de streams/dia: 500.000.000
Streams/segundo: 500M / 86.400 ≈ 5.800/s (média)
Pico: ~15.000-20.000 streams/s

Bitrate médio (720p): ~2.5 Mbps
Bandwidth de pico: 20.000 × 2.5 Mbps = 50 Tbps
```

50 terabits por segundo. Nenhum servidor único aguenta isso. Esse número sozinho justifica **CDN global obrigatória**.

### Storage total com transcoding

Cada vídeo é transcodificado em ~6 resoluções (240p, 360p, 480p, 720p, 1080p, 4K). Se o vídeo original tem 500 MB:

```
240p:  ~25 MB
360p:  ~50 MB
480p:  ~100 MB
720p:  ~200 MB
1080p: ~400 MB
4K:    ~1.5 GB

Total por vídeo: ~2.3 GB (original + todas resoluções)
Storage com transcoding/dia: 1M × 2.3 GB = ~2.3 PB/dia
```

Agora você entende por que YouTube precisa de **exabytes** de storage.

## Fase 3: High-level design

O sistema tem dois fluxos principais completamente diferentes:

1. **Write path** (upload + processamento): assíncrono, tolerante a latência
2. **Read path** (streaming): síncrono, latency-sensitive, 100x mais tráfego

Vamos separar os dois.

### Arquitetura geral

<svg viewBox="0 0 920 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Write path de upload de vídeo" style="max-width:100%;height:auto;" font-family="Segoe UI, Arial, sans-serif">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#666666" />
    </marker>
  </defs>
  <rect x="10" y="10" width="900" height="340" rx="8" fill="#f5f5f5" stroke="#666666" />
  <text x="30" y="35" font-size="14" font-weight="bold">WRITE PATH (Upload)</text>

  <g>
    <rect x="40" y="140" width="110" height="52" rx="6" fill="#f5f5f5" stroke="#666666" />
    <text x="95" y="171" text-anchor="middle" font-size="12" font-weight="bold">Client</text>
  </g>
  <g>
    <rect x="190" y="140" width="140" height="52" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="260" y="171" text-anchor="middle" font-size="12" font-weight="bold">API Server</text>
  </g>
  <g>
    <rect x="370" y="140" width="160" height="52" rx="6" fill="#fff2cc" stroke="#d6b656" />
    <text x="450" y="160" text-anchor="middle" font-size="12" font-weight="bold">Blob Storage</text>
    <text x="450" y="176" text-anchor="middle" font-size="10" fill="#555">raw</text>
  </g>
  <g>
    <rect x="580" y="140" width="150" height="52" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="655" y="160" text-anchor="middle" font-size="12" font-weight="bold">Message Queue</text>
    <text x="655" y="176" text-anchor="middle" font-size="10" fill="#555">Kafka</text>
  </g>
  <g>
    <rect x="190" y="245" width="140" height="52" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="260" y="276" text-anchor="middle" font-size="12" font-weight="bold">Metadata DB</text>
  </g>
  <g>
    <rect x="580" y="245" width="150" height="52" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="655" y="265" text-anchor="middle" font-size="12" font-weight="bold">Transcoding</text>
    <text x="655" y="281" text-anchor="middle" font-size="10" fill="#555">Workers</text>
  </g>
  <g>
    <rect x="370" y="245" width="160" height="52" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="450" y="265" text-anchor="middle" font-size="12" font-weight="bold">Blob Storage</text>
    <text x="450" y="281" text-anchor="middle" font-size="10" fill="#555">processed</text>
  </g>
  <g>
    <rect x="370" y="305" width="160" height="32" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="450" y="325" text-anchor="middle" font-size="12" font-weight="bold">CDN</text>
  </g>

  <g stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)">
    <line x1="150" y1="166" x2="190" y2="166" />
    <line x1="330" y1="166" x2="370" y2="166" />
    <line x1="530" y1="166" x2="580" y2="166" />
    <line x1="260" y1="192" x2="260" y2="245" />
    <line x1="655" y1="192" x2="655" y2="245" />
    <line x1="580" y1="271" x2="530" y2="271" />
    <line x1="450" y1="297" x2="450" y2="305" />
  </g>
</svg>

<svg viewBox="0 0 920 230" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Read path de streaming de vídeo" style="max-width:100%;height:auto;" font-family="Segoe UI, Arial, sans-serif">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#666666" />
    </marker>
  </defs>
  <rect x="10" y="10" width="900" height="210" rx="8" fill="#f5f5f5" stroke="#666666" />
  <text x="30" y="35" font-size="14" font-weight="bold">READ PATH (Streaming)</text>

  <g>
    <rect x="40" y="105" width="110" height="52" rx="6" fill="#f5f5f5" stroke="#666666" />
    <text x="95" y="136" text-anchor="middle" font-size="12" font-weight="bold">Client</text>
  </g>
  <g>
    <rect x="220" y="55" width="160" height="52" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="300" y="77" text-anchor="middle" font-size="12" font-weight="bold">CDN</text>
    <text x="300" y="93" text-anchor="middle" font-size="10" fill="#555">cache hit?</text>
  </g>
  <g>
    <rect x="450" y="55" width="180" height="52" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="540" y="75" text-anchor="middle" font-size="12" font-weight="bold">Blob Storage</text>
    <text x="540" y="91" text-anchor="middle" font-size="10" fill="#555">processed</text>
  </g>
  <g>
    <rect x="220" y="145" width="160" height="52" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="300" y="176" text-anchor="middle" font-size="12" font-weight="bold">API Server</text>
  </g>
  <g>
    <rect x="450" y="145" width="150" height="52" rx="6" fill="#fff2cc" stroke="#d6b656" />
    <text x="525" y="165" text-anchor="middle" font-size="12" font-weight="bold">Cache</text>
    <text x="525" y="181" text-anchor="middle" font-size="10" fill="#555">Redis</text>
  </g>
  <g>
    <rect x="670" y="145" width="150" height="52" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="745" y="176" text-anchor="middle" font-size="12" font-weight="bold">Metadata DB</text>
  </g>

  <g stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)">
    <line x1="150" y1="131" x2="220" y2="81" />
    <line x1="380" y1="81" x2="450" y2="81" />
    <line x1="150" y1="131" x2="220" y2="171" />
    <line x1="380" y1="171" x2="450" y2="171" />
    <line x1="600" y1="171" x2="670" y2="171" />
  </g>
</svg>

### Por que separar write e read?

- Write é **compute-intensive** (transcoding consome GPU/CPU) mas tolerante a atraso
- Read é **bandwidth-intensive** (streaming de vídeo) mas precisa de baixa latência
- Escalam com hardware diferente: write precisa de CPU/GPU, read precisa de rede e cache

## API Design

### 1. Iniciar upload

```
POST /v1/videos
```

```json
// Request
{
  "title": "System Design na Prática",
  "description": "Como projetar o YouTube",
  "file_size_bytes": 524288000,
  "content_type": "video/mp4"
}

// Response (201 Created)
{
  "video_id": "vid_abc123",
  "upload_url": "https://storage.example.com/uploads/vid_abc123?X-Signature=...",
  "upload_url_expires_at": "2026-05-19T15:00:00Z",
  "chunk_size_bytes": 5242880
}
```

**Decisão de design: Pre-Signed URLs**

O client **não** faz upload através do nosso API server. Ele recebe uma URL temporária assinada e faz upload direto pro blob storage (S3, Azure Blob, GCS).

Por quê?

1. **Elimina bottleneck:** se 36 uploads/s passassem pelo API server, cada um com 500 MB, seriam 18 GB/s de bandwidth no server. Impossível.
2. **Escala independente:** blob storage é projetado pra receber petabytes. Seus API servers não.
3. **Resumable:** se a conexão cair, o client retoma de onde parou (multipart upload com chunk retry).

O API server só lida com **metadata** (título, descrição, thumbnail): dados pequenos, rápidos de processar.

### 2. Stream de vídeo

```
GET /v1/videos/{video_id}
```

```json
// Response (200 OK)
{
  "video_id": "vid_abc123",
  "title": "System Design na Prática",
  "manifest_url": "https://cdn.example.com/videos/vid_abc123/manifest.m3u8",
  "thumbnail_url": "https://cdn.example.com/thumbnails/vid_abc123.jpg",
  "duration_seconds": 1847,
  "available_resolutions": ["240p", "360p", "480p", "720p", "1080p", "4K"]
}
```

O player do client usa o `manifest_url` pra iniciar **adaptive bitrate streaming** (mais sobre isso no deep dive).

### 3. Busca

```
GET /v1/search?q=system+design&cursor=eyJvZmZzZXQiOjIwfQ&limit=20
```

```json
// Response (200 OK)
{
  "results": [
    {
      "video_id": "vid_abc123",
      "title": "System Design na Prática",
      "thumbnail_url": "https://cdn.example.com/thumbnails/vid_abc123.jpg",
      "view_count": 142000,
      "duration_seconds": 1847
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjQwfQ",
  "has_more": true
}
```

**Cursor-based pagination** em vez de offset. Com offset, `SKIP 10.000.000` no banco é catastrófico. Com cursor, o banco sabe exatamente onde continuar.

### 4. Progresso de visualização

```
POST /v1/progress/{video_id}
```

```json
// Request (fire-and-forget)
{
  "user_id": "usr_xyz",
  "position_seconds": 342,
  "timestamp": "2026-05-19T14:30:00Z"
}
```

Esse endpoint recebe **milhões de writes/segundo** (cada player reportando posição a cada poucos segundos). Estratégia: fire-and-forget, sem esperar confirmação. Armazena num banco otimizado pra escrita (DynamoDB, Cassandra).

## Deep Dive 1: Pipeline de transcoding

Esse é o coração do write path. Quando alguém faz upload de um vídeo de 1 hora em 4K, o sistema precisa transformar isso em **dezenas de arquivos otimizados** pra qualquer device e velocidade de rede.

### O que é transcoding?

Converter um vídeo de um formato/resolução pra outro. Um upload de 4K precisa virar:

- 240p, 360p, 480p, 720p, 1080p, 4K (6 resoluções)
- Cada resolução é cortada em **segmentos** de 2-10 segundos
- Cada segmento é um arquivo independente que pode ser baixado separadamente

Um vídeo de 1 hora em 6 resoluções com segmentos de 4 segundos = **900 segmentos × 6 resoluções = 5.400 arquivos**. Por vídeo.

### Arquitetura do pipeline

<svg viewBox="0 0 980 740" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pipeline de transcodificação de vídeo" style="max-width:100%;height:auto;" font-family="Segoe UI, Arial, sans-serif">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#666666" />
    </marker>
  </defs>

  <g>
    <rect x="380" y="20" width="220" height="48" rx="6" fill="#f5f5f5" stroke="#666666" />
    <text x="490" y="49" text-anchor="middle" font-size="12" font-weight="bold">Upload finalizado</text>
  </g>
  <g>
    <rect x="380" y="95" width="220" height="48" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="490" y="117" text-anchor="middle" font-size="12" font-weight="bold">Message Queue</text>
    <text x="490" y="133" text-anchor="middle" font-size="10" fill="#555">Kafka</text>
  </g>
  <g>
    <rect x="345" y="170" width="290" height="70" rx="8" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="490" y="200" text-anchor="middle" font-size="14" font-weight="bold">Transcoding Orchestrator</text>
    <text x="490" y="218" text-anchor="middle" font-size="10" fill="#555">divide em jobs</text>
  </g>

  <g>
    <rect x="60" y="285" width="130" height="56" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="125" y="307" text-anchor="middle" font-size="12" font-weight="bold">Worker 1</text>
    <text x="125" y="323" text-anchor="middle" font-size="10" fill="#555">gerar 240p</text>
  </g>
  <g>
    <rect x="210" y="285" width="130" height="56" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="275" y="307" text-anchor="middle" font-size="12" font-weight="bold">Worker 2</text>
    <text x="275" y="323" text-anchor="middle" font-size="10" fill="#555">gerar 360p</text>
  </g>
  <g>
    <rect x="360" y="285" width="130" height="56" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="425" y="307" text-anchor="middle" font-size="12" font-weight="bold">Worker 3</text>
    <text x="425" y="323" text-anchor="middle" font-size="10" fill="#555">gerar 480p</text>
  </g>
  <g>
    <rect x="510" y="285" width="130" height="56" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="575" y="307" text-anchor="middle" font-size="12" font-weight="bold">Worker 4</text>
    <text x="575" y="323" text-anchor="middle" font-size="10" fill="#555">gerar 720p</text>
  </g>
  <g>
    <rect x="180" y="370" width="130" height="56" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="245" y="392" text-anchor="middle" font-size="12" font-weight="bold">Worker 5</text>
    <text x="245" y="408" text-anchor="middle" font-size="10" fill="#555">gerar 1080p</text>
  </g>
  <g>
    <rect x="350" y="370" width="130" height="56" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="415" y="392" text-anchor="middle" font-size="12" font-weight="bold">Worker 6</text>
    <text x="415" y="408" text-anchor="middle" font-size="10" fill="#555">gerar 4K</text>
  </g>
  <g>
    <rect x="520" y="370" width="220" height="56" rx="6" fill="#fff2cc" stroke="#d6b656" />
    <text x="630" y="392" text-anchor="middle" font-size="12" font-weight="bold">Worker 7</text>
    <text x="630" y="408" text-anchor="middle" font-size="10" fill="#555">thumbnail + preview</text>
  </g>

  <g>
    <rect x="360" y="470" width="260" height="56" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="490" y="490" text-anchor="middle" font-size="12" font-weight="bold">Blob Storage</text>
    <text x="490" y="506" text-anchor="middle" font-size="10" fill="#555">processed</text>
  </g>
  <g>
    <rect x="360" y="550" width="260" height="48" rx="6" fill="#fff2cc" stroke="#d6b656" />
    <text x="490" y="579" text-anchor="middle" font-size="12" font-weight="bold">Gerar manifest file (.m3u8)</text>
  </g>
  <g>
    <rect x="340" y="620" width="300" height="48" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="490" y="642" text-anchor="middle" font-size="12" font-weight="bold">Atualizar Metadata DB</text>
    <text x="490" y="658" text-anchor="middle" font-size="10" fill="#555">status: ready</text>
  </g>
  <g>
    <rect x="360" y="690" width="260" height="48" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="490" y="719" text-anchor="middle" font-size="12" font-weight="bold">Push pra CDN</text>
  </g>

  <g stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)">
    <line x1="490" y1="68" x2="490" y2="95" />
    <line x1="490" y1="143" x2="490" y2="170" />
    <line x1="490" y1="240" x2="125" y2="285" />
    <line x1="490" y1="240" x2="275" y2="285" />
    <line x1="490" y1="240" x2="425" y2="285" />
    <line x1="490" y1="240" x2="575" y2="285" />
    <line x1="490" y1="240" x2="245" y2="370" />
    <line x1="490" y1="240" x2="415" y2="370" />
    <line x1="490" y1="240" x2="630" y2="370" />
    <line x1="125" y1="341" x2="430" y2="470" />
    <line x1="275" y1="341" x2="450" y2="470" />
    <line x1="425" y1="341" x2="470" y2="470" />
    <line x1="575" y1="341" x2="510" y2="470" />
    <line x1="245" y1="426" x2="450" y2="470" />
    <line x1="415" y1="426" x2="490" y2="470" />
    <line x1="630" y1="426" x2="530" y2="470" />
    <line x1="490" y1="526" x2="490" y2="550" />
    <line x1="490" y1="598" x2="490" y2="620" />
    <line x1="490" y1="668" x2="490" y2="690" />
  </g>
</svg>

### Por que usar Message Queue aqui?

1. **Desacoplamento:** upload e transcoding são processos independentes. Se o transcoding está lento, uploads não são bloqueados.
2. **Retry automático:** se um worker falha no meio do job, a mensagem volta pra fila e outro worker pega.
3. **Backpressure:** se há mais uploads que capacidade de transcoding, a fila absorve o pico. Nada é perdido.
4. **Priorização:** vídeos de canais grandes podem ter prioridade na fila.

### Paralelismo no transcoding

Cada resolução pode ser processada **em paralelo** (workers independentes). Mas podemos ir além: cada resolução pode ser dividida em **chunks temporais** e processada por workers diferentes.

Vídeo de 1 hora dividido em chunks de 5 minutos = 12 chunks × 6 resoluções = 72 jobs paralelos. Um vídeo de 1 hora que levaria 6 horas sequencialmente pode ficar pronto em **10-15 minutos** com paralelismo suficiente.

## Deep Dive 2: CDN e Adaptive Bitrate Streaming

### O problema

Você está em São Paulo e quer ver um vídeo. O blob storage está em Virginia (us-east-1). Round-trip: ~120ms. O vídeo tem segmentos de 4 segundos a 2.5 Mbps.

Sem CDN: cada segmento precisa percorrer 120ms de latência + tempo de download. Buffering constante.

Com CDN: o segmento está cacheado num edge server em São Paulo. Latência: <10ms. Download instantâneo.

### Como CDN funciona pra vídeo

<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fluxo de cache hit no streaming" style="max-width:100%;height:auto;" font-family="Segoe UI, Arial, sans-serif">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#666666" />
    </marker>
  </defs>

  <g>
    <rect x="30" y="105" width="220" height="62" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="140" y="132" text-anchor="middle" font-size="12" font-weight="bold">Player pede segmento 47</text>
    <text x="140" y="148" text-anchor="middle" font-size="10" fill="#555">vídeo em 720p</text>
  </g>

  <g>
    <path d="M350 90 L470 90 L540 150 L470 210 L350 210 L280 150 Z" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
    <text x="410" y="142" text-anchor="middle" font-size="12" font-weight="bold">CDN Edge</text>
    <text x="410" y="158" text-anchor="middle" font-size="10" fill="#555">São Paulo: tenho no cache?</text>
  </g>

  <g>
    <rect x="610" y="40" width="230" height="62" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="725" y="67" text-anchor="middle" font-size="12" font-weight="bold">Retorna imediatamente</text>
    <text x="725" y="83" text-anchor="middle" font-size="10" fill="#555">cache hit</text>
  </g>
  <g>
    <rect x="610" y="138" width="230" height="62" rx="6" fill="#f8cecc" stroke="#b85450" />
    <text x="725" y="165" text-anchor="middle" font-size="12" font-weight="bold">Busca no Origin</text>
    <text x="725" y="181" text-anchor="middle" font-size="10" fill="#555">blob storage</text>
  </g>
  <g>
    <rect x="610" y="230" width="230" height="52" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="725" y="252" text-anchor="middle" font-size="12" font-weight="bold">Retorna pro player</text>
    <text x="725" y="268" text-anchor="middle" font-size="10" fill="#555">e cacheia localmente</text>
  </g>

  <g stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)">
    <line x1="250" y1="136" x2="280" y2="136" />
    <line x1="540" y1="120" x2="610" y2="71" />
    <line x1="540" y1="180" x2="610" y2="169" />
    <line x1="725" y1="200" x2="725" y2="230" />
  </g>

  <text x="570" y="102" font-size="10" font-weight="bold" fill="#555">SIM</text>
  <text x="570" y="196" font-size="10" font-weight="bold" fill="#555">NÃO</text>
</svg>

**Cache hit ratio** pra vídeo popular: >95%. A grande maioria dos views é de vídeos populares (distribuição power-law). Os 1% mais populares respondem por >80% do tráfego. Esses estão **sempre** no cache.

### Adaptive Bitrate Streaming (ABR)

É isso que faz o YouTube mudar de qualidade automaticamente quando sua internet fica lenta.

**Como funciona:**

1. Quando o vídeo é transcodificado, geramos um **manifest file** (`.m3u8` pra HLS, `.mpd` pra DASH)
2. O manifest lista todos os segmentos disponíveis em cada resolução:

```
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=426x240
/videos/vid_abc123/240p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=640x360
/videos/vid_abc123/360p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720
/videos/vid_abc123/720p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
/videos/vid_abc123/1080p/playlist.m3u8
```

3. O player monitora a velocidade de download em tempo real
4. Se o segmento anterior demorou pra baixar → próximo segmento em resolução menor
5. Se está baixando rápido → aumenta resolução gradualmente

**O resultado:** zero buffering na maioria das condições. O player se adapta em tempo real. O usuário nem percebe a troca (os segmentos são curtos o suficiente pra transição ser suave).

### HLS vs DASH

| | HLS (Apple) | DASH (MPEG) |
|---|------------|-------------|
| Formato manifest | .m3u8 | .mpd (XML) |
| Codec support | H.264, HEVC | Qualquer codec |
| Compatibilidade | iOS nativo, amplo | Android, browsers |
| DRM | FairPlay | Widevine, PlayReady |
| Segmentos | .ts ou .fmp4 | .m4s (fragmentos MP4) |

Na prática, YouTube usa DASH no browser e suporta ambos. Netflix usa DASH exclusivamente.

## Deep Dive 3: Database design

### Metadata DB (PostgreSQL / MySQL - relacional)

```sql
-- Tabela principal de vídeos
CREATE TABLE videos (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL,
    title       VARCHAR(500) NOT NULL,
    description TEXT,
    status      ENUM('uploading', 'processing', 'ready', 'failed'),
    duration_ms BIGINT,
    file_size   BIGINT,
    manifest_url VARCHAR(1000),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Resoluções disponíveis por vídeo
CREATE TABLE video_renditions (
    video_id    UUID REFERENCES videos(id),
    resolution  VARCHAR(10),  -- '720p', '1080p', etc
    bitrate_kbps INT,
    segment_count INT,
    storage_url VARCHAR(1000),
    PRIMARY KEY (video_id, resolution)
);
```

**Por que SQL aqui?** Metadata de vídeo é relacional (vídeo pertence a user, tem várias renditions). Volume de escrita é gerenciável (~12/s). Queries precisam de filtros complexos (por user, por status, por data).

### Sharding strategy

Com 1 milhão de vídeos/dia, após 3 anos temos ~1 bilhão de registros. Precisa shardear.

**Shard por video_id (hash-based):**
- ✅ Distribui uniformemente
- ✅ Lookup por ID é direto (sabe qual shard ir)
- ❌ Query "todos os vídeos do user X" precisa ir em todos os shards (scatter-gather)

**Shard por user_id:**
- ✅ "Meus vídeos" é query local num shard só
- ❌ Hot spots: um canal com 10M vídeos sobrecarrega um shard
- ❌ Distribuição desigual

**Solução híbrida:** shard por user_id com consistent hashing pra distribuir melhor + tabela de mapeamento user→shard. Channels grandes podem ser split em múltiplos shards.

### Search Index (Elasticsearch)

```json
{
  "video_id": "vid_abc123",
  "title": "System Design na Prática",
  "description": "Como projetar o YouTube em 45 minutos...",
  "tags": ["system-design", "arquitetura", "entrevista"],
  "channel_name": "Ricardo Martins",
  "upload_date": "2026-05-19",
  "view_count": 142000,
  "duration_seconds": 1847
}
```

Elasticsearch roda em paralelo ao banco principal. Toda vez que um vídeo fica "ready", um evento atualiza o índice de busca. Search queries nunca tocam o PostgreSQL.

### Progress tracking (DynamoDB / Cassandra - NoSQL)

```json
{
  "partition_key": "usr_xyz#vid_abc123",
  "position_seconds": 342,
  "updated_at": "2026-05-19T14:30:00Z"
}
```

**Por que NoSQL aqui?** Milhões de writes/segundo, access pattern simples (key→value), sem necessidade de joins, eventual consistency é aceitável (se perder 5 segundos de progresso, não é o fim do mundo).

## Deep Dive 4: Handling failures

### Upload falha no meio

**Solução: Multipart upload com resumable chunks**

O client divide o arquivo em chunks de 5 MB. Cada chunk é uploaded independentemente. Se um chunk falha, só aquele chunk é retransmitido.

```
Vídeo de 500 MB ÷ 5 MB/chunk = 100 chunks

Chunk 1  ✅ uploaded
Chunk 2  ✅ uploaded
...
Chunk 47 ❌ falhou (conexão caiu)
...
Reconecta → retoma do chunk 47
Chunk 47 ✅ uploaded
...
Chunk 100 ✅ uploaded → upload completo
```

O blob storage (S3/Azure Blob) suporta isso nativamente. O client precisa track de quais chunks já foram confirmados.

### Transcoding worker morre no meio

O job volta pra fila (message queue garante at-least-once delivery). Outro worker pega. Mas e os segmentos já processados?

**Solução: idempotência por segmento.** Cada worker verifica se o segmento de output já existe no blob storage antes de processar. Se já existe, pula. Isso faz o retry ser barato.

### CDN edge fica indisponível

**Solução: DNS-based failover.** O CDN provider (Cloudflare, CloudFront, Akamai) automaticamente roteia pra outro edge. É transparente pro client.

### Metadata DB fica indisponível

**Solução: Read replicas + cache.**

- Writes vão pro primary (com retry e circuit breaker)
- Reads vão pras replicas ou cache (Redis)
- Se tudo cair: o streaming continua funcionando (CDN tem os vídeos), apenas metadata/busca fica degradada

## Trade-offs e decisões

| Decisão | Alternativa | Por que essa escolha |
|---------|-------------|---------------------|
| Pre-signed URL (upload direto) | Upload via API server | API server não aguenta TB/s de bandwidth |
| Transcoding async (queue) | Transcoding síncrono | Não dá pra bloquear upload por 30 min |
| CDN pra streaming | Streaming do origin | 50 Tbps de bandwidth exige edge global |
| SQL pra metadata | NoSQL pra tudo | Metadata é relacional e volume de write é baixo |
| NoSQL pra progresso | SQL pra tudo | Milhões de writes/s em key-value simples |
| Cursor pagination | Offset pagination | Offset não escala com milhões de resultados |
| HLS/DASH segmentado | Download completo | Adaptive bitrate + inicio instantâneo |
| Eventual consistency | Strong consistency | Upload não precisa aparecer instantaneamente |

## Como escalar além

Se a entrevista permitir, mencione:

1. **Multi-region:** replicar metadata e vídeos populares em múltiplas regiões
2. **Cold storage tier:** vídeos com zero views há 1 ano vão pra storage mais barato (S3 Glacier)
3. **Pre-warming CDN:** vídeos de canais populares fazem push pro CDN antes de publicar
4. **ML pra transcoding:** nem todo vídeo precisa de 4K. Detectar conteúdo e gerar só as resoluções que fazem sentido
5. **Edge transcoding:** pra reduzir tempo de processamento, transcodar em servidores próximos ao uploader

## Resumo

| Componente | Tecnologia | Motivo |
|-----------|-----------|--------|
| API Server | Load-balanced stateless servers | Escalabilidade horizontal |
| Upload | Pre-signed URLs → Blob Storage | Elimina bottleneck |
| Processamento | Kafka + Workers pool | Async, retry, paralelismo |
| Storage (vídeo) | S3/Azure Blob + CDN | Escala de PBs + baixa latência |
| Storage (metadata) | PostgreSQL sharded | Queries relacionais |
| Storage (progresso) | DynamoDB/Cassandra | Alta escrita, key-value |
| Busca | Elasticsearch | Full-text, relevância |
| Cache | Redis | Metadata hot, sessões |
| Streaming | HLS/DASH via CDN | Adaptive bitrate |

---

*Esse é o segundo artigo da série [System Design na Prática](/series/system-design-na-prática/). No próximo, vamos projetar o WhatsApp: messaging em tempo real com WebSockets, presença online, e criptografia end-to-end.*
