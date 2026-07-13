---
slug: "postmortems-no-azure-automacao-devops-metricas-parte-2"
aliases:
  - "/posts/postmortems-no-azure-automacao-devops-metricas-parte-2/"
title: "Postmortems no Azure: automação com Azure DevOps e métricas de aprendizado (Parte 2)"
description: "Integre postmortems ao Azure DevOps, acompanhe MTTD e MTTR, implemente dashboards interativos com Azure Workbooks e conecte o aprendizado ao ciclo SRE completo."
date: 2026-07-13T10:30:00-04:00
categories:
  - Azure
  - SRE
tags:
  - postmortem
  - azure-devops
  - kql
  - mttd
  - mttr
  - sre
  - observabilidade
  - incident-management
series:
  - "SRE no Azure"
---

Na [Parte 1](/postmortems-no-azure-analise-pos-incidente-blameless-parte-1/), falamos de cultura blameless, template de postmortem, queries KQL e automação com Logic Apps. Aqui, o foco é ligar o postmortem ao fluxo de engenharia: Azure DevOps, métricas de eficácia, cenários avançados e reuniões de revisão.

---

## Integrando postmortems com Azure DevOps

O Azure DevOps é o lugar natural para rastrear action items de postmortems. A chave é conectar os insights do postmortem diretamente ao backlog de engenharia.

### Criando um work item para registrar postmortems

Você pode usar tipos existentes como Bug ou criar um Work Item personalizado com campos específicos:

```bash
# Usando az devops para configurar campos customizados
# Primeiro, instale a extensão de DevOps CLI
az extension add --name azure-devops

# Configurar a organização e projeto
az devops configure --defaults organization=https://dev.azure.com/suaorg project=SeuProjeto

# Criar tags padrão para postmortems
az boards work-item create \
  --type "Bug" \
  --title "Postmortem: [Título do Incidente]" \
  --description "$(cat postmortem-template.md)" \
  --area "\\SeuProjeto\\SRE" \
  --iteration "\\SeuProjeto\\Sprint-Atual" \
  --fields "System.Tags=postmortem;sev-1;action-required" \
           "Microsoft.VSTS.Common.Priority=1" \
           "Microsoft.VSTS.Common.Severity=1 - Critical"
```

### Estrutura recomendada no Azure DevOps

Organize os artefatos do postmortem da seguinte forma:

### Query para acompanhar action items pendentes

Crie uma query salva para acompanhar action items pendentes:

```wiql
SELECT [System.Id], [System.Title], [System.State], 
       [System.AssignedTo], [Microsoft.VSTS.Scheduling.TargetDate],
       [System.Tags]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.Tags] CONTAINS "postmortem"
  AND [System.State] <> "Closed"
  AND [System.State] <> "Done"
ORDER BY [Microsoft.VSTS.Common.Priority] ASC,
         [Microsoft.VSTS.Scheduling.TargetDate] ASC
```

### Dashboard de acompanhamento no Azure DevOps

Widgets recomendados para o dashboard:

| Widget | Configuração | Propósito |
|--------|-------------|-----------|
| **Query Results** | Action items pendentes por postmortem | Ver itens abertos e responsáveis |
| **Chart for Work Items** | Burndown de action items por sprint | Acompanhar velocidade de resolução |
| **Query Tile** | Contagem de action items vencidos | Alerta visual para itens atrasados |
| **Chart for Work Items** | Action items por severidade | Priorização visual |
| **Markdown** | Link para wiki de postmortems | Acesso rápido à documentação |

---

## Métricas de postmortem: medindo a eficácia da cultura de aprendizado

Essas métricas mostram se a organização está realmente aprendendo com incidentes ou só cumprindo tabela.

### Métricas essenciais

| Métrica | Fórmula | Meta sugerida | O que revela |
|---------|---------|---------------|-------------|
| **Taxa de conclusão de postmortems** | Postmortems concluídos / Incidentes SEV-1 e SEV-2 | 100% | Aderência ao processo |
| **Tempo até o postmortem** | Data da revisão - Data de resolução do incidente | < 5 dias úteis (SEV-1) | Velocidade do ciclo de aprendizado |
| **Taxa de conclusão de action items** | Action items concluídos / Action items criados | > 85% em 30 dias | Eficácia na implementação de melhorias |
| **Action items vencidos** | Action items além do prazo / Total de action items | < 10% | Disciplina do time |
| **Taxa de recorrência** | Incidentes com causa raiz similar / Total de incidentes | < 5% | Eficácia dos postmortems anteriores |
| **MTTD (Mean Time to Detect)** | Média do tempo entre início do impacto e detecção | Tendência decrescente | Melhoria na observabilidade |
| **MTTR (Mean Time to Recover)** | Média do tempo entre detecção e resolução | Tendência decrescente | Melhoria na capacidade de resposta |

