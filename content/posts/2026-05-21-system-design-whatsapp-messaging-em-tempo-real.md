---
slug: "system-design-whatsapp-messaging-em-tempo-real"
aliases:
  - "/posts/system-design-whatsapp-messaging-em-tempo-real/"
title: "System design: WhatsApp, messaging em tempo real"
description: "Como projetar um sistema de mensagens que entrega bilhões de mensagens por dia com latência de milissegundos. WebSockets, message queues, presença online, e criptografia end-to-end."
date: 2026-05-24T10:00:00-04:00
categories:
  - Carreira
  - Arquitetura
tags:
  - system-design
  - entrevista
  - messaging
  - websockets
  - arquitetura
series:
  - "System Design na Prática"
---

"Design a messaging system like WhatsApp."

Se o YouTube é o exercício clássico de **throughput e storage**, WhatsApp é o exercício clássico de **latência e conexões persistentes**. O desafio muda completamente: em vez de entregar arquivos grandes pra milhões de viewers passivos, precisamos entregar mensagens pequenas pra bilhões de usuários em tempo real e garantir que nenhuma se perca.

WhatsApp processa mais de 100 bilhões de mensagens por dia. O que impressiona aqui não é só a escala, mas a pressão simultânea por latência baixa, conexões persistentes e durabilidade.

Vamos aplicar o [framework da série](/posts/system-design-na-pratica-como-pensar-sistemas-em-escala/).

**tl;dr:** o núcleo aqui é manter conexão persistente, gravar antes do ACK, rotear por sessão/device e tratar entrega como at-least-once com deduplicação no cliente.

## Fase 1: Esclarecer requisitos

### Requisitos funcionais

| Funcionalidade | Detalhe |
|---------------|---------|
| Mensagens 1:1 | Enviar texto, imagem, vídeo entre dois usuários |
| Grupos | Mensagens pra até 1024 membros |
| Status de entrega | Enviado (✓), entregue (✓✓), lido (✓✓ azul) |
| Presença online | Mostrar "online" ou "última vez às..." |
| Histórico | Mensagens persistem e sincronizam entre devices |

### Requisitos não-funcionais

| Requisito | Target |
|-----------|--------|
| Escala | 2 bilhões de usuários, 500M DAU |
| Mensagens/dia | 100 bilhões |
| Latência | < 100ms pra entrega (usuário online) |
| Disponibilidade | 99.99% (< 53 minutos de downtime/ano) |
| Consistência | Mensagens nunca podem ser perdidas (at-least-once delivery) |
| Ordenação | Mensagens devem chegar na ordem correta por conversa |
| Segurança | Criptografia end-to-end (servidor não lê conteúdo) |

### Fora do escopo

- Chamadas de voz/vídeo (protocolo diferente: WebRTC)
- Stories/Status (mais parecido com feed)
- Payments
- Bots e business API

### Uma observação importante sobre a escala

100 bilhões de mensagens/dia com 500M de usuários ativos = **200 mensagens por usuário por dia** em média. Parece pouco, mas o pico é brutal: horário comercial, eventos ao vivo, Ano Novo (WhatsApp processa ~75 bilhões de mensagens só em 31/dez).

## Fase 2: Estimativas

### Mensagens

```
Mensagens/dia: 100.000.000.000 (100 bilhões)
Mensagens/segundo: 100B / 86.400 ≈ 1.150.000/s (média)
Pico: 1.15M × 5 = ~5.000.000 mensagens/segundo

Tamanho médio de mensagem (texto): ~100 bytes
Tamanho médio com metadata (timestamps, IDs, status): ~500 bytes
```

### Conexões

```
Usuários online simultâneos (pico): ~200M
Cada usuário = 1 conexão WebSocket persistente
200 milhões de conexões TCP simultâneas

Se cada server aguenta ~200K conexões WebSocket estáveis:
  Servers necessários: 200M / 200K = ~1000 servers (só pra conexões)
```

Mil servidores só pra manter conexão não é absurdo nesse cenário. Com redundância, drenagem de conexão e folga operacional, essa conta sobe fácil pra 1500-2000+ instâncias.

### Storage

```
Mensagens de texto/dia: 100B × 500 bytes = ~50 TB/dia
Mídia (fotos/vídeos): assume 5% das mensagens com média 200 KB
  = 5B × 200 KB = ~1 PB/dia

Retenção: mensagens ficam no server até serem entregues
  (E2E encryption = server não precisa guardar pra sempre)
Mídia: 30 dias de retenção = ~30 PB ativo
```

