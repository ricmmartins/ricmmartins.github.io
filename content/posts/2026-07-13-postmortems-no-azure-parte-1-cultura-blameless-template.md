---
slug: "postmortems-no-azure-analise-pos-incidente-blameless-parte-1"
aliases:
  - "/posts/postmortems-no-azure-analise-pos-incidente-blameless-parte-1/"
title: "Postmortems no Azure: análise pós-incidente blameless com Azure Monitor — Parte 1"
description: "Aprenda a implementar postmortems blameless no Azure: template completo, queries KQL para reconstruir timelines e automação com Logic Apps para coleta de dados."
date: 2026-07-13T10:00:00-04:00
categories:
  - Azure
  - SRE
tags:
  - postmortem
  - sre
  - azure-monitor
  - kql
  - blameless
  - incident-management
  - devops
  - observabilidade
series:
  - "SRE no Azure"
---

Você já automatizou alertas e runbooks, definiu SLIs, SLOs e Error Budgets e validou resiliência com Engenharia de Caos. Mas quando o incidente termina, o que acontece? Na maioria das organizações: **nada**. O alerta é resolvido e todos seguem em frente — até o mesmo problema acontecer de novo.

Sem análise pós-incidente estruturada, sua organização repete os mesmos erros. O postmortem blameless transforma falhas em aprendizado sistêmico e impede que incidentes recorrentes corroam seu Error Budget.

Neste artigo, construímos um processo completo de postmortem no Azure: coleta automatizada com KQL, templates estruturados, automação com Logic Apps e integração com Azure DevOps.

---

## Por que postmortems falham na maioria das organizações

| Anti-padrão | Consequência | Sintoma visível |
|-------------|-------------|-----------------|
| **Cultura de culpa** | Pessoas escondem informações por medo de punição | Timeline do incidente tem lacunas inexplicáveis |
| **Postmortem tardio** | Detalhes críticos são esquecidos após dias ou semanas | Documento superficial, sem insights acionáveis |
| **Sem action items** | Revisão vira exercício burocrático sem resultado | Mesmo incidente se repete em semanas |
| **Action items sem dono** | Tarefas são criadas mas nunca acompanhadas | Lista de melhorias cresce infinitamente, nada é implementado |
| **Escopo excessivo** | Tentativa de resolver todos os problemas da organização | Reunião de 3 horas sem conclusão clara |
| **Foco em "o que deu errado"** | Ignora fatores sistêmicos e contribuintes | Correção pontual que não endereça a causa raiz |
| **Sem dados concretos** | Análise baseada em memória e percepções | Conclusões divergentes entre os participantes |

O Google SRE Book define postmortem como "um registro escrito de um incidente, seu impacto, as ações tomadas para mitigá-lo, a(s) causa(s) raiz, e as ações para evitar recorrência". Mas o aspecto mais importante é a filosofia: **blameless**, sem culpa.

---

## O que é cultura blameless e por que ela é essencial

Cultura blameless não significa ausência de responsabilidade — significa que o foco é o **sistema**, não o indivíduo. Se uma pessoa cometeu um erro, o sistema permitiu que esse erro se propagasse até causar impacto.

### Comparação: abordagem tradicional vs. blameless

| Aspecto | Abordagem tradicional | Abordagem blameless |
|---------|----------------------|---------------------|
| **Pergunta central** | "Quem causou isso?" | "O que permitiu que isso acontecesse?" |
| **Foco da análise** | Ação individual | Fatores sistêmicos e contribuintes |
| **Resultado esperado** | Punição ou advertência | Melhorias no sistema, processos e ferramentas |
| **Efeito na equipe** | Medo, ocultação de erros | Segurança psicológica, transparência |
| **Timeline do incidente** | Incompleta (pessoas omitem detalhes) | Completa (pessoas compartilham sem medo) |
| **Probabilidade de recorrência** | Alta (causa raiz não endereçada) | Baixa (fatores sistêmicos corrigidos) |
| **Aprendizado organizacional** | Mínimo | Máximo |

