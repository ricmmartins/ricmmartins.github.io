---
slug: "system-design-youtube-streaming-de-video-em-escala"
aliases:
  - "/posts/system-design-youtube-streaming-de-video-em-escala/"
title: "System design: YouTube, streaming de vídeo em escala"
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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 429" role="img" aria-label="Write path de upload de vídeo" style="max-width:100%;height:auto;" font-family="Segoe UI, Arial, sans-serif">
<defs>
<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="#666666" />
</marker>
</defs>
<rect x="10" y="10" width="900" height="389" rx="8" fill="#f5f5f5" stroke="#666666" />
<text x="30" y="35" font-size="14" font-weight="bold" fill="#333333">WRITE PATH (Upload)</text>

<g>
<rect x="40" y="140" width="110" height="52" rx="6" fill="#f5f5f5" stroke="#666666" />
<text x="95" y="170" text-anchor="middle" font-size="12" font-weight="bold" fill="#333333">Client</text>
</g>
<g>
<rect x="190" y="140" width="140" height="52" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
<text x="260" y="170" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">API Server</text>
</g>
<g>
<rect x="370" y="140" width="160" height="52" rx="6" fill="#fff2cc" stroke="#d6b656" />
<text x="450" y="162.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">Blob Storage</text>
<text x="450" y="177.5" text-anchor="middle" font-size="10" fill="#555">raw</text>
</g>
<g>
<rect x="580" y="140" width="150" height="52" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="655" y="162.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">Message Queue</text>
<text x="655" y="177.5" text-anchor="middle" font-size="10" fill="#555">Kafka</text>
</g>
<g>
<rect x="190" y="245" width="140" height="52" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="260" y="275" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">Metadata DB</text>
</g>
<g>
<rect x="580" y="245" width="150" height="52" rx="6" fill="#d5e8d4" stroke="#82b366" />
<text x="655" y="267.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Transcoding</text>
<text x="655" y="282.5" text-anchor="middle" font-size="10" fill="#555">Workers</text>
</g>
<g>
<rect x="370" y="245" width="160" height="52" rx="6" fill="#d5e8d4" stroke="#82b366" />
<text x="450" y="267.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Blob Storage</text>
<text x="450" y="282.5" text-anchor="middle" font-size="10" fill="#555">processed</text>
</g>
<g>
<rect x="370" y="337" width="160" height="32" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="450" y="357" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">CDN</text>
</g>

<g stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)">
<line x1="156" y1="166" x2="196" y2="166" />
<line x1="336" y1="166" x2="376" y2="166" />
<line x1="536" y1="166" x2="586" y2="166" />
<line x1="260" y1="198" x2="260" y2="251" />
<line x1="655" y1="198" x2="655" y2="251" />
<line x1="574" y1="271" x2="524" y2="271" />
<line x1="450" y1="303" x2="450" y2="343" />
</g>
</svg>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 259" role="img" aria-label="Read path de streaming de vídeo" style="max-width:100%;height:auto;" font-family="Segoe UI, Arial, sans-serif">
<defs>
<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="#666666" />
</marker>
</defs>
<rect x="10" y="10" width="900" height="219" rx="8" fill="#f5f5f5" stroke="#666666" />
<text x="30" y="35" font-size="14" font-weight="bold" fill="#333333">READ PATH (Streaming)</text>

<g>
<rect x="40" y="105" width="110" height="52" rx="6" fill="#f5f5f5" stroke="#666666" />
<text x="95" y="135" text-anchor="middle" font-size="12" font-weight="bold" fill="#333333">Client</text>
</g>
<g>
<rect x="220" y="55" width="160" height="52" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="300" y="77.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">CDN</text>
<text x="300" y="92.5" text-anchor="middle" font-size="10" fill="#555">cache hit?</text>
</g>
<g>
<rect x="450" y="55" width="180" height="52" rx="6" fill="#d5e8d4" stroke="#82b366" />
<text x="540" y="77.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Blob Storage</text>
<text x="540" y="92.5" text-anchor="middle" font-size="10" fill="#555">processed</text>
</g>
<g>
<rect x="220" y="147" width="160" height="52" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
<text x="300" y="177" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">API Server</text>
</g>
<g>
<rect x="450" y="147" width="150" height="52" rx="6" fill="#fff2cc" stroke="#d6b656" />
<text x="525" y="169.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">Cache</text>
<text x="525" y="184.5" text-anchor="middle" font-size="10" fill="#555">Redis</text>
</g>
<g>
<rect x="670" y="145" width="150" height="52" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="745" y="175" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">Metadata DB</text>
</g>

<g stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)">
<line x1="155.8" y1="116.2" x2="225.8" y2="99.1" />
<line x1="386" y1="81" x2="456" y2="81" />
<line x1="155.9" y1="143.5" x2="225.9" y2="157.8" />
<line x1="386" y1="173" x2="456" y2="173" />
<line x1="606" y1="172.3" x2="676" y2="171.6" />
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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 720" width="100%" style="max-width:860px;height:auto;" role="img" aria-label="Pipeline de transcodificação de vídeo" font-family="Segoe UI, Arial, sans-serif">
<defs>
<marker id="arr-pipe" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="#555" />
</marker>
</defs>

