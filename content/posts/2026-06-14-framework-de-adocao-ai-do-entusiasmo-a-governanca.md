---
slug: "framework-de-adocao-ai-do-entusiasmo-a-governanca"
translationKey: "2026/07/01/ai-adoption-framework-from-enthusiasm-to-governance"
aliases:
  - "/posts/framework-de-adocao-ai-do-entusiasmo-a-governanca/"
title: "Framework de adoção AI: do entusiasmo à governança"
description: "Entusiasmo sem framework é caos caro. As 6 fases de adoção, readiness scorecard, anti-patterns que matam projetos AI e como não virar mais uma empresa com shadow AI."
date: 2026-06-14T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - ai
  - infraestrutura
  - azure
  - adocao
  - governanca
  - cloud-adoption-framework
  - shadow-ai
series:
  - "AI para Engenheiros de Infraestrutura"
---

Décimo quarto post da série. No [anterior](/ai-use-cases-pra-infra-teams-aiops-e-alem/), a gente usou AI no próprio trabalho de infra. Agora o escopo aumenta: como levar uma organização inteira do "vamos usar AI" pra uma plataforma governada e escalável.

**tl;dr:** Adoção de AI sem framework vira custo espalhado, segurança frouxa e GPU ociosa. As 6 fases (assessment, foundation, pilot, scale, govern, optimize) evitam repetir os mesmos erros de cloud adoption.

## As melhores intenções, os piores resultados

Seu CTO entra no all-hands e manda: "vamos com tudo em AI". A sala anima. Antes do fim da reunião já tem thread no Slack sobre GPU, copiloto, agente e orçamento que ninguém pediu.

Três meses depois, cinco times provisionaram VMs com GPU em quatro subscriptions diferentes. Ninguém sabe dizer o que virou produção e o que ainda é experimento de fim de semana. Dois times compraram capacidade reservada pra carga que passa boa parte do tempo ociosa. Segurança não revisou um deployment sequer. O CFO quer entender por que a conta do Azure subiu 40%.

Entusiasmo tinha. Estrutura, não.

## O modelo de 6 fases

A ideia pega a disciplina do Cloud Adoption Framework da Microsoft e traz isso pro contexto de AI em infraestrutura. Cada fase tem entrega clara e critério de saída. Se você não consegue dizer se a fase terminou, ela ainda não terminou.

```
Diagnóstico → Capacitação → Preparação de Infra → Experimentação → Escala e Governança → Adoção Contínua
```

Pensa nisso como o ciclo de vida de infraestrutura aplicado à AI: avaliar, construir, validar, escalar, operar e ajustar.

## Fase 1: diagnóstico

Antes de provisionar qualquer coisa, faça um assessment honesto. Se um time precisasse colocar um modelo em produção amanhã, sua infraestrutura aguentaria isso com segurança?

### Readiness scorecard

| Área | Perguntas-chave | Rating (1-5) |
|------|-----------------|:---:|
| **Skills do time** | O time consegue provisionar e operar compute com GPU? | ___ |
| **GPU readiness** | Quotas aprovadas? Regiões definidas? | ___ |
| **Networking** | Private endpoints, banda e DNS estão prontos? | ___ |
| **Segurança** | Managed identity, Key Vault e isolamento de rede estão no lugar? | ___ |
| **Automação** | Cobertura de IaC, maturidade de CI/CD e GitOps? | ___ |
| **Shadow AI** | Deployments não autorizados já foram mapeados? | ___ |

Nota abaixo de 3 em qualquer área pede trabalho na fase seguinte antes de escalar. Não esconda nota ruim. Ela é justamente a parte mais útil do diagnóstico.

### Shadow AI detection

É a auditoria que quase todo mundo pula e quase todo mundo precisa fazer. Procure times rodando modelo em subscription pessoal, chave de API em repositório, VM com GPU criada fora do pipeline de IaC, ferramenta SaaS de AI processando dado corporativo sem revisão.

> Shadow AI não é só bagunça de governança. Também é exposição de segurança. Endpoint não revisado é um caminho pronto pra vazamento de dado.

## Fase 2: capacitação

Feche as lacunas encontradas no diagnóstico. É aqui que você gasta tempo com gente, processo e ferramenta antes de gastar muito mais consertando o improviso.

### Upskilling do time

Engenheiro de infra não precisa virar pesquisador de ML. Precisa entender memória de GPU, padrão de escala em inferência e preço por token. Eu gosto de pensar em três camadas:

1. **Fundação:** conceitos de AI traduzidos pra linguagem de infra
2. **Operação:** deploy, monitoramento e troubleshooting de workloads de AI
3. **Ajuste fino:** performance, custo e capacidade

### Security baseline

- Todo serviço autentica com managed identity, sem exceção boba
- Todo segredo fica no Key Vault com rotação automatizada
- Todo endpoint de modelo usa private endpoint quando o serviço suportar
- Todo acesso a dados segue RBAC de menor privilégio

Documente isso como política. Se ficar no campo da sugestão, vai virar opcional no primeiro prazo apertado.