## Fase 3: High-level design

### O desafio core: entrega em tempo real

Diferente do YouTube (pull-based: usuário pede o vídeo), messaging é **push-based**: a mensagem precisa **chegar** no recipient sem ele pedir.

Isso exige **conexão persistente** entre client e server. HTTP request-response não funciona aqui: a latência de abrir/fechar conexão a cada mensagem seria inaceitável.

### WebSockets: a espinha dorsal

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 780 180" role="img" aria-label="Conexão WebSocket persistente entre cliente e chat server" style="max-width:100%;height:auto;" font-family="Segoe UI, Arial, sans-serif">
<defs>
<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="#666666" />
</marker>
</defs>
<g>
<rect x="40" y="45" width="150" height="90" rx="8" fill="#dae8fc" stroke="#6c8ebf" />
<text x="115" y="86.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Client</text>
<text x="115" y="101.5" text-anchor="middle" font-size="10" fill="#555">app</text>
</g>
<g>
<rect x="590" y="45" width="150" height="90" rx="8" fill="#d5e8d4" stroke="#82b366" />
<text x="665" y="86.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Chat Server</text>
<text x="665" y="101.5" text-anchor="middle" font-size="10" fill="#555">stateful</text>
</g>
<line x1="196" y1="90" x2="596" y2="90" stroke="#666666" stroke-width="3" marker-start="url(#arrow)" marker-end="url(#arrow)" />
<text x="390" y="56" text-anchor="middle" font-size="14" font-weight="bold" fill="#1f1f1f">WebSocket</text>
<text x="390" y="75" text-anchor="middle" font-size="10" fill="#555">conexão persistente</text>
<text x="390" y="122" text-anchor="middle" font-size="10" fill="#555">full-duplex</text>
</svg>

**Por que WebSocket e não HTTP polling?**

| Approach | Latência | Overhead | Escala |
|----------|----------|----------|--------|
| HTTP Polling (cada 5s) | 0-5 segundos | Enorme (milhões de requests vazios) | Péssima |
| HTTP Long Polling | ~instantâneo | Médio (reconexão a cada msg) | Razoável |
| **WebSocket** | **~instantâneo** | **Mínimo (1 conexão persistente)** | **Excelente** |
| Server-Sent Events (SSE) | ~instantâneo | Baixo | Boa (mas unidirecional) |

WebSocket é full-duplex: client e server enviam dados a qualquer momento pela mesma conexão. Uma vez estabelecida, a conexão fica aberta até o client desconectar.

### Arquitetura geral

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1020 616" role="img" aria-label="Fluxo de envio de mensagem no WhatsApp" style="max-width:100%;height:auto;" font-family="Segoe UI, Arial, sans-serif">
<defs>
<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="#666666" />
</marker>
</defs>
<rect x="10" y="10" width="980" height="576" rx="8" fill="#f5f5f5" stroke="#666666" />
<text x="30" y="35" font-size="14" font-weight="bold" fill="#333333">ENVIO DE MENSAGEM</text>
<g>
<rect x="30" y="210" width="120" height="56" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
<text x="90" y="242" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Sender</text>
</g>
<g>
<rect x="200" y="210" width="150" height="56" rx="6" fill="#d5e8d4" stroke="#82b366" />
<text x="275" y="242" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Chat Server A</text>
</g>
<g>
<rect x="410" y="210" width="160" height="56" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
<text x="490" y="242" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Message Service</text>
</g>
<g>
<rect x="410" y="330" width="160" height="56" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="490" y="362" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">Message DB</text>
</g>
<g>
<rect x="630" y="210" width="180" height="56" rx="6" fill="#fff2cc" stroke="#d6b656" />
<text x="720" y="234.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">Session Service</text>
<text x="720" y="249.5" text-anchor="middle" font-size="10" fill="#555">Onde está o recipient?</text>
</g>
<g>
<rect x="600" y="330" width="160" height="50" rx="6" fill="#d5e8d4" stroke="#82b366" />
<text x="680" y="359" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">recipient online</text>
</g>
<g>
<rect x="790" y="330" width="170" height="50" rx="6" fill="#f8cecc" stroke="#b85450" />
<text x="875" y="359" text-anchor="middle" font-size="12" font-weight="bold" fill="#8a1c1c">recipient offline</text>
</g>
<g>
<rect x="590" y="420" width="150" height="56" rx="6" fill="#d5e8d4" stroke="#82b366" />
<text x="665" y="452" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Chat Server B</text>
</g>
<g>
<rect x="780" y="420" width="170" height="56" rx="6" fill="#fff2cc" stroke="#d6b656" />
<text x="865" y="444.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">Push Notification</text>
<text x="865" y="459.5" text-anchor="middle" font-size="10" fill="#555">APNs / FCM</text>
</g>
<g>
<rect x="650" y="516" width="180" height="40" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
<text x="740" y="540" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Recipient</text>
</g>
<g stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)">
<line x1="156" y1="238" x2="206" y2="238" />
<line x1="356" y1="238" x2="416" y2="238" />
<line x1="490" y1="272" x2="490" y2="336" />
<line x1="576" y1="238" x2="636" y2="238" />
<line x1="708.5" y1="271.7" x2="686.6" y2="335.7" />
<line x1="761.9" y1="269.6" x2="846.7" y2="333.6" />
<line x1="675" y1="385.9" x2="668.6" y2="425.9" />
<line x1="871.7" y1="386" x2="867.4" y2="426" />
<line x1="692.8" y1="480.6" x2="726.8" y2="520.6" />
<line x1="820.3" y1="479.5" x2="763.5" y2="519.5" />
</g>
<text x="175" y="224" font-size="10" fill="#555">WebSocket</text>
</svg>

