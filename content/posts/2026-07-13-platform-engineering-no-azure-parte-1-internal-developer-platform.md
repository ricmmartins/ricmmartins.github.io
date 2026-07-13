---
slug: "platform-engineering-azure-internal-developer-platform-parte-1"
aliases:
  - "/posts/platform-engineering-azure-internal-developer-platform-parte-1/"
title: "Platform Engineering no Azure: construindo um Internal Developer Platform com AKS e Bicep (Parte 1)"
description: "Construa um IDP no Azure com Dev Center, Deployment Environments, AKS multi-tenant e Bicep. Self-service para desenvolvedores com segurança e governança."
date: 2026-07-13T11:00:00-04:00
categories:
  - Azure
  - DevOps
tags:
  - platform-engineering
  - idp
  - aks
  - bicep
  - azure-deployment-environments
  - dev-center
  - kubernetes
  - devops
series:
  - "SRE no Azure"
---

Você já implementou SLIs, SLOs e Error Budgets, automatizou resposta a incidentes, validou resiliência com Engenharia de Caos e até conduziu investigações cross-cloud. Mas quando um novo desenvolvedor entra no time e precisa provisionar um ambiente completo para começar a codar, quanto tempo leva? Dias? Semanas? Se a resposta for mais que minutos, você tem um problema de plataforma.

Platform Engineering é isso: criar uma camada de abstração para que desenvolvedores trabalhem com autonomia sem virar especialistas em infraestrutura. Em vez de abrir ticket para o time de DevOps pedindo "um cluster com banco e fila", o desenvolvedor entra num portal self-service, escolhe um template e, em minutos, tem um ambiente completo dentro dos padrões da organização.

Aqui, a ideia é montar um Internal Developer Platform (IDP) no Azure usando Azure Deployment Environments, Microsoft Dev Center, AKS, Bicep e práticas de governança que aguentam vários times.

---

## O que é Platform Engineering e por que importa agora?

Platform Engineering é a disciplina de construir e manter plataformas internas que reduzem a carga cognitiva dos desenvolvedores. Não é um produto que você compra, é uma prática que você implementa.

O conceito ganhou força porque o modelo "you build it, you run it" do DevOps, quando levado ao extremo, sobrecarrega os desenvolvedores. Eles acabam gastando mais tempo configurando pipelines, entendendo redes e gerenciando permissões do que escrevendo código de negócio.

| Modelo | Quem provisiona infra | Quem opera | Problema |
|--------|----------------------|-----------|----------|
| **Ops tradicional** | Time de infra (tickets) | Time de infra | Lento, gargalo, shadow IT |
| **DevOps puro** | Cada dev team | Cada dev team | Carga cognitiva alta, inconsistência |
| **Platform Engineering** | Plataforma self-service | Time de plataforma + automação | Autonomia com guardrails |

Segundo o relatório State of DevOps 2024 da Puppet, organizações com plataformas internas maduras têm **tempo de onboarding 60% menor** e **frequência de deploy 4x maior** que organizações sem plataforma definida.

### Os quatro pilares de um IDP

Um Internal Developer Platform bem construído se apoia em quatro capacidades:

1. **Self-service com guardrails**: desenvolvedores provisionam recursos sem tickets, mas dentro de limites definidos pela plataforma (políticas, quotas, padrões de segurança).

2. **Golden paths**: caminhos pré-definidos e otimizados para cenários comuns. Não é "a única forma de fazer", mas sim "a forma mais fácil e segura de fazer".

3. **Abstrações adequadas**: o desenvolvedor não precisa saber que está usando um Azure Database for PostgreSQL Flexible Server com geo-redundancy. Ele precisa saber que tem "um banco PostgreSQL em produção com backup".

4. **Observabilidade integrada**: cada ambiente provisionado já vem com métricas, logs e traces configurados. Sem configuração adicional.

---

## Componentes do Azure para Platform Engineering

O Azure oferece um conjunto de serviços que, combinados, formam a base de um IDP corporativo:

| Componente | Função no IDP | Serviço Azure |
|------------|--------------|---------------|
| **Catálogo de ambientes** | Templates de infraestrutura versionados | Azure Deployment Environments |
| **Portal do desenvolvedor** | Interface self-service | Microsoft Dev Center / Dev Portal |
| **Orquestração de infra** | Provisionamento declarativo | Bicep / ARM Templates |
| **Runtime de aplicações** | Execução de workloads | AKS / Azure Container Apps |
| **Governança** | Políticas e compliance | Azure Policy + RBAC |
| **Observabilidade** | Métricas, logs, traces | Azure Monitor + Managed Grafana |
| **Identidade** | Autenticação e autorização | Microsoft Entra ID |
| **Secrets** | Gerenciamento de credenciais | Azure Key Vault |

