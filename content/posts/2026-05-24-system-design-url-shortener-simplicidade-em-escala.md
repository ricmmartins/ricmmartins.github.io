---
slug: "system-design-url-shortener-simplicidade-em-escala"
aliases:
  - "/posts/system-design-url-shortener-simplicidade-em-escala/"
title: "System design: URL Shortener - simplicidade em escala"
description: "Como projetar um sistema que parece trivial mas esconde decisões profundas sobre hashing, colisão, read optimization, e analytics de bilhões de cliques em tempo real."
date: 2026-05-30T10:00:00-04:00
categories:
  - Carreira
  - Arquitetura
tags:
  - system-design
  - entrevista
  - hashing
  - caching
  - analytics
  - arquitetura
series:
  - "System Design na Prática"
---

"Design a URL shortening service like Bitly or TinyURL."

Essa é geralmente a primeira pergunta de system design que candidatos encontram. Parece simples: recebe URL longa, retorna URL curta, redireciona quando acessam. Dá pra fazer em 50 linhas de código, certo?

Certo. Pra 100 usuários. Agora faz isso pra **100 bilhões de URLs** com **100.000 redirects por segundo** e vamos ver o quão "simples" é.

O URL Shortener é o exercício perfeito pra fechar a série porque combina decisões aparentemente simples que revelam profundidade quando você puxa o fio:
- Como gerar IDs curtos únicos sem colisão? (hashing vs counter)
- Como servir redirects em <10ms? (caching agressivo)
- Como contar cliques sem afetar latência? (analytics async)
- Como expirar URLs sem scan do banco inteiro? (TTL design)

São decisões que aparecem em **qualquer** sistema. Dominar esse design te dá ferramentas pra todos os outros.

Vamos aplicar o [framework](/posts/system-design-na-pratica-como-pensar-sistemas-em-escala/) pela última vez.

## Fase 1: Esclarecer requisitos

### Requisitos funcionais

| Funcionalidade | Detalhe |
|---------------|---------|
| Criar short URL | Recebe URL longa, retorna `short.url/abc123` |
| Redirect | Acesso à short URL redireciona pra URL original |
| Custom alias | Usuário pode escolher slug personalizado |
| Expiração | URLs podem ter TTL configurável |
| Analytics | Contagem de cliques, geo, device, referer |

### Requisitos não-funcionais

| Requisito | Target |
|-----------|--------|
| Escala | 1 bilhão de URLs criadas, 100B redirects/mês |
| Ratio read/write | ~1000:1 (pra cada URL criada, ~1000 redirects) |
| Latência de redirect | < 10ms (p99) |
| Latência de criação | < 100ms |
| Disponibilidade | 99.99% (redirect offline = links quebrados everywhere) |
| Unicidade | Colisão = zero. Dois URLs nunca podem mapear pro mesmo short code |
| Durabilidade | URL criada nunca pode ser perdida (a menos que expire) |

### Fora do escopo

- Link preview / unfurling
- QR code generation
- A/B testing de destinos
- User management (planos, billing)

### A restrição interessante

O short code precisa ser **curto** (é literalmente o propósito do serviço). Se usamos caracteres `[a-zA-Z0-9]` = 62 possibilidades por posição:

```
6 caracteres: 62^6 = ~56 bilhões de combinações
7 caracteres: 62^7 = ~3.5 trilhões de combinações
```

Com 1 bilhão de URLs, 6 caracteres é suficiente (usa ~1.8% do espaço). 7 caracteres dá margem confortável pra décadas.

## Fase 2: Estimativas

### Criação (write)

```
URLs criadas/mês: 100.000.000 (100M)
URLs criadas/segundo: 100M / (30 × 86.400) ≈ ~40/s (média)
Pico: ~200/s

Tamanho médio de uma URL: ~200 bytes (original) + ~50 bytes (metadata)
Storage/mês: 100M × 250 bytes = ~25 GB/mês
Storage/5 anos: ~1.5 TB
```

1.5 TB em 5 anos. Cabe num único PostgreSQL confortavelmente. Escala de write é trivial (~40/s). O desafio **não é write**.

### Redirect (read)

```
Redirects/mês: 100.000.000.000 (100 bilhões)
Redirects/segundo: 100B / (30 × 86.400) ≈ ~38.500/s (média)
Pico: ~100.000/s

Bandwidth: 100K req/s × ~500 bytes (request + headers) = ~50 MB/s
```

100.000 reads/segundo no pico. Aqui está o desafio. O banco não aguenta 100K queries/segundo por row lookup. Precisa de **cache na frente**.

### Cache sizing

```
Distribuição de acessos segue power law:
  20% das URLs respondem por 80% do tráfego

URLs "hot" (acessadas frequentemente): ~20M URLs
Tamanho por entry no cache: short_code + long_url ≈ 300 bytes
Cache total: 20M × 300 bytes = ~6 GB
```

