---
slug: "system-design-na-pratica-como-pensar-sistemas-em-escala"
aliases:
  - "/posts/system-design-na-pratica-como-pensar-sistemas-em-escala/"
title: "System design na prática: como pensar sistemas em escala"
description: "O framework completo pra abordar qualquer problema de system design: de capacity planning a trade-offs. O primeiro artigo da série System Design na Prática."
date: 2026-05-20T10:00:00-04:00
categories:
  - Carreira
  - Arquitetura
tags:
  - system-design
  - entrevista
  - arquitetura
  - escalabilidade
series:
  - "System Design na Prática"
---

Você está numa entrevista. O entrevistador vira e fala: "Design a video-sharing platform like YouTube." Você tem 45 minutos. O que faz primeiro?

Se a resposta for "começo desenhando caixinhas no diagrama", você já perdeu.

System design não é sobre saber a resposta certa. É sobre mostrar como você pensa quando o problema ainda está meio em aberto. E isso melhora com framework, prática e repertório.

Este é o primeiro artigo da série **System Design na Prática**. Nos próximos posts eu vou aplicar esse framework em sistemas reais como YouTube, WhatsApp, Uber e Twitter. Mas antes precisamos do toolkit mental. Esse artigo é o seu canivete suíço.

## Por que system design importa

Se você está mirando vagas em empresas de tecnologia fora do Brasil (FAANG, startups bem financiadas, scale-ups), system design é a etapa que mais reprova candidatos seniores.

O motivo é simples: coding interviews testam se você sabe programar. System design testa se você sabe **construir software que funciona em produção, em escala, com restrições reais**.

Não existe gabarito. O entrevistador quer ver:

- Como você **decompõe** um problema ambíguo
- Quais **trade-offs** você identifica e como decide entre eles
- Se você entende as **implicações** das suas escolhas em escala
- Se consegue **comunicar** decisões técnicas com clareza

## O framework: 4 fases em 45 minutos

Todo problema de system design, não importa o sistema, segue a mesma estrutura. Decorar essa estrutura libera seu cérebro pra pensar no que importa.

### Fase 1: Esclarecer requisitos (5-7 minutos)

Nunca comece a desenhar sem perguntar. O entrevistador deliberadamente deixa o problema vago pra ver se você busca clareza.

**Perguntas funcionais**: o que o sistema faz:

- Quais são as funcionalidades core? (upload, streaming, busca?)
- Quem são os usuários? (web, mobile, API?)
- Qual o fluxo principal? (upload → processamento → visualização?)

**Perguntas não-funcionais**: como o sistema se comporta:

- Qual a escala? (DAU, requests/segundo, volume de dados)
- Qual a latência aceitável? (real-time? segundos? minutos?)
- Qual o nível de disponibilidade? (99.9%? 99.99%?)
- Consistência é mais importante que disponibilidade, ou vice-versa?

**Perguntas de escopo**: o que NÃO fazer:

- Precisamos de feature X nesse design? (livestreaming, comentários, recommendations?)
- Qual é o out-of-scope explícito?

Esse passo demonstra maturidade. Engenheiros juniores assumem. Seniores perguntam.

### Fase 2: Estimativas e capacity planning (5 minutos)

Back-of-the-envelope calculations. Não precisa ser preciso; precisa estar na ordem de grandeza certa.

**Os números que você precisa ter na cabeça:**

| Recurso | Valor aproximado |
|---------|-----------------|
| 1 dia | 86.400 segundos (~100k pra facilitar) |
| 1 mês | ~2.6 milhões de segundos |
| QPS de 1M requests/dia | ~12 requests/segundo |
| 1 char (UTF-8) | 1-4 bytes |
| 1 tweet/post curto | ~1 KB |
| 1 foto (comprimida) | ~200 KB |
| 1 minuto de vídeo (720p) | ~50 MB |
| 1 TB | 1 trilhão de bytes |
| Leitura de SSD | ~0.1 ms |
| Round-trip na mesma região | ~1-5 ms |
| Round-trip cross-continent | ~100-150 ms |
| Leitura de disco (HDD) | ~5-10 ms |

**Como calcular:**

Exemplo: "1 milhão de uploads por dia"

```
1.000.000 uploads / 100.000 segundos = ~10 uploads/segundo (média)
Pico: 3-5x a média = ~30-50 uploads/segundo
Se cada vídeo tem em média 500 MB:
  Storage/dia = 1M × 500 MB = 500 TB/dia
  Storage/ano = ~180 PB
```

Isso já te diz: precisa de blob storage distribuído, não dá pra guardar em disco local.

**A fórmula universal:**