<!-- Upload finalizado -->
<rect x="310" y="20" width="240" height="50" rx="6" fill="#ffffff" stroke="#999" stroke-width="1.5"/>
<text x="430" y="50" text-anchor="middle" font-size="13" font-weight="bold" fill="#333">Upload finalizado</text>

<!-- Arrow -->
<line x1="430" y1="70" x2="430" y2="98" stroke="#555" stroke-width="2" marker-end="url(#arr-pipe)"/>

<!-- Message Queue -->
<rect x="310" y="100" width="240" height="55" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2"/>
<text x="430" y="125" text-anchor="middle" font-size="13" font-weight="bold" fill="#4a235a">Message Queue</text>
<text x="430" y="143" text-anchor="middle" font-size="10" fill="#555">Kafka</text>

<!-- Arrow -->
<line x1="430" y1="155" x2="430" y2="183" stroke="#555" stroke-width="2" marker-end="url(#arr-pipe)"/>

<!-- Transcoding Orchestrator -->
<rect x="270" y="185" width="320" height="60" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2"/>
<text x="430" y="213" text-anchor="middle" font-size="14" font-weight="bold" fill="#1a3a5c">Transcoding Orchestrator</text>
<text x="430" y="231" text-anchor="middle" font-size="10" fill="#555">divide em jobs</text>

<!-- Arrows from Orchestrator to Workers (fan-out, distributed exit points) -->
<line x1="310" y1="245" x2="130" y2="278" stroke="#555" stroke-width="1.5" marker-end="url(#arr-pipe)"/>
<line x1="370" y1="245" x2="310" y2="278" stroke="#555" stroke-width="1.5" marker-end="url(#arr-pipe)"/>
<line x1="430" y1="245" x2="430" y2="278" stroke="#555" stroke-width="1.5" marker-end="url(#arr-pipe)"/>
<line x1="490" y1="245" x2="550" y2="278" stroke="#555" stroke-width="1.5" marker-end="url(#arr-pipe)"/>
<line x1="370" y1="245" x2="190" y2="368" stroke="#555" stroke-width="1.5" marker-end="url(#arr-pipe)"/>
<line x1="430" y1="245" x2="370" y2="368" stroke="#555" stroke-width="1.5" marker-end="url(#arr-pipe)"/>
<line x1="530" y1="245" x2="670" y2="278" stroke="#555" stroke-width="1.5" marker-end="url(#arr-pipe)"/>

<!-- Worker Row 1: 240p, 360p, 480p, 720p -->
<rect x="70" y="280" width="120" height="55" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="1.5"/>
<text x="130" y="304" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Worker 1</text>
<text x="130" y="321" text-anchor="middle" font-size="10" fill="#555">gerar 240p</text>

<rect x="250" y="280" width="120" height="55" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="1.5"/>
<text x="310" y="304" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Worker 2</text>
<text x="310" y="321" text-anchor="middle" font-size="10" fill="#555">gerar 360p</text>

<rect x="430" y="280" width="120" height="55" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="1.5"/>
<text x="490" y="304" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Worker 3</text>
<text x="490" y="321" text-anchor="middle" font-size="10" fill="#555">gerar 480p</text>

<rect x="610" y="280" width="120" height="55" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="1.5"/>
<text x="670" y="304" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Worker 4</text>
<text x="670" y="321" text-anchor="middle" font-size="10" fill="#555">gerar 720p</text>

<!-- Worker Row 2: 1080p, 4K, thumbnail -->
<rect x="130" y="370" width="120" height="55" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="1.5"/>
<text x="190" y="394" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Worker 5</text>
<text x="190" y="411" text-anchor="middle" font-size="10" fill="#555">gerar 1080p</text>

<rect x="310" y="370" width="120" height="55" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="1.5"/>
<text x="370" y="394" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Worker 6</text>
<text x="370" y="411" text-anchor="middle" font-size="10" fill="#555">gerar 4K</text>

<rect x="550" y="370" width="180" height="55" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="1.5"/>
<text x="640" y="394" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">Worker 7</text>
<text x="640" y="411" text-anchor="middle" font-size="10" fill="#555">thumbnail + preview</text>

<!-- Arrows from Workers to Blob Storage (converging) -->
<line x1="130" y1="335" x2="380" y2="460" stroke="#555" stroke-width="1.5" marker-end="url(#arr-pipe)"/>
<line x1="310" y1="335" x2="400" y2="460" stroke="#555" stroke-width="1.5" marker-end="url(#arr-pipe)"/>
<line x1="490" y1="335" x2="440" y2="460" stroke="#555" stroke-width="1.5" marker-end="url(#arr-pipe)"/>
<line x1="670" y1="335" x2="490" y2="460" stroke="#555" stroke-width="1.5" marker-end="url(#arr-pipe)"/>
<line x1="190" y1="425" x2="390" y2="460" stroke="#555" stroke-width="1.5" marker-end="url(#arr-pipe)"/>
<line x1="370" y1="425" x2="420" y2="460" stroke="#555" stroke-width="1.5" marker-end="url(#arr-pipe)"/>
<line x1="640" y1="425" x2="480" y2="460" stroke="#555" stroke-width="1.5" marker-end="url(#arr-pipe)"/>