6 GB cabe em **um único Redis node**. Esse é o tipo de sistema onde caching resolve quase tudo.

## Fase 3: High-level design

### Arquitetura geral

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 650" width="100%" style="max-width: 100%; height: auto;" role="img" aria-labelledby="url-paths-title">
  <title id="url-paths-title">Diagrama dos caminhos de criação e redirecionamento do encurtador</title>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#666666" />
    </marker>
  </defs>
  <g font-family="Segoe UI, Arial, sans-serif">
    <rect x="20" y="20" width="820" height="220" rx="8" fill="#f5f5f5" stroke="#666666" />
    <text x="430" y="46" font-size="14" font-weight="bold" text-anchor="middle">WRITE PATH (Create)</text>
    <rect x="50" y="80" width="120" height="48" rx="6" fill="#f5f5f5" stroke="#666666" />
    <text x="110" y="109" font-size="12" font-weight="bold" text-anchor="middle">Client</text>
    <rect x="220" y="80" width="130" height="48" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="285" y="109" font-size="12" font-weight="bold" text-anchor="middle">API Server</text>
    <rect x="400" y="80" width="140" height="48" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="470" y="109" font-size="12" font-weight="bold" text-anchor="middle">ID Generator</text>
    <rect x="590" y="80" width="140" height="48" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="660" y="109" font-size="12" font-weight="bold" text-anchor="middle">URL DB</text>
    <rect x="560" y="160" width="200" height="48" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="660" y="189" font-size="12" font-weight="bold" text-anchor="middle">Cache (warm)</text>
    <line x1="170" y1="104" x2="220" y2="104" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="350" y1="104" x2="400" y2="104" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="540" y1="104" x2="590" y2="104" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="660" y1="128" x2="660" y2="160" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <rect x="20" y="280" width="820" height="340" rx="8" fill="#f5f5f5" stroke="#666666" />
    <text x="430" y="306" font-size="14" font-weight="bold" text-anchor="middle">READ PATH (Redirect)</text>
    <rect x="50" y="340" width="120" height="48" rx="6" fill="#f5f5f5" stroke="#666666" />
    <text x="110" y="369" font-size="12" font-weight="bold" text-anchor="middle">Client</text>
    <rect x="220" y="340" width="150" height="48" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="295" y="369" font-size="12" font-weight="bold" text-anchor="middle">CDN / Load Balancer</text>
    <rect x="420" y="340" width="150" height="48" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="495" y="369" font-size="12" font-weight="bold" text-anchor="middle">Redirect Service</text>
    <rect x="280" y="430" width="150" height="56" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="355" y="455" font-size="12" font-weight="bold" text-anchor="middle">Cache</text>
    <text x="355" y="473" font-size="10" fill="#555" text-anchor="middle">hit?</text>
    <rect x="500" y="430" width="140" height="56" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="570" y="463" font-size="12" font-weight="bold" text-anchor="middle">URL DB</text>
    <rect x="360" y="520" width="270" height="48" rx="6" fill="#fff2cc" stroke="#d6b656" />
    <text x="495" y="549" font-size="12" font-weight="bold" text-anchor="middle">HTTP 301/302 Redirect</text>
    <rect x="345" y="590" width="300" height="48" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="495" y="619" font-size="12" font-weight="bold" text-anchor="middle">Analytics Pipeline</text>
    <line x1="170" y1="364" x2="220" y2="364" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="370" y1="364" x2="420" y2="364" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="495" y1="388" x2="355" y2="430" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="495" y1="388" x2="570" y2="430" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="355" y1="486" x2="460" y2="520" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="570" y1="486" x2="530" y2="520" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="495" y1="568" x2="495" y2="590" stroke="#666666" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#arrow)" />
    <text x="510" y="584" font-size="10" fill="#555">async</text>
  </g>
</svg>

### Componentes

| Componente | Responsabilidade |
|-----------|-----------------|
| **API Server** | Criar short URLs, validação |
| **ID Generator** | Gerar short codes únicos |
| **URL DB** | Persistir mapeamento short→long |
| **Cache (Redis)** | Lookup rápido pra redirects |
| **Redirect Service** | Resolver short code e redirecionar |
| **Analytics Pipeline** | Contar cliques, metadata |
| **Cleanup Service** | Expirar URLs com TTL |

## Deep Dive 1: Geração de Short Codes - O problema mais importante

Como gerar `abc123` a partir de `https://www.example.com/very/long/path/to/something`?

Parece bobo, mas a escolha aqui impacta unicidade, performance, e distribuição do sistema inteiro.

### Approach 1: Hashing (MD5/SHA256 + truncar)

