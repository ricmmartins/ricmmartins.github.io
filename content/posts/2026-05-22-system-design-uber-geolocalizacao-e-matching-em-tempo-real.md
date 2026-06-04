---
slug: "system-design-uber-geolocalizacao-e-matching-em-tempo-real"
aliases:
  - "/posts/system-design-uber-geolocalizacao-e-matching-em-tempo-real/"
title: "System design: Uber - geolocalização e matching em tempo real"
description: "Como projetar um sistema de ride-sharing que encontra o motorista mais próximo em segundos, rastreia milhões de veículos em movimento, e calcula ETAs precisos em tempo real."
date: 2026-05-26T10:00:00-04:00
categories:
  - Carreira
  - Arquitetura
tags:
  - system-design
  - entrevista
  - geolocation
  - matching
  - arquitetura
series:
  - "System Design na Prática"
---

"Design a ride-sharing platform like Uber."

Se YouTube é sobre **throughput de dados** e WhatsApp sobre **latência de mensagens**, Uber é sobre **dados em movimento**. Literalmente. Milhões de carros se movendo simultaneamente, e o sistema precisa saber onde cada um está, a cada segundo, pra conectar passageiros e motoristas em tempo real.

O desafio do Uber é único porque combina:
- **Geolocalização em tempo real** (milhões de pontos se movendo)
- **Matching otimizado** (encontrar o melhor motorista, não apenas o mais próximo)
- **Cálculo de rota e ETA** (com condições de tráfego variando)
- **Pricing dinâmico** (oferta e demanda flutuando por região e minuto)

Tudo isso com latência perceptível pro usuário de **< 3 segundos** entre apertar "pedir corrida" e ver o motorista atribuído.

Vamos aplicar o [framework](/posts/system-design-na-pratica-como-pensar-sistemas-em-escala/).

## Fase 1: Esclarecer requisitos

### Requisitos funcionais

| Funcionalidade | Detalhe |
|---------------|---------|
| Solicitar corrida | Passageiro informa origem e destino, recebe motorista |
| Matching | Sistema encontra motorista ideal (próximo + disponível) |
| Tracking em tempo real | Passageiro vê motorista se movendo no mapa |
| ETA | Tempo estimado de chegada (pickup e destino) |
| Pricing | Estimativa de preço antes de confirmar, surge pricing |
| Histórico | Registro de corridas passadas, recibos |

### Requisitos não-funcionais

| Requisito | Target |
|-----------|--------|
| Escala | 100M+ usuários, 5M motoristas ativos |
| Corridas/dia | 20 milhões |
| Latência de matching | < 3 segundos |
| Location updates | A cada 3-4 segundos por motorista ativo |
| Disponibilidade | 99.99% (downtime = motoristas sem renda) |
| Consistência | Forte pra matching (1 corrida → 1 motorista), eventual pra tracking |

### Fora do escopo

- Uber Eats (delivery tem constraints diferentes)
- Pagamentos (gateway externo)
- Rating e review
- Chat in-app entre rider e driver
- Múltiplas paradas

### A restrição que muda tudo

Diferente de YouTube/WhatsApp onde dados são estáticos após serem criados (vídeo uploaded fica no mesmo lugar, mensagem enviada não muda), no Uber **os dados se movem**. A posição de cada motorista muda a cada 3-4 segundos. Isso invalida cache, torna indexes voláteis, e exige reprocessamento constante.

## Fase 2: Estimativas

### Location updates (o fluxo mais intenso)

```
Motoristas ativos simultaneamente (pico): 2.000.000
Update de localização: a cada 4 segundos
Location writes/segundo: 2M / 4 = 500.000/s

Cada update: ~200 bytes (lat, lng, heading, speed, timestamp, driver_id)
Bandwidth de ingestão: 500K × 200 bytes = ~100 MB/s
```

500 mil writes geoespaciais por segundo. Esse é o heartbeat do sistema.

### Matching

```
Corridas/dia: 20.000.000
Corridas/segundo: 20M / 86.400 ≈ 230/s (média)
Pico (sexta à noite, chuva): 230 × 10 = ~2.300/s

Cada matching precisa:
  1. Query geoespacial: "motoristas disponíveis num raio de 3km"
  2. Ranking: quem é o melhor match
  3. Notify driver: enviar request
  4. Timeout: esperar aceite (10-15s)
  5. Fallback: se recusar, próximo da lista
```

### Storage

```
Corridas/dia: 20M × ~2 KB metadata = 40 GB/dia
Location history: 500K updates/s × 200 bytes × 86.400s = ~8.6 TB/dia (raw)
  → Geralmente só último ponto é guardado em real-time
  → Histórico é amostrado (1 ponto/30s vs 1/4s) = ~1.4 TB/dia
```

## Fase 3: High-level design

O sistema tem três fluxos principais:

1. **Location ingestion**: motoristas reportando posição continuamente
2. **Ride matching**: encontrar e atribuir motorista ao passageiro
3. **Real-time tracking**: passageiro acompanhando motorista no mapa