A segurança psicológica é o alicerce. Quando engenheiros sabem que não serão punidos, compartilham informações cruciais — inclusive decisões que pareciam razoáveis no momento mas se mostraram problemáticas. Essas informações são essenciais para prevenir incidentes futuros.

### Os cinco princípios de um postmortem blameless

1. **Assumir boa-fé**: ninguém acorda querendo derrubar a produção.
2. **Falhas são aprendizado**: cada incidente revela lacunas não visíveis antes.
3. **Foco em fatores contribuintes**: incidentes raramente têm causa raiz isolada — são múltiplos fatores convergindo.
4. **Ações corretivas sistêmicas**: melhorias tornam o sistema mais resiliente, não apenas impedem a repetição exata.
5. **Transparência total**: conclusões acessíveis a toda a organização.

---

## Anatomia de um postmortem eficaz

Template baseado nas práticas do Google SRE, adaptado para o ecossistema Azure.

### Template completo de postmortem

```markdown
# Postmortem: [Título descritivo do incidente]

## Metadados
- **Data do incidente**: YYYY-MM-DD
- **Duração**: HH:MM (do início da detecção até a resolução)
- **Severidade**: SEV-1 / SEV-2 / SEV-3 / SEV-4
- **Autor do postmortem**: [Nome]
- **Facilitador da reunião**: [Nome]
- **Data da revisão**: YYYY-MM-DD
- **Status**: Rascunho / Em Revisão / Aprovado

## Resumo executivo
[2-3 parágrafos: o que aconteceu, impacto e resolução.]

## Impacto
- **Usuários afetados**: [número ou percentual]
- **Duração do impacto**: [tempo em que usuários foram afetados]
- **Receita impactada**: [estimativa, se aplicável]
- **SLO afetado**: [qual SLO foi violado e em quanto]
- **Error Budget consumido**: [percentual do budget mensal consumido]
- **Tickets de suporte**: [quantidade gerada]

## Timeline detalhada
| Hora (UTC) | Evento | Fonte |
|------------|--------|-------|
| HH:MM | Primeiro sinal de degradação nos logs | Azure Monitor |
| HH:MM | Alerta disparado | Action Group |
| HH:MM | Engenheiro de plantão acionado | PagerDuty/Opsgenie |
| HH:MM | Início da investigação | - |
| HH:MM | Causa identificada | Log Analytics |
| HH:MM | Ação de mitigação aplicada | - |
| HH:MM | Serviço restaurado | Azure Monitor |
| HH:MM | Confirmação de normalidade | Dashboard SLO |

## Causa raiz e fatores contribuintes
### Causa raiz
[Descrição técnica detalhada da causa raiz]

### Fatores contribuintes
1. [Fator 1]
2. [Fator 2]
3. [Fator 3]

### Diagrama de causa e efeito
[Se aplicável, incluir diagrama de Ishikawa ou árvore de falhas]

## O que funcionou bem
- [Item 1]
- [Item 2]
- [Item 3]

## O que pode ser melhorado
- [Item 1]
- [Item 2]
- [Item 3]

## Onde tivemos sorte
- [Item 1]
- [Item 2]

## Action items
| ID | Ação | Prioridade | Responsável | Prazo | Status |
|----|------|-----------|-------------|-------|--------|
| AI-001 | Ajustar threshold do alerta X | P1 | @fulano | 7 dias | Pendente |
| AI-002 | Criar runbook para cenário Y | P2 | @ciclano | 14 dias | Pendente |
| AI-003 | Adicionar teste de caos para componente Z | P3 | @beltrano | 30 dias | Pendente |

## Lições aprendidas
[Insights que transcendem este incidente específico e se aplicam à organização]
```

### Classificação de severidade

A severidade determina o rigor do postmortem, participantes e prazos.

| Severidade | Critério | Prazo do postmortem | Participantes obrigatórios |
|------------|----------|--------------------|-----------------------------|
| **SEV-1** | Indisponibilidade total ou perda de dados | 48 horas após resolução | Engenharia, Gestão, Produto, Suporte |
| **SEV-2** | Degradação significativa ou funcionalidade crítica indisponível | 5 dias úteis | Engenharia, Gestão |
| **SEV-3** | Impacto parcial ou degradação moderada | 10 dias úteis | Engenharia |
| **SEV-4** | Impacto mínimo, detectado internamente | 15 dias úteis | Engenheiros envolvidos |