```
input:  "https://www.example.com/long/path"
md5:    "e4d909c290d0fb1ca068ffaddf22cbd0"
base62: "e4d909c290" → truncar pra 7 chars → "e4d909c"
```

**Problemas:**

1. **Colisão:** truncar hash aumenta probabilidade de colisão. Com 7 chars base62 e 1B URLs, a probabilidade não é negligível (birthday paradox).

2. **Resolver colisão:** se `e4d909c` já existe no DB:
   ```
   Retry: hash(original_url + "1") → novo hash → truncar → checar colisão → retry...
   ```
   Loop até encontrar slot livre. Funciona mas adiciona latência imprevisível.

3. **Mesma URL = mesmo hash:** se dois usuários encurtam a mesma URL, recebem o mesmo short code. Pode ser feature (deduplicação) ou bug (cada um deveria ter analytics separado).

**Veredito:** funciona pra MVP. Não escala bem com bilhões de URLs (colisões frequentes degradam performance).

### Approach 2: Counter + Base62 encoding

```
Counter auto-increment: 1, 2, 3, ... 1000000
Base62 encode: 
  1 → "1"
  62 → "10"  
  1000000 → "4c92"
  56800235583 → "zzzzzzz" (máximo com 7 chars)
```

**Como funciona:**

```python
CHARSET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

def encode_base62(num):
    if num == 0:
        return CHARSET[0]
    result = []
    while num > 0:
        result.append(CHARSET[num % 62])
        num //= 62
    return ''.join(reversed(result))

def decode_base62(s):
    num = 0
    for char in s:
        num = num * 62 + CHARSET.index(char)
    return num
```

**Vantagens:**
- ✅ Zero colisões (cada número gera código único)
- ✅ Previsível e determinístico
- ✅ Decodificação possível (short code → número → busca direta no DB)

**Problema:** como gerar o counter de forma distribuída?

### Counter distribuído: as opções

**Opção A: Auto-increment no DB**

```sql
INSERT INTO urls (long_url) VALUES ('https://...') RETURNING id;
-- id = 7483921
-- short_code = base62(7483921) = "1Ri7B"
```

Simples. Mas o DB vira single point of contention. Com ~40 writes/s é ok. Com burst de 200/s pode ser gargalo (lock no sequence).

**Opção B: Pre-allocated ranges**

```
Coordinator distribui ranges pra cada server:
  Server A: range [1, 1.000.000]
  Server B: range [1.000.001, 2.000.000]
  Server C: range [2.000.001, 3.000.000]

Cada server consome seu range localmente (in-memory counter):
  Server A cria URL → counter = 547.832 → base62 → short code
  Sem coordenação necessária (cada server tem range exclusivo)
  Quando range acaba → pede novo range ao coordinator
```

**Vantagens:**
- Zero colisão (ranges não se sobrepõem)
- Sem coordenação por-request (counter local é O(1))
- Coordinator só é chamado a cada ~1M URLs (raro)

**Desvantagem:** IDs não são sequenciais globalmente (Server A pode estar no 500K enquanto Server B está no 1.2M). Não é problema. Ninguém precisa de ordem global.

**Opção C: Snowflake-style ID (timestamp + machine + sequence)**

```
| 41 bits: timestamp | 5 bits: datacenter | 5 bits: machine | 12 bits: sequence |
```

Gera IDs únicos sem coordenação. Mas produz números de 64 bits que em base62 têm 11 chars. Mais longo que necessário pra URL shortener (queremos 6-7).

**Escolha recomendada:** Pre-allocated ranges. Combina simplicidade, zero colisão, e escala horizontal.

### Approach 3: Custom alias (slug escolhido pelo user)

```
POST /v1/urls
{
  "long_url": "https://...",
  "custom_alias": "meu-link-legal"
}
```

**Validação necessária:**
1. Slug permitido? (não é palavra reservada, profanidade, etc)
2. Slug disponível? `SELECT 1 FROM urls WHERE short_code = 'meu-link-legal'`
3. Se disponível → reservar atomicamente

Race condition: dois users pedem mesmo slug simultaneamente:
```sql
INSERT INTO urls (short_code, long_url) VALUES ('meu-link-legal', '...')
ON CONFLICT (short_code) DO NOTHING
RETURNING id;

-- Se id retornado: sucesso
-- Se nada retornado: slug já existe → erro 409 Conflict
```

Unique constraint no DB garante atomicidade. Sem race condition.

## Deep Dive 2: Storage e Caching

### Database schema

```sql
CREATE TABLE urls (
    id BIGINT PRIMARY KEY,           -- counter-based
    short_code VARCHAR(10) UNIQUE NOT NULL,
    long_url TEXT NOT NULL,
    user_id BIGINT,                  -- quem criou (nullable pra anônimos)
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,            -- NULL = nunca expira
    click_count BIGINT DEFAULT 0,    -- counter denormalizado
    
    INDEX idx_short_code (short_code),
    INDEX idx_expires (expires_at) WHERE expires_at IS NOT NULL
);
```

