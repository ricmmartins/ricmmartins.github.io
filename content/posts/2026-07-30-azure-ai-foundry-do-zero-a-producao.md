---
slug: "azure-ai-foundry-do-zero-a-producao"
aliases:
  - "/posts/azure-ai-foundry-do-zero-a-producao/"
title: "Azure AI Foundry: Do Zero à Produção — Guia Prático"
description: "O que eu cubro quando um cliente pergunta 'queremos construir aplicações com IA no Azure, por onde começamos?' — destilado de um workshop recente em um playbook para produção cobrindo seleção de modelo, PTU vs PAYGO, spillover e otimização de custo."
date: 2026-07-30T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - azure-ai-foundry
  - openai
  - ptu
  - otimizacao-custo
  - arquitetura-ai
  - producao
---

*O que eu cubro quando um cliente pergunta "queremos construir aplicações com IA no Azure, por onde começamos?" — destilado de um workshop recente em um playbook para produção.*

## O ponto de partida

Algumas semanas atrás, tive uma conversa com um time de engenharia que estava pronto para construir sua primeira aplicação com IA no Azure. Tinham experimentado com ChatGPT, prototipado com a API da OpenAI diretamente, e agora precisavam entender: *como saímos do playground para produção em escala enterprise?*

Essa conversa virou um workshop, o workshop virou material estruturado, e agora estou transformando em este guia — porque as perguntas que eles fizeram são as mesmas que ouço de todo time fazendo essa transição.

## O que é o Azure AI Foundry?