### Componentes principais

| Componente | Responsabilidade |
|-----------|-----------------|
| **Chat Server** | Mantém WebSocket connections, roteia mensagens |
| **Session Service** | Sabe qual Chat Server cada user está conectado |
| **Message Service** | Persiste mensagens, garante entrega |
| **Message DB** | Armazena mensagens até serem entregues |
| **Push Service** | Notifica usuários offline via APNs/FCM |
| **Media Service** | Upload/download de fotos e vídeos |
| **Presence Service** | Rastreia quem está online |

## API Design

Diferente dos artigos anteriores, aqui o protocolo principal não é REST: é **WebSocket com mensagens estruturadas**. REST é usado apenas pra operações não-realtime (login, upload de mídia, busca de histórico).

### Protocolo WebSocket

```json
// Client → Server: enviar mensagem
{
  "type": "message.send",
  "id": "msg_uuid_123",
  "conversation_id": "conv_abc",
  "recipient_id": "usr_bob",
  "content": {
    "type": "text",
    "body": "E aí, beleza?"
  },
  "timestamp": 1716163200000
}

// Server → Client: confirmação de recebimento (✓)
{
  "type": "message.ack",
  "message_id": "msg_uuid_123",
  "status": "sent",
  "server_timestamp": 1716163200042
}

// Server → Recipient: mensagem chegando
{
  "type": "message.receive",
  "id": "msg_uuid_123",
  "conversation_id": "conv_abc",
  "sender_id": "usr_alice",
  "content": {
    "type": "text",
    "body": "E aí, beleza?"
  },
  "timestamp": 1716163200042
}

// Recipient → Server: confirmação de entrega (✓✓)
{
  "type": "message.delivered",
  "message_id": "msg_uuid_123"
}

// Recipient → Server: confirmação de leitura (✓✓ azul)
{
  "type": "message.read",
  "message_id": "msg_uuid_123"
}
```

### REST endpoints (operações auxiliares)

```
POST /v1/auth/login          → autenticação, recebe token
POST /v1/media/upload        → upload de foto/vídeo (pre-signed URL)
GET  /v1/conversations       → lista de conversas
GET  /v1/messages/{conv_id}  → histórico (paginado, cursor-based)
```

### Por que gerar message_id no client?

O client gera o UUID da mensagem **antes** de enviar. Isso resolve:

1. **Deduplicação:** se a mensagem for enviada duas vezes (retry por timeout), o server reconhece pelo ID e ignora duplicata
2. **Idempotência:** operação pode ser repetida sem efeitos colaterais
3. **Offline-first:** o client mostra a mensagem na UI imediatamente (optimistic update), antes do server confirmar

## Deep Dive 1: Roteamento de mensagens

O problema central: Alice está conectada no Chat Server A. Bob está no Chat Server B. Como a mensagem chega de A em B?

### Session Service: o "GPS" de usuários

Precisa de um mapeamento em tempo real:

```
user_id → { chat_server_id, connection_id, last_heartbeat }
```

**Opções de storage:**

| Opção | Prós | Contras |
|-------|------|---------|
| Redis (in-memory) | Ultra-rápido (~0.1ms), TTL nativo | Custo alto pra centenas de milhões de conexões simultâneas |
| Consistent Hash Ring | Cada server sabe seus users | Complexo, rebalanceamento |
| Redis Cluster (sharded) | Rápido + distribuído | Precisa gerenciar slots |

**Redis Cluster** é a escolha mais comum. Chave: `session:{user_id}`, valor: `{server_id, connected_at}`. TTL de 5 minutos com heartbeat renovando.

### Fluxo completo de uma mensagem

```
1. Alice envia msg pro Chat Server A (via WebSocket)
2. Chat Server A persiste msg no Message DB (status: "sent")
3. Chat Server A retorna ACK pra Alice (✓)
4. Chat Server A consulta Session Service: "onde está Bob?"
5. Session Service retorna: "Bob está no Chat Server B, connection_42"
6. Chat Server A envia msg pro Chat Server B (comunicação server-to-server)
7. Chat Server B entrega msg pro Bob via WebSocket
8. Bob responde com "delivered" ACK
9. Chat Server B atualiza Message DB (status: "delivered")
10. Chat Server B notifica Chat Server A → Alice vê (✓✓)
```

**E se Bob estiver offline?**

```
4. Session Service retorna: "Bob não está conectado"
5. Mensagem fica no Message DB com status "pending"
6. Push Service envia push notification (APNs/FCM)
7. Quando Bob reconecta:
   a. Chat Server busca mensagens pending no Message DB
   b. Entrega todas as mensagens acumuladas
   c. Bob confirma delivery de cada uma
   d. Message DB atualiza status
```

### Comunicação server-to-server

Com 1000+ Chat Servers, eles precisam se comunicar. Opções:

- **RPC direto (gRPC):** Chat Server A chama Chat Server B diretamente. Simples mas cria acoplamento.
- **Message broker (Kafka/RabbitMQ):** desacopla servers. Mais resiliente mas adiciona latência.
- **Pub/Sub (NATS, Redis Streams, etc.):** roteia eventos por shard ou por server de destino. Desacopla bem, mas você paga com mais hops e operação mais chata.

Na prática, o desenho costuma ficar híbrido: RPC direto no caminho quente, message queue como fallback quando o destino está sobrecarregado ou temporariamente fora.

## Deep Dive 2: Garantia de entrega

Em messaging, perder uma mensagem é **inaceitável**. Diferente de um view count que pode tolerar inconsistência, uma mensagem perdida pode significar perder um negócio, um compromisso, ou pior.

### At-least-once delivery

O sistema garante que toda mensagem será entregue **pelo menos uma vez**. Pode haver duplicatas (deduplicação no client resolve), mas nunca perda.

**Mecanismo:**

```
1. Client envia mensagem
2. Server persiste no DB ANTES de confirmar
3. Server retorna ACK pro sender
4. Server tenta entregar pro recipient
5. Se falha → mensagem fica pendente, retry periódico
6. Recipient confirma entrega
7. Server atualiza status

Se server crash entre 2 e 3: 
  → Client não recebeu ACK → faz retry → server deduplicata pelo message_id

Se server crash entre 4 e 6:
  → Mensagem está no DB → quando recipient reconecta, recebe
```

### Ordenação de mensagens

Mensagens numa conversa devem chegar na ordem. Mas com múltiplos servers e rede assíncrona, como garantir?

**Solução: sequence number por conversa**

Cada conversa tem um counter atômico. Toda mensagem recebe um `sequence_number` incremental:

```json
{
  "message_id": "msg_123",
  "conversation_id": "conv_abc",
  "sequence_number": 47,
  "content": "..."
}
```

O client reordena baseado no sequence number. Se recebe msg 49 antes da 48, segura até 48 chegar (ou pede retry após timeout).

**Onde armazenar o counter?** Redis com INCR atômico: `INCR conv:{conv_id}:seq`. Operação O(1) e thread-safe.

### Message queue como buffer

Pra picos extremos (Ano Novo, eventos), mensagens entram mais rápido do que podem ser processadas. Sem buffer, o sistema vai dropar ou crashar.

```
Sender → Chat Server → Kafka (topic: messages) → Consumer → Recipient
```