**Por que PostgreSQL (e não NoSQL)?**

- Volume de write é baixo (~40/s). Não precisa de escala horizontal de escrita.
- Read vai ser servido pelo cache na esmagadora maioria.
- Unique constraint garante zero colisão.
- Queries de analytics (top URLs, por user) são relacionais.

Com 1.5 TB em 5 anos, um PostgreSQL com bom hardware (NVMe SSD) serve sem problemas. Se precisar escalar além: shard por `id` (range-based, já que IDs são sequenciais).

### Caching strategy

O sistema é **extremamente read-heavy** (1000:1). Cache hit rate esperado: >99%.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 360" width="100%" style="max-width: 100%; height: auto;" role="img" aria-labelledby="url-cache-title">
  <title id="url-cache-title">Diagrama do fluxo cache-aside do redirecionamento</title>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#666666" />
    </marker>
  </defs>
  <g font-family="Segoe UI, Arial, sans-serif">
    <rect x="300" y="20" width="260" height="48" rx="6" fill="#f5f5f5" stroke="#666666" />
    <text x="430" y="49" font-size="12" font-weight="bold" text-anchor="middle">Redirect request: GET /abc123</text>
    <rect x="300" y="100" width="260" height="48" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="430" y="129" font-size="12" font-weight="bold" text-anchor="middle">Redis: GET url:abc123</text>
    <rect x="90" y="190" width="250" height="70" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="215" y="218" font-size="12" font-weight="bold" text-anchor="middle">HIT (99%+ dos casos)</text>
    <text x="215" y="238" font-size="10" fill="#555" text-anchor="middle">retorna long_url</text>
    <text x="215" y="252" font-size="10" fill="#555" text-anchor="middle">redirect</text>
    <rect x="520" y="190" width="250" height="54" rx="6" fill="#fff2cc" stroke="#d6b656" />
    <text x="645" y="216" font-size="12" font-weight="bold" text-anchor="middle">MISS</text>
    <text x="645" y="234" font-size="10" fill="#555" text-anchor="middle">query DB → retorna long_url</text>
    <rect x="520" y="270" width="250" height="54" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="645" y="294" font-size="12" font-weight="bold" text-anchor="middle">SET url:abc123 {long_url} EX 86400</text>
    <text x="645" y="312" font-size="10" fill="#555" text-anchor="middle">cacheia por 24h</text>
    <rect x="320" y="300" width="220" height="42" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="430" y="326" font-size="12" font-weight="bold" text-anchor="middle">redirect</text>
    <line x1="430" y1="68" x2="430" y2="100" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="370" y1="148" x2="245" y2="190" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="490" y1="148" x2="615" y2="190" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="215" y1="260" x2="380" y2="300" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="645" y1="244" x2="645" y2="270" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="610" y1="324" x2="490" y2="300" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <text x="250" y="176" font-size="10" fill="#555">HIT</text>
    <text x="610" y="176" font-size="10" fill="#555">MISS</text>
  </g>
</svg>

**Cache policy:**

| Aspecto | Decisão | Motivo |
|---------|---------|--------|
| Eviction | LRU (Least Recently Used) | URLs não acessadas há tempo são cold |
| TTL | 24 horas (renovado a cada hit) | Balance entre memória e hit rate |
| Warm-up | Ao criar URL, já escreve no cache | Primeira visita não sofre cold start |
| Invalidação | Ao deletar/expirar URL | Remove do cache imediatamente |

**Cache hit rate com 6 GB:**

```
Total URLs: 1 bilhão
URLs acessadas nas últimas 24h: ~20 milhões (2%)
Cache cabe: ~20M entries × 300 bytes = 6 GB
Hit rate: ~99.5% (quase todo acesso é pra URLs recentes/populares)
```

Com 99.5% de cache hit, o DB recebe apenas ~500 queries/segundo (0.5% de 100K/s). Confortável.

### CDN como primeira camada

URLs extremamente populares (viral no Twitter, email marketing pra milhões) podem ser cacheadas direto no CDN:

```
Client → CDN Edge (cache hit?) → Origin (Redirect Service + Redis)
```

CDN retorna HTTP 301 cacheado. O redirect nem chega no nosso server. Reduz load drasticamente pra links virais.

**Cuidado:** se usar 301 (permanent redirect), browsers cacheiam e não passam mais pelo seu server (perde analytics). Se usar 302 (temporary redirect), browser volta sempre ao server (mantém analytics mas não ganha cache de browser).

**Trade-off:**
- 301: melhor performance, perde controle (não pode mudar destino, perde tracking)
- 302: mantém controle total, mais load no server