```
QPS = (requests diários) / 86.400
Pico QPS = QPS médio × fator de pico (geralmente 2-5x)
Storage = (itens/dia) × (tamanho médio) × (retenção em dias)
Bandwidth = QPS × tamanho médio da resposta
```

### Fase 3: High-level design (15-20 minutos)

Agora sim: desenhe. Mas com intenção.

**Comece pelo fluxo de dados, não pelos componentes.** O erro mais comum é começar colocando "Load Balancer → API Server → Database" no diagrama sem entender o fluxo.

Pergunte-se:
1. Quais são os **write paths**? (dados entrando no sistema)
2. Quais são os **read paths**? (dados saindo pro usuário)
3. Onde está a **assimetria**? (read-heavy? write-heavy? ambos?)

**Componentes que você vai usar em quase todo design:**

| Componente | Quando usar |
|------------|-------------|
| **Load Balancer** | Distribuir tráfego entre múltiplas instâncias |
| **API Gateway** | Rate limiting, autenticação, roteamento |
| **Cache (Redis/Memcached)** | Dados lidos com frequência que mudam pouco |
| **Message Queue (Kafka/SQS)** | Desacoplar producers de consumers, processar async |
| **CDN** | Conteúdo estático próximo do usuário (imagens, vídeos, JS) |
| **Blob Storage (S3)** | Arquivos grandes, mídia, backups |
| **Search Index (Elasticsearch)** | Full-text search, queries complexas |
| **Database SQL** | Dados relacionais, transações ACID, joins complexos |
| **Database NoSQL** | Alta escala de escrita, esquema flexível, key-value |

**Dica de ouro:** desenhe o write path e o read path como fluxos separados. Isso mostra que você entende que escrita e leitura têm requisitos diferentes e podem ser otimizadas independentemente.

### Fase 4: Deep dives (15-20 minutos)

O entrevistador vai pedir pra aprofundar em 1-2 áreas. Aqui é onde você mostra profundidade.

Áreas comuns de deep dive:

- **Database schema e sharding strategy**: como particionar dados?
- **Caching strategy**: o que cachear, invalidação, cache stampede?
- **Failure handling**: o que acontece quando X falha?
- **Scaling bottlenecks**: onde o sistema quebra primeiro?
- **Consistency model**: eventual vs strong, e as implicações?

Não espere o entrevistador pedir. Se você identifica um ponto interessante, diga: *"Aqui tem um trade-off que vale a pena explorar..."*

## Os trade-offs fundamentais

System design é sobre trade-offs. Não existe solução perfeita. Toda escolha tem custo.

### Consistência vs. Disponibilidade (CAP Theorem)

O CAP Theorem costuma ser resumido de um jeito meio torto. O ponto não é "escolher dois de três" em qualquer situação. O ponto é que, quando existe partição de rede, você precisa escolher entre consistência forte e disponibilidade.

Na prática, partições acontecem. Então a decisão vira:

- **CP (Consistência + Partição):** o sistema prefere bloquear ou falhar algumas requests a responder com dados inconsistentes. Bom pra: transações financeiras, inventário.
- **AP (Disponibilidade + Partição):** o sistema continua respondendo mesmo com dados possivelmente stale. Bom pra: feeds, likes, view counts.

**Como isso aparece na entrevista:**

> "Quando um usuário posta um vídeo, ele precisa aparecer imediatamente pra todo mundo?"
>
> Se não (maioria dos casos): eventual consistency → AP.
> Se sim (sistema de pagamento): strong consistency → CP.

### Latência vs. Throughput

- **Latência:** quanto tempo leva uma única request
- **Throughput:** quantas requests o sistema processa por segundo

Otimizar pra um geralmente piora o outro. Batch processing aumenta throughput mas aumenta latência individual. Processar request-by-request tem baixa latência mas throughput limitado.

### SQL vs. NoSQL

Não é uma guerra. É uma ferramenta pra cada contexto.

| Critério | SQL (PostgreSQL, MySQL) | NoSQL (DynamoDB, Cassandra, MongoDB) |
|----------|------------------------|--------------------------------------|
| Schema | Estruturado, definido upfront | Flexível, schemaless |
| Escala de escrita | Vertical (limitada) | Horizontal (alta) |
| Queries complexas | Excelente (JOINs, aggregations) | Limitado (denormalize tudo) |
| Transações | ACID nativo | Limitado ou por item |
| Melhor pra | Dados relacionais, financeiro, inventário | Alta escala, time-series, sessões, cache |

**Regra de bolso:** se você precisa de JOIN pra responder uma query, provavelmente SQL. Se o access pattern é sempre key→value ou key→list, NoSQL escala melhor.