### Arquitetura geral

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 780" role="img" aria-label="Arquitetura de ingestão de localização, matching e tracking em tempo real" style="max-width:100%;height:auto;" font-family="Segoe UI, Arial, sans-serif">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#666666" />
    </marker>
  </defs>

  <rect x="10" y="10" width="960" height="385" rx="8" fill="#f5f5f5" stroke="#666666" />
  <text x="30" y="35" font-size="14" font-weight="bold" fill="#333333">LOCATION INGESTION (contínuo)</text>
  <g>
    <rect x="40" y="100" width="150" height="56" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="115" y="132" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Driver App</text>
  </g>
  <g>
    <rect x="300" y="100" width="180" height="56" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="390" y="132" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Location Service</text>
  </g>
  <g>
    <rect x="620" y="65" width="220" height="56" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="730" y="97" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">Geospatial Index</text>
  </g>
  <g>
    <rect x="620" y="161" width="220" height="56" rx="6" fill="#fff2cc" stroke="#d6b656" />
    <text x="730" y="193" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">Location History DB</text>
  </g>
  <g stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)">
    <line x1="196" y1="128" x2="306" y2="128" />
    <line x1="486" y1="118.1" x2="626" y2="103.7" />
    <line x1="485.9" y1="145.2" x2="625.9" y2="170.3" />
  </g>
  <text x="245" y="114" text-anchor="middle" font-size="10" fill="#555">cada 4s</text>

  <rect x="10" y="245" width="960" height="336" rx="8" fill="#f5f5f5" stroke="#666666" />
  <text x="30" y="270" font-size="14" font-weight="bold" fill="#333333">RIDE MATCHING</text>
  <g>
    <rect x="40" y="385" width="150" height="56" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="115" y="417" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Rider App</text>
  </g>
  <g>
    <rect x="230" y="385" width="150" height="56" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="305" y="417" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Ride Service</text>
  </g>
  <g>
    <rect x="430" y="385" width="180" height="56" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="520" y="417" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Matching Service</text>
  </g>
  <g>
    <rect x="690" y="315" width="210" height="50" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="795" y="336.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">Geospatial Index</text>
    <text x="795" y="351.5" text-anchor="middle" font-size="10" fill="#555">query</text>
  </g>
  <g>
    <rect x="690" y="405" width="210" height="50" rx="6" fill="#fff2cc" stroke="#d6b656" />
    <text x="795" y="434" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">ETA Service</text>
  </g>
  <g>
    <rect x="690" y="495" width="210" height="50" rx="6" fill="#fff2cc" stroke="#d6b656" />
    <text x="795" y="524" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">Pricing Service</text>
  </g>
  <g>
    <rect x="430" y="495" width="210" height="56" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="535" y="519.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">Notify Driver</text>
    <text x="535" y="534.5" text-anchor="middle" font-size="10" fill="#555">WebSocket / Push</text>
  </g>
  <g>
    <rect x="230" y="495" width="150" height="56" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="305" y="527" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">Ride DB</text>
  </g>
  <g stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)">
    <line x1="196" y1="413" x2="236" y2="413" />
    <line x1="386" y1="413" x2="436" y2="413" />
    <line x1="305" y1="447" x2="305" y2="501" />
    <line x1="615.8" y1="387.6" x2="706.6" y2="363.5" />
    <line x1="616" y1="418.9" x2="696" y2="423.9" />
    <line x1="597.6" y1="443.2" x2="736.3" y2="497.2" />
    <line x1="725.2" y1="492.8" x2="586.4" y2="438.8" />
    <line x1="424" y1="523" x2="374" y2="523" />
  </g>
  <text x="390" y="515" font-size="10" fill="#555">Accept/Reject</text>

  <rect x="10" y="605" width="960" height="145" rx="8" fill="#f5f5f5" stroke="#666666" />
  <text x="30" y="630" font-size="14" font-weight="bold" fill="#333333">REAL-TIME TRACKING</text>
  <g>
    <rect x="70" y="665" width="160" height="52" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="150" y="695" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Rider App</text>
  </g>
  <g>
    <rect x="400" y="665" width="180" height="52" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="490" y="695" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Tracking Service</text>
  </g>
  <g>
    <rect x="730" y="665" width="180" height="52" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="820" y="695" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Location Service</text>
  </g>
  <g stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)">
    <line x1="724" y1="691" x2="574" y2="691" />
    <line x1="394" y1="691" x2="224" y2="691" />
  </g>
  <text x="315" y="675" text-anchor="middle" font-size="10" fill="#555">WebSocket</text>
</svg>

### Componentes principais

| Componente | Responsabilidade |
|-----------|-----------------|
| **Location Service** | Ingere e armazena posições de motoristas |
| **Geospatial Index** | Busca rápida: "quem está perto de X?" |
| **Matching Service** | Algoritmo de atribuição driver↔rider |
| **ETA Service** | Calcula tempo estimado com base em rota + tráfego |
| **Pricing Service** | Calcula tarifa, surge pricing |
| **Ride Service** | Gerencia ciclo de vida da corrida |
| **Tracking Service** | Streaming de posição pro rider durante corrida |
| **Notification Service** | Push/WebSocket pra driver aceitar/recusar |

## Deep Dive 1: Geospatial Index - o coração do sistema