**Escolha comum:** 302 por padrão (analytics importa), 301 opcional pra URLs que nunca mudam.

## Deep Dive 3: Redirect - os 10ms mais importantes

O redirect precisa ser **rápido**. Cada milissegundo de latência aqui é sentido por todo mundo que clica num link encurtado.

### Fluxo otimizado

```
1. Request: GET /abc123
   [0ms]

2. Parse short_code do path
   [<0.1ms]

3. Redis lookup: GET url:abc123
   [0.5-1ms]

4. Se encontrou: retorna HTTP 302 Location: {long_url}
   [<0.1ms]

5. Se não encontrou: query DB
   [2-5ms]

Total (cache hit): ~1-2ms
Total (cache miss): ~5-10ms
```

### Otimizações

**1. Connection pooling ao Redis:**

Abrir conexão TCP pro Redis a cada request adiciona ~1ms. Connection pool reutiliza conexões existentes.

**2. Redirect service stateless:**

Nenhum estado local. Qualquer instância pode servir qualquer request. Escala adicionando mais pods/containers.

**3. HTTP keep-alive:**

Client mantém conexão TCP aberta pro server. Elimina overhead de TCP handshake + TLS handshake a cada request.

**4. Resposta mínima:**

```http
HTTP/1.1 302 Found
Location: https://www.example.com/very/long/original/url
Content-Length: 0
```

Zero body. Só o header `Location`. Menor resposta possível = menor latência de transmissão.

## Deep Dive 4: Analytics Pipeline

Cada redirect é um evento de analytics: quem clicou, de onde, quando, qual device.

### O problema

100.000 redirects/segundo. Se cada um fizer um write síncrono no analytics DB:

```
100K writes/s no PostgreSQL = vai derrubar
E o redirect ficaria mais lento (esperando write de analytics)
```

**Solução: fire-and-forget + async pipeline.**

O redirect NÃO espera analytics ser processado. Registro é assíncrono.

### Arquitetura de analytics

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 390" width="100%" style="max-width: 100%; height: auto;" role="img" aria-labelledby="url-analytics-title">
  <title id="url-analytics-title">Diagrama da fan-out assíncrona de analytics do encurtador</title>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#666666" />
    </marker>
  </defs>
  <g font-family="Segoe UI, Arial, sans-serif">
    <rect x="340" y="20" width="220" height="48" rx="6" fill="#f5f5f5" stroke="#666666" />
    <text x="450" y="49" font-size="12" font-weight="bold" text-anchor="middle">Redirect acontece</text>
    <rect x="320" y="100" width="260" height="52" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="450" y="128" font-size="12" font-weight="bold" text-anchor="middle">Kafka topic: click_events</text>
    <text x="450" y="145" font-size="10" fill="#555" text-anchor="middle">fire-and-forget</text>
    <rect x="40" y="220" width="240" height="86" rx="8" fill="#d5e8d4" stroke="#82b366" />
    <text x="160" y="248" font-size="12" font-weight="bold" text-anchor="middle">Consumer: Real-time counter</text>
    <text x="160" y="268" font-size="10" fill="#555" text-anchor="middle">Redis INCR</text>
    <text x="160" y="286" font-size="10" fill="#555" text-anchor="middle">Incrementa click_count:{short_code}</text>
    <rect x="330" y="220" width="240" height="96" rx="8" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="450" y="248" font-size="12" font-weight="bold" text-anchor="middle">Consumer: Analytics aggregator</text>
    <text x="450" y="268" font-size="10" fill="#555" text-anchor="middle">Agrega por hora, geo, device, referer</text>
    <text x="450" y="286" font-size="10" fill="#555" text-anchor="middle">Escreve em batch no Analytics DB</text>
    <text x="450" y="302" font-size="10" fill="#555" text-anchor="middle">(cada 10s)</text>
    <rect x="620" y="220" width="240" height="86" rx="8" fill="#fff2cc" stroke="#d6b656" />
    <text x="740" y="248" font-size="12" font-weight="bold" text-anchor="middle">Consumer: Raw event archive</text>
    <text x="740" y="268" font-size="10" fill="#555" text-anchor="middle">S3 / Blob</text>
    <text x="740" y="286" font-size="10" fill="#555" text-anchor="middle">pra queries ad-hoc futuras</text>
    <line x1="450" y1="68" x2="450" y2="100" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="450" y1="152" x2="160" y2="220" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="450" y1="152" x2="450" y2="220" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="450" y1="152" x2="740" y2="220" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
  </g>
</svg>

### Evento de click

```json
{
  "short_code": "abc123",
  "timestamp": "2026-05-24T10:30:15.432Z",
  "ip": "189.100.x.x",
  "country": "BR",
  "city": "São Paulo",
  "user_agent": "Mozilla/5.0 (iPhone; CPU iOS 17_0)...",
  "referer": "https://twitter.com/...",
  "device_type": "mobile",
  "os": "iOS",
  "browser": "Safari"
}
```