### Azure Deployment Environments: a base do self-service

Azure Deployment Environments (ADE) é o serviço que permite criar catálogos de templates de infraestrutura que desenvolvedores podem instanciar sob demanda. Funciona assim:

1. O time de plataforma cria **definições de ambiente** (Bicep/Terraform templates) em um repositório Git.
2. Essas definições são registradas em um **catálogo** no Dev Center.
3. Desenvolvedores, via portal ou CLI, criam **instâncias** desses ambientes dentro de **projetos**.
4. Políticas de expiração, custo e compliance são aplicadas automaticamente.

### Microsoft Dev Center: o hub de gerenciamento

O Dev Center é o plano de controle que conecta tudo. Nele você define:

- **Projetos**: agrupamento lógico por time ou produto
- **Catálogos**: repositórios Git com templates de infra
- **Environment Types**: dev, staging, production (cada um com policies diferentes)
- **Dev Box definitions**: máquinas de desenvolvimento pré-configuradas (não é o foco aqui, mas faz parte do ecossistema)

---

## Arquitetura de referência: IDP no Azure

Arquitetura completa antes de partir para a implementação:

![Arquitetura de referência: IDP no Azure](/img/idp-architecture.svg)

O fluxo é simples: o desenvolvedor interage com a camada de experiência (portal, CLI ou IDE), a camada de plataforma orquestra o provisionamento com guardrails, e a camada de infraestrutura é criada automaticamente.

---

## Implementação passo a passo

### Passo 1: Configurar o Dev Center

Primeiro, vamos criar o Dev Center, que centraliza o gerenciamento:

```bash
# Variáveis
RESOURCE_GROUP="rg-platform-engineering"
LOCATION="brazilsouth"
DEVCENTER_NAME="dc-azurebrasil"

# Criar resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Criar o Dev Center
az devcenter admin devcenter create \
  --name $DEVCENTER_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --identity-type SystemAssigned
```

Após a criação, o Dev Center recebe uma Managed Identity que será usada para provisionar recursos nos projetos.

### Passo 2: Criar um projeto

Projetos representam times ou produtos. Cada projeto tem seus próprios ambientes, permissões e limites de custo:

```bash
PROJECT_NAME="proj-payments-team"

az devcenter admin project create \
  --name $PROJECT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --dev-center-id "/subscriptions/<sub-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.DevCenter/devcenters/$DEVCENTER_NAME" \
  --max-dev-boxes-per-user 2
```

### Passo 3: Conectar um catálogo Git

O catálogo é um repositório Git que contém os templates de infraestrutura. Pode ser Azure DevOps Repos ou GitHub:

```bash
az devcenter admin catalog create \
  --name "infra-templates" \
  --resource-group $RESOURCE_GROUP \
  --dev-center-name $DEVCENTER_NAME \
  --git-hub \
    uri="https://github.com/azurebrasil/platform-catalog.git" \
    branch="main" \
    path="/environments"
```

### Passo 4: Criar templates Bicep para o catálogo

Aqui está a peça central da plataforma. Cada template define um ambiente completo. Vou usar um exemplo de microserviço que precisa de banco de dados, cache e observabilidade; o namespace no AKS aparece como módulo opcional mais adiante:

**Estrutura do catálogo no Git:**

```
/environments
  /microservice-standard
    environment.yaml
    main.bicep
    modules/
      aks-namespace.bicep
      database.bicep
      cache.bicep
      observability.bicep
```

**environment.yaml** (manifesto do template):

```yaml
name: microservice-standard
version: 1.0.0
summary: "Ambiente padrão para microserviço com banco, cache e observabilidade"
description: "Provisiona PostgreSQL Flexible Server, Redis Cache e configura dashboards no Grafana; o namespace no AKS pode ser combinado via módulo opcional"
runner: Bicep
templatePath: main.bicep
parameters:
  - id: serviceName
    name: "Nome do serviço"
    description: "Nome do microserviço (kebab-case, max 20 chars)"
    type: string
    required: true
  - id: tier
    name: "Tier"
    description: "Tier de recursos (dev = básico, prod = alta disponibilidade)"
    type: string
    required: true
    allowedValues:
      - dev
      - staging
      - prod
  - id: enableRedis
    name: "Habilitar Redis"
    description: "Provisionar Azure Cache for Redis"
    type: boolean
    default: true
```

**main.bicep** (template principal):