O problema mais importante: dado um ponto (localização do passageiro), encontrar rapidamente todos os motoristas disponíveis num raio.

### Naive approach (por que não funciona)

```sql
SELECT * FROM drivers
WHERE status = 'available'
  AND ST_Distance(location, POINT(-23.55, -46.63)) < 3000  -- 3km
ORDER BY ST_Distance(location, POINT(-23.55, -46.63))
LIMIT 10;
```

Com 2 milhões de motoristas e 2.300 queries/segundo no pico, um full table scan com cálculo de distância em cada row é **catastrófico**. O(N) por query × 2.300 queries/s = impossível.

### Solução: dividir o mundo em células

Em vez de calcular distância pra todos os motoristas, **pré-organize** os motoristas em regiões geográficas. Assim a query vira: "quais motoristas estão na minha célula e nas adjacentes?": O(1) lookup em vez de O(N) scan.

### Opção 1: Geohash

Geohash converte coordenadas (lat, lng) num string que representa uma célula retangular:

```
(-23.5505, -46.6333) → "6gycfq" (célula de ~1.2km × 0.6km com 6 chars)
(-23.5510, -46.6340) → "6gycfq" (mesma célula! estão próximos)
(-23.5505, -46.5900) → "6gycg5" (célula diferente, mais longe)
```

**Propriedade chave:** pontos geograficamente próximos compartilham o mesmo prefixo de geohash. Isso transforma uma query geoespacial numa **query de string prefix**: algo que qualquer banco faz rápido com B-tree index.

**Busca de motoristas próximos:**

```
1. Calcular geohash do passageiro: "6gycfq"
2. Identificar 8 células vizinhas: "6gycfr", "6gycfp", "6gycfn", ...
3. Buscar motoristas nessas 9 células
4. Filtrar por distância real (distância euclidiana/haversine)
5. Rankear
```

De 2M de motoristas, reduz pra ~50-200 candidatos nas 9 células. De O(N) pra O(1) lookup + O(K) filtro onde K << N.

### Opção 2: Quadtree

Uma árvore onde cada nó divide o espaço em 4 quadrantes. Áreas com mais motoristas são subdivididas mais finamente.

```
        [Mundo inteiro]
       /    |    |    \
    [NW]  [NE]  [SW]  [SE]
                  |
          /   |   |   \
        ...  ...  ...  [São Paulo Centro]
                            |
                    /    |    |    \
                 [Pinheiros][Consolação][Bela Vista][Liberdade]
```

**Vantagens sobre geohash:**
- Adapta granularidade à densidade (centro tem células menores que zona rural)
- Eficiente pra range queries (percorre a árvore, poda branches fora do raio)

**Desvantagens:**
- Mais complexo de implementar e distribuir
- Rebalanceamento quando densidade muda (eventos, horário de pico)

### Opção 3: H3 (Uber's choice)

