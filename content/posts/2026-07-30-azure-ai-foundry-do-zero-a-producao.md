---
title: "Azure AI Foundry: do zero à produção"
slug: azure-ai-foundry-do-zero-a-producao
aliases: [/azure-ai-foundry-do-zero-a-producao/]
description: "O que eu cubro quando um cliente pergunta por onde começar com IA no Azure. Seleção de modelo, PAYGO vs PTU, arquitetura spillover e checklist de produção."
date: 2026-07-30
categories: [Azure, AI]
tags: [azure-ai-foundry, ptu, openai, agentes-ia, otimizacao-custo]
---
# Azure AI Foundry: do zero à produção

*O que eu cubro quando um cliente pergunta "queremos construir aplicações com IA no Azure, por onde começamos?"*

> **TL;DR:** Azure AI Foundry é a plataforma unificada para aplicações de IA no Azure. Comece com PAYGO, migre para PTU quando utilização sustentada passar de 60-70%, e sempre configure spillover (PTU primário + PAYGO overflow). Use o [ptucalc.com](https://ptucalc.com) ([código no GitHub](https://github.com/ricmmartins/ptucalc)) para modelar custos antes de comprometer.

---

## O ponto de partida

Algumas semanas atrás, tive uma conversa com um time de engenharia que estava pronto para construir sua primeira aplicação com IA no Azure. Tinham experimentado com ChatGPT, prototipado com a API da OpenAI diretamente, e agora precisavam entender: *como saímos do playground para produção em escala enterprise?*

Essa conversa virou um workshop, o workshop virou material estruturado, e agora estou transformando em guia. As perguntas que eles fizeram são as mesmas que ouço de todo time fazendo essa transição.

## O que é o Azure AI Foundry?

O [Azure AI Foundry](https://ai.azure.com) é a plataforma unificada para construir, deployar e operar aplicações de IA no Azure. Pense nele como o control plane de tudo que é IA no seu ambiente Azure:

- Catálogo de Modelos: acesso a 1.900+ modelos (OpenAI, Meta Llama, Mistral, Cohere, Phi, entre outros)
- Prompt Engineering: playground, prompt flow, ferramentas de avaliação
- Opções de Deploy: serverless pay-per-token, Provisioned Throughput (PTU), Global/Data Zone routing
- Segurança e Governança: filtros de conteúdo, red teaming, monitoramento de modelos
- Framework de Agentes: agentes multi-step com tool-calling, code interpreter, file search

Foundry não é "mais um serviço Azure." É a camada que amarra modelos, dados, compute e governança numa superfície de desenvolvimento só.

## As decisões que você vai enfrentar

Todo time construindo no Foundry bate nas mesmas perguntas, mais ou menos na mesma ordem.

### 1. Seleção de modelo

O cenário de modelos em meados de 2026:

| Modelo | Melhor para | Trade-off |
|--------|------------|-----------|
| **GPT-5.x** | Orquestração, raciocínio complexo, agentes multi-step | Maior capacidade, maior custo |
| **GPT-5-mini** | Tarefas rápidas, classificação, sumarização | 90% da qualidade do GPT-5 a 20% do custo |
| **GPT-4.1** | Workloads legados (deprecating) | Estável mas sendo substituído |
| **Phi-4** | Deploy em edge, fine-tuning, embedding | Pequeno, rápido, barato, customizável |
| **Llama 3.x** | Flexibilidade open-weight, requisitos on-prem | Controle total, self-managed |

**Minha recomendação para workloads agênticos:** GPT-5.x para o orquestrador (melhor acurácia de tool-calling), GPT-5-mini para sub-tarefas (classificação, extração, formatação), e Phi-4 ou modelos fine-tuned para componentes de domínio específico.

### 2. Tipo de deploy: PAYGO vs PTU

A maioria dos times complica isso mais do que precisa. A regra é simples:

![Decision tree PAYGO vs PTU](/img/foundry-paygo-vs-ptu.svg)

**Comece com PAYGO** quando:
- Está em desenvolvimento/teste
- Tráfego é imprevisível ou com picos esporádicos
- Ainda está descobrindo quais modelos vai usar a longo prazo

**Migre para PTU** quando:
- Utilização sustentada excede 60-70% da capacidade PTU equivalente
- Precisa de latência garantida (sem throttling por noisy-neighbor)
- Workloads de produção com padrões previsíveis

### 3. Como PTU funciona na prática

PTU é um modelo de token-bucket. Cada PTU reserva um throughput fixo em tokens por minuto:

- **GPT-5-mini**: ~3.500 TPM por PTU
- **GPT-5**: varia por variante
- **GPT-4.1**: 3.000 TPM por PTU (deprecating)

Ou seja, 100 PTUs de GPT-5-mini dão aproximadamente 350.000 tokens/minuto garantidos. Passou disso, a API devolve 429. Sem fila, sem espera. Corte seco.

### 4. A matemática de custo (aqui fica interessante)

| Tier | Preço (referência Jul/2026) | Compromisso |
|------|-----------------------------|-------------|
| On-Demand | ~$2/hora/PTU = $14.400/mês | Nenhum |
| Monthly Reserved | ~$0.72/hora/PTU = $5.184/mês | 1 mês |
| Yearly Reserved | ~$0.60/hora/PTU = $4.320/mês | 1 ano |

O break-even: se a utilização sustentada está acima de 60-70% da sua capacidade PTU, a reserva mensal já ganha do PAYGO.

> ⚠️ Esses são preços de referência de julho de 2026. Rates negociados em EA/MCA podem diferir. Sempre valide contra seu contrato específico.

Eu criei o [ptucalc.com](https://ptucalc.com) exatamente para esse cálculo. É open source, 12.000+ sessões até agora. Coloque seus padrões de uso e ele mostra o tier e a quantidade de PTU ideal.

### 5. Arquitetura spillover

O padrão que recomendo para produção:

![Arquitetura Spillover](/img/foundry-spillover-architecture.svg)

Configure seu deployment com PTU como primário e PAYGO como spillover:
- Latência garantida para seu tráfego base (PTU)
- Sem requests dropados durante picos (PAYGO absorve overflow)
- Otimização de custo (PTU para steady-state, PAYGO só para picos)

Isso se configura no nível do deployment no Foundry. Sem mudança de código na aplicação.

## Checklist de produção

O que eu verifico antes de qualquer cliente ir para produção:

### Segurança e rede
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

### Governança de custo
- [ ] Alertas de budget configurados
- [ ] Tags de chargeback para ambientes multi-time
- [ ] Monitoramento de utilização PTU (target: 70-85%)
- [ ] Cadência de revisão regular (mensal) para otimização de tier

## A progressão típica

A maioria dos times que eu acompanho segue este caminho:

![De POC a Produção](/img/foundry-progression.svg)

Não pule etapas. Cada fase ensina algo sobre seu workload que informa a próxima decisão.

## Por onde começar

1. Abra o [Playground do Foundry](https://ai.azure.com) e teste modelos contra seus use cases reais
2. Modele seus custos com [ptucalc.com](https://ptucalc.com) antes de comprometer com PTU
3. Deploy com spillover desde o dia 1. Não custa nada extra quando o PTU dá conta, mas salva quando picos acontecem
4. Configure monitoramento cedo. Não dá pra otimizar o que não se mede

---

**Links:**
- [Azure AI Foundry](https://ai.azure.com)
- [PTU Calculator](https://ptucalc.com)
- [Documentação do Foundry](https://learn.microsoft.com/en-us/azure/ai-studio/)
- [Well-Architected Framework para IA](https://learn.microsoft.com/en-us/azure/well-architected/ai/)

---

*Dúvidas sobre estratégia de deploy ou otimização de custo? Deixa um comentário.*