```bicep
@description('Nome do microserviço')
@minLength(3)
@maxLength(20)
param serviceName string

@description('Tier do ambiente')
@allowed(['dev', 'staging', 'prod'])
param tier string

@description('Habilitar Redis Cache')
param enableRedis bool = true

param location string = resourceGroup().location
param dateTag string = utcNow('yyyy-MM-dd')

// Tags padrão da plataforma
var commonTags = {
  platform: 'idp-azurebrasil'
  service: serviceName
  tier: tier
  managedBy: 'deployment-environments'
  createdAt: dateTag
}

// Configurações por tier
var tierConfig = {
  dev: {
    dbSkuName: 'Standard_B1ms'
    dbStorageGb: 32
    dbHaMode: 'Disabled'
    redisSkuName: 'Basic'
    redisFamily: 'C'
    redisCapacity: 0
  }
  staging: {
    dbSkuName: 'Standard_B2ms'
    dbStorageGb: 64
    dbHaMode: 'Disabled'
    redisSkuName: 'Standard'
    redisFamily: 'C'
    redisCapacity: 1
  }
  prod: {
    dbSkuName: 'Standard_D2ds_v4'
    dbStorageGb: 128
    dbHaMode: 'ZoneRedundant'
    redisSkuName: 'Premium'
    redisFamily: 'P'
    redisCapacity: 1
  }
}

var config = tierConfig[tier]

// PostgreSQL Flexible Server
module database 'modules/database.bicep' = {
  name: 'deploy-db-${serviceName}'
  params: {
    serverName: 'psql-${serviceName}-${tier}'
    location: location
    skuName: config.dbSkuName
    storageSizeGB: config.dbStorageGb
    haMode: config.dbHaMode
    tags: commonTags
  }
}

// Redis Cache (condicional)
module cache 'modules/cache.bicep' = if (enableRedis) {
  name: 'deploy-cache-${serviceName}'
  params: {
    cacheName: 'redis-${serviceName}-${tier}'
    location: location
    skuName: config.redisSkuName
    family: config.redisFamily
    capacity: config.redisCapacity
    tags: commonTags
  }
}

// Observabilidade (Log Analytics workspace + dashboard)
module observability 'modules/observability.bicep' = {
  name: 'deploy-obs-${serviceName}'
  params: {
    serviceName: serviceName
    tier: tier
    location: location
    tags: commonTags
  }
}

// Outputs para o desenvolvedor
output databaseHost string = database.outputs.fqdn
output databaseName string = database.outputs.databaseName
output redisHost string = enableRedis ? cache.outputs.hostname : 'N/A'
output grafanaDashboardUrl string = observability.outputs.dashboardUrl
```

**modules/database.bicep:**

```bicep
param serverName string
param location string
param skuName string
param storageSizeGB int
param haMode string
param tags object

param administratorLogin string = 'platformadmin'

@secure()
param administratorPassword string

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: serverName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: contains(skuName, 'B') ? 'Burstable' : 'GeneralPurpose'
  }
  properties: {
    version: '16'
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    storage: {
      storageSizeGB: storageSizeGB
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: haMode == 'ZoneRedundant' ? 35 : 7
      geoRedundantBackup: haMode == 'ZoneRedundant' ? 'Enabled' : 'Disabled'
    }
    highAvailability: {
      mode: haMode
    }
  }
}

resource defaultDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresServer
  name: 'app'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

output fqdn string = postgresServer.properties.fullyQualifiedDomainName
output databaseName string = defaultDatabase.name
```

### Passo 5: Definir Environment Types

Environment Types controlam quais tipos de ambiente cada projeto pode criar, e com quais permissões e subscriptions:

```bash
# Criar environment types no Dev Center
az devcenter admin environment-type create \
  --name "dev" \
  --resource-group $RESOURCE_GROUP \
  --dev-center-name $DEVCENTER_NAME

az devcenter admin environment-type create \
  --name "staging" \
  --resource-group $RESOURCE_GROUP \
  --dev-center-name $DEVCENTER_NAME

az devcenter admin environment-type create \
  --name "prod" \
  --resource-group $RESOURCE_GROUP \
  --dev-center-name $DEVCENTER_NAME

# Associar ao projeto com subscription e identity
az devcenter admin project-environment-type create \
  --name "dev" \
  --resource-group $RESOURCE_GROUP \
  --project-name $PROJECT_NAME \
  --deployment-target-id "/subscriptions/<dev-sub-id>" \
  --identity-type "SystemAssigned" \
  --roles "{\"b24988ac-6180-42a0-ab88-20f7382dd24c\":{}}" \
  --status "Enabled"
```

