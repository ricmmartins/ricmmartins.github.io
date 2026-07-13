---
slug: "platform-engineering-azure-governanca-observabilidade-seguranca-parte-2"
aliases:
  - "/posts/platform-engineering-azure-governanca-observabilidade-seguranca-parte-2/"
title: "Platform Engineering no Azure: governança, observabilidade e segurança do IDP — Parte 2"
description: "Azure Policy como guardrail, observabilidade out-of-the-box com Managed Grafana, Workload Identity para zero secrets e golden paths com GitHub Actions."
date: 2026-07-13T11:30:00-04:00
categories:
  - Azure
  - DevOps
tags:
  - platform-engineering
  - azure-policy
  - managed-grafana
  - workload-identity
  - github-actions
  - kubernetes
  - seguranca
  - observabilidade
series:
  - "SRE no Azure"
---

Na [Parte 1](/platform-engineering-azure-internal-developer-platform-parte-1/), montamos a base do Internal Developer Platform: Dev Center, templates Bicep para provisionamento self-service e AKS como runtime compartilhado com multi-tenancy. Aqui entram as camadas que deixam a plataforma segura, observável e governada.

---

## Governança: Azure Policy como guardrail

A plataforma precisa garantir que, independente do que o desenvolvedor faça dentro do seu namespace ou resource group, certos padrões sejam mantidos. Azure Policy é a ferramenta para isso.

### Policies essenciais para um IDP

```bash
# 1. Exigir tags obrigatórias em todos os recursos
az policy assignment create \
  --name "require-platform-tags" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/871b6d14-10aa-478d-b590-94f262ecfa99" \
  --params '{"tagName": {"value": "managedBy"}, "tagValue": {"value": "deployment-environments"}}' \
  --scope "/subscriptions/<sub-id>"

# 2. Bloquear SKUs não permitidos (evitar VMs caras em dev)
az policy assignment create \
  --name "restrict-vm-skus-dev" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/cccc23c7-8427-4f53-ad12-b6a63eb452b3" \
  --params '{"listOfAllowedSKUs": {"value": ["Standard_B1ms", "Standard_B2ms", "Standard_B4ms", "Standard_D2ds_v4"]}}' \
  --scope "/subscriptions/<dev-sub-id>"

# 3. Exigir HTTPS em todos os App Services
az policy assignment create \
  --name "enforce-https" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/a4af4a39-4135-47fb-b175-47fbdf85311d" \
  --scope "/subscriptions/<sub-id>"
```

### Policy customizada: expiração automática de ambientes dev

Um problema clássico de plataformas é o acúmulo de ambientes abandonados. Vamos criar uma policy que marca ambientes dev criados há mais de 14 dias para exclusão:

```json
{
  "mode": "All",
  "policyRule": {
    "if": {
      "allOf": [
        {
          "field": "tags['platform']",
          "equals": "idp-azurebrasil"
        },
        {
          "field": "tags['tier']",
          "equals": "dev"
        },
        {
          "value": "[utcNow()]",
          "greater": "[addDays(field('tags.createdAt'), 14)]"
        }
      ]
    },
    "then": {
      "effect": "modify",
      "details": {
        "operations": [
          {
            "operation": "addOrReplace",
            "field": "tags['scheduled-deletion']",
            "value": "true"
          }
        ],
        "roleDefinitionIds": [
          "/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c"
        ]
      }
    }
  }
}
```

Combinado com uma Azure Function que roda diariamente, ambientes marcados são deletados automaticamente, mantendo o custo sob controle.

---

## Observabilidade pronta desde o início

Num IDP maduro, o desenvolvedor não deveria perder tempo configurando observabilidade. O ambiente já nasce com:

- Log Analytics workspace (ou workspace compartilhado)
- Dashboards no Azure Managed Grafana
- Alertas básicos pré-configurados
- Application Insights para telemetria de aplicação

### módulo de observabilidade (modules/observability.bicep):