Kafka absorve o pico. Se consumers ficam pra trás, mensagens acumulam no topic e são processadas quando o sistema recupera. Com replicação e ACKs configurados direito, você ganha durabilidade suficiente pra atravessar o pico sem derrubar a entrega.

## Deep Dive 3: Presença online

"Online", "last seen at 14:32", "typing...": essas features parecem simples mas são surpreendentemente caras em escala.

### O problema

200 milhões de usuários online simultaneamente. Se cada um faz heartbeat a cada 30 segundos pra indicar que está vivo:

```
200M / 30 = ~6.7 milhões de heartbeats/segundo
```

6.7 milhões de writes/segundo só pra presença. E cada mudança de status ("ficou online", "saiu") precisa ser comunicada pra todos os contatos daquele usuário.

Se cada usuário tem 100 contatos em média:
```
Mudança de presença × contatos = fan-out massivo
Se 10M de usuários mudam status/minuto × 100 contatos = 1 bilhão de updates/minuto
```

### Estratégias pra escalar presença

**1. Lazy presence (WhatsApp approach):**
- Não faz broadcast pra todos os contatos
- Presença é **pull-based**: só consulta quando o usuário abre a conversa com alguém
- Reduz fan-out drasticamente

**2. Threshold-based:**
- Só atualiza se mudança real de estado (online→offline, offline→online)
- Ignora heartbeats intermediários
- "Last seen" é atualizado periodicamente (a cada 5 min), não em real-time

**3. Presença por conversa ativa:**
- Só envia "typing..." e "online" pra conversas abertas no momento
- Se você não está olhando a conversa com Alice, não recebe os typing indicators dela

### Implementação

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 350" role="img" aria-label="Fluxo de heartbeat do presence service" style="max-width:100%;height:auto;" font-family="Segoe UI, Arial, sans-serif">
<defs>
<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="#666666" />
</marker>
</defs>
<g>
<rect x="40" y="55" width="150" height="56" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
<text x="115" y="87" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Client</text>
</g>
<g>
<rect x="520" y="40" width="220" height="72" rx="8" fill="#d5e8d4" stroke="#82b366" />
<text x="630" y="72.5" text-anchor="middle" font-size="14" font-weight="bold" fill="#1b5e20">Presence Service</text>
<text x="630" y="87.5" text-anchor="middle" font-size="10" fill="#555">Redis TTL</text>
</g>
<g>
<rect x="500" y="152" width="260" height="88" rx="6" fill="#fff2cc" stroke="#d6b656" />
<text x="630" y="162.5" font-size="12" font-weight="bold" fill="#7c6200" text-anchor="middle">Key</text>
<text x="630" y="177.5" font-size="10" fill="#555" text-anchor="middle">presence:{user_id}</text>
<text x="630" y="192.5" font-size="12" font-weight="bold" fill="#7c6200" text-anchor="middle">Value</text>
<text x="630" y="207.5" font-size="10" fill="#555" text-anchor="middle">{status, last_seen}</text>
<text x="630" y="222.5" font-size="12" font-weight="bold" fill="#7c6200" text-anchor="middle">TTL</text>
<text x="630" y="237.5" font-size="10" fill="#555" text-anchor="middle">60 seconds</text>
</g>
<g>
<rect x="150" y="280" width="580" height="40" rx="6" fill="#f8cecc" stroke="#b85450" />
<text x="440" y="304" text-anchor="middle" font-size="10" fill="#555">Se heartbeat não renova dentro do TTL, a key expira e o user é considerado offline</text>
</g>
<g stroke="#666666" stroke-width="2" fill="none" marker-end="url(#arrow)">
<line x1="196" y1="81.9" x2="526" y2="77.4" />
<line x1="630" y1="118" x2="630" y2="158" />
</g>
<text x="355" y="68" text-anchor="middle" font-size="10" fill="#555">heartbeat (cada 30s)</text>
</svg>

Redis com TTL funciona muito bem aqui: se o client cair sem mandar "going offline", a key expira sozinha e o status vira offline sem job de cleanup.

## Deep Dive 4: Criptografia end-to-end (E2E)

### O princípio

O server **nunca** tem acesso ao conteúdo da mensagem. Só o sender e o recipient conseguem ler.

```
Alice (plain) → encrypt com chave de Bob → [ciphertext] → Server → [ciphertext] → decrypt com chave de Bob → Bob (plain)
```