O Uber desenvolveu internamente o [H3](https://h3geo.org/), um sistema de indexação hexagonal hierárquico.

**Por que hexágonos?**

- Quadrados (geohash) têm vizinhos a distâncias desiguais (diagonal > lateral)
- **Hexágonos** têm todos os vizinhos à mesma distância do centro
- Isso elimina edge cases em boundary: "motorista está a 100m mas numa célula 'longe'"

```
Resoluções H3:
  Res 7: ~5.16 km² (bom pra matching)
  Res 9: ~0.1 km² (bom pra ETA granular)
  Res 12: ~0.003 km² (tracking preciso)
```

**O fluxo com H3:**

```
1. Driver reporta (lat, lng)
2. Sistema calcula H3 index na resolução 9: "892a1008003ffff"
3. Armazena: driver_id → h3_cell mapping
4. Rider pede corrida em (lat, lng)
5. Sistema calcula H3 cell do rider + k-ring (vizinhos num raio k)
6. Busca todos drivers nos cells do k-ring
7. Ranking por distância real + ETA
```

### Implementação do index em memória

Com 2M de motoristas atualizando a cada 4 segundos, o geospatial index precisa ser **in-memory**. Disco é lento demais pra 500K updates/s.

```
Estrutura: HashMap<H3Cell, Set<DriverID>>

Update (driver moveu):
  1. Remove driver do cell antigo: cells["892a1008003"].remove("drv_123")
  2. Adiciona no cell novo: cells["892a1008007"].add("drv_123")
  
Query (rider quer corrida):
  1. Calcula k-ring de cells: h3.kRing("892a100800f", k=2)
  2. Pra cada cell no ring: retorna drivers disponíveis
  3. Merge + sort por distância
```

**Sharding do index:**

O mundo é grande demais pra um server. Shard por região geográfica:
- Shard "São Paulo": cobre cells H3 da região metropolitana
- Shard "Rio de Janeiro": cobre cells do Rio
- Cada shard é um cluster Redis ou serviço in-memory dedicado

## Deep Dive 2: Matching Algorithm

Encontrar motorista não é simplesmente "o mais perto". O matching precisa otimizar múltiplos fatores.

### Fatores de ranking

| Fator | Peso | Motivo |
|-------|------|--------|
| Distância (ETA de pickup) | Alto | Passageiro não quer esperar |
| Rating do motorista | Médio | Qualidade do serviço |
| Direção do movimento | Médio | Motorista indo na direção certa é melhor que um parado |
| Taxa de aceitação | Médio | Motorista que cancela muito não recebe prioridade |
| Tipo do veículo | Filtro | UberX vs Black vs Pool |
| Tempo ocioso | Baixo | Justiça: motorista esperando há mais tempo tem prioridade |

### O fluxo de matching

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 866" role="img" aria-label="Fluxo de matching de corrida" style="max-width:100%;height:auto;" font-family="Segoe UI, Arial, sans-serif">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#666666" />
    </marker>
  </defs>

  <g>
    <rect x="270" y="20" width="360" height="58" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="450" y="53" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">1. Rider solicita corrida</text>
  </g>
  <g>
    <rect x="270" y="118" width="360" height="74" rx="6" fill="#fff2cc" stroke="#d6b656" />
    <text x="450" y="144" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">2. Query geospatial</text>
    <text x="450" y="159" text-anchor="middle" font-size="10" fill="#555">candidatos num raio de 3-5 km</text>
    <text x="450" y="174" text-anchor="middle" font-size="10" fill="#555">retorna ~20-50 drivers</text>
  </g>
  <g>
    <rect x="270" y="232" width="360" height="82" rx="6" fill="#fff2cc" stroke="#d6b656" />
    <text x="450" y="262" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">3. Calcula ETA de pickup</text>
    <text x="450" y="277" text-anchor="middle" font-size="10" fill="#555">ETA Service para cada candidato</text>
    <text x="450" y="292" text-anchor="middle" font-size="10" fill="#555">filtra ETA &gt; 15 min</text>
  </g>
  <g>
    <rect x="270" y="354" width="360" height="74" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="450" y="380" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">4. Score</text>
    <text x="450" y="395" text-anchor="middle" font-size="10" fill="#555">weighted_sum(eta_score, rating_score,</text>
    <text x="450" y="410" text-anchor="middle" font-size="10" fill="#555">direction_score, ...)</text>
  </g>
  <g>
    <rect x="270" y="468" width="370" height="58" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="455" y="501" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">5. Envia request pro driver com maior score</text>
  </g>

  <g>
    <path d="M390 560 L510 560 L570 620 L510 680 L390 680 L330 620 Z" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
    <text x="450" y="614" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Driver aceita</text>
    <text x="450" y="630" text-anchor="middle" font-size="10" fill="#555">10-15s pra responder</text>
  </g>
  <g>
    <rect x="620" y="590" width="210" height="56" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="725" y="622" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Corrida atribuída ✓</text>
  </g>
  <g>
    <rect x="240" y="740" width="420" height="96" rx="6" fill="#f8cecc" stroke="#b85450" />
    <text x="450" y="769.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#8a1c1c">Driver recusa ou timeout</text>
    <text x="450" y="784.5" text-anchor="middle" font-size="10" fill="#555">Próximo da lista: step 5 com o #2 do ranking</text>
    <text x="450" y="799.5" text-anchor="middle" font-size="10" fill="#555">Repete até 3-5 tentativas</text>
    <text x="450" y="814.5" text-anchor="middle" font-size="10" fill="#555">Se ninguém aceita: nenhum motorista disponível</text>
  </g>

  <g stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)">
    <line x1="450" y1="84" x2="450" y2="124" />
    <line x1="450" y1="198" x2="450" y2="238" />
    <line x1="450" y1="320" x2="450" y2="360" />
    <line x1="452" y1="434" x2="453.9" y2="474" />
    <line x1="525.2" y1="528.5" x2="668" y2="592.5" />
    <line x1="570" y1="610" x2="620" y2="618" />
    <line x1="674.6" y1="649.2" x2="522.5" y2="743.2" />
    <path d="M 450 734 V 633 H 455 V 532" />
  </g>

  <text x="585" y="602" font-size="10" font-weight="bold" fill="#555">SIM</text>
  <text x="465" y="716" font-size="10" font-weight="bold" fill="#555">NÃO</text>
</svg>

### Batch matching vs Sequential matching

**Sequential (descrito acima):** envia pra um de cada vez. Simples mas lento se muitos recusam.