### Push vs. Pull (Fan-out)

Quando alguém posta conteúdo que followers precisam ver:

- **Fan-out on write (push):** no momento do post, escreve na timeline de cada follower. Leitura rápida, escrita cara. Bom quando número de followers é limitado.
- **Fan-out on read (pull):** na hora de ler, busca posts de quem você segue. Escrita rápida, leitura cara. Bom quando poucos followers lêem frequentemente.
- **Híbrido:** push pra maioria, pull pra celebridades (quem tem milhões de followers). É o que o Twitter faz.

### Cache: onde, o que, e quando invalidar

Cache resolve muita latência. Também cria boa parte da dor de cabeça de consistência quando é mal desenhado.

**Estratégias de caching:**

- **Cache-aside:** aplicação verifica cache → se miss, busca no DB → escreve no cache. Simples, flexível.
- **Write-through:** toda escrita vai pro cache E pro DB simultaneamente. Consistente, mas mais lento pra escrita.
- **Write-behind:** escrita vai pro cache, e async pro DB. Rápido, mas risco de perda de dados.

**Invalidação (o problema difícil):**

- TTL (time-to-live): simples mas pode servir dados stale
- Event-driven: invalida quando dado muda. Mais complexo, mais correto.
- Versioning: cada write gera nova versão. Nunca invalida, apenas adiciona.

## Números mágicos pra entrevista

Esses números aparecem o tempo todo. Vale ter isso na cabeça:

| SLA | Downtime/ano |
|-----|-------------|
| 99% | 3.65 dias |
| 99.9% | 8.76 horas |
| 99.99% | 52.6 minutos |
| 99.999% | 5.26 minutos |

| Operação | Latência |
|----------|----------|
| L1 cache | ~1 ns |
| L2 cache | ~4 ns |
| RAM | ~100 ns |
| SSD random read | ~100 μs |
| HDD seek | ~10 ms |
| São Paulo → Virginia (round-trip) | ~120 ms |
| São Paulo → Tokyo (round-trip) | ~280 ms |

## Erros comuns (e como evitar)

**1. Pular pra solução sem entender o problema**
→ Sempre gaste 5-7 minutos em requirements. É contraintuitivo mas economiza tempo.

**2. Over-engineering**
→ Se o sistema tem 1000 usuários, você não precisa de Kafka, sharding, e 3 camadas de cache. Comece simples, escale quando necessário.

**3. Ignorar failure modes**
→ Pra cada componente, pergunte: "o que acontece se isso cair?" Se não tem resposta, seu design tem um single point of failure.

**4. Não quantificar**
→ "Muito tráfego" não é um requisito. "50.000 requests/segundo com p99 < 200ms" é.

**5. Design perfeito que não cabe no tempo**
→ 45 minutos. Cubra tudo superficialmente, aprofunde onde importa. Melhor um design completo com 2 deep dives do que metade de um design perfeito.

## Template pra usar em qualquer problema

Quando sentar pra resolver um system design (entrevista ou vida real), siga isso:

```
1. REQUIREMENTS
   - Funcional: [o que o sistema faz]
   - Não-funcional: [escala, latência, disponibilidade]
   - Escopo: [o que NÃO fazer]

2. ESTIMATIVAS
   - QPS (média e pico)
   - Storage (total e crescimento)
   - Bandwidth

3. HIGH-LEVEL DESIGN
   - Write path: [fluxo de escrita]
   - Read path: [fluxo de leitura]
   - Componentes principais

4. DEEP DIVES
   - Database design + sharding
   - Caching strategy
   - Failure handling
   - Scaling plan

5. TRADE-OFFS E DECISÕES
   - Por que X e não Y?
   - Quais as limitações?
   - Como evoluir no futuro?
```

## O que vem na série

Nos próximos artigos, vamos aplicar esse framework em sistemas reais:

- **YouTube**: CDN, transcoding pipeline, adaptive bitrate, pre-signed URLs
- **WhatsApp**: WebSockets, message queues, presença online, criptografia E2E
- **Uber**: geospatial indexes, matching em tempo real, ETA
- **Twitter/X**: fan-out, timeline service, caching em escala
- **URL Shortener**: hashing, read-heavy optimization, analytics

Cada artigo vai seguir a estrutura que definimos aqui. Requisitos → Estimativas → Design → Deep Dives → Trade-offs.

---

*Esse artigo é o primeiro da série [System Design na Prática](/series/system-design-na-prática/). No próximo, vamos dissecar como o YouTube entrega 500 horas de vídeo por minuto pra bilhões de usuários.*