O server só vê ciphertext. Mesmo se alguém invadir o server, as mensagens são ilegíveis.

### Signal Protocol (usado pelo WhatsApp)

O WhatsApp usa o **Signal Protocol** (Double Ratchet Algorithm):

1. **Key exchange (X3DH):** quando Alice quer falar com Bob pela primeira vez, eles trocam chaves públicas pra estabelecer um segredo compartilhado. O server facilita essa troca mas não conhece o segredo.

2. **Double Ratchet:** cada mensagem usa uma chave diferente. Se uma chave for comprometida, mensagens anteriores continuam protegidas e o protocolo consegue se recuperar nas trocas seguintes (forward secrecy + post-compromise recovery).

3. **Pre-keys:** Bob registra chaves públicas "descartáveis" no server. Alice pode iniciar conversa com Bob mesmo se ele estiver offline, usando uma pre-key.

### Implicações pra arquitetura

| Aspecto | Impacto |
|---------|---------|
| Storage | Server armazena ciphertext (mesmo tamanho + overhead de ~40 bytes) |
| Busca | **Impossível** buscar conteúdo de mensagens no server-side |
| Backup | Backup de mensagens precisa ser encrypt/decrypt no client |
| Grupos | Cada mensagem é encrypted N vezes (uma pra cada membro) |
| Mídia | Mídia é encrypted com chave simétrica; chave é enviada via mensagem E2E |

### E2E em grupos

Mensagem pro grupo de 100 pessoas: o sender **não** encrypta 100 vezes individualmente. Seria lento e redundante.

**Solução: Sender Key protocol**

1. Cada membro gera uma "sender key" e distribui (via E2E 1:1) pra todos os membros
2. Quando envia mensagem pro grupo, encrypta uma vez com sua sender key
3. Todos os membros têm a sender key do sender e podem decriptar
4. Se alguém sai do grupo → nova sender key é gerada e redistribuída

Uma encrypt por mensagem (independente do tamanho do grupo). Eficiente.

## Deep Dive 5: Database design

### Message storage

**Opção avaliada: Cassandra (uma escolha comum pra esse padrão de acesso)**

```
CREATE TABLE messages (
    conversation_id UUID,
    sequence_number BIGINT,
    message_id UUID,
    sender_id UUID,
    content_encrypted BLOB,
    content_type TEXT,        -- 'text', 'image', 'video'
    media_url TEXT,
    status TEXT,              -- 'sent', 'delivered', 'read'
    created_at TIMESTAMP,
    PRIMARY KEY (conversation_id, sequence_number)
) WITH CLUSTERING ORDER BY (sequence_number ASC);
```

**Por que esse modelo funciona:**

- **Partition key: conversation_id**: todas as mensagens de uma conversa ficam no mesmo nó. Query "últimas 50 mensagens da conversa X" é uma leitura sequencial em disco (extremamente rápida).
- **Clustering key: sequence_number**: mensagens são armazenadas ordenadas fisicamente. Range scan por order é O(N).
- **Write-optimized:** Cassandra é append-only (LSM tree). Escrita é absurdamente rápida (~1ms).

### Sizing

```
100B mensagens/dia × 500 bytes = 50 TB/dia
Se o produto retiver mensagens não entregues por até 30 dias = ~1.5 PB
Mensagens já entregues podem ser apagadas do server ou migradas
  (com E2E, o conteúdo não precisa ficar disponível indefinidamente no backend)
```

### Conversa metadata (separado)

```sql
-- PostgreSQL pra metadata relacional
CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    type TEXT,                  -- 'direct', 'group'
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE conversation_members (
    conversation_id UUID REFERENCES conversations(id),
    user_id UUID,
    role TEXT DEFAULT 'member', -- 'admin', 'member'
    joined_at TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    public_key BYTEA,          -- pra E2E key exchange
    created_at TIMESTAMP
);
```

## Handling de cenários edge

### Usuário troca de device

Mensagens são E2E encrypted. O server não tem o plaintext. Como sincronizar histórico pro novo device?

**Opções:**

1. **Backup na nuvem (encrypted):** client encrypta todo o histórico com uma chave que só o usuário conhece (derivada de senha ou PIN) e faz upload. Novo device baixa e decripta. É o que WhatsApp faz com Google Drive/iCloud.

2. **Transferência local:** devices se conectam via rede local e transferem diretamente. Seguro mas inconveniente.

