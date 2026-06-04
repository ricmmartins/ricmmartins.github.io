---
slug: "como-vector-databases-funcionam-por-dentro"
aliases:
  - "/posts/como-vector-databases-funcionam-por-dentro/"
title: "Como vector databases funcionam por dentro"
description: "HNSW, IVF, quantização. Como vector databases armazenam e buscam milhões de embeddings em milissegundos, explicado pra quem já operou bancos de dados em produção."
date: 2026-06-29T10:00:00-04:00
categories:
  - AI
  - Arquitetura
tags:
  - ai-engineering
  - vector-database
  - embeddings
  - similarity-search
  - azure-ai-search
series:
  - "AI Engineering pra quem é de infra"
---

O time de ML acabou de te pedir um "vector database" em produção. Você sabe operar PostgreSQL, Redis, Cosmos DB. Mas isso? É um banco de dados ou um índice de busca? Precisa de backup? Tem replicação? Qual o modelo de consistência?

Vamos abrir o capô.

## O mapa pro profissional de infra

| Conceito Vector DB | O que faz | Equivalente em infra |
|-------------------|-----------|---------------------|
| **Vector/Embedding** | Array de floats que representa significado | Uma row com 1536 colunas numéricas |
| **Similarity search** | Buscar vetores parecidos | Query com ORDER BY distance LIMIT K |
| **Index (HNSW, IVF)** | Estrutura pra busca rápida | B-tree, hash index num banco relacional |
| **Dimension** | Tamanho do vetor (768, 1536, 3072) | Largura da row (quantas colunas) |
| **Distance metric** | Como calcular "parecido" | Cosine similarity, Euclidean, dot product |
| **Recall** | % de resultados corretos encontrados | Taxa de acerto da recuperação (o que deveria aparecer apareceu?) |

## O problema fundamental

Num banco relacional, buscar é comparar valores exatos ou ranges. `WHERE status = 'active'` ou `WHERE created_at > '2024-01-01'`. Indexes como B-tree resolvem isso em O(log n).

Com vetores, o problema é diferente. Você tem um vetor de query (1536 floats) e precisa encontrar os K vetores mais similares entre milhões. A busca "exata" (comparar com todos) é O(n). Com 10 milhões de documentos, cada busca compara 10 milhões de vetores. Inaceitável.

A solução? **Approximate Nearest Neighbor (ANN)**. Aceitar 95-99% de accuracy em troca de velocidade 1000x maior. É o mesmo trade-off que caching: você abre mão de "sempre correto" em troca de "rápido o suficiente".

## HNSW: o algoritmo que você vai encontrar em todo lugar

**Hierarchical Navigable Small World (HNSW)** é o índice mais usado. Pensa nele como um skip list multi-dimensional.