```bicep
param serviceName string
param tier string
param location string
param tags object

// Workspace compartilhado (referência)
var sharedWorkspaceId = resourceId('rg-platform-shared', 'Microsoft.OperationalInsights/workspaces', 'law-platform-shared')

// Application Insights para o serviço
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${serviceName}-${tier}'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: sharedWorkspaceId
    RetentionInDays: tier == 'prod' ? 90 : 30
  }
}

// Alert: latência P95 acima do threshold
resource latencyAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alert-latency-${serviceName}-${tier}'
  location: 'global'
  tags: tags
  properties: {
    severity: tier == 'prod' ? 2 : 3
    enabled: true
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    scopes: [appInsights.id]
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'high-latency'
          metricName: 'requests/duration'
          operator: 'GreaterThan'
          threshold: tier == 'prod' ? 500 : 2000
          timeAggregation: 'Average'
        }
      ]
    }
  }
}

// Alert: taxa de erro acima de 5%
resource errorAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alert-errors-${serviceName}-${tier}'
  location: 'global'
  tags: tags
  properties: {
    severity: tier == 'prod' ? 1 : 3
    enabled: true
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    scopes: [appInsights.id]
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'high-error-rate'
          metricName: 'requests/failed'
          operator: 'GreaterThan'
          threshold: 5
          timeAggregation: 'Average'
        }
      ]
    }
  }
}

output instrumentationKey string = appInsights.properties.InstrumentationKey
output connectionString string = appInsights.properties.ConnectionString
output dashboardUrl string = 'https://grafana-platform.brazilsouth.grafana.azure.com/d/${serviceName}'
```

### Dashboard já provisionado com Grafana

Usando Azure Managed Grafana, podemos provisionar dashboards automaticamente via API:

```bash
# Criar instância Managed Grafana (feito uma vez pelo time de plataforma)
az grafana create \
  --name "grafana-platform" \
  --resource-group "rg-platform-shared" \
  --location $LOCATION \
  --sku-tier Standard

# Importar dashboard template para cada novo serviço
az grafana dashboard import \
  --name "grafana-platform" \
  --resource-group "rg-platform-shared" \
  --definition @dashboards/microservice-golden-signals.json \
  --overwrite true
```

O dashboard padrão monitora os **Four Golden Signals** (latência, tráfego, erros e saturação) conforme recomendado pelo livro SRE do Google.

---

## Cenário avançado: Golden Path com GitHub Actions

Um IDP completo não termina no provisionamento de infra. O golden path também inclui o pipeline de CI/CD. Quando o desenvolvedor cria um novo serviço, ele já recebe:

1. Um repositório com estrutura padrão
2. Pipeline de CI/CD pré-configurado
3. Ambientes de dev, staging e prod já vinculados
4. Secrets do Key Vault injetados automaticamente

### GitHub Actions template para deploy no AKS

```yaml
# .github/workflows/deploy.yml (template no catálogo)
name: Deploy to AKS

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  ACR_NAME: acrplatform
  AKS_CLUSTER: aks-platform-shared
  AKS_RESOURCE_GROUP: rg-platform-engineering

permissions:
  id-token: write
  contents: read

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'development' }}
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Azure Login (OIDC)
      uses: azure/login@v2
      with:
        client-id: ${{ secrets.AZURE_CLIENT_ID }}
        tenant-id: ${{ secrets.AZURE_TENANT_ID }}
        subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
    
    - name: Build and push to ACR
      run: |
        az acr login --name ${{ env.ACR_NAME }}
        docker build -t ${{ env.ACR_NAME }}.azurecr.io/${{ github.event.repository.name }}:${{ github.sha }} .
        docker push ${{ env.ACR_NAME }}.azurecr.io/${{ github.event.repository.name }}:${{ github.sha }}
    
    - name: Set AKS context
      uses: azure/aks-set-context@v4
      with:
        resource-group: ${{ env.AKS_RESOURCE_GROUP }}
        cluster-name: ${{ env.AKS_CLUSTER }}
    
    - name: Deploy to namespace
      run: |
        kubectl set image deployment/${{ github.event.repository.name }} \
          app=${{ env.ACR_NAME }}.azurecr.io/${{ github.event.repository.name }}:${{ github.sha }} \
          -n ${{ vars.KUBE_NAMESPACE }}
        
        kubectl rollout status deployment/${{ github.event.repository.name }} \
          -n ${{ vars.KUBE_NAMESPACE }} \
          --timeout=300s
```

---

## Segurança: Workload Identity e zero secrets no código

Um princípio fundamental do IDP é que nenhum desenvolvedor precise gerenciar credentials manualmente. Usamos Workload Identity para que pods no AKS se autentiquem no Azure sem secrets:

```bash
# Criar Managed Identity para o serviço
az identity create \
  --name "id-payment-svc" \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Criar federated credential para o namespace do AKS
az identity federated-credential create \
  --name "fc-payment-svc-aks" \
  --identity-name "id-payment-svc" \
  --resource-group $RESOURCE_GROUP \
  --issuer "$(az aks show -n $AKS_NAME -g $RESOURCE_GROUP --query oidcIssuerProfile.issuerUrl -o tsv)" \
  --subject "system:serviceaccount:payment-svc:payment-svc-sa" \
  --audiences "api://AzureADTokenExchange"

# Dar acesso ao PostgreSQL
az role assignment create \
  --assignee "$(az identity show -n id-payment-svc -g $RESOURCE_GROUP --query principalId -o tsv)" \
  --role "Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.DBforPostgreSQL/flexibleServers/psql-payment-svc-dev"
```

O ServiceAccount no Kubernetes fica assim:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payment-svc-sa
  namespace: payment-svc
  annotations:
    azure.workload.identity/client-id: "<managed-identity-client-id>"
  labels:
    azure.workload.identity/use: "true"
```

O pod recebe automaticamente um token federado que permite acessar banco de dados, Key Vault e outros recursos Azure sem guardar secret no código ou no cluster.

---

## Troubleshooting comum

### Problema: Template falha no provisionamento

**Sintoma**: O desenvolvedor cria um ambiente e recebe erro de deployment.

**Diagnóstico**:

```bash
# Ver logs do deployment
az devcenter dev environment show \
  --name "my-payment-svc" \
  --project-name "proj-payments-team" \
  --dev-center-name $DEVCENTER_NAME \
  --query "provisioningState"

# Ver detalhes do erro
az deployment group show \
  --name "deploy-db-payment-svc" \
  --resource-group "rg-proj-payments-team-dev" \
  --query "properties.error"
```

**Causas comuns**:
- Managed Identity do Dev Center sem permissão na subscription de destino
- Nome de recurso já existente (conflito de nomes globais como PostgreSQL server)
- Quota insuficiente na subscription

### Problema: Namespace no AKS sem conectividade

**Sintoma**: Pods no namespace não conseguem acessar o banco de dados.

**Diagnóstico**:

```bash
# Verificar Network Policy
kubectl get networkpolicy -n payment-svc

# Testar conectividade de dentro do pod
kubectl exec -it deploy/payment-svc -n payment-svc -- \
  nc -zv psql-payment-svc-dev.postgres.database.azure.com 5432

# Verificar se Private Endpoint resolve corretamente
kubectl exec -it deploy/payment-svc -n payment-svc -- \
  nslookup psql-payment-svc-dev.postgres.database.azure.com
```

**Solução**: Adicionar uma Network Policy que permite egress para o CIDR do Private Endpoint do PostgreSQL.

### Problema: Ambientes dev acumulando custo

**Sintoma**: Bill da subscription dev crescendo descontroladamente.

**Solução com KQL**:

```kusto
// Identificar ambientes dev criados há mais de 14 dias
AzureActivity
| where OperationNameValue == "Microsoft.Resources/deployments/write"
| where Properties has "idp-azurebrasil"
| where Properties has "tier\":\"dev"
| where TimeGenerated < ago(14d)
| extend envName = extract("\"name\":\"([^\"]+)\"", 1, Properties)
| summarize CreatedAt = min(TimeGenerated) by envName
| where CreatedAt < ago(14d)
| order by CreatedAt asc
```

Combine com o Azure Cost Management para identificar quais ambientes são os maiores ofensores:

```bash
az costmanagement query \
  --type ActualCost \
  --timeframe MonthToDate \
  --dataset-filter "{\"tags\": {\"name\": \"tier\", \"values\": [\"dev\"]}}" \
  --scope "/subscriptions/<dev-sub-id>"