### Geo-lookup

IP → país/cidade. Não dá pra fazer request externo a cada click (latência). Solução: **MaxMind GeoIP database local** (~50 MB, atualizada semanalmente). Lookup é in-memory, <0.1ms.

### Aggregation schema

```sql
CREATE TABLE click_stats_hourly (
    short_code VARCHAR(10),
    hour TIMESTAMP,         -- truncado pra hora
    click_count INT,
    unique_visitors INT,    -- HyperLogLog approximation
    top_countries JSONB,    -- {"BR": 4500, "US": 1200, ...}
    top_referers JSONB,     -- {"twitter.com": 3000, "direct": 2000}
    device_breakdown JSONB, -- {"mobile": 70, "desktop": 25, "tablet": 5}
    
    PRIMARY KEY (short_code, hour)
);
```

**Por que agregar por hora (e não raw)?**

Raw events: 100K/s × 200 bytes = 20 MB/s = ~52 TB/mês. Caro pra queries.
Agregado por hora: 1 row por URL por hora. Queries são rápidas, storage é mínimo.

Raw fica no S3 pra deep analytics; aggregated fica no PostgreSQL pra dashboard em real-time.

### Contadores aproximados: HyperLogLog

"Quantos visitantes únicos?" parece exigir armazenar cada visitor ID. Com 1M clicks, seria 1M entries só pra uniqueness.

**HyperLogLog:** conta elementos únicos usando ~12 KB de memória, independente do número de elementos. Erro: <2%.

```
Redis: PFADD unique_visitors:abc123:2026-05-24 "visitor_hash_1"
Redis: PFADD unique_visitors:abc123:2026-05-24 "visitor_hash_2"
Redis: PFCOUNT unique_visitors:abc123:2026-05-24
→ 847293 (±2%)
```

847.293 visitors únicos rastreados com 12 KB de memória em vez de ~6 MB (se armazenasse todos os hashes).

## Deep Dive 5: Expiração e Cleanup

URLs com TTL precisam parar de funcionar após expirar. Como fazer isso sem escanear o banco inteiro a cada segundo?

### Approach 1: Check on read (lazy expiration)

```
Redirect request → busca URL → verifica expires_at → se expirado: 404
```

**Prós:** zero overhead de background jobs. Simples.
**Contras:** URL expirada ainda ocupa espaço no DB e cache até ser acessada. Se nunca for acessada de novo, fica lá pra sempre.

### Approach 2: Background cleanup job

```sql
-- A cada 5 minutos:
DELETE FROM urls 
WHERE expires_at IS NOT NULL 
  AND expires_at < NOW()
LIMIT 10000;  -- batch pra não lockar tabela
```

**Prós:** limpa storage, libera short codes pra reuso.
**Contras:** precisa de index eficiente em `expires_at`, query pode ser cara se muitas URLs expiram ao mesmo tempo.

### Approach 3: Combinação (o melhor dos dois mundos)

```
1. Check on read (lazy): redirect retorna 404 imediatamente se expirado
2. Cache com TTL alinhado: Redis TTL = expires_at - now()
   → Cache entry expira automaticamente no Redis
3. Background job (diário): limpa URLs expiradas do DB em batch
   → Faz em horário de baixo tráfego (3-5 AM)
   → Processa em chunks de 10K pra não lockar
```

### Reuso de short codes?

Quando URL expira, o short code `abc123` fica disponível de novo?

**Opção A: Nunca reutilizar.** Simples, evita confusão (link antigo em cache de alguém redireciona pra lugar errado). Com 62^7 = 3.5 trilhões de combinações, espaço não é problema.

**Opção B: Reutilizar após grace period (30 dias).** Libera codes "bonitos" pra custom aliases. Complexo: precisa garantir que caches foram limpos.

**Recomendação:** nunca reutilizar, a menos que o negócio exija explicitamente.

## Deep Dive 6: Rate Limiting e Abuse Prevention

URL shortener é alvo fácil de abuso: spam, phishing, DDoS via redirect amplification.

### Problemas de abuso

1. **Spam:** criar milhões de short URLs apontando pra sites maliciosos
2. **Phishing:** esconder URL de phishing atrás de URL "confiável" do seu domínio
3. **Amplification attack:** criar short URL pra site pesado, mandar milhões de bots clicarem → DDoS no destino via seu serviço
4. **Enumeration:** tentar todos os short codes (`/a`, `/b`, ..., `/zzzzzzz`) pra descobrir URLs privadas

### Defesas

**Rate limiting por IP e por user:**