### Passo 6: O desenvolvedor cria um ambiente

Na prática, para o desenvolvedor, fica assim:

```bash
# Login como desenvolvedor
az login

# Listar templates disponíveis
az devcenter dev environment-definition list \
  --project-name "proj-payments-team" \
  --dev-center-name $DEVCENTER_NAME

# Criar um ambiente
az devcenter dev environment create \
  --name "my-payment-svc" \
  --project-name "proj-payments-team" \
  --dev-center-name $DEVCENTER_NAME \
  --environment-type "dev" \
  --catalog-name "infra-templates" \
  --environment-definition-name "microservice-standard" \
  --parameters '{"serviceName": "payment-svc", "tier": "dev", "enableRedis": true}'
```

Em poucos minutos, o desenvolvedor recebe um ambiente completo com banco de dados, cache, observabilidade configurada e os controles de segurança aplicados automaticamente. Se quiser isolar workloads no AKS compartilhado, adicione também o módulo de namespace mostrado na seção seguinte.

---

## Integrando AKS como runtime compartilhado

Na maioria dos IDPs corporativos, o cluster AKS é compartilhado entre múltiplos times (multi-tenancy). Cada time recebe um namespace isolado com resource quotas e network policies.

### Configuração do cluster AKS para multi-tenancy

```bash
AKS_NAME="aks-platform-shared"

# Criar AKS com workload identity e OIDC
az aks create \
  --name $AKS_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --node-count 3 \
  --node-vm-size Standard_D4ds_v5 \
  --enable-managed-identity \
  --enable-oidc-issuer \
  --enable-workload-identity \
  --enable-azure-monitor-metrics \
  --enable-addons monitoring \
  --network-plugin azure \
  --network-policy calico \
  --tier standard
```

### Template Bicep para namespace isolado

Cada vez que um time cria um ambiente, o template pode incluir um módulo que configura o namespace no AKS:

```bicep
param namespaceName string
param teamName string
param cpuLimit string = '4'
param memoryLimit string = '8Gi'
param maxPods int = 20
param managedIdentityId string

// Esse módulo seria executado via deployment script ou AKS extension
// A identidade atribuída ao script precisa ter permissão para obter credenciais do AKS e aplicar manifests no cluster
resource deploymentScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  name: 'configure-namespace-${namespaceName}'
  location: resourceGroup().location
  kind: 'AzureCLI'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    azCliVersion: '2.60.0'
    retentionInterval: 'P1D'
    scriptContent: $'''
      az aks install-cli
      az aks get-credentials --resource-group ${RG} --name ${AKS}
      
      # Criar namespace
      kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
      
      # Resource Quota
      cat <<EOF | kubectl apply -f -
      apiVersion: v1
      kind: ResourceQuota
      metadata:
        name: ${NAMESPACE}-quota
        namespace: ${NAMESPACE}
      spec:
        hard:
          requests.cpu: "${CPU_LIMIT}"
          requests.memory: "${MEM_LIMIT}"
          limits.cpu: "${CPU_LIMIT}"
          limits.memory: "${MEM_LIMIT}"
          pods: "${MAX_PODS}"
      EOF
      
      # Network Policy: deny all ingress by default
      cat <<EOF | kubectl apply -f -
      apiVersion: networking.k8s.io/v1
      kind: NetworkPolicy
      metadata:
        name: deny-all-ingress
        namespace: ${NAMESPACE}
      spec:
        podSelector: {}
        policyTypes:
        - Ingress
      EOF
      
      # Label para identificação
      kubectl label namespace ${NAMESPACE} team=${TEAM} platform=idp --overwrite
    '''
    environmentVariables: [
      { name: 'RG', value: resourceGroup().name }
      { name: 'AKS', value: 'aks-platform-shared' }
      { name: 'NAMESPACE', value: namespaceName }
      { name: 'CPU_LIMIT', value: cpuLimit }
      { name: 'MEM_LIMIT', value: memoryLimit }
      { name: 'MAX_PODS', value: string(maxPods) }
      { name: 'TEAM', value: teamName }
    ]
  }
}
```

---

## Conclusão da Parte 1

Até aqui, você montou a base de um Internal Developer Platform no Azure: Dev Center, templates Bicep para provisionamento self-service e AKS como runtime compartilhado com multi-tenancy e isolamento por namespace. Com isso, já dá para provisionar ambientes completos em minutos, sem abrir ticket.

Na [Parte 2](/platform-engineering-azure-governanca-observabilidade-seguranca-parte-2/), eu entro em governança com Azure Policy, observabilidade, segurança com Workload Identity e golden paths com GitHub Actions.