### Queries KQL para métricas de incidentes

#### Calculando MTTD e MTTR

Com Azure Monitor registrando eventos do ciclo de vida dos incidentes, calcule MTTD e MTTR:

```kql
// Calculando MTTD e MTTR dos incidentes (usando custom logs ou Sentinel)
let incidents = datatable(
    IncidentId: string, 
    ImpactStart: datetime, 
    DetectionTime: datetime, 
    ResolutionTime: datetime, 
    Severity: string
) [
    "INC-001", datetime("2026-04-01 14:00"), datetime("2026-04-01 14:03"), datetime("2026-04-01 15:30"), "SEV-1",
    "INC-002", datetime("2026-04-05 09:15"), datetime("2026-04-05 09:20"), datetime("2026-04-05 10:00"), "SEV-2",
    "INC-003", datetime("2026-04-10 22:00"), datetime("2026-04-10 22:15"), datetime("2026-04-10 23:45"), "SEV-1"
];
incidents
| extend 
    MTTD_minutes = datetime_diff('minute', DetectionTime, ImpactStart),
    MTTR_minutes = datetime_diff('minute', ResolutionTime, DetectionTime),
    TotalDuration_minutes = datetime_diff('minute', ResolutionTime, ImpactStart)
| summarize 
    AvgMTTD = round(avg(MTTD_minutes), 1),
    AvgMTTR = round(avg(MTTR_minutes), 1),
    AvgTotal = round(avg(TotalDuration_minutes), 1),
    P95_MTTR = round(percentile(MTTR_minutes, 95), 1),
    IncidentCount = count()
  by Severity
```

#### Identificando incidentes recorrentes

Detecte padrões de incidentes recorrentes. Isso costuma indicar que action items anteriores não resolveram o problema:

```kql
// Identificar padrões de incidentes recorrentes
AppExceptions
| where TimeGenerated > ago(90d)
| summarize 
    OccurrenceCount = count(),
    DistinctDays = dcount(bin(TimeGenerated, 1d)),
    FirstOccurrence = min(TimeGenerated),
    LastOccurrence = max(TimeGenerated),
    AffectedOperations = dcount(OperationName)
  by ProblemId, ExceptionType = tostring(split(Type, ".")[-1])
| where DistinctDays > 3 // apareceu em mais de 3 dias distintos
| extend RecurrencePattern = iff(DistinctDays > 7, "Crônico", "Intermitente")
| order by OccurrenceCount desc
```

### Criando um Workbook para métricas de postmortem

Use Azure Workbooks para dashboards interativos de métricas. Estrutura recomendada:

Estrutura simplificada para referência. O formato real do Azure Workbooks usa um schema ARM mais complexo:

```json
// Pseudocódigo - adaptar ao schema real do Workbook
{
  "version": "Notebook/1.0",
  "items": [
    {
      "type": "markdown",
      "content": "## 📊 Métricas de Postmortem e Aprendizado Pós-Incidente"
    },
    {
      "type": "query",
      "title": "MTTD e MTTR - Tendência Mensal",
      "query": "// Query de MTTD/MTTR agrupada por mês",
      "visualization": "linechart"
    },
    {
      "type": "query",
      "title": "Taxa de Recorrência de Incidentes",
      "query": "// Query de incidentes recorrentes",
      "visualization": "piechart"
    },
    {
      "type": "query",
      "title": "Exceções Top 10 - Últimos 30 Dias",
      "query": "AppExceptions | where TimeGenerated > ago(30d) | summarize count() by ProblemId | top 10 by count_",
      "visualization": "barchart"
    }
  ]
}
```

---

## Conectando postmortems ao ciclo SRE completo

O postmortem fecha o ciclo SRE e alimenta todos os outros processos. Na prática, cada output se conecta com as práticas dos artigos anteriores:

### Do postmortem para os SLOs

O postmortem deve documentar quanto do Error Budget foi consumido e alimentar a decisão sobre congelamento de deploys:

```
Postmortem → Error Budget consumido > 50% → Congelamento de feature releases
                                           → Foco em confiabilidade
                                           → Priorização dos action items P1
```

Se você implementou SLIs, SLOs e Error Budgets, os action items devem incluir ajustes nos SLIs (detecção lenta) ou revisão dos SLOs (metas irrealistas).

### Do postmortem para a Engenharia de Caos

Cada incidente revela cenários que deveriam ter sido testados preventivamente:

```
Postmortem → Causa raiz: timeout em dependência X
           → Action item: criar experimento no Chaos Studio
           → Cenário: injetar latência na dependência X
           → Validar: o circuit breaker ativa em < 5s?
```