```
Criação: máximo 100 URLs/hora por IP (anônimo) ou 1000/hora por conta
Redirect: máximo 1000/minuto por IP (previne bot crawling)

Implementação: Redis sliding window
  Key: ratelimit:create:{ip}:{hour}
  INCR + EXPIRE 3600
  Se > 100: retorna 429 Too Many Requests
```

**URL safety check na criação:**

```
Antes de aceitar URL longa:
  1. Check contra lista de domínios maliciosos (Google Safe Browsing API)
  2. Check contra blocklist interna
  3. DNS resolution: domínio existe?
  4. Se suspeito: queue pra review manual, cria com flag "pending"
```

**Anti-enumeration:**

Short codes previsíveis (counter sequencial: 1, 2, 3...) são enumeráveis. Solução: embaralhar o counter antes de encodar:

```python
def generate_short_code(counter):
    # Scramble com bitwise operations (reversível)
    scrambled = scramble(counter)  # 7483921 → 39284756
    return encode_base62(scrambled)  # "mK4Rp"

def resolve_short_code(code):
    scrambled = decode_base62(code)  # "mK4Rp" → 39284756
    counter = unscramble(scrambled)  # 39284756 → 7483921
    return lookup_by_id(counter)
```

Códigos parecem aleatórios mas são determinísticos. Não é criptografia (não precisa ser seguro contra atacante motivado), só evita crawling trivial.

## Deep Dive 7: Alta disponibilidade

URL shortener **não pode cair**. Links estão em emails, tweets, cartões de visita, QR codes físicos. Se o serviço fica offline, **nenhum link encurtado do mundo funciona**.

### Multi-region deployment

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 420" width="100%" style="max-width: 100%; height: auto;" role="img" aria-labelledby="url-regions-title">
  <title id="url-regions-title">Diagrama do deployment multi-region do encurtador</title>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#666666" />
    </marker>
  </defs>
  <g font-family="Segoe UI, Arial, sans-serif">
    <rect x="355" y="20" width="250" height="50" rx="6" fill="#f5f5f5" stroke="#666666" />
    <text x="480" y="50" font-size="12" font-weight="bold" text-anchor="middle">DNS (GeoDNS / Anycast)</text>
    <rect x="50" y="110" width="360" height="260" rx="8" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="230" y="138" font-size="14" font-weight="bold" text-anchor="middle">Region: US-East</text>
    <rect x="110" y="160" width="240" height="52" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="230" y="188" font-size="12" font-weight="bold" text-anchor="middle">LB → Redirect Service (N pods)</text>
    <rect x="130" y="235" width="200" height="48" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="230" y="264" font-size="12" font-weight="bold" text-anchor="middle">Redis Cluster</text>
    <rect x="110" y="305" width="240" height="48" rx="6" fill="#fff2cc" stroke="#d6b656" />
    <text x="230" y="334" font-size="12" font-weight="bold" text-anchor="middle">PostgreSQL (primary)</text>
    <rect x="550" y="110" width="360" height="260" rx="8" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="730" y="138" font-size="14" font-weight="bold" text-anchor="middle">Region: EU-West</text>
    <rect x="610" y="160" width="240" height="52" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="730" y="188" font-size="12" font-weight="bold" text-anchor="middle">LB → Redirect Service (N pods)</text>
    <rect x="630" y="235" width="200" height="48" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="730" y="264" font-size="12" font-weight="bold" text-anchor="middle">Redis Cluster</text>
    <rect x="610" y="305" width="240" height="48" rx="6" fill="#fff2cc" stroke="#d6b656" />
    <text x="730" y="334" font-size="12" font-weight="bold" text-anchor="middle">PostgreSQL (read replica)</text>
    <line x1="480" y1="70" x2="230" y2="110" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="480" y1="70" x2="730" y2="110" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="230" y1="212" x2="230" y2="235" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="230" y1="283" x2="230" y2="305" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="730" y1="212" x2="730" y2="235" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="730" y1="283" x2="730" y2="305" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="350" y1="329" x2="610" y2="329" stroke="#666666" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#arrow)" />
    <line x1="610" y1="345" x2="350" y2="345" stroke="#666666" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#arrow)" />
    <text x="480" y="320" font-size="10" fill="#555" text-anchor="middle">async replication</text>
  </g>
</svg>

**DNS GeoDNS:** roteia usuário pro datacenter mais próximo. Brasileiro vai pro US-East (ou SA-East se tiver), europeu vai pro EU-West.

**Read replica:** redirect é read-only. Replica é suficiente. Se primary cai, promote replica. Writes (criar URL) são raros e podem ter latência ligeiramente maior.

**Redis per-region:** cada região tem seu próprio Redis. Writes no Redis são feitos localmente após DB write. Se região cai, outra região assume.

### Failover