A ideia:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1254 338" width="100%" role="img" aria-labelledby="hnsw-structure-title">
<title id="hnsw-structure-title">Estrutura em camadas do HNSW</title>
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<text x="24" y="52" font-size="12" font-weight="bold" fill="#1f1f1f">Nível 3</text>
<rect x="120" y="20" width="904" height="288" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
<line x1="200" y1="46" x2="510" y2="46" stroke="#666666" stroke-width="2" />
<line x1="560" y1="46" x2="830" y2="46" stroke="#666666" stroke-width="2" />
<rect x="144" y="30" width="50" height="32" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<rect x="504" y="30" width="50" height="32" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<rect x="824" y="30" width="50" height="32" rx="6" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="169" y="50" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">A</text>
<text x="529" y="50" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">M</text>
<text x="849" y="50" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Z</text>
<text x="24" y="122" font-size="12" font-weight="bold" fill="#1f1f1f">Nível 2</text>
<rect x="120" y="90" width="974" height="218" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
<line x1="169" y1="68" x2="169" y2="108" stroke="#666666" stroke-width="2" />
<line x1="529" y1="68" x2="529" y2="108" stroke="#666666" stroke-width="2" />
<line x1="849" y1="68" x2="849" y2="108" stroke="#666666" stroke-width="2" />
<line x1="200" y1="117.6" x2="310" y2="116.2" stroke="#666666" stroke-width="2" />
<line x1="360" y1="116" x2="430" y2="116" stroke="#666666" stroke-width="2" />
<line x1="480" y1="116.8" x2="510" y2="117.5" stroke="#666666" stroke-width="2" />
<line x1="660.8" y1="166.8" x2="683" y2="126.8" stroke="#666666" stroke-width="2" />
<line x1="720" y1="116.4" x2="830" y2="117.8" stroke="#666666" stroke-width="2" />
<rect x="144" y="102" width="50" height="32" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<rect x="304" y="100" width="50" height="32" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<rect x="424" y="100" width="50" height="32" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<rect x="504" y="102" width="50" height="32" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<rect x="664" y="100" width="50" height="32" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<rect x="824" y="102" width="50" height="32" rx="6" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<text x="169" y="122" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">A</text>
<text x="329" y="120" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">D</text>
<text x="449" y="120" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">H</text>
<text x="529" y="122" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">M</text>
<text x="689" y="120" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">R</text>
<text x="849" y="122" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Z</text>
<text x="24" y="192" font-size="12" font-weight="bold" fill="#1f1f1f">Nível 1</text>
<rect x="120" y="160" width="974" height="148" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
<line x1="169" y1="140" x2="169" y2="180" stroke="#666666" stroke-width="2" />
<line x1="329" y1="138" x2="329" y2="178" stroke="#666666" stroke-width="2" />
<line x1="460.5" y1="137.3" x2="483.2" y2="179.3" stroke="#666666" stroke-width="2" />
<line x1="559.2" y1="135.6" x2="629.2" y2="176.4" stroke="#666666" stroke-width="2" />
<line x1="719.1" y1="134.6" x2="789.1" y2="177.7" stroke="#666666" stroke-width="2" />
<line x1="879.2" y1="135.1" x2="949.2" y2="174.8" stroke="#666666" stroke-width="2" />
<line x1="200" y1="188.5" x2="230" y2="187" stroke="#666666" stroke-width="2" />
<line x1="280" y1="186.8" x2="310" y2="187.5" stroke="#666666" stroke-width="2" />
<line x1="332" y1="186" x2="364" y2="186" stroke="#666666" stroke-width="2" />
<line x1="400" y1="186" x2="432" y2="186" stroke="#666666" stroke-width="2" />
<line x1="468" y1="186" x2="500" y2="186" stroke="#666666" stroke-width="2" />
<line x1="536" y1="186" x2="568" y2="186" stroke="#666666" stroke-width="2" />
<line x1="600" y1="189.2" x2="630" y2="188.5" stroke="#666666" stroke-width="2" />
<line x1="680" y1="188" x2="710" y2="188" stroke="#666666" stroke-width="2" />
<line x1="760" y1="188.8" x2="790" y2="189.5" stroke="#666666" stroke-width="2" />
<line x1="808" y1="186" x2="840" y2="186" stroke="#666666" stroke-width="2" />
<rect x="144" y="174" width="50" height="32" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<rect x="224" y="170" width="50" height="32" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<rect x="304" y="172" width="50" height="32" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<rect x="384" y="172" width="50" height="32" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<rect x="464" y="174" width="50" height="32" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<rect x="544" y="174" width="50" height="32" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<rect x="624" y="172" width="50" height="32" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<rect x="704" y="172" width="50" height="32" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<rect x="784" y="174" width="50" height="32" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<rect x="864" y="174" width="50" height="32" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<rect x="944" y="170" width="50" height="32" rx="6" fill="#e1d5e7" stroke="#9673a6" stroke-width="2" />
<text x="169" y="194" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">A</text>
<text x="249" y="190" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">B</text>
<text x="329" y="192" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">D</text>
<text x="409" y="192" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">F</text>
<text x="489" y="194" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">H</text>
<text x="569" y="194" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">J</text>
<text x="649" y="192" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">M</text>
<text x="729" y="192" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">O</text>
<text x="809" y="194" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">R</text>
<text x="889" y="194" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">V</text>
<text x="969" y="190" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Z</text>
<text x="24" y="262" font-size="12" font-weight="bold" fill="#1f1f1f">Nível 0</text>
<rect x="120" y="230" width="974" height="78" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
<line x1="166" y1="211.9" x2="160.4" y2="251.9" stroke="#666666" stroke-width="2" />
<line x1="246" y1="207.9" x2="240.4" y2="247.9" stroke="#666666" stroke-width="2" />
<line x1="348.7" y1="208.3" x2="387.6" y2="248.3" stroke="#666666" stroke-width="2" />
<line x1="439.4" y1="203" x2="539.4" y2="252.3" stroke="#666666" stroke-width="2" />
<line x1="519.7" y1="199.4" x2="699.7" y2="254.1" stroke="#666666" stroke-width="2" />
<line x1="599.8" y1="197.2" x2="859.8" y2="257.6" stroke="#666666" stroke-width="2" />
<line x1="679.9" y1="192.5" x2="1099.9" y2="253.2" stroke="#666666" stroke-width="2" />
<line x1="190" y1="260.5" x2="220" y2="259" stroke="#666666" stroke-width="2" />
<line x1="254" y1="256" x2="270" y2="256" stroke="#666666" stroke-width="2" />
<line x1="306" y1="256" x2="322" y2="256" stroke="#666666" stroke-width="2" />
<line x1="350" y1="260" x2="380" y2="260" stroke="#666666" stroke-width="2" />
<line x1="410" y1="256" x2="426" y2="256" stroke="#666666" stroke-width="2" />
<line x1="462" y1="256" x2="478" y2="256" stroke="#666666" stroke-width="2" />
<line x1="510" y1="262" x2="540" y2="262" stroke="#666666" stroke-width="2" />
<line x1="566" y1="256" x2="582" y2="256" stroke="#666666" stroke-width="2" />
<line x1="618" y1="256" x2="634" y2="256" stroke="#666666" stroke-width="2" />
<line x1="670" y1="260" x2="700" y2="260" stroke="#666666" stroke-width="2" />
<line x1="722" y1="256" x2="738" y2="256" stroke="#666666" stroke-width="2" />
<line x1="774" y1="256" x2="790" y2="256" stroke="#666666" stroke-width="2" />
<line x1="830" y1="262" x2="860" y2="262" stroke="#666666" stroke-width="2" />
<rect x="134" y="246" width="50" height="32" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<rect x="214" y="242" width="50" height="32" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<rect x="294" y="244" width="50" height="32" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<rect x="374" y="244" width="50" height="32" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<rect x="454" y="246" width="50" height="32" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<rect x="534" y="246" width="50" height="32" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<rect x="614" y="244" width="50" height="32" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<rect x="694" y="244" width="50" height="32" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<rect x="774" y="246" width="50" height="32" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<rect x="854" y="246" width="50" height="32" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<rect x="934" y="242" width="50" height="32" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<rect x="1014" y="240" width="50" height="32" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<rect x="1094" y="240" width="50" height="32" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<rect x="1174" y="240" width="50" height="32" rx="6" fill="#d5e8d4" stroke="#82b366" stroke-width="2" />
<text x="159" y="266" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">A</text>
<text x="239" y="262" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">B</text>
<text x="319" y="264" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">C</text>
<text x="399" y="264" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">D</text>
<text x="479" y="266" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">E</text>
<text x="559" y="266" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">F</text>
<text x="639" y="264" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">G</text>
<text x="719" y="264" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">H</text>
<text x="799" y="266" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">I</text>
<text x="879" y="266" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">J</text>
<text x="959" y="262" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">K</text>
<text x="1039" y="260" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">L</text>
<text x="1119" y="260" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">M</text>
<text x="1199" y="260" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">N</text>
<text x="1240" y="260" text-anchor="start" font-size="10" fill="#555555">...</text>
</g>
</svg>