**Batch (Uber's approach em mercados densos):**

Em vez de matchear 1 rider com 1 driver por vez, o sistema acumula requests por 1-2 segundos e resolve como um problema de **otimização global**:

```
Riders pedindo: [R1, R2, R3, R4, R5]
Drivers disponíveis: [D1, D2, D3, D4, D5, D6, D7]

Otimização: minimizar ETA total de pickup do batch
  → R1↔D3, R2↔D1, R3↔D7, R4↔D5, R5↔D2
```

Isso evita conflitos (dois riders querendo o mesmo driver) e encontra o **ótimo global** em vez de ótimos locais. Na prática, usa-se Hungarian Algorithm ou variantes de Linear Assignment Problem.

### Supply positioning (driver heat maps)

O matching não começa quando o rider pede corrida. Começa antes: o sistema sugere pra motoristas **onde se posicionar** baseado em predição de demanda.

```
ML Model:
  Input: hora, dia da semana, clima, eventos, dados históricos
  Output: previsão de demanda por cell H3 nos próximos 15 min

Se cell "Aeroporto GRU" vai ter alta demanda em 20min:
  → Notifica motoristas na região: "alta demanda prevista em GRU"
```

## Deep Dive 3: ETA Service

ETA (Estimated Time of Arrival) parece simples mas é surpreendentemente complexo. Não é distância/velocidade.

### Por que é difícil?

- Distância em linha reta ≠ distância de rota (ruas não são linhas retas)
- Velocidade varia por trecho (avenida ≠ rua local ≠ rodovia)
- Condições de tráfego mudam a cada minuto
- Semáforos, obras, acidentes
- Conversões à esquerda levam mais tempo que à direita
- Hora do dia (rush hour é 3x mais lento)

### Componentes do ETA

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 935 360" role="img" aria-label="Componentes internos do ETA Service" style="max-width:100%;height:auto;" font-family="Segoe UI, Arial, sans-serif">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#666666" />
    </marker>
  </defs>
  <rect x="10" y="10" width="895" height="320" rx="8" fill="#f5f5f5" stroke="#666666" />
  <text x="30" y="35" font-size="14" font-weight="bold" fill="#333333">ETA Service</text>

  <g>
    <rect x="30" y="65" width="250" height="235" rx="8" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="155" y="156.5" font-size="12" font-weight="bold" fill="#1a3a5c" text-anchor="middle">1. Route calculation</text>
    <text x="155" y="171.5" font-size="10" fill="#555" text-anchor="middle">graph algorithm</text>
    <text x="155" y="186.5" font-size="10" fill="#555" text-anchor="middle">• Road network como grafo</text>
    <text x="155" y="201.5" font-size="10" fill="#555" text-anchor="middle">• nós = interseções</text>
    <text x="155" y="216.5" font-size="10" fill="#555" text-anchor="middle">• Dijkstra/A* pra shortest path</text>
  </g>
  <g>
    <rect x="325" y="65" width="270" height="235" rx="8" fill="#fff2cc" stroke="#d6b656" />
    <text x="460" y="164" font-size="12" font-weight="bold" fill="#7c6200" text-anchor="middle">2. Segment speed estimation</text>
    <text x="460" y="179" font-size="10" fill="#555" text-anchor="middle">• Dados históricos por trecho por hora</text>
    <text x="460" y="194" font-size="10" fill="#555" text-anchor="middle">• Dados real-time de motoristas ativos</text>
    <text x="460" y="209" font-size="10" fill="#555" text-anchor="middle">• Machine learning pra predição</text>
  </g>
  <g>
    <rect x="625" y="65" width="250" height="235" rx="8" fill="#d5e8d4" stroke="#82b366" />
    <text x="750" y="156.5" font-size="12" font-weight="bold" fill="#1b5e20" text-anchor="middle">3. Aggregation</text>
    <text x="750" y="171.5" font-size="10" fill="#555" text-anchor="middle">• Soma o tempo de cada segmento</text>
    <text x="750" y="186.5" font-size="10" fill="#555" text-anchor="middle">• Adiciona overhead de semáforos</text>
    <text x="750" y="201.5" font-size="10" fill="#555" text-anchor="middle">• Adiciona overhead de conversões</text>
    <text x="750" y="216.5" font-size="10" fill="#555" text-anchor="middle">• Retorna ETA + confidence interval</text>
  </g>
</svg>

### Road network como grafo

```
Nós (nodes): interseções, curvas, mudanças de velocidade
Arestas (edges): segmentos de rua entre dois nós

Cada edge tem:
  - distance_meters: 342
  - speed_limit_kmh: 60
  - current_speed_kmh: 25 (real-time, inferido de GPS dos drivers)
  - road_type: "arterial" | "local" | "highway"
  - weight (tempo): distance / current_speed = 342/25 × 3.6 = ~49s
```

São Paulo tem ~150.000 segmentos de rua. O grafo inteiro cabe em memória (~200 MB). Dijkstra com otimizações (A*, contraction hierarchies) resolve rotas em <50ms.

### Real-time speed estimation

O Uber tem uma vantagem massiva: **milhares de motoristas ativos são sensores de tráfego ambulantes**.

```
Driver D1 percorreu segmento S47 em 85 segundos (distância: 500m)
  → Velocidade observada: 500/85 × 3.6 = 21 km/h

Driver D2 percorreu S47 em 90 segundos
  → Velocidade: 20 km/h

Média ponderada recente (últimos 5 min): 20.5 km/h
Velocidade esperada (sem tráfego): 50 km/h
Congestion factor: 50/20.5 = 2.4x mais lento
```

Essa informação é agregada em real-time e alimenta o cálculo de ETA. É por isso que o ETA do Uber é geralmente mais preciso que o Google Maps: tem dados de velocidade real de milhares de veículos por segmento.

### Caching de ETA

ETAs entre cells H3 populares são pré-calculados e cacheados:

```
Cache key: eta:{origin_h3}:{destination_h3}:{time_bucket}
Cache value: {eta_seconds: 480, confidence: 0.85, route_polyline: "..."}
TTL: 2-5 minutos (tráfego muda)
```

Pro matching (que precisa de ETA pra 20-50 candidatos), o cache evita recalcular rotas do zero a cada request.

## Deep Dive 4: Location ingestion e tracking

### O pipeline de ingestão

500.000 updates por segundo. Não pode passar por um API server tradicional: precisa de um pipeline de streaming.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 502" role="img" aria-label="Pipeline de ingestão de localização dos motoristas" style="max-width:100%;height:auto;" font-family="Segoe UI, Arial, sans-serif">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#666666" />
    </marker>
  </defs>

  <g>
    <rect x="390" y="20" width="200" height="52" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="490" y="35" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Driver App</text>
    <text x="490" y="50" text-anchor="middle" font-size="10" fill="#555">cada 4s</text>
  </g>
  <g>
    <rect x="390" y="112" width="200" height="52" rx="6" fill="#fff2cc" stroke="#d6b656" />
    <text x="490" y="142" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">Load Balancer</text>
  </g>
  <g>
    <rect x="330" y="204" width="320" height="70" rx="8" fill="#d5e8d4" stroke="#82b366" />
    <text x="490" y="235.5" text-anchor="middle" font-size="14" font-weight="bold" fill="#1b5e20">Location Gateway</text>
    <text x="490" y="250.5" text-anchor="middle" font-size="10" fill="#555">stateless, alto throughput</text>
  </g>

  <g>
    <rect x="40" y="290" width="240" height="62" rx="6" fill="#e1d5e7" stroke="#9673a6" />
    <text x="160" y="310" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">Geospatial Index</text>
    <text x="160" y="325" text-anchor="middle" font-size="10" fill="#555">in-memory, real-time</text>
    <text x="160" y="340" text-anchor="middle" font-size="10" fill="#555">move driver de cell A pra cell B</text>
  </g>
  <g>
    <rect x="375" y="314" width="230" height="62" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
    <text x="490" y="341.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Kafka topic</text>
    <text x="490" y="356.5" text-anchor="middle" font-size="10" fill="#555">driver-locations</text>
  </g>
  <g>
    <rect x="710" y="290" width="230" height="62" rx="6" fill="#fff2cc" stroke="#d6b656" />
    <text x="825" y="310" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">Redis</text>
    <text x="825" y="325" text-anchor="middle" font-size="10" fill="#555">last_known_location:{driver_id}</text>
    <text x="825" y="340" text-anchor="middle" font-size="10" fill="#555">pra queries pontuais</text>
  </g>

  <g>
    <rect x="60" y="392" width="240" height="56" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="180" y="409" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Consumer</text>
    <text x="180" y="424" text-anchor="middle" font-size="10" fill="#555">Location History DB</text>
    <text x="180" y="439" text-anchor="middle" font-size="10" fill="#555">write-optimized</text>
  </g>
  <g>
    <rect x="370" y="416" width="240" height="56" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="490" y="440.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Consumer</text>
    <text x="490" y="455.5" text-anchor="middle" font-size="10" fill="#555">ETA Speed Aggregator</text>
  </g>
  <g>
    <rect x="680" y="392" width="240" height="56" rx="6" fill="#d5e8d4" stroke="#82b366" />
    <text x="800" y="409" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Consumer</text>
    <text x="800" y="424" text-anchor="middle" font-size="10" fill="#555">Tracking fanout</text>
    <text x="800" y="439" text-anchor="middle" font-size="10" fill="#555">riders observando</text>
  </g>

  <g stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)">
    <line x1="490" y1="78" x2="490" y2="118" />
    <line x1="490" y1="170" x2="490" y2="210" />
    <line x1="343.3" y1="275.4" x2="274.2" y2="292.6" />
    <line x1="490" y1="280" x2="490" y2="320" />
    <line x1="638.8" y1="275.4" x2="715.8" y2="294.3" />
    <line x1="369.2" y1="374.2" x2="289.9" y2="393.4" />
    <line x1="490" y1="382" x2="490" y2="422" />
    <line x1="610.8" y1="374.2" x2="690.1" y2="393.4" />
  </g>

  <text x="490" y="65" font-size="10" fill="#555" text-anchor="middle">UDP ou HTTP/2 com batching</text>
