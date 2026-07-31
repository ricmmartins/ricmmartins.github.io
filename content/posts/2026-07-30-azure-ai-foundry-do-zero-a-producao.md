---
title: "Azure AI Foundry: do zero à produção"
slug: azure-ai-foundry-do-zero-a-producao
aliases:
  - /azure-ai-foundry-do-zero-a-producao/
description: "O que eu cubro quando um cliente pergunta como ir do playground à produção com Azure AI Foundry: seleção de modelo, PTU vs PAYGO, arquitetura spillover, APIM como AI Gateway, e checklist de produção."
date: 2026-07-30
categories:
  - Azure
  - AI
tags:
  - azure-ai-foundry
  - openai
  - ptu
  - provisioned-throughput
  - apim
  - ai-gateway
  - producao
---

# Azure AI Foundry: do zero à produção

*O que eu cubro quando um cliente pergunta "queremos construir aplicações com IA no Azure, por onde começamos?"*

> **TL;DR:** Azure AI Foundry é a plataforma unificada para aplicações de IA no Azure. Comece com PAYGO, migre para PTU quando utilização sustentada passar de 60-70%, e sempre configure spillover (PTU primário + PAYGO overflow). Use o [ptucalc.com](https://ptucalc.com) ([código no GitHub](https://github.com/ricmmartins/ptucalc)) para modelar custos antes de comprometer.

*Este guia é para times de engenharia migrando de protótipo para produção no Azure AI Foundry. Se você ainda está avaliando se Foundry é a plataforma certa, comece em [ai.azure.com](https://ai.azure.com).*

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

### 2. Ciclo de vida dos modelos

Todo modelo no Foundry segue um ciclo de vida: Preview, GA, Legacy, Deprecated, Retired.

O que importa na prática:
- GA dura cerca de 18 meses. Parece muito, mas passa rápido com sistema em produção.
- Legacy significa que um substituto está disponível. Comece a planejar migração.
- Deprecated dá cerca de 90 dias para migrar. Depois disso, a API retorna 410 Gone e seu sistema para.

O detalhe crítico: se você usa Provisioned Throughput (PTU), a migração de modelo NÃO é automática. Você precisa fazer manualmente: planejar janela de manutenção, testar o novo modelo com prompts existentes, validar qualidade, e fazer o swap. Deploys Standard/Global Standard fazem auto-upgrade, mas você não controla quando.

Minha recomendação: crie um processo de model governance. Monitore Azure Updates, mantenha testes automatizados de qualidade por modelo, e comece o planejamento de migração com pelo menos 60 dias de antecedência.

![Ciclo de vida dos modelos no Azure AI Foundry](/img/foundry-model-lifecycle.svg)

### 3. Tipo de deploy: PAYGO vs PTU

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

### 4. Como PTU funciona na prática

PTU é um modelo de token-bucket. Cada PTU reserva um throughput fixo em tokens por minuto:

- **GPT-5-mini**: ~3.500 TPM por PTU
- **GPT-5**: varia por variante
- **GPT-4.1**: 3.000 TPM por PTU (deprecating)

Ou seja, 100 PTUs de GPT-5-mini dão aproximadamente 350.000 tokens/minuto garantidos. Passou disso, a API devolve 429. Sem fila, sem espera. Corte seco.

### 5. A matemática de custo (aqui fica interessante)

| Tier | Preço (referência Jul/2026) | Compromisso |
|------|-----------------------------|-------------|
| On-Demand | ~$2/hora/PTU = $14.400/mês | Nenhum |
| Monthly Reserved | ~$0.72/hora/PTU = $5.184/mês | 1 mês |
| Yearly Reserved | ~$0.60/hora/PTU = $4.320/mês | 1 ano |

O break-even: se a utilização sustentada está acima de 60-70% da sua capacidade PTU, a reserva mensal já ganha do PAYGO.

> ⚠️ Esses são preços de referência de julho de 2026. Rates negociados em EA/MCA podem diferir. Sempre valide contra seu contrato específico.

Eu criei o [ptucalc.com](https://ptucalc.com) exatamente para esse cálculo. É open source. Coloque seus padrões de uso e ele mostra o tier e a quantidade de PTU ideal.

### 6. Arquitetura spillover

O padrão que recomendo para produção:

![Arquitetura Spillover](/img/foundry-spillover-architecture.svg)

Configure seu deployment com PTU como primário e PAYGO como spillover:
- Latência garantida para seu tráfego base (PTU)
- Sem requests dropados durante picos (PAYGO absorve overflow)
- Otimização de custo (PTU para steady-state, PAYGO só para picos)

Isso se configura no nível do deployment no Foundry. Sem mudança de código na aplicação.

## Parte 2: hardening para produção

Tudo acima coloca seu sistema rodando. As seções abaixo colocam rodando com segurança, escala e governança.

## APIM como AI Gateway

Para qualquer workload de IA em produção, recomendo colocar o Azure API Management (APIM) entre suas aplicações e os modelos. O APIM atua como AI Gateway centralizado com seis capacidades que o Foundry sozinho não oferece:

- Load balancing: distribuição round-robin ou weighted entre múltiplos backends PTU/PAYGO. Habilita DR e distribuição de capacidade entre regiões.
- Rate limiting por token: diferente do rate limiting tradicional por request, o APIM conta tokens reais consumidos. Um request que usa 10.000 tokens tem peso diferente de um que usa 100. Muito mais justo para controle de consumo.
- Circuit breaker: quando um backend PTU retorna 429, o APIM automaticamente faz failover para o próximo backend (outro PTU ou PAYGO). Sem retry no lado do cliente.
- Semantic caching: cache de respostas por similaridade semântica do prompt. Se alguém perguntou algo parecido nos últimos N minutos, retorna do cache. Reduz custo e latência para perguntas recorrentes.
- Token tracking: métricas de consumo por app, por time, por usuário. Emite para Azure Monitor. Essencial para chargeback quando múltiplos times compartilham os mesmos modelos.
- Content safety: políticas no gateway que bloqueiam inputs maliciosos antes de chegarem ao modelo. Defesa em profundidade em cima dos filtros de conteúdo do Foundry.

O padrão: suas aplicações e agentes chamam o APIM, não o modelo diretamente. O APIM roteia, controla, monitora e protege.

![APIM como AI Gateway](/img/foundry-apim-gateway.svg)

## Arquitetura de referência para workloads agênticos

Para times construindo sistemas multi-agente, esta é a arquitetura de referência que recomendo:

1. Camada de orquestração: um agente principal (tipicamente usando o modelo com melhor tool-calling disponível, hoje GPT-5.x) que coordena sub-agentes, mantém estado da conversa, e decide a próxima ação.
2. Camada de agentes especializados: cada agente otimizado para uma tarefa usando o modelo certo. Um agente de extração de dados no Phi-4, um agente de compliance no GPT-4.1, um agente de UX no GPT-5. Modelos diferentes para tarefas diferentes, otimizando custo e qualidade.
3. Camada de gateway (APIM): fica entre agentes e modelos. Cada agente tem rate limits diferentes, rotas para modelos diferentes, e o circuit breaker protege contra throttling. É onde você centraliza governança.
4. Camada de modelos (Foundry): múltiplos deployments com PTU para carga base e PAYGO para burst. Multi-região para DR. Spillover acontece automaticamente via routing do APIM.

![Arquitetura de referência para agentes: 4 camadas](/img/foundry-agentic-architecture.svg)

O ponto chave: agentes nunca chamam modelos diretamente. Sempre passam pelo gateway. Se um agente mal-comportado começa a consumir tokens demais, você corta no gateway sem mexer no código do agente.

> Se você roda Azure SRE Agent junto com seus workloads de IA, o [skill 08 (AI Foundry & OpenAI Posture)](https://github.com/ricmmartins/azure-sre-agent-skills/blob/main/skills/08-ai-foundry-openai-posture/SKILL.md) audita seu deploy do Foundry contra esses padrões de arquitetura de forma agendada. Veja meu post complementar: [Skills customizados para Azure SRE Agent](/azure-sre-agent-skills-proativos/).

## Anti-patterns para evitar

Esses são erros que eu vejo repetidamente em produção. A maioria parece óbvia depois que alguém aponta, mas acontecem o tempo todo:

| Não faça isso | Faça assim | Impacto se ignorar |
|---|---|---|
| API keys no código | Managed Identity + Key Vault | Credential leak, billing attack |
| Um endpoint para tudo | APIM Gateway + routing por app | Noisy neighbor, sem visibilidade |
| Provisionar para o pico | Spillover (PTU base + PAYGO burst) | 60%+ capacidade ociosa, desperdício |
| Ignorar model lifecycle | Pipeline de teste + plano de migração | 410 Gone em produção, outage |
| max_tokens default (4096) | Calcular max_tokens por use case | Utilização PTU inflada, waste de capacidade |
| Retry sem backoff | Exponential backoff + jitter | Retry storm, 429 cascading |

O max_tokens é sutil: o Azure calcula utilização PTU baseado em tokens de input MAIS max_tokens reservado, mesmo que a resposta real use menos. Se você configura max_tokens em 4096 mas a resposta típica é 200 tokens, está desperdiçando capacidade. O [ptucalc.com](https://ptucalc.com) tem uma ferramenta específica para isso.

## Checklist de produção

O que eu verifico antes de qualquer cliente ir para produção:

### Segurança e rede
- [ ] Private endpoints configurados (sem exposição pública)
- [ ] Managed Identity para autenticação (sem API keys no código)
- [ ] Filtros de Content Safety ajustados (não só defaults)
- [ ] VNet integration se necessário por compliance
- [ ] Residência de dados: região do deployment == requisitos de dados
- [ ] APIM como AI Gateway (sem acesso direto ao modelo pelas aplicações)

### Confiabilidade
- [ ] Deploy multi-região (primary + failover)
- [ ] Retry logic com exponential backoff e jitter
- [ ] Circuit breaker para dependências downstream
- [ ] Health probes e monitoramento de disponibilidade
- [ ] Spillover configurado (PTU primário, PAYGO overflow)
- [ ] APIM load balancing entre backends PTU

### Observabilidade
- [ ] Métricas de consumo de tokens no Azure Monitor
- [ ] Dashboards de latência P50/P95/P99
- [ ] Tags de alocação de custo em todos os recursos Foundry
- [ ] Alertas em rates de 429 (indicador de throttling)
- [ ] Pipeline de avaliação de performance de modelo (drift detection)
- [ ] Token tracking do APIM habilitado (por app/time/usuário)

### Governança de custo
- [ ] Alertas de budget configurados
- [ ] Tags de chargeback para ambientes multi-time
- [ ] Monitoramento de utilização PTU (target: 70-85%)
- [ ] max_tokens ajustado por use case (não default 4096)
- [ ] Cadência de revisão regular (mensal) para otimização de tier

### Governança de modelo
- [ ] Monitoramento de lifecycle dos modelos (assinatura Azure Updates)
- [ ] Testes automatizados de qualidade por versão de modelo
- [ ] Plano de migração documentado (60+ dias antes da retirement)
- [ ] Runbook de migração PTU (swap manual necessário)
- [ ] Semantic caching configurado no APIM para queries recorrentes

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

## Próximos passos

1. **Deploy um modelo no Foundry** — escolha GPT-4o em PAYGO, conecte a um endpoint único, e rode um prompt de teste pela REST API. Tempo: 20 minutos.
2. **Rode o ptucalc com seu tráfego real** — exporte o consumo de tokens do Azure Monitor e modele o ponto de break-even. Se estiver acima de 60% de utilização sustentada, PTU provavelmente se paga.
3. **Coloque APIM na frente** — mesmo em dev. Configure uma policy com token-rate-limit e emit-token-metric. Isso te dá observabilidade e uma camada de retry desde o dia 1.

---

**Links:**
- [Azure AI Foundry](https://ai.azure.com)
- [PTU Calculator](https://ptucalc.com)
- [Documentação do Foundry](https://learn.microsoft.com/en-us/azure/ai-studio/)
- [Well-Architected Framework para IA](https://learn.microsoft.com/en-us/azure/well-architected/ai/)

---

*Dúvidas sobre estratégia de deploy ou otimização de custo? Deixa um comentário.*