O [Azure AI Foundry](https://ai.azure.com) é a plataforma unificada para construir, deployar e operar aplicações de IA no Azure. Pense nele como o control plane de tudo que é IA no seu ambiente Azure:

- **Catálogo de Modelos** — Acesso a 1.900+ modelos (OpenAI, Meta Llama, Mistral, Cohere, Phi, e mais)
- **Prompt Engineering** — Playground, prompt flow, ferramentas de avaliação
- **Opções de Deploy** — Serverless (pay-per-token), Provisioned Throughput (PTU), Global/Data Zone routing
- **Segurança & Governança** — Filtros de conteúdo, red teaming, monitoramento de modelos
- **Framework de Agentes** — Construa agentes multi-step com tool-calling, code interpreter, file search

O insight principal: Foundry não é "mais um serviço Azure." É a camada de orquestração que conecta modelos, dados, compute e governança em uma experiência coerente de desenvolvimento.

## A árvore de decisão

Todo time construindo no Foundry enfrenta as mesmas decisões sequenciais:

### 1. Seleção de Modelo

O cenário de modelos em meados de 2026:

| Modelo | Melhor para | Trade-off |
|--------|------------|-----------|
| **GPT-5.x** | Orquestração, raciocínio complexo, agentes multi-step | Maior capacidade, maior custo |
| **GPT-5-mini** | Tarefas rápidas, classificação, sumarização | 90% da qualidade do GPT-5 a 20% do custo |
| **GPT-4.1** | Workloads legados (deprecating) | Estável mas sendo substituído |
| **Phi-4** | Deploy em edge, fine-tuning, embedding | Pequeno, rápido, barato, customizável |
| **Llama 3.x** | Flexibilidade open-weight, requisitos on-prem | Controle total, self-managed |

**Minha recomendação para workloads agênticos:** GPT-5.x para o orquestrador (melhor acurácia de tool-calling), GPT-5-mini para sub-tarefas (classificação, extração, formatação), e Phi-4 ou modelos fine-tuned para componentes de domínio específico.

### 2. Tipo de Deploy: PAYGO vs PTU

Aqui é onde a maioria dos times se confunde. Framework simples:

**Comece com PAYGO** quando:
- Está em desenvolvimento/teste
- Tráfego é imprevisível ou com picos esporádicos
- Ainda está descobrindo quais modelos vai usar a longo prazo

**Migre para PTU** quando:
- Utilização sustentada excede 60-70% da capacidade PTU equivalente
- Precisa de latência garantida (sem throttling por noisy-neighbor)
- Workloads de produção com padrões previsíveis

### 3. Como PTU funciona

PTU é um modelo de token-bucket. Cada PTU reserva um throughput fixo em tokens por minuto:

- **GPT-5-mini**: ~3.500 TPM por PTU
- **GPT-5**: varia por variante
- **GPT-4.1**: 3.000 TPM por PTU (deprecating)

Exemplo: 100 PTUs de GPT-5-mini = ~350.000 tokens/minuto garantidos. Se a carga exceder, a API retorna 429 — sem fila, sem espera. Corte seco.

### 4. A matemática de custo

| Tier | Preço (referência Jul/2026) | Compromisso |
|------|-----------------------------|-------------|
| On-Demand | ~$2/hora/PTU = $14.400/mês | Nenhum |
| Monthly Reserved | ~$0.72/hora/PTU = $5.184/mês | 1 mês |
| Yearly Reserved | ~$0.60/hora/PTU = $4.320/mês | 1 ano |

O break-even: se a utilização sustentada está acima de 60-70% da sua capacidade PTU, a reserva mensal já ganha do PAYGO.

> ⚠️ Esses são preços de referência de julho de 2026. Rates negociados em EA/MCA podem diferir. Sempre valide contra seu contrato específico.

**Ferramenta**: Use o [ptucalc.com](https://ptucalc.com) para modelar seu cenário. É open source, com 12.000+ sessões até agora — coloque seus padrões de uso e ele calcula o tier e quantidade de PTU ideal.

### 5. Arquitetura Spillover (o melhor dos dois mundos)

O padrão que recomendo para produção:

```
[Tráfego] → [PTU (lida com carga base, latência garantida)]
                ↓ (overflow quando PTU satura)
             [PAYGO (absorve picos, sem teto de capacidade)]
```

Configure seu deployment com PTU como primário e PAYGO como spillover:
- Latência garantida para seu tráfego base (PTU)
- Sem requests dropados durante picos (PAYGO absorve overflow)
- Otimização de custo (PTU para steady-state, PAYGO só para picos)

Configurado no nível do deployment no Foundry — sem mudança de código na aplicação.

## Checklist de produção

Antes de ir para produção, valide:

### Segurança & Rede
- [ ] Private endpoints configurados (sem exposição pública)
- [ ] Managed Identity para autenticação (sem API keys no código)
- [ ] Filtros de Content Safety ajustados (não só defaults)
- [ ] VNet integration se necessário por compliance
- [ ] Residência de dados: região do deployment == requisitos de dados

### Confiabilidade
- [ ] Deploy multi-região (primary + failover)
- [ ] Retry logic com exponential backoff
- [ ] Circuit breaker para dependências downstream
- [ ] Health probes e monitoramento de disponibilidade
- [ ] Spillover configurado (PTU → PAYGO)

### Observabilidade
- [ ] Métricas de consumo de tokens no Azure Monitor
- [ ] Dashboards de latência P50/P95/P99
- [ ] Tags de alocação de custo em todos os recursos Foundry
- [ ] Alertas em rates de 429 (indicador de throttling)
- [ ] Pipeline de avaliação de performance de modelo (drift detection)

### Governança de Custo
- [ ] Alertas de budget configurados
- [ ] Tags de chargeback para ambientes multi-time
- [ ] Monitoramento de utilização PTU (target: 70-85%)
- [ ] Cadência de revisão regular (mensal) para otimização de tier

## A progressão: de POC a produção

A maioria dos times segue este caminho:

```
Semana 1-2:  Playground → Provar que o conceito funciona
Semana 3-4:  PAYGO Standard → Construir a lógica da aplicação
Mês 2:       PAYGO + monitoramento → Entender padrões reais de uso
Mês 3:       PTU Monthly Reserved → Travar economia de custo
Mês 6+:      PTU Yearly → Desconto máximo com confiança
```

Não pule etapas. Cada fase ensina algo sobre seu workload que informa a próxima decisão.

## Próximos passos

Se está construindo aplicações com IA no Azure e navegando essas decisões:

1. **Comece no [Playground do Foundry](https://ai.azure.com)** — teste modelos contra seus use cases reais
2. **Modele seus custos** com [ptucalc.com](https://ptucalc.com) antes de comprometer com PTU
3. **Deploy com spillover** desde o dia 1 — não custa nada extra quando o PTU dá conta, mas salva de requests dropados quando picos acontecem
4. **Configure monitoramento cedo** — não dá pra otimizar o que não se mede

---

**Links:**
- 🔗 [Azure AI Foundry](https://ai.azure.com)
- 📊 [PTU Calculator](https://ptucalc.com)
- 📖 [Documentação do Foundry](https://learn.microsoft.com/en-us/azure/ai-studio/)
- 🏗️ [Well-Architected Framework para IA](https://learn.microsoft.com/en-us/azure/well-architected/ai/)

---

*Construindo com Foundry e tem dúvidas sobre estratégia de deploy ou otimização de custo? Comenta aqui embaixo — posso aprofundar em qualquer um desses tópicos.*