Cada nível é um grafo com conexões entre vetores. Níveis superiores são mais "sparse" (poucos nós, conexões longas). Níveis inferiores são densos (todos os nós, conexões curtas).

**Busca**: começa no topo (poucos saltos longos pra chegar na região certa), desce nível por nível refinando. Como usar uma estrada principal pra chegar na cidade, depois ruas locais pra chegar no endereço.

**Performance**:
- Tempo de busca: O(log n) 
- Memória: O(n × M × d) onde M é número de conexões e d é dimensão
- Build time: O(n × log n)

### HNSW em números reais

| Vetores | Dimensão | Memória (HNSW) | Latência p99 | Recall@10 |
|---------|----------|----------------|--------------|-----------|
| 1M | 1536 | ~8 GB | < 5ms | 98% |
| 10M | 1536 | ~80 GB | < 10ms | 97% |
| 100M | 1536 | ~800 GB | < 20ms | 95% |

Percebe o padrão? HNSW mora em memória. 100M vetores de 1536 dimensões precisam de ~800GB de RAM. É por isso que vector databases em escala ficam caros rápido.

## IVF: a alternativa disk-friendly

**Inverted File Index (IVF)** usa uma abordagem diferente. Em vez de grafo, ele particiona o espaço em clusters.

1. **Training**: roda K-means pra dividir os vetores em N clusters (ex: 1024)
2. **Busca**: identifica os clusters mais próximos da query, busca apenas dentro deles

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 320" width="100%" role="img" aria-labelledby="ivf-grid-title">
<title id="ivf-grid-title">Espaço vetorial particionado no IVF</title>
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
</marker>
</defs>
<g font-family="Segoe UI, Arial, sans-serif">
<text x="310" y="26" text-anchor="middle" font-size="14" font-weight="bold" fill="#1f1f1f">Espaço vetorial particionado</text>
<rect x="80" y="50" width="150" height="80" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
<rect x="260" y="50" width="150" height="80" rx="8" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<rect x="440" y="50" width="150" height="80" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
<rect x="80" y="170" width="150" height="80" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
<rect x="260" y="170" width="150" height="80" rx="8" fill="#fff2cc" stroke="#d6b656" stroke-width="2" />
<rect x="440" y="170" width="150" height="80" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
<text x="155" y="94" font-size="12" font-weight="bold" fill="#1f1f1f" text-anchor="middle">C1</text>
<text x="335" y="94" font-size="12" font-weight="bold" fill="#1f1f1f" text-anchor="middle">C2</text>
<text x="515" y="94" font-size="12" font-weight="bold" fill="#1f1f1f" text-anchor="middle">C3</text>
<text x="155" y="214" font-size="12" font-weight="bold" fill="#1f1f1f" text-anchor="middle">C4</text>
<text x="335" y="214" font-size="12" font-weight="bold" fill="#1f1f1f" text-anchor="middle">C5</text>
<text x="515" y="214" font-size="12" font-weight="bold" fill="#1f1f1f" text-anchor="middle">C6</text>
<g fill="#9673a6">
<circle cx="120" cy="95" r="4" /><circle cx="135" cy="95" r="4" /><circle cx="150" cy="95" r="4" /><circle cx="135" cy="112" r="4" /><circle cx="150" cy="112" r="4" />
<circle cx="275" cy="95" r="4" /><circle cx="290" cy="95" r="4" /><circle cx="275" cy="112" r="4" /><circle cx="290" cy="112" r="4" /><circle cx="305" cy="112" r="4" />
<circle cx="430" cy="95" r="4" /><circle cx="445" cy="95" r="4" /><circle cx="460" cy="95" r="4" /><circle cx="475" cy="95" r="4" /><circle cx="445" cy="112" r="4" /><circle cx="460" cy="112" r="4" />
<circle cx="120" cy="180" r="4" /><circle cx="135" cy="180" r="4" /><circle cx="120" cy="197" r="4" /><circle cx="135" cy="197" r="4" /><circle cx="150" cy="197" r="4" />
<circle cx="275" cy="180" r="4" /><circle cx="290" cy="180" r="4" /><circle cx="305" cy="180" r="4" /><circle cx="320" cy="180" r="4" /><circle cx="290" cy="197" r="4" /><circle cx="305" cy="197" r="4" />
<circle cx="430" cy="180" r="4" /><circle cx="445" cy="197" r="4" /><circle cx="460" cy="197" r="4" />
</g>
<circle cx="310" cy="150" r="12" fill="#f8cecc" stroke="#b85450" stroke-width="2" />
<text x="310" y="154" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Q</text>
<line x1="310" y1="138" x2="310" y2="88" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<line x1="310" y1="162" x2="310" y2="176" stroke="#666666" stroke-width="2" marker-end="url(#arrow)" />
<text x="310" y="285" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f1f1f">Query Q está perto de C2 e C5.</text>
<text x="310" y="307" text-anchor="middle" font-size="10" fill="#555555">Em vez de buscar em todos os vetores, busca só em C2 e C5 (nprobe=2).</text>
</g>
</svg>

