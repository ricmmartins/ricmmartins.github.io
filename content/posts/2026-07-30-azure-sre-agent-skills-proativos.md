---
title: "De bombeiro a engenheiro de plataforma: skills customizados para o Azure SRE Agent"
slug: azure-sre-agent-skills-proativos
aliases:
  - /azure-sre-agent-skills-proativos/
description: "Como criei um pack open-source com 8 skills customizados que transformam o Azure SRE Agent de reativo para proativo."
date: 2026-07-30
categories:
  - Azure
  - SRE
tags:
  - azure-sre-agent
  - site-reliability
  - custom-skills
  - operacoes-proativas
  - finops
  - governanca
---
# De bombeiro a engenheiro de plataforma: skills customizados para o Azure SRE Agent

**TL;DR:** O Azure SRE Agent é excelente em resposta reativa a incidentes, mas não cobre operações proativas por padrão. Criei um [pack open-source com 8 skills customizados](https://github.com/ricmmartins/azure-sre-agent-skills/) que adicionam auditorias de governança, relatórios FinOps, capacity planning, postmortems, e mais. Combinados com Scheduled Investigations, eles movem suas operações de reativas para proativas.

*Como uma conversa com um cliente que nunca tinha ouvido falar de SRE Agent me levou a criar um pack de skills que transforma o agente de reativo para proativo.*

---

## A conversa que começou tudo

Algumas semanas atrás, tive uma call com um time de engenharia que não conhecia o Azure SRE Agent. Eles estavam rodando uma plataforma SaaS crescendo rápido no Azure, apagando incêndios manualmente, e queimando horas de engenharia em diagnósticos repetitivos. O cenário clássico: não têm um time de SRE dedicado, mas precisam dos resultados que um time de SRE entregaria.

Apresentei o que o Azure SRE Agent faz: investigação de incidentes com IA, análise de causa raiz automatizada, 40+ conectores MCP, execução em sandbox, memória entre investigações. A reação foi imediata: *"Isso resolve nosso problema reativo. Mas e a parte proativa?"*

Essa pergunta ficou na minha cabeça. Porque eles estavam certos.

## O que é o Azure SRE Agent

Para quem não conhece: o [Azure SRE Agent](https://learn.microsoft.com/en-us/azure/sre-agent/) é o agente de IA da Microsoft para site reliability, GA desde março de 2026. Internamente na Microsoft, mais de 1.300 agentes SRE estão rodando em produção, lidando com 35.000+ incidentes por mês e economizando 20.000+ horas de engenharia mensalmente.

O que ele faz muito bem:

- Resposta reativa a incidentes: um alerta dispara, o agente investiga, correlaciona telemetria, identifica causa raiz, e resolve ou escala com contexto completo.
- Automação de diagnósticos: queries KQL, health checks de recursos, mapeamento de dependências, tudo executado em ambiente sandboxed.
- Memória organizacional: cada investigação constrói conhecimento. O agente lembra de incidentes passados e aplica esse contexto nos novos.
- Integrações: PagerDuty, ServiceNow, Teams, GitHub (incluindo Bring Your Own GitHub App desde junho 2026), Azure Monitor, e APIs customizadas via plugins.

O que ele **não** faz out of the box:

- Auditorias proativas de governança
- Tracking de oportunidades de otimização de custo em schedule
- Assessment de arquitetura contra o Well-Architected Framework
- Previsões de capacidade antes de bater nos limites de quota
- Postmortems blameless estruturados com análise de 5 Porquês
- Monitoramento do Defender Secure Score com plano de melhoria
- Avaliação de maturidade de workloads AI/OpenAI para produção

Esse gap entre excelência reativa e operações proativas é exatamente o que me motivou a criar o Skills Pack.

![Progressão de maturidade SRE do Nível 1 (manual) ao Nível 4 (IA proativa)](/img/sre-maturity-progression.svg)

## Custom skills: como funciona a extensibilidade

Desde junho de 2026, o Azure SRE Agent suporta Custom Skills e Plugins. Um skill é um prompt estruturado com instruções, contexto e formato de output que o agente executa usando todo seu toolkit (Azure Resource Graph, KQL, ARM APIs, Cost Management APIs, etc.).

Pensa assim:
- O agente fornece o **motor de raciocínio** e **acesso às ferramentas**
- O skill fornece o **conhecimento de domínio** e **metodologia**

Você escreve um arquivo SKILL.md descrevendo o que verificar, como pontuar os achados, e em que formato reportar. O agente cuida da execução, coleta de dados, correlação e geração de output. Sem SDK, sem código compilado, sem pipeline de deploy. Apenas instruções estruturadas em Markdown.

## O pack: 8 skills para operações proativas

Criei [8 skills customizados](https://github.com/ricmmartins/azure-sre-agent-skills/) que transformam o Azure SRE Agent de um respondedor reativo de incidentes em um parceiro proativo de operações:

![8 skills em 4 domínios operacionais](/img/sre-skills-overview.svg)

| # | Skill | O que faz | Cadência sugerida |
|---|-------|-----------|-------------------|
| 01 | Well-Architected Review | Assessment WAF 5 pilares com scoring | Antes de go-lives, trimestral |
| 02 | Compliance e Governance | Auditoria de Policy, RBAC, tags, locks, naming | Semanal |
| 03 | Capacity Planning | Utilização de quota, projeção de crescimento | Quinzenal |
| 04 | FinOps Intelligence | Otimização de custo + chargeback por time | Mensal |
| 05 | Incident Postmortem | Gerador de postmortem blameless com 5 Porquês | Após cada SEV1/SEV2 |
| 06 | Defender Secure Score | Monitoramento de score + plano de melhoria priorizado | Semanal |
| 07 | Digital Native Governance | Maturidade de governança para startups (15 checks, 0-100) | Mensal |
| 08 | AI Foundry e OpenAI Posture | Postura de segurança, confiabilidade e custo para workloads AI | Quinzenal |

### Mas isso não é o que o Azure Advisor já faz?

Essa é a pergunta que mais ouço. Resposta curta: não.

| | Azure Advisor | SRE Agent Skills |
|---|---|---|
| Output | Lista plana de recomendações por recurso | Relatórios com score, nível de maturidade e prioridade |
| Correlação | Nenhuma, cada recomendação é isolada | Conecta achados entre domínios ("corrija 2.2 primeiro, desbloqueia 2.5 e 3.5") |
| Remediação | Link para documentação | Comandos `az` CLI prontos para copiar e colar |
| Schedule | Passivo (você vai lá olhar quando lembra) | Roda no schedule que você definir |
| Contexto | Genérico (mesmo conselho pra todo mundo) | Pergunta sobre seu cenário e adapta |

Advisor é um linter. Esses skills são mais parecidos com um SRE senior que leu tudo, correlacionou os achados, e entrega um plano de ação priorizado.

### Exemplo prático: Governance Maturity

Quando você diz pro seu SRE Agent: *"Roda um check de maturidade de governança na minha subscription de produção"*, ele:

1. Consulta Azure Resource Graph para inventário
2. Verifica Azure Policy assignments e compliance
3. Audita RBAC contra princípio de menor privilégio
4. Valida completude da estratégia de tagging
5. Checa resource locks em recursos críticos
6. Avalia convenções de nomenclatura
7. Verifica segmentação de rede
8. Revisa configuração de backup e DR
9. Checa cobertura de monitoramento e alertas
10. Avalia práticas de gestão de segredos

...e mais 5 checks, cada um pontuado. Resultado: um número único (ex: 67/100) + lista priorizada do que corrigir primeiro, com comandos exatos.

Para uma startup caminhando para um security review de um cliente enterprise, isso é a diferença entre "achamos que estamos prontos" e "aqui está nosso assessment pontuado com evidências."

## Skills + Scheduled Investigations = operações proativas

O verdadeiro poder aparece quando você combina skills com Scheduled Investigations (GA julho 2026). Em vez de rodar skills manualmente, você configura schedules recorrentes:

![Ritmo semanal de operações com skills agendados](/img/sre-weekly-rhythm.svg)

- **Toda segunda 8h**: Compliance & Governance → resultado no Slack #platform-ops
- **Dia 1 do mês**: FinOps Intelligence → relatório de custo por email para leads
- **Sexta sim, sexta não**: Capacity Planning → flaggear qualquer coisa acima de 70% de quota
- **Após cada deploy**: AI Foundry Posture → validar que não houve regressão de segurança

É aqui que o SRE Agent sai do Nível 3 (inteligência reativa) para o Nível 4 (operações proativas) no modelo de maturidade. Você para de esperar as coisas quebrarem e começa a encontrar problemas antes de virarem incidentes.

## Como começar

1. Acesse [sre.azure.com](https://sre.azure.com/) → **Skill Builder**
2. Clique **+ Create skill**, cole o conteúdo de qualquer [SKILL.md do repo](https://github.com/ricmmartins/azure-sre-agent-skills/tree/main/skills)
3. Comece com [Digital Native Governance](https://github.com/ricmmartins/azure-sre-agent-skills/blob/main/skills/07-digital-native-governance/SKILL.md) — mais rápido para ver resultado
4. Configure um schedule ou rode on-demand

O repo inclui sample outputs para cada skill, então você pode ver o formato do relatório antes de instalar.

## Open source e customizável

Os skills são open source (MIT) e feitos para customizar. Cada SKILL.md é auto-contido: ajuste thresholds, adicione checks específicos do seu domínio, mude pesos de scoring. O [CONTRIBUTING.md](https://github.com/ricmmartins/azure-sre-agent-skills/blob/main/CONTRIBUTING.md) tem guidelines se quiser contribuir novos skills.

A resposta da comunidade na primeira semana (dezenas de stars, múltiplos forks e contribuições) me diz que isso ressoa. Se seu time está rodando Azure SRE Agent e sentindo o mesmo gap entre reativo e proativo, [o repo está aqui](https://github.com/ricmmartins/azure-sre-agent-skills/).

---

**Links:**
- [Azure SRE Agent Skills Pack (GitHub)](https://github.com/ricmmartins/azure-sre-agent-skills/)
- [Documentação do Azure SRE Agent](https://learn.microsoft.com/en-us/azure/sre-agent/)
- [Portal do Azure SRE Agent](https://sre.azure.com/)
- [Post anterior: Your Startup Doesn't Have an SRE Team, Now What?](https://techcommunity.microsoft.com/blog/startupsatmicrosoftblog/your-startup-doesnt-have-an-sre-team-now-what/4540142)

---

*Perguntas? Quer compartilhar como está usando o SRE Agent no seu ambiente? Comenta aqui ou abre uma issue no repo.*