```
Cenário: região US-East fica offline

1. DNS health check detecta (timeout 10s)
2. DNS remove US-East do rotation (TTL 30s)
3. Próximos requests vão pra EU-West
4. EU-West tem read replica → serve redirects normalmente
5. Creates são redirecionados pra nova primary (failover de DB)

Impacto total: ~30-60 segundos de latência elevada, zero downtime real
```

## Comparação: URL Shortener vs sistemas anteriores

| Aspecto | URL Shortener | YouTube | WhatsApp | Uber | Twitter |
|---------|--------------|---------|----------|------|---------|
| Complexidade de write | Trivial (40/s) | Alta (transcoding) | Alta (delivery guarantee) | Alta (matching) | Alta (fan-out) |
| Complexidade de read | Média (cache-heavy) | Alta (CDN/streaming) | Baixa (1:1) | Média (tracking) | Alta (timeline merge) |
| Data model | Simples (key→value) | Complexo (multi-format) | Complexo (E2E, ordering) | Complexo (geospatial) | Complexo (graph + cache) |
| Principal desafio | Read latency + analytics | Storage + bandwidth | Delivery + connections | Geolocation + real-time | Fan-out + scale |
| Cache hit rate | >99% | >95% (CDN) | N/A | Low (data moves) | >95% (timeline) |

O URL Shortener é o "hello world" do system design, mas um hello world que toca em caching, hashing, analytics pipelines, rate limiting, e HA multi-region.

## Trade-offs e decisões

| Decisão | Alternativa | Por que essa escolha |
|---------|-------------|---------------------|
| Pre-allocated ranges (ID) | Hash + collision check | Zero colisão, O(1) generation, distributed |
| Base62 encoding | Base64, UUID | URL-safe, legível, curto |
| PostgreSQL | DynamoDB/Cassandra | Write volume baixo, queries de analytics, unique constraints |
| Redis (single layer) | Multi-tier cache | 6 GB cabe em 1 node, simplicidade |
| 302 Redirect (padrão) | 301 Redirect | Mantém controle: analytics, pode mudar destino |
| Kafka (analytics) | Sync write | Redirect não pode esperar analytics |
| HyperLogLog (uniques) | Exact count | 12 KB vs 6 MB, <2% erro |
| Lazy + batch expiration | Só lazy OU só batch | Best of both: UX imediato + storage cleanup |
| Scrambled counter | Pure sequential | Anti-enumeration sem custo de colisão |
| Never reuse codes | Reuse após expiry | Evita cache confusion, espaço é abundante |

## Como escalar além

1. **Link preview service:** ao criar URL, fetch a página destino e armazenar título + thumbnail (como Slack faz ao colar um link)
2. **A/B testing:** mesma short URL redireciona pra destinos diferentes baseado em % de tráfego
3. **Smart routing:** device=mobile → URL mobile, device=desktop → URL desktop
4. **Branded domains:** empresas usam seu próprio domínio (links.empresa.com.br) com seu backend
5. **Real-time dashboard:** WebSocket streaming de clicks conforme acontecem (dashbard ao vivo pra campanhas de marketing)

## Resumo da série

Com esse artigo, concluímos os 6 sistemas da série. Aqui está o mapa mental dos conceitos que cobrimos:

| Conceito | Onde apareceu |
|----------|--------------|
| **CDN** | YouTube (streaming), URL Shortener (redirect cache) |
| **Message Queue (Kafka)** | YouTube (transcoding), WhatsApp (delivery), Twitter (fan-out), URL Shortener (analytics) |
| **WebSocket** | WhatsApp (messaging), Uber (tracking), Twitter (real-time) |
| **Caching (Redis)** | Todos (é universal) |
| **Geospatial** | Uber (H3, matching) |
| **Fan-out** | Twitter (write vs read vs hybrid) |
| **Consistent Hashing** | YouTube (storage), Twitter (timeline sharding) |
| **Rate Limiting** | URL Shortener (abuse prevention) |
| **Eventual Consistency** | YouTube (upload visibility), Twitter (timeline), URL Shortener (analytics) |
| **Strong Consistency** | WhatsApp (delivery), Uber (matching: 1 ride = 1 driver) |
| **Pre-signed URLs** | YouTube (upload bypass) |
| **Snowflake IDs** | Twitter (time-ordered distributed IDs) |
| **HyperLogLog** | URL Shortener (unique visitors) |
| **Count-Min Sketch** | Twitter (trending topics) |
| **E2E Encryption** | WhatsApp (Signal Protocol) |

Se você dominar esses conceitos e souber **quando e por que** usar cada um, está preparado pra qualquer entrevista de system design.

---

*Esse foi o último artigo da série [System Design na Prática](/series/system-design-na-prática/). Se a série te ajudou, compartilha com outros devs que estão se preparando pra entrevistas. E se quiser que eu cubra outro sistema específico, me encontra no [LinkedIn](https://www.linkedin.com/in/yourprofile).*