**Trade-off**: IVF é mais eficiente em disco, mas o parâmetro `nprobe` (quantos clusters buscar) controla o trade-off accuracy vs velocidade. Menos probes = mais rápido, menos preciso.

## Quantização: comprimindo vetores

Se HNSW precisa de muita RAM, quantização reduz isso drasticamente. Em vez de guardar cada dimensão como float32 (4 bytes), comprime pra menos bits.

| Tipo | Bytes por dimensão | Vetor 1536d | Perda de accuracy |
|------|-------------------|-------------|-------------------|
| Float32 (original) | 4 | 6.1 KB | 0% |
| Float16 | 2 | 3.0 KB | ~0% |
| Int8 (SQ) | 1 | 1.5 KB | 1-3% |
| Binary (1 bit) | 0.125 | 192 bytes | 10-20% |
| Product Quantization | ~0.25-0.5 | 384-768 bytes | 3-8% |

Na prática, **Scalar Quantization (int8)** dá o melhor custo-benefício. Reduz RAM em 4x com perda mínima de accuracy.

```bash
# Azure AI Search: criar índice vetorial com quantização via REST data plane
az rest --method POST \
  --url "https://meu-search.search.windows.net/indexes?api-version=2026-04-01" \
  --skip-authorization-header \
  --headers Content-Type=application/json api-key=$SEARCH_ADMIN_KEY \
  --body '{
    "name": "meu-indice",
    "fields": [
      {"name": "id", "type": "Edm.String", "key": true, "filterable": true},
      {"name": "content", "type": "Edm.String", "searchable": true},
      {
        "name": "embedding",
        "type": "Collection(Edm.Single)",
        "searchable": true,
        "retrievable": false,
        "stored": false,
        "dimensions": 1536,
        "vectorSearchProfile": "meu-perfil"
      }
    ],
    "vectorSearch": {
      "algorithms": [{
        "name": "meu-hnsw",
        "kind": "hnsw",
        "hnswParameters": {
          "m": 4,
          "efConstruction": 400,
          "efSearch": 500,
          "metric": "cosine"
        }
      }],
      "compressions": [{
        "name": "minha-quantizacao",
        "kind": "scalarQuantization",
        "scalarQuantizationParameters": {
          "quantizedDataType": "int8"
        },
        "rescoringOptions": {
          "enableRescoring": true,
          "defaultOversampling": 10,
          "rescoreStorageMethod": "preserveOriginals"
        }
      }],
      "profiles": [{
        "name": "meu-perfil",
        "algorithm": "meu-hnsw",
        "compression": "minha-quantizacao"
      }]
    }
  }'
```