```

---

## Métricas de sucesso do IDP

Como saber se sua plataforma está funcionando? Acompanhe estas métricas:

| Métrica | Como medir | Meta |
|---------|-----------|------|
| **Time to first deploy** | Tempo entre onboarding e primeiro deploy em produção | < 1 dia |
| **Provisioning time** | Tempo para criar um ambiente completo | < 10 minutos |
| **Adoption rate** | % de times usando a plataforma vs provisioning manual | > 80% |
| **Developer satisfaction (NPS)** | Survey trimestral com desenvolvedores | > 40 |
| **Ambientes abandonados** | Ambientes dev sem atividade há >14 dias | < 10% |
| **Incidentes causados por infra mal configurada** | Correlação com SRE metrics | Diminuir mês a mês |
| **Self-service ratio** | Requests resolvidos sem ticket / total | > 90% |

---

## Anti-patterns: o que evitar ao construir um IDP

Antes de falar de evolução, segue uma lista de erros comuns que vejo em organizações tentando implementar Platform Engineering:

| Anti-pattern | O que acontece | Como evitar |
|-------------|---------------|-------------|
| **Plataforma sem clientes** | Time de plataforma constrói features que ninguém pediu | Começar com um time piloto real, iterar baseado em feedback |
| **Abstração excessiva** | Desenvolvedores não conseguem debugar porque a plataforma esconde tudo | Manter escape hatches: acesso kubectl read-only, logs acessíveis |
| **Golden cage** | Plataforma tão rígida que times fogem para shadow IT | Golden paths devem ser o caminho mais fácil, não o único caminho |
| **Big bang** | Tentar construir tudo antes de entregar valor | Entregar incrementalmente: primeiro self-service de ambientes dev, depois staging, depois prod |
| **Ignorar Developer Experience** | Portal confuso, CLI com 20 flags obrigatórias, erros genéricos | Investir em UX como se fosse um produto externo. Mensagens de erro claras, defaults inteligentes |
| **Copiar o Spotify/Netflix** | Adotar Backstage completo antes de ter 10 serviços | Complexidade da plataforma deve ser proporcional à complexidade da organização |

A regra aqui é simples: se usar a plataforma der mais trabalho do que fazer na mão, o time vai fazer na mão. Seu trabalho é garantir que a plataforma seja o caminho de menor resistência.

---

## Evolução: o que vem depois

Um IDP não tem linha de chegada. É um produto interno que vai sendo ajustado com uso. Depois dessa base, os próximos passos mais comuns são:

**Fase 2: Developer Portal com Backstage**

Integrar o Backstage (CNCF) ou um portal customizado que unifica catálogo de serviços, documentação, ownership e status de deploys em uma única interface.

**Fase 3: Score cards e compliance contínuo**

Implementar scorecards que medem a "saúde" de cada serviço (tem observabilidade? testes? runbooks? SLOs definidos?) e mostram isso no portal.

**Fase 4: FinOps integrado**

Cada time vê seu custo em tempo real no portal, com breakdown por ambiente e recomendações de otimização automáticas.

**Fase 5: AI-assisted operations**

Integrar o Azure SRE Agent (que exploramos no artigo anterior) para que desenvolvedores possam investigar incidentes nos seus serviços via linguagem natural, sem depender do time de SRE para cada investigação.

---

## Conclusão

Platform Engineering não é sobre tirar autonomia dos desenvolvedores. É sobre tirar atrito sem abrir mão de controle. Com Azure Deployment Environments, Dev Center, AKS multi-tenant e Bicep como base, você monta uma plataforma que:

- Permite provisionamento em minutos, não dias
- Garante compliance e segurança por design
- Reduz carga cognitiva sem limitar flexibilidade
- Escala para dezenas de times sem aumentar o time de plataforma proporcionalmente

Dá trabalho no começo: montar templates, configurar policies e integrar observabilidade. Só que esse esforço se paga toda vez que um novo time entra e já começa usando os padrões certos desde o dia zero.

Se você já amadureceu as práticas de SRE da série, o passo seguinte faz sentido: empacotar esse conhecimento numa plataforma que o time realmente queira usar.

---

## Referências

- [Microsoft Dev Center documentation](https://learn.microsoft.com/en-us/azure/deployment-environments/)
- [Azure Deployment Environments](https://learn.microsoft.com/en-us/azure/deployment-environments/overview-what-is-azure-deployment-environments)
- [Platform Engineering on Azure](https://learn.microsoft.com/en-us/platform-engineering/)
- [AKS Workload Identity](https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview)
- [Azure Managed Grafana](https://learn.microsoft.com/en-us/azure/managed-grafana/overview)
- [Bicep documentation](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
- [Team Topologies (book)](https://teamtopologies.com/) - Matthew Skelton & Manuel Pais