Com Engenharia de Caos no Azure Chaos Studio, o postmortem é a fonte primária de novos cenários de teste.

### Do postmortem para os alertas e runbooks

Gaps em alertas ou runbooks geram action items para melhorar a resposta a incidentes:

| Gap identificado no postmortem | Action item gerado |
|-------------------------------|-------------------|
| Alerta disparou 10 min após início do impacto | Reduzir window size do alerta de 10 para 5 min |
| Runbook não cobria rollback do serviço Y | Criar runbook específico para rollback do serviço Y |
| Engenheiro de plantão não tinha acesso ao recurso | Revisar permissões RBAC do time de on-call |
| Comunicação com stakeholders atrasou | Configurar notificação automática no Action Group |

### Diagrama do ciclo SRE completo

---

## Cenários avançados

### Postmortem automatizado com Azure SRE Agent

Se você configurou o [Azure SRE Agent](https://aka.ms/sreagent/ga), ele acelera a fase de coleta de dados:

1. **Reconstruir a timeline automaticamente**: consultar Azure Monitor, Activity Log e Resource Health.
2. **Identificar causa raiz provável**: correlacionar mudanças recentes com o início das falhas.
3. **Sugerir action items**: com base nos padrões identificados e na documentação oficial.
4. **Gerar rascunho do postmortem**: preenchendo automaticamente o template.

Use o SRE Agent para gerar o rascunho inicial e refine manualmente na reunião de revisão. Isso corta a preparação de horas para minutos.

### Postmortems para incidentes cross-cloud

Em cenários multi-cloud, o Azure SRE Agent pode coletar dados de ambos os ambientes (via MCP Server da AWS) para compor uma timeline unificada.

Seções adicionais recomendadas:

| Seção adicional | Conteúdo |
|----------------|----------|
| **Topologia cross-cloud** | Diagrama mostrando quais componentes em cada cloud foram afetados |
| **Correlação de timestamps** | Verificar sincronização de relógios entre Azure e AWS (UTC é obrigatório) |
| **Pontos de integração** | Quais APIs ou serviços cruzam as fronteiras entre clouds |
| **Dados de cada cloud** | Sections separadas para dados do Azure Monitor e CloudWatch |
| **Recomendações de observabilidade** | Gaps na correlação cross-cloud identificados |

### Integrando postmortems com o Error Budget

Vincule o consumo de Error Budget ao ciclo de postmortem. Quando o budget cai abaixo de um threshold crítico:

```bash
# Exemplo de alerta baseado em Error Budget que dispara revisão
az monitor metrics alert create \
  --resource-group rg-monitoring \
  --name "error-budget-critical" \
  --scopes "/subscriptions/{sub}/resourceGroups/rg-app/providers/Microsoft.Insights/components/app-production" \
  --condition "total requests/failed > 50" \
  --window-size 1h \
  --evaluation-frequency 5m \
  --action ag-postmortem-trigger \
  --description "Taxa de falhas acima do threshold - investigar impacto no Error Budget" \
  --severity 1
```

---

## Conduzindo a reunião de revisão: guia prático

A reunião de revisão é onde o aprendizado realmente acontece. Boas práticas:

### Antes da reunião

| Preparação | Responsável | Prazo |
|-----------|-------------|-------|
| Rascunho do postmortem completo com timeline e dados | Autor do postmortem | 24h antes da reunião |
| Revisão prévia do rascunho por todos os participantes | Todos | 4h antes da reunião |
| Preparar perguntas específicas para a discussão | Facilitador | 2h antes da reunião |
| Reservar sala (ou call) com tempo adequado (60-90 min) | Facilitador | Ao agendar |

### Durante a reunião

1. **Facilitador inicia reforçando os princípios blameless** (1 minuto): "Estamos aqui para aprender, não para culpar. Assumimos que todos agiram com as melhores intenções."

2. **Revisão da timeline** (15-20 minutos): caminhar cronologicamente pelos eventos, permitindo que cada participante adicione contexto e corrija imprecisões.

3. **Discussão de causa raiz e fatores contribuintes** (20-30 minutos): usar a técnica dos "5 Porquês" para aprofundar além da causa superficial.

4. **O que funcionou / O que pode melhorar / Onde tivemos sorte** (10-15 minutos): capturar insights que vão além da correção do problema imediato.

5. **Definição de action items** (10-15 minutos): cada action item deve ter dono, prazo e critério de conclusão claros.

6. **Fechamento** (5 minutos): resumir decisões e confirmar próximos passos.

### A técnica dos "5 Porquês" na prática

```
Incidente: API de pagamentos retornou 500 por 45 minutos

Por quê? → O pool de conexões com o banco de dados esgotou.

Por quê? → Uma query estava demorando 30s em vez de 200ms.

Por quê? → O índice da tabela de transações foi removido.

Por quê? → Uma migration no pipeline de CI/CD removeu o índice.

Por quê? → A migration não foi revisada por alguém com 
           conhecimento do schema de produção.

Action item: Implementar code review obrigatório para migrations
             de banco de dados, com checklist de impacto em índices.
```

### Regras de ouro para o facilitador

- **Nunca permita frases como "Fulano deveria ter..."**: redirecione para "O que no sistema permitiu que..."
- **Se alguém se defender**: reconheça que a situação era complexa e redirecione para o sistema.
- **Mantenha o foco**: se a discussão divergir para problemas não relacionados, anote como "para investigar depois" e volte ao tópico.
- **Garanta diversidade de perspectivas**: se alguém não falou, pergunte diretamente: "Você observou algo diferente durante o incidente?"
- **Termine no horário**: quando a reunião respeita o tempo combinado, o time leva o processo a sério.

---

## Erros comuns e como evitá-los

| Erro | Impacto | Solução |
|------|---------|---------|
| Escrever o postmortem semanas depois do incidente | Detalhes críticos perdidos, timeline imprecisa | Automatizar coleta de dados; começar rascunho em 24h |
| Não definir donos para action items | Nada é implementado | Todo action item precisa de nome, prazo e critério de conclusão |
| Não acompanhar action items | Mesmos incidentes se repetem | Dashboard no Azure DevOps; revisão semanal de itens pendentes |
| Postmortem muito longo ou burocrático | Time perde motivação para o processo | Template conciso; foco em insights acionáveis, não em narrativa |
| Excluir "onde tivemos sorte" | Perde-se a consciência de riscos latentes | Sempre incluir esta seção; sorte hoje é risco amanhã |
| Restringir acesso ao postmortem | Organização não aprende como um todo | Publicar postmortems para toda a engenharia (exceto dados sensíveis) |
| Tratar cada incidente isoladamente | Padrões sistêmicos não são identificados | Revisão trimestral de tendências across postmortems |
| Pular o postmortem porque "foi um incidente simples" | Acúmulo de debt operacional | Estabelecer critérios claros de quando postmortem é obrigatório |

---

## Conclusão e próximos passos

O postmortem blameless fecha o ciclo de aprendizado. Sem ele, alertas, SLOs, Error Budgets e Engenharia de Caos ficam soltos, sem feedback real para melhorar.

### Checklist de implementação

Para começar a implementar postmortems blameless na sua organização:

1. Adote o template apresentado aqui e adapte-o ao seu contexto.
2. Configure as queries KQL no Log Analytics para facilitar a coleta de dados.
3. Crie o Action Group no Azure Monitor para disparar a automação quando alertas forem resolvidos.
4. Configure a Logic App para gerar rascunhos automáticos de postmortem.
5. Crie a estrutura no Azure DevOps para rastrear action items.
6. Monte o dashboard de métricas com Azure Workbooks.
7. Conduza o primeiro postmortem usando o guia de facilitação acima.
8. Revise trimestralmente as tendências across postmortems para identificar padrões sistêmicos.

Com essa série, cobrindo resposta a incidentes, SLIs e SLOs, Engenharia de Caos e postmortems, você fecha o ciclo SRE no Azure. Daqui em diante, faz sentido medir a maturidade do time e decidir onde atacar primeiro.

---

## Referências

- [Arquitetura de processo de gestão de incidentes - Azure Well-Architected Framework](https://learn.microsoft.com/azure/well-architected/operational-excellence/incident-response)
- [Azure Monitor - Visão geral](https://learn.microsoft.com/azure/azure-monitor/overview)
- [Log Analytics - Visão geral](https://learn.microsoft.com/azure/azure-monitor/logs/log-analytics-overview)
- [Application Insights - Investigar falhas e transações](https://learn.microsoft.com/azure/azure-monitor/app/failures-performance-transactions)
- [Azure DevOps Work Items](https://learn.microsoft.com/azure/devops/boards/work-items/about-work-items)
- [Azure Logic Apps - Visão geral](https://learn.microsoft.com/azure/logic-apps/logic-apps-overview)
- [Azure SRE Agent](https://aka.ms/sreagent/ga)
- [AIOps e machine learning no Azure Monitor](https://learn.microsoft.com/azure/azure-monitor/logs/aiops-machine-learning)
- [Azure Workbooks](https://learn.microsoft.com/azure/azure-monitor/visualize/workbooks-overview)
- [Google SRE Book - Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [KQL Reference](https://learn.microsoft.com/kusto/query/)