</svg>

### Por que Kafka no meio?

1. **Desacoplamento:** se o Location History DB ficar lento, não afeta o geospatial index
2. **Múltiplos consumers:** mesmo evento alimenta tracking, ETA, analytics, fraud detection
3. **Replay:** se um consumer crashar, pode reprocessar do offset

### Tracking: rider vendo motorista no mapa

Quando o rider está acompanhando a corrida, precisa ver a posição do motorista atualizar a cada poucos segundos.

**Approach: Fan-out on write via WebSocket**

```
1. Rider abre tela de tracking → conecta WebSocket ao Tracking Service
2. Tracking Service subscribe no Kafka topic filtrado por driver_id
3. A cada location update do driver no Kafka:
   → Tracking Service pusha pro rider via WebSocket
4. Rider vê o ícone do carro se movendo no mapa
```

**Escala:** durante uma corrida, 1 rider observa 1 driver. Não é fan-out massivo (diferente de presença em WhatsApp). Mas com 5M de corridas ativas simultaneamente, são 5M de WebSocket connections no Tracking Service.

### Otimização: client-side interpolation

Enviar posição a cada 4s faz o carro "pular" no mapa. Solução: o client interpola a posição entre updates:

```
Update T=0:  driver em (-23.550, -46.633), speed=30km/h, heading=90°
Update T=4:  driver em (-23.550, -46.630)

Entre T=0 e T=4, client anima o carro se movendo suavemente
usando speed + heading pra estimar posição intermediária
```