## Fase 3: preparação de infraestrutura

Aqui IaC deixa de ser pano de fundo e vira a própria plataforma. Transforme o baseline em algo repetível e self-service. Se não pode sair de um commit, ele ainda não está pronto pra existir.

### Templates pra padrões comuns

- Clusters de VMs com GPU pra treino, em Bicep ou Terraform
- Clusters AKS com node pools de GPU pra inferência
- Workspaces do Azure Machine Learning com rede fechada
- Deployments do Azure OpenAI com diagnostic settings

Cada template já deve nascer com os controles importantes: private endpoint, managed identity, diagnostic settings e tagging.

### Monitoring stack

- Utilização e memória de GPU, com DCGM exporter
- Latência de endpoint de inferência em P50, P95 e P99
- Consumo de tokens
- Custo por time e por projeto
- Indicadores de saúde do modelo e do serviço

### Cost governance

Orçamento por time, alerta em 50%, 75% e 90%, tagging obrigatório e regra clara pra quota de GPU. Se isso não existir antes dos workloads, não vai aparecer por milagre depois.

## Fase 4: experimentação

Com a plataforma pronta, dá pra experimentar sem virar faroeste.

### Sandbox environments

- Resource groups dedicados com budgets e políticas de SKU
- Quotas de GPU dimensionadas pra experimento, não pra data center paralelo
- Cleanup automático: sandbox inativo por 14 dias gera alerta; por 30 dias entra em remoção
- Tag única por experimento desde o primeiro dia

### Critérios obrigatórios de sucesso

Antes de começar, o time define:
- O que conta como sucesso, como accuracy, latência ou teto de custo
- Quais sinais de infra indicam que aquilo escala de verdade
- Qual é o próximo passo se der certo

Experimento sem critério de sucesso não é experimento. É passatempo caro.

## Fase 5: escala e governança

É a transição do "funciona no sandbox" pro "roda com SLA e acorda alguém quando quebra".

### Multi-tenancy e isolamento

- Namespace ou resource group isolado por time
- Quota de GPU por tenant
- Segmentação de rede entre workloads
- Dashboard de monitoramento por time

### SLA e SLO pra AI

Defina SLO pra disponibilidade, latência, throughput e error budget. Endpoint de AI tem falhas próprias, como atraso de carga de modelo, estouro de memória de GPU e rate limiting por token. Seu desenho de SLO precisa considerar isso.

**Tradução infra ↔ AI:** SLA de endpoint de inferência continua sendo SLA de API. A diferença é que um cold start pode levar dezenas de segundos porque alguém está empurrando gigabytes pra memória de GPU, e o gargalo pode ser HBM, não CPU.

### Fleet management e runbooks

Documente procedimento pra pico de tráfego, rotação de versão sem downtime, falha de hardware de GPU, avalanche de 429 e estouro de custo.

## Fase 6: adoção contínua

Infra de AI não é projeto com data pra acabar. É capacidade operacional. Ou você trata assim, ou passa o ano repetindo piloto.

### Cadência trimestral

- Revisão de tendência de utilização
- Ações de otimização de custo
- Atualização de segurança
- Mudanças no technology radar
- Métricas de adoção self-service
- Roadmap do próximo trimestre

### Technology radar

Classifique ferramenta e serviço assim:
- **Adopt:** provado, pronto pra padronizar
- **Trial:** promissor, mas ainda em avaliação com prazo definido
- **Assess:** interessante, vale acompanhar
- **Hold:** não entra agora

## Os 5 anti-patterns que matam a adoção

| Anti-pattern | O que acontece | Como evitar |
|--------------|----------------|-------------|
| **Big Bang** | 6 meses construindo a plataforma perfeita enquanto ninguém usa | Comece pequeno e itere |
| **Shadow AI** | Times fazem deployment sem passar por infra | Faça do caminho governado o caminho mais fácil |
| **GPU Hoarding** | Time reserva quota "por garantia" | Política de use ou perca, com revisão periódica |
| **Security Afterthought** | Segurança fica pra depois e nunca chega inteira | Template seguro por padrão |
| **Build Everything** | O time inventa framework próprio sem precisar | Dê preferência a serviço gerenciado |

Esses anti-patterns quase nunca aparecem sozinhos. Big Bang empurra o pessoal pra Shadow AI. Shadow AI corta revisão. Quando finanças percebe, o trabalho já virou limpeza.

## Leitura complementar

- [Cloud Adoption Framework](https://learn.microsoft.com/azure/cloud-adoption-framework/)
- [Azure landing zones](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/)
- [Azure OpenAI quotas and limits](https://learn.microsoft.com/azure/foundry/openai/quotas-limits)
- [Foundry model lifecycle and retirements](https://learn.microsoft.com/azure/foundry/openai/concepts/model-retirements)

## No próximo post

Se o seu CTO abrir o próximo all-hands com "vamos com tudo em AI", você já tem um jeito prático de evitar a bagunça que abriu este post. Framework pronto. No último post da série vem o **glossário visual**: uma tradução direta entre os termos de AI e os conceitos de infraestrutura que você já domina.