3. **Sem transferência:** novo device começa do zero. Simples pra o sistema mas UX ruim.

### Grupo com 1024 membros: mensagem demora?

Fan-out de grupo grande:

```
Sender envia 1 mensagem → Server precisa entregar pra 1023 recipients
Se cada entrega leva 5ms → 5 segundos pra todos receberem?
```

**Solução: paralelismo.** Não entrega sequencialmente. O message service publica um evento no broker, múltiplos Chat Servers processam em paralelo. Entrega pra todos em <100ms.

### Client está offline há 3 dias: 500 mensagens acumuladas

Quando reconecta:

1. Client informa último `sequence_number` recebido por conversa
2. Server retorna delta (mensagens após aquele sequence number)
3. Entrega em batch, não uma por uma
4. Client confirma em batch também

```json
// Server → Client (sync batch)
{
  "type": "sync.batch",
  "conversation_id": "conv_abc",
  "messages": [
    {"seq": 48, "id": "msg_1", ...},
    {"seq": 49, "id": "msg_2", ...},
    {"seq": 50, "id": "msg_3", ...}
  ]
}
```

## Trade-offs e decisões

| Decisão | Alternativa | Por que essa escolha |
|---------|-------------|---------------------|
| WebSocket | HTTP Long Polling | Full-duplex, menos overhead, escala melhor |
| Client-generated message ID | Server-generated | Idempotência, deduplicação, offline-first |
| At-least-once delivery | Exactly-once | Exactly-once é exponencialmente mais complexo; dedup no client é simples |
| Sequence number por conversa | Timestamp ordering | Timestamps podem colidir e clocks são unreliable |
| Cassandra (messages) | PostgreSQL | Write throughput de 1M+/s, partition by conversation |
| Redis (sessions/presence) | DB relacional | Latência <1ms, TTL nativo, 6.7M writes/s |
| Lazy presence | Broadcast presence | Fan-out de broadcast é insustentável em escala |
| Signal Protocol (E2E) | TLS only (encrypt in transit) | Privacidade real: server não lê conteúdo |
| Sender Key (grupos) | E2E individual por membro | 1 encrypt vs N encrypts por mensagem de grupo |
| Push notifications (offline) | Apenas entrega no reconnect | UX: user precisa saber que tem msg pendente |

## Como escalar além

1. **Geo-routing:** conectar usuário ao Chat Server mais próximo geograficamente (DNS anycast ou geo load balancer)
2. **Connection draining:** antes de desligar um server pra manutenção, migrar conexões gracefully pro outro
3. **Message compaction:** após entrega confirmada + E2E, deletar conteúdo do server (só manter tombstone pro audit)
4. **Rate limiting inteligente:** detectar spam patterns (1000 msgs/minuto) sem bloquear usuários legítimos
5. **Multi-device:** sincronizar estado entre phone + desktop + web (WhatsApp Web model via QR code e relay)

## Resumo

| Componente | Tecnologia | Motivo |
|-----------|-----------|--------|
| Conexão client-server | WebSocket | Full-duplex, baixa latência, persistente |
| Roteamento | Session Service (Redis Cluster) | Lookup em <1ms: qual server tem qual user |
| Server-to-server | gRPC + Kafka (fallback) | Latência mínima + resiliência |
| Message storage | Cassandra | Write-heavy, partitioned by conversation |
| Metadata | PostgreSQL | Relacional, queries complexas |
| Presença | Redis com TTL | Auto-expiry, alta escrita |
| Push notifications | APNs + FCM | Alcançar users offline |
| Criptografia | Signal Protocol (E2E) | Privacidade real, forward secrecy |
| Media | Blob Storage + CDN | Arquivos grandes, entrega global |
| Deduplicação | Client-generated UUID | Idempotência sem server-side tracking |

Se a pergunta vier como "Design a messaging system like WhatsApp.", o fechamento certo é esse: WebSocket para conexão persistente, persistência antes do ACK e roteamento por sessão/device para não perder mensagem nem quebrar multi-device.

## Leitura complementar

- [The Signal Protocol](https://signal.org/docs/)
- [APNs overview](https://developer.apple.com/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)

---

*Esse é o terceiro artigo da série [System Design na Prática](/series/system-design-na-prática/). No próximo, vamos projetar o Uber: geolocalização em tempo real, matching de motoristas, e cálculo de ETA com milhões de pontos se movendo simultaneamente.*