O bloco `rescoringOptions` é importante. Busca primeiro com vetores quantizados (rápido), depois recalcula o ranking com vetores originais (preciso). É como usar um CDN pra filtrar e depois ir no origin server pra confirmar.

## Comparando soluções: o que usar

| Solução | Tipo | Melhor pra | Cuidado com |
|---------|------|-----------|-------------|
| **Azure AI Search** | Managed, hybrid (vector + text) | RAG com docs, busca semântica | Custo em escala alta |
| **pgvector (PostgreSQL)** | Extension em DB existente | Times pequenos, já usam PostgreSQL | Performance > 5M vetores |
| **Qdrant** | Dedicado, open-source | Alta performance, self-hosted | Ops overhead |
| **Pinecone** | Managed, serverless | Escala sem ops | Vendor lock-in, custo |
| **Azure Cosmos DB (vector)** | Multi-model managed | Já usa Cosmos, quer adicionar vectors | Feature mais recente |
| **Redis (vector)** | In-memory, rápido | Latência ultra-baixa, cache de embeddings | RAM cara em escala |

### pgvector: quando já tem PostgreSQL

Se seu time já roda PostgreSQL, pgvector é a forma mais simples de começar. Adiciona suporte a vetores sem novo serviço.

```sql
-- Habilitar extensão
CREATE EXTENSION vector;

-- Criar tabela com coluna de embedding
CREATE TABLE documentos (
  id SERIAL PRIMARY KEY,
  conteudo TEXT,
  embedding vector(1536)
);

-- Criar índice HNSW
CREATE INDEX ON documentos 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Buscar os 5 mais similares via prepared statement / driver
-- Passe em $1 um vetor 1536d gerado pelo mesmo modelo de embedding
SELECT id, conteudo,
       1 - (embedding <=> $1::vector) AS similarity
FROM documentos
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

Limitação: pgvector funciona bem até ~5 milhões de vetores. Depois disso, performance degrada. Se precisa de mais, considere uma solução dedicada.

## Métricas de distância: qual usar

Três opções principais. A escolha depende do modelo de embedding que gerou os vetores.

| Métrica | Fórmula (simplificada) | Quando usar | Modelos que usam |
|---------|----------------------|-------------|-----------------|
| **Cosine** | Ângulo entre vetores | Mais comum, normaliza magnitude | OpenAI, Cohere |
| **Euclidean (L2)** | Distância geométrica | Quando magnitude importa | Sentence-BERT |
| **Dot Product** | Multiplicação direta | Vetores já normalizados, mais rápido | Quando pre-normalizado |

Na dúvida, use cosine. OpenAI e Azure OpenAI normalizam seus embeddings, então cosine e dot product dão o mesmo resultado. Mas cosine é mais seguro como default.

## Operações do dia a dia

### Backup e recovery

Vector databases precisam de backup como qualquer outro. Os vetores são dados derivados (gerados a partir de texto por um modelo de embedding), mas re-gerar 10 milhões de embeddings pode levar horas e custar centenas de dólares em API calls.

```bash
# Azure AI Search: não tem backup nativo "click-button"
# Estratégia: manter os dados fonte + pipeline de re-indexação