Isso é chamado **dead reckoning**: predizer posição baseado em velocidade e direção até o próximo update real. Resultado: animação suave sem aumentar a frequência de updates.

## Deep Dive 5: Pricing e Surge

### Pricing estático

```
fare = base_fare 
     + (distance_km × per_km_rate)
     + (duration_min × per_min_rate)
     + booking_fee
     - promotions

Exemplo São Paulo (UberX):
  fare = R$3.00 + (8.5 × R$1.20) + (22 × R$0.15) + R$1.50
       = R$3.00 + R$10.20 + R$3.30 + R$1.50
       = R$18.00
```

### Surge pricing (preço dinâmico)

Quando demanda > oferta numa região, o preço sobe pra:
1. Incentivar mais motoristas a irem pra região
2. Desincentivar corridas não-urgentes (equilibrar demanda)

**Implementação:**

```
Para cada cell H3 (resolução 7), a cada 2 minutos:

  demand = requests_nos_ultimos_5min
  supply = drivers_disponiveis_no_cell
  
  ratio = demand / supply
  
  if ratio > 1.5:
    surge_multiplier = f(ratio)  -- curva configurável
    -- ex: ratio 2.0 → surge 1.5x
    -- ex: ratio 4.0 → surge 2.5x
  else:
    surge_multiplier = 1.0

  fare_final = fare_base × surge_multiplier
```

**Visualização pro rider:** aquele mapa com zonas vermelhas/alaranjadas mostrando onde o surge está ativo.

### O dilema do surge

Surge alto demais → riders cancelam → demand cai → surge cai → mais riders pedem → demand sobe → surge sobe... Oscilação.

**Solução: smoothing.** O surge é calculado como média móvel (últimos 5-10 minutos), não instantâneo. Isso amortece oscilações e torna o preço mais previsível.

## Deep Dive 6: Database design

### Ride DB (PostgreSQL - relacional)

```sql
CREATE TABLE rides (
    id UUID PRIMARY KEY,
    rider_id UUID NOT NULL,
    driver_id UUID,
    status TEXT NOT NULL,
    -- 'requested','matched','driver_en_route','arrived',
    -- 'in_progress','completed','cancelled'
    
    pickup_lat DECIMAL(9,6),
    pickup_lng DECIMAL(9,6),
    dropoff_lat DECIMAL(9,6),
    dropoff_lng DECIMAL(9,6),
    
    pickup_eta_seconds INT,
    estimated_fare_cents BIGINT,
    actual_fare_cents BIGINT,
    surge_multiplier DECIMAL(3,2),
    
    requested_at TIMESTAMP,
    matched_at TIMESTAMP,
    pickup_at TIMESTAMP,
    dropoff_at TIMESTAMP,
    
    INDEX idx_rider (rider_id, requested_at DESC),
    INDEX idx_driver (driver_id, requested_at DESC),
    INDEX idx_status (status)
);

CREATE TABLE drivers (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    vehicle_type TEXT,        -- 'economy', 'comfort', 'black'
    license_plate VARCHAR(20),
    status TEXT,              -- 'available', 'busy', 'offline'
    current_ride_id UUID,
    rating DECIMAL(2,1),
    acceptance_rate DECIMAL(3,2),
    
    INDEX idx_status (status)
);
```

**Por que SQL?** Corridas têm relações claras (rider, driver), precisam de transações ACID (não pode atribuir mesmo driver a dois riders), e queries de histórico com filtros complexos.

### Location History (time-series DB - TimescaleDB ou InfluxDB)

```sql
CREATE TABLE location_updates (
    driver_id UUID,
    timestamp TIMESTAMPTZ,
    lat DECIMAL(9,6),
    lng DECIMAL(9,6),
    speed_kmh DECIMAL(5,1),
    heading DECIMAL(5,2),
    accuracy_meters DECIMAL(4,1),
    
    -- TimescaleDB: particiona automaticamente por tempo
    PRIMARY KEY (driver_id, timestamp)
);

-- Retenção: 7 dias raw, depois downsample pra 1 update/30s
SELECT set_chunk_time_interval('location_updates', INTERVAL '1 day');
```

**Por que time-series DB?** 500K writes/s de dados com timestamp que só cresce. Time-series DBs são otimizados exatamente pra esse pattern: append-only, compressão temporal, queries por janela de tempo.

### Geospatial Index (Redis + custom logic)