Regra: **todo incidente SEV-1 e SEV-2 deve gerar postmortem**. SEV-3/SEV-4 são recomendados mas podem ser simplificados.

---

## Coletando dados para o postmortem com Azure Monitor e KQL

Reconstruir a timeline é a parte mais trabalhosa do postmortem. Com Azure Monitor configurado, os dados já estão disponíveis — o segredo é extraí-los com KQL.

### Reconstruindo a timeline de falhas com Application Insights

Identificando quando as falhas começaram e como evoluíram:

```kql
// Timeline de falhas por minuto durante o período do incidente
AppRequests
| where TimeGenerated between (datetime("2026-04-15 14:00") .. datetime("2026-04-15 18:00"))
| summarize 
    totalRequests = count(),
    failedRequests = countif(Success == false),
    failureRate = round(100.0 * countif(Success == false) / count(), 2),
    avgDuration = round(avg(DurationMs), 2),
    p95Duration = round(percentile(DurationMs, 95), 2)
  by bin(TimeGenerated, 1m)
| order by TimeGenerated asc
| render timechart
```

### Identificando as exceções que causaram as falhas

Com o período mapeado, identificamos as exceções por trás dos erros:

```kql
// Top exceções durante o período do incidente
AppExceptions
| where TimeGenerated between (datetime("2026-04-15 14:00") .. datetime("2026-04-15 18:00"))
| summarize 
    occurrences = count(),
    firstSeen = min(TimeGenerated),
    lastSeen = max(TimeGenerated),
    affectedOperations = dcount(OperationId)
  by ProblemId, ExceptionType = tostring(split(Type, ".")[-1]), OuterMessage
| order by occurrences desc
| take 20
```

### Correlacionando exceções com requests falhos

Cruzando requests falhos com exceções para revelar qual operação foi afetada e por quê:

```kql
// Correlação entre requests falhos e exceções
AppRequests
| where TimeGenerated between (datetime("2026-04-15 14:00") .. datetime("2026-04-15 18:00"))
| where Success == false
| join kind=inner (
    AppExceptions
    | where TimeGenerated between (datetime("2026-04-15 14:00") .. datetime("2026-04-15 18:00"))
) on OperationId
| summarize 
    failureCount = count(),
    avgDuration = round(avg(DurationMs), 2)
  by RequestName = Name, ExceptionType = Type, ExceptionMessage = OuterMessage
| order by failureCount desc
```

### Analisando dependências que falharam

Muitos incidentes vêm de dependências externas (bancos, APIs, cache). Esta query identifica quais falharam:

```kql
// Dependências com falha durante o incidente
AppDependencies
| where TimeGenerated between (datetime("2026-04-15 14:00") .. datetime("2026-04-15 18:00"))
| where Success == false
| summarize 
    failures = count(),
    avgDuration = round(avg(DurationMs), 2),
    p99Duration = round(percentile(DurationMs, 99), 2),
    firstFailure = min(TimeGenerated),
    lastFailure = max(TimeGenerated)
  by DependencyType = Type, DependencyName = Name, Target, ResultCode
| order by failures desc
```

### Verificando alterações no ambiente (Activity Log)

"Algo mudou antes do incidente?" — o Activity Log registra todas as operações de gerenciamento:

```kql
// Alterações no ambiente nas 6 horas anteriores ao incidente
AzureActivity
| where TimeGenerated between (datetime("2026-04-15 08:00") .. datetime("2026-04-15 14:30"))
| where OperationNameValue has_any ("write", "delete", "action")
| where ActivityStatusValue == "Success"
| project 
    TimeGenerated,
    Caller,
    OperationNameValue,
    ResourceGroup,
    Resource = tostring(split(_ResourceId, "/")[-1]),
    Properties = ActivitySubstatusValue
| order by TimeGenerated desc
```

### Verificando a saúde dos recursos (Resource Health)

O Resource Health revela problemas de infraestrutura não visíveis nos logs da aplicação:

```kql
// Eventos de saúde dos recursos durante o incidente
AzureActivity
| where TimeGenerated between (datetime("2026-04-15 13:00") .. datetime("2026-04-15 19:00"))
| where CategoryValue == "ResourceHealth"
| project 
    TimeGenerated,
    ResourceType = tostring(split(_ResourceId, "/")[-2]),
    Resource = tostring(split(_ResourceId, "/")[-1]),
    Status = ActivityStatusValue,
    Detail = Properties
| order by TimeGenerated asc
```

### Query consolidada: timeline completa do incidente

Esta query unifica eventos de múltiplas fontes em uma visão cronológica:

```kql
// Timeline unificada do incidente
let incidentStart = datetime("2026-04-15 14:00");
let incidentEnd = datetime("2026-04-15 18:00");
let lookbackWindow = 2h;
//
// 1. Primeiros sinais de falha (requests)
let requestFailures = AppRequests
| where TimeGenerated between ((incidentStart - lookbackWindow) .. incidentEnd)
| where Success == false
| summarize Count = count() by bin(TimeGenerated, 1m)
| where Count > 5 // threshold de ruído
| extend EventType = "RequestFailure", Detail = strcat(Count, " requests falharam");
//
// 2. Exceções novas
let exceptions = AppExceptions
| where TimeGenerated between ((incidentStart - lookbackWindow) .. incidentEnd)
| summarize Count = count(), Types = make_set(Type) by bin(TimeGenerated, 1m)
| where Count > 0
| extend EventType = "Exception", Detail = strcat(Count, " exceções: ", tostring(Types));
//
// 3. Alterações no ambiente
let changes = AzureActivity
| where TimeGenerated between ((incidentStart - lookbackWindow) .. incidentEnd)
| where OperationNameValue has_any ("write", "delete")
| where ActivityStatusValue == "Success"
| extend EventType = "EnvironmentChange", 
         Detail = strcat(Caller, " executou ", OperationNameValue, " em ", tostring(split(_ResourceId, "/")[-1]));
//
// 4. Alertas disparados
let alerts = AlertsManagementResources
| extend EventType = "AlertFired", Detail = "Alerta disparado";
//
// Unificação
requestFailures
| union exceptions
| union changes
| project TimeGenerated, EventType, Detail
| order by TimeGenerated asc
```

---

## Automatizando a coleta de dados do postmortem com Logic Apps

Podemos automatizar a geração do rascunho com Logic Apps que disparam quando um incidente é resolvido.

### Arquitetura da automação

### Configurando o trigger no Azure Monitor

Crie um Action Group que dispara quando um alerta é **resolvido**:

```bash
# Criar Action Group para postmortem
az monitor action-group create \
  --resource-group rg-monitoring \
  --name ag-postmortem-trigger \
  --short-name postmortem \
  --action logicapp "PostmortemGenerator" \
    "/subscriptions/{sub-id}/resourceGroups/rg-automation/providers/Microsoft.Logic/workflows/postmortem-generator" \
    "https://prod-XX.brazilsouth.logic.azure.com:443/workflows/{workflow-id}/triggers/manual/paths/invoke"
```

### Criando a Logic App para geração automática

A Logic App executa queries KQL via API do Log Analytics e monta o rascunho:

```json
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "triggers": {
      "Quando_alerta_resolvido": {
        "type": "Request",
        "kind": "Http",
        "inputs": {
          "schema": {
            "type": "object",
            "properties": {
              "data": {
                "type": "object",
                "properties": {
                  "essentials": {
                    "type": "object",
                    "properties": {
                      "alertId": { "type": "string" },
                      "alertRule": { "type": "string" },
                      "severity": { "type": "string" },
                      "monitorCondition": { "type": "string" },
                      "firedDateTime": { "type": "string" },
                      "resolvedDateTime": { "type": "string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "actions": {
      "Consultar_Log_Analytics": {
        "type": "ApiConnection",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters('$connections')['azuremonitorlogs']['connectionId']"
            }
          },
          "method": "post",
          "path": "/queryData",
          "body": {
            "query": "AppRequests | where TimeGenerated between (datetime('@{triggerBody()?['data']?['essentials']?['firedDateTime']}') .. datetime('@{triggerBody()?['data']?['essentials']?['resolvedDateTime']}')) | where Success == false | summarize failedCount=count(), avgDuration=avg(DurationMs) by bin(TimeGenerated, 5m), Name | order by TimeGenerated asc",
            "timerange": {
              "start": "@triggerBody()?['data']?['essentials']?['firedDateTime']",
              "end": "@triggerBody()?['data']?['essentials']?['resolvedDateTime']"
            }
          }
        }
      },
      "Criar_Work_Item_DevOps": {
        "type": "ApiConnection",
        "runAfter": { "Consultar_Log_Analytics": ["Succeeded"] },
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters('$connections')['visualstudioteamservices']['connectionId']"
            }
          },
          "method": "patch",
          "path": "/{project}/_apis/wit/workitems/$Bug",
          "body": {
            "title": "Postmortem: @{triggerBody()?['data']?['essentials']?['alertRule']}",
            "description": "Postmortem gerado automaticamente...",
            "tags": "postmortem;incident-review"
          }
        }
      }
    }
  }
}
```

### Script Azure CLI para consultar dados do postmortem

Para gerar o rascunho via CLI em vez de Logic Apps:

```bash
#!/bin/bash
# Script para gerar rascunho de postmortem via CLI
# Uso: ./gerar-postmortem.sh <workspace-id> <inicio> <fim>

WORKSPACE_ID=$1
INCIDENT_START=$2
INCIDENT_END=$3

echo "# Postmortem - Rascunho Automático"
echo "Gerado em: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""
echo "## Período do incidente"
echo "- Início: $INCIDENT_START"
echo "- Fim: $INCIDENT_END"
echo ""

# Timeline de falhas
echo "## Timeline de falhas (requests)"
az monitor log-analytics query \
  --workspace "$WORKSPACE_ID" \
  --analytics-query "
    AppRequests
    | where TimeGenerated between (datetime('$INCIDENT_START') .. datetime('$INCIDENT_END'))
    | where Success == false
    | summarize failedCount=count() by bin(TimeGenerated, 5m), Name
    | order by TimeGenerated asc
  " \
  --output table

# Top exceções
echo ""
echo "## Exceções identificadas"
az monitor log-analytics query \
  --workspace "$WORKSPACE_ID" \
  --analytics-query "
    AppExceptions
    | where TimeGenerated between (datetime('$INCIDENT_START') .. datetime('$INCIDENT_END'))
    | summarize count() by ProblemId, Type, OuterMessage
    | order by count_ desc
    | take 10
  " \
  --output table

# Alterações no ambiente
echo ""
echo "## Alterações no ambiente (2h antes do incidente)"
az monitor log-analytics query \
  --workspace "$WORKSPACE_ID" \
  --analytics-query "
    AzureActivity
    | where TimeGenerated between (datetime_add('hour', -2, datetime('$INCIDENT_START')) .. datetime('$INCIDENT_START'))
    | where OperationNameValue has_any ('write', 'delete')
    | where ActivityStatusValue == 'Success'
    | project TimeGenerated, Caller, OperationNameValue, ResourceGroup
    | order by TimeGenerated desc
  " \
  --output table

# Dependências com falha
echo ""
echo "## Dependências com falha"
az monitor log-analytics query \
  --workspace "$WORKSPACE_ID" \
  --analytics-query "
    AppDependencies
    | where TimeGenerated between (datetime('$INCIDENT_START') .. datetime('$INCIDENT_END'))
    | where Success == false
    | summarize failures=count() by Type, Name, Target, ResultCode
    | order by failures desc
  " \
  --output table
```

---

## Conclusão da Parte 1

Construímos os alicerces para postmortems blameless: filosofia sem culpa, template estruturado, coleta automatizada com KQL e geração de rascunhos com Logic Apps. Com isso, você já consegue reconstruir a timeline de qualquer incidente com precisão.

Na [Parte 2](/postmortems-no-azure-automacao-devops-metricas-parte-2/), integramos os postmortems ao Azure DevOps para rastrear action items, definimos métricas de eficácia e exploramos cenários avançados como postmortems cross-cloud.