# Exportar uma página de documentos via Search API
az rest --method POST \
  --url "https://meu-search.search.windows.net/indexes/meu-indice/docs/search?api-version=2026-04-01" \
  --skip-authorization-header \
  --headers Content-Type=application/json api-key=$SEARCH_QUERY_KEY \
  --body '{
    "search": "*",
    "top": 1000,
    "skip": 0,
    "select": "id,content"
  }'
```

### Monitoring

Métricas que importam pra vector DB em produção:

- **Query latency (p50, p95, p99)**: deve ficar < 50ms pra boa UX
- **Index size vs available memory**: se o índice não cabe em RAM, performance desaba
- **Recall**: % de resultados corretos (monitore via amostras)
- **Indexing throughput**: quantos vetores/segundo consegue ingerir
- **Storage utilization**: especialmente com quantização

```bash
# Azure AI Search: verificar estatísticas do índice
az rest --method GET \
  --url "https://meu-search.search.windows.net/indexes/meu-indice/stats?api-version=2026-04-01" \
  --skip-authorization-header \
  --headers api-key=$SEARCH_ADMIN_KEY \
  --query "{documentCount: documentCount, storageSize: storageSize}"
```

## Scaling patterns

**Vertical**: mais RAM = mais vetores em HNSW. Mais CPU = buscas paralelas mais rápidas.

**Horizontal (sharding)**: dividir vetores entre múltiplos nós. Cada nó busca no seu subset, results são merged. Azure AI Search faz isso automaticamente com partitions.

**Tiered storage**: vetores "quentes" (buscados frequentemente) em HNSW na RAM. Vetores "frios" em disco com IVF. Similar a hot/cool/archive tiers em storage.

## O que levar pra segunda-feira

- **Vector DB é como um search engine especializado**, não um banco relacional. Otimizado pra busca por similaridade, não pra queries complexas.
- **HNSW domina** mas come RAM. Quantização (int8) reduz 4x com perda mínima.
- **Escolha de solução**: se já tem PostgreSQL e < 5M vetores, pgvector. Se precisa de escala e features de busca, Azure AI Search. Se precisa de controle total, Qdrant self-hosted.
- **Backup é importante** mesmo sendo dados derivados. Re-gerar embeddings custa dinheiro e tempo.
- **A métrica que importa é recall**, não só latência. Uma busca rápida que retorna resultados irrelevantes é inútil.

No próximo post, vamos juntar embeddings + vector database + LLM no padrão que todo mundo está implementando: **RAG (Retrieval-Augmented Generation)**.

## Leitura complementar

- [How Vector Databases Work](https://lnkd.in/dbeBn5Un) (Neo Kim, System Design Newsletter)
- [Azure AI Search vector search documentation](https://learn.microsoft.com/azure/search/vector-search-overview)
- [pgvector documentation](https://github.com/pgvector/pgvector)