```
-- Redis: HashMap por H3 cell
SADD "cell:892a1008003:available" "drv_123" "drv_456" "drv_789"
SADD "cell:892a1008007:available" "drv_012" "drv_345"

-- Quando driver move pra outro cell:
SREM "cell:892a1008003:available" "drv_123"
SADD "cell:892a100800f:available" "drv_123"

-- Query: drivers disponíveis num raio (k-ring):
SUNION "cell:892a1008003:available" "cell:892a1008007:available" "cell:892a100800f:available" ...
```

O(1) pra cada operação. Redis Cluster com sharding por região geográfica.

## Handling de cenários edge

### Driver aceita mas não se move

**Solução: timeout de pickup.** Se o driver não se move em direção ao rider por 2 minutos após aceitar, o sistema:
1. Pergunta ao driver se está a caminho
2. Se não responde: cancela automaticamente, reatribui, e penaliza o driver

Detecção: compara posição atual com posição no momento do aceite. Se distância ao pickup não diminuiu, flag.

### Dois riders pedem corrida ao mesmo tempo pra mesmo driver

**Solução: lock otimista no matching.**

```
1. Matching Service seleciona driver D1 pra rider R1
2. Tenta: UPDATE drivers SET status='busy', current_ride_id='ride_R1' 
         WHERE id='D1' AND status='available'
3. Se affected_rows = 1 → sucesso, driver locked
4. Se affected_rows = 0 → outro matching pegou primeiro → próximo candidato
```

Compare-and-swap atômico. Sem race condition.

### GPS impreciso (túnel, garagem, prédios altos)

**Soluções:**
- **Snap-to-road:** ajustar coordenadas GPS pra rua mais próxima no road graph
- **Kalman filter:** suavizar série de posições, remover outliers impossíveis (carro não pode ir de 0 a 200km/h em 1 segundo)
- **Accuracy field:** cada update inclui margem de erro. Se accuracy > 50m, ignorar pra matching

### Surge descontrolado em evento grande (show, jogo)

100.000 pessoas saindo do estádio ao mesmo tempo:

```
Demand/min no cell do estádio: 5.000
Supply disponível: 200
Ratio: 25x → surge de 8x? Insustentável.
```

**Solução: cap + redistribuição.**
1. Surge tem cap (máximo 3-5x dependendo do mercado)
2. Sistema envia incentivos pra motoristas em raio de 10-20km
3. Fila virtual: "estimativa de espera: 15 minutos" em vez de preço absurdo
4. Geo-fence do evento: pre-posicionar motoristas antes do evento acabar (ML prevê fim)

## Trade-offs e decisões

| Decisão | Alternativa | Por que essa escolha |
|---------|-------------|---------------------|
| H3 (hexagonal) | Geohash (retangular) | Vizinhos equidistantes, menos edge cases |
| In-memory geospatial index | PostGIS | 500K updates/s é muito pra DB on-disk |
| Sequential matching (padrão) | Batch matching | Mais simples, bom pra mercados de baixa densidade |
| Batch matching (mercados densos) | Sequential | Ótimo global, evita conflitos |
| WebSocket (tracking) | Polling | Latência mínima, eficiente pra streaming contínuo |
| Kafka (location pipeline) | Ingestão direta no DB | Desacoplamento, múltiplos consumers, replay |
| Time-series DB (locations) | PostgreSQL | Otimizado pra append, compressão, janelas temporais |
| SQL (rides) | NoSQL | Transações ACID pra matching, queries de histórico |
| Dead reckoning (client) | Updates mais frequentes | UX suave sem aumentar carga no server |
| Surge smoothing (média móvel) | Surge instantâneo | Evita oscilação de preço |

## Como escalar além

1. **Predição de demanda:** ML que antecipa picos (chuva começando, show acabando) e pre-posiciona supply
2. **Multi-modal:** integrar transporte público no ETA (bike → metrô → UberX)
3. **Shared rides (Pool):** matching multi-party; otimizar rota que atende N riders com desvio mínimo
4. **Autonomous vehicles:** driver é um robô, mas a arquitetura de matching/tracking é a mesma
5. **Cross-region routing:** corrida que cruza boundary entre shards geográficos

## Resumo

| Componente | Tecnologia | Motivo |
|-----------|-----------|--------|
| Geospatial index | Redis + H3 (in-memory) | 500K updates/s, queries O(1) |
| Location ingestion | Kafka pipeline | Desacoplamento, múltiplos consumers |
| Location history | TimescaleDB/InfluxDB | Time-series otimizado, compressão |
| Ride management | PostgreSQL | ACID, relações, queries complexas |
| Matching | Custom service + geospatial | Multi-factor ranking, batch optimization |
| ETA | Graph + real-time speeds | Dijkstra/A* com dados de tráfego live |
| Tracking | WebSocket + dead reckoning | Streaming de posição, animação suave |
| Pricing | Rule engine + ML demand forecast | Surge dinâmico por cell H3 |
| Driver communication | WebSocket + Push (FCM/APNs) | Aceitar/recusar em tempo real |

---

*Esse é o quarto artigo da série [System Design na Prática](/series/system-design-na-prática/). No próximo, vamos projetar o Twitter/X: feed de notícias com fan-out pra centenas de milhões de timelines, caching agressivo, e o dilema de trending topics em tempo real.*