<!-- Blob Storage -->
<rect x="310" y="462" width="240" height="55" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2"/>
<text x="430" y="487" text-anchor="middle" font-size="13" font-weight="bold" fill="#1b5e20">Blob Storage</text>
<text x="430" y="505" text-anchor="middle" font-size="10" fill="#555">processed</text>

<!-- Arrow -->
<line x1="430" y1="517" x2="430" y2="538" stroke="#555" stroke-width="2" marker-end="url(#arr-pipe)"/>

<!-- Manifest -->
<rect x="310" y="540" width="240" height="45" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2"/>
<text x="430" y="568" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">Gerar manifest file (.m3u8)</text>

<!-- Arrow -->
<line x1="430" y1="585" x2="430" y2="608" stroke="#555" stroke-width="2" marker-end="url(#arr-pipe)"/>

<!-- Metadata DB -->
<rect x="280" y="610" width="300" height="50" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2"/>
<text x="430" y="633" text-anchor="middle" font-size="13" font-weight="bold" fill="#1a3a5c">Atualizar Metadata DB</text>
<text x="430" y="650" text-anchor="middle" font-size="10" fill="#555">status: ready</text>

<!-- Arrow -->
<line x1="430" y1="660" x2="430" y2="683" stroke="#555" stroke-width="2" marker-end="url(#arr-pipe)"/>

<!-- Push CDN -->
<rect x="310" y="685" width="240" height="50" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2"/>
<text x="430" y="715" text-anchor="middle" font-size="13" font-weight="bold" fill="#4a235a">Push pra CDN</text>
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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 380" width="100%" style="max-width:860px;height:auto;" role="img" aria-label="Fluxo de cache hit no streaming" font-family="Segoe UI, Arial, sans-serif">
<defs>
<marker id="arr-cdn" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="#555" />
</marker>
</defs>

<!-- Player -->
<rect x="40" y="140" width="220" height="60" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2"/>
<text x="150" y="166" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Player pede segmento 47</text>
<text x="150" y="184" text-anchor="middle" font-size="10" fill="#555">vídeo em 720p</text>

<!-- Arrow Player → CDN -->
<line x1="260" y1="170" x2="328" y2="170" stroke="#555" stroke-width="2" marker-end="url(#arr-cdn)"/>

<!-- CDN Edge (hexagon) -->
<polygon points="330,170 370,120 490,120 530,170 490,220 370,220" fill="#fff2cc" stroke="#d6b656" stroke-width="2"/>
<text x="430" y="165" text-anchor="middle" font-size="13" font-weight="bold" fill="#7c6200">CDN Edge</text>
<text x="430" y="183" text-anchor="middle" font-size="10" fill="#555">São Paulo: tenho no cache?</text>

<!-- Arrow CDN → Cache Hit (up-right) -->
<line x1="490" y1="135" x2="600" y2="80" stroke="#2e7d32" stroke-width="2" marker-end="url(#arr-cdn)"/>
<text x="540" y="95" font-size="11" font-weight="bold" fill="#2e7d32">SIM</text>

<!-- Cache Hit -->
<rect x="602" y="50" width="240" height="60" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2"/>
<text x="722" y="76" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Retorna imediatamente</text>
<text x="722" y="94" text-anchor="middle" font-size="10" fill="#555">cache hit</text>

<!-- Arrow CDN → Origin (down-right) -->
<line x1="490" y1="200" x2="600" y2="250" stroke="#c62828" stroke-width="2" marker-end="url(#arr-cdn)"/>
<text x="540" y="240" font-size="11" font-weight="bold" fill="#c62828">NÃO</text>

<!-- Busca no Origin -->
<rect x="602" y="225" width="240" height="60" rx="6" fill="#f8cecc" stroke="#b85450" stroke-width="2"/>
<text x="722" y="251" text-anchor="middle" font-size="12" font-weight="bold" fill="#8a1c1c">Busca no Origin</text>
<text x="722" y="269" text-anchor="middle" font-size="10" fill="#555">blob storage</text>

<!-- Arrow Origin → Retorna -->
<line x1="722" y1="285" x2="722" y2="313" stroke="#555" stroke-width="2" marker-end="url(#arr-cdn)"/>

<!-- Retorna pro player -->
<rect x="602" y="315" width="240" height="55" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2"/>
<text x="722" y="339" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Retorna pro player</text>
<text x="722" y="357" text-anchor="middle" font-size="10" fill="#555">e cacheia localmente</text>
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
