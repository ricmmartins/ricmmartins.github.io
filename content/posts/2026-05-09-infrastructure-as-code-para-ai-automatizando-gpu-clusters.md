---
slug: "infrastructure-as-code-para-ai-automatizando-gpu-clusters"
translationKey: "2026/05/26/infrastructure-as-code-for-ai-automating-gpu-clusters"
aliases:
  - "/posts/infrastructure-as-code-para-ai-automatizando-gpu-clusters/"
title: "Infrastructure as Code para AI: automatizando GPU clusters"
description: "Um typo no SKU de VM custou $4.000 em três dias. IaC não é nice-to-have pra infra de AI. É sobrevivência. Terraform, Bicep e CI/CD pra clusters GPU."
date: 2026-05-09T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - ai
  - infraestrutura
  - azure
  - terraform
  - bicep
  - iac
  - aks
  - github-actions
series:
  - "AI para Engenheiros de Infraestrutura"
---

Quinto post da série. No [anterior](/gpu-deep-dive-o-que-acontece-dentro-do-silicio/), mergulhamos dentro da GPU. Agora vamos automatizar tudo ao redor dela. Porque entender GPUs é metade da batalha; provisionar elas de forma consistente e em escala é onde engenharia de infraestrutura realmente encontra AI.

## O typo de $4.000

Comecei a semana com uma vitória. Provisionei um cluster GPU manualmente em East US 2 pra um experimento de ML: AKS com node pool `Standard_NC6s_v3`, accelerated networking, drivers NVIDIA, taints corretos. Levou quase um dia, mas funcionou.

Três semanas depois, o mesmo time precisa do setup idêntico em West US 3. Sem problema, pensei. Abri o portal, referenciando um Slack thread pro SKU, uma wiki pra config de rede, e minha memória pro resto.

Alguém digitou errado o SKU. Ao invés de `Standard_NC6s_v3` (VM GPU a ~$3.80/hr), o node pool ficou rodando `Standard_D16s_v5`, uma VM CPU sem GPU nenhuma. O training job lançou, não achou CUDA device, fez fallback pra CPU. Ninguém percebeu por três dias porque o job não falhou, só rodou devagar. Quando alguém checou, o cluster tinha queimado **$4.000** em compute que nem conseguia fazer o que precisava.

Foi a última vez que provisionei infra de AI manualmente.

## Por que IaC é não-negociável pra AI

Infra de aplicações web tradicionais é tolerante. Um App Service mal configurado custa uns $50/mês extra. Um cluster GPU mal configurado custa **milhares por dia**.

| Razão | Por que importa pra AI |
|-------|----------------------|
| **Complexidade** | Quotas GPU por região, driver versions, taints, InfiniBand, NVMe ephemeral, private endpoints. Nenhum humano segura tudo na cabeça |
| **Custo** | ND A100 4-nodes = ~$350/dia. Cada minuto de misconfiguration é dinheiro queimando |
| **Reprodutibilidade** | ML experiments precisam ser repetíveis. Mesmo SKU, driver, topologia de rede |
| **Compliance** | Quem mudou o que, quando, por quê. Git dá audit trail de graça |

**Tradução infra ↔ AI:** Quando o ML engineer diz "preciso do mesmo ambiente da semana passada", ele quer reprodutibilidade de infra. Quando compliance pergunta "o que mudou", quer audit trail. IaC responde ambos com o mesmo artefato: um arquivo de configuração versionado.

## Landscape de IaC pra AI

| Critério | Terraform | Bicep | Azure CLI | Pulumi |
|----------|-----------|-------|-----------|--------|
| **Paradigma** | Declarativo | Declarativo | Imperativo | Declarativo (code) |
| **Multi-cloud** | ✅ | ❌ Azure only | ❌ Azure only | ✅ |
| **State management** | Remote state file | Nenhum (ARM gerencia) | Nenhum | Remote state file |
| **Linguagem** | HCL | Bicep DSL | Bash/PowerShell | Python, TS, Go, C# |
| **Learning curve** | Moderada | Baixa (Azure users) | Baixa | Moderada-Alta |
| **Melhor pra** | Plataformas multi-cloud | Times Azure-native | Automação rápida, glue | Times developer-first |

**Quando usar cada:** Terraform quando precisa multi-cloud ou platform engineering em escala. Bicep quando é 100% Azure e quer o caminho mais simples. Azure CLI pra glue, prototyping e operações ad-hoc. Muitos times usam mais de um: Terraform/Bicep pra provisioning, Azure CLI pra operações, GitHub Actions pra orquestrar tudo.

## Terraform pra infra de AI

### Variables com validação (previne typos)

```hcl
variable "gpu_vm_size" {
  description = "VM SKU for GPU node pool"
  type        = string
  default     = "Standard_NC6s_v3"

  validation {
    condition     = can(regex("^Standard_N", var.gpu_vm_size))
    error_message = "GPU VM size must be an N-series SKU (e.g., Standard_NC6s_v3, Standard_NC24ads_A100_v4)."
  }
}

variable "gpu_max_nodes" {
  description = "Maximum number of GPU nodes for autoscaling"
  type        = number
  default     = 5
}
```

Aquela `validation` não é decorativa. Ela previne exatamente o erro da história de abertura. Pego no `terraform plan`, não na fatura.

### AKS com GPU node pool

```hcl
resource "azurerm_kubernetes_cluster" "ai" {
  name                = "aks-ai-${var.environment}"
  location            = azurerm_resource_group.ai.location
  resource_group_name = azurerm_resource_group.ai.name
  dns_prefix          = "aks-ai-${var.environment}"
  kubernetes_version  = "1.30"

  default_node_pool {
    name            = "system"
    vm_size         = "Standard_D4s_v5"
    node_count      = 2
    os_disk_size_gb = 128

    upgrade_settings {
      max_surge = "33%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin = "azure"
    network_policy = "calico"
  }
}

resource "azurerm_kubernetes_cluster_node_pool" "gpu" {
  name                  = "gpu"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.ai.id
  vm_size               = var.gpu_vm_size
  mode                  = "User"
  os_disk_size_gb       = 256
  auto_scaling_enabled  = true
  min_count             = 0
  max_count             = var.gpu_max_nodes

  node_taints = [
    "sku=gpu:NoSchedule"
  ]

  node_labels = {
    "hardware" = "gpu"
    "gpu-type" = "nvidia"
    "workload" = "ai"
  }
}
```

O taint `sku=gpu:NoSchedule` é essencial. Sem ele, Kubernetes coloca monitoring DaemonSets e log collectors nos seus nós GPU de $3.80/hr.

### Remote state (obrigatório)

Nunca guarde state de Terraform localmente pra infra GPU. State corrompido ou perdido = Terraform não consegue rastrear ou destruir recursos que custam dinheiro real a cada hora.

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate"
    container_name       = "tfstate"
    key                  = "ai-platform.terraform.tfstate"
  }
}
```

Setup do storage (uma vez):

```bash
az group create --name rg-terraform-state --location eastus2

az storage account create \
  --name stterraformstate \
  --resource-group rg-terraform-state \
  --sku Standard_LRS \
  --encryption-services blob

az storage container create \
  --name tfstate \
  --account-name stterraformstate
```

## Bicep pra infra de AI

Vantagem do Bicep: sem state file, sem backend, sem locking. ARM gerencia tudo. Pra times 100% Azure, remove uma categoria inteira de complexidade operacional.

### GPU VM com NVIDIA Driver Extension

```bicep
@allowed([
  'Standard_NC6s_v3'
  'Standard_NC12s_v3'
  'Standard_NC24ads_A100_v4'
  'Standard_NC48ads_A100_v4'
  'Standard_NC96ads_A100_v4'
])
@description('GPU VM size — must be an N-series SKU')
param vmSize string = 'Standard_NC6s_v3'

param vmName string = 'vm-gpu-ai'
param location string = resourceGroup().location
param adminUsername string = 'azureuser'

@secure()
param sshPublicKey string

resource vm 'Microsoft.Compute/virtualMachines@2024-07-01' = {
  name: vmName
  location: location
  properties: {
    hardwareProfile: { vmSize: vmSize }
    osProfile: {
      computerName: vmName
      adminUsername: adminUsername
      linuxConfiguration: {
        disablePasswordAuthentication: true
        ssh: {
          publicKeys: [{
            path: '/home/${adminUsername}/.ssh/authorized_keys'
            keyData: sshPublicKey
          }]
        }
      }
    }
    storageProfile: {
      imageReference: {
        publisher: 'Canonical'
        offer: '0001-com-ubuntu-server-jammy'
        sku: '22_04-lts-gen2'
        version: 'latest'
      }
      osDisk: {
        createOption: 'FromImage'
        managedDisk: { storageAccountType: 'Premium_LRS' }
        diskSizeGB: 256
      }
    }
    networkProfile: {
      networkInterfaces: [{ id: nic.id }]
    }
  }
}

resource nvidiaExtension 'Microsoft.Compute/virtualMachines/extensions@2024-07-01' = {
  parent: vm
  name: 'NvidiaGpuDriverLinux'
  location: location
  properties: {
    publisher: 'Microsoft.HpcCompute'
    type: 'NvidiaGpuDriverLinux'
    typeHandlerVersion: '1.9'
    autoUpgradeMinorVersion: true
  }
}
```

O decorator `@allowed` serve o mesmo propósito da `validation` do Terraform: previne SKUs não-GPU no deploy.

### Estrutura modular pra produção

```
infra/
├── main.bicep              # Orquestrador
├── modules/
│   ├── network.bicep       # VNet, subnets, NSGs, private endpoints
│   ├── aks.bicep           # AKS cluster com GPU node pool
│   ├── storage.bicep       # Storage account pra modelos e dados
│   ├── monitoring.bicep    # Log Analytics, alerts, dashboards
│   └── keyvault.bicep      # Key Vault pra secrets
└── parameters/
    ├── dev.bicepparam
    ├── staging.bicepparam
    └── prod.bicepparam
```

Um time novo sobe um ambiente completo e compliant criando um único arquivo de parâmetros.

## CI/CD: plan → approve → apply

Mudanças de infra de AI nunca devem ser aplicadas de um laptop. A pipeline dá gates de review, validação automatizada e audit trail.

### GitHub Actions com OIDC

```yaml
name: "AI Infrastructure — Plan & Apply"

on:
  push:
    branches: [main]
    paths: ["infra/**"]
  pull_request:
    branches: [main]
    paths: ["infra/**"]

permissions:
  id-token: write
  contents: read
  pull-requests: write

env:
  ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
  ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
  ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

jobs:
  plan:
    name: "Terraform Plan"
    runs-on: ubuntu-latest
    environment: ai-infrastructure
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.9.0"
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - run: terraform init
        working-directory: infra
      - run: terraform plan -out=tfplan -input=false
        working-directory: infra

  apply:
    name: "Terraform Apply"
    runs-on: ubuntu-latest
    needs: plan
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: ai-infrastructure-prod
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.9.0"
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - run: terraform init
        working-directory: infra
      - run: terraform apply -auto-approve tfplan
        working-directory: infra
```

O fluxo: PR = `plan` only (mostra o que vai mudar). Merge em main = `apply` com environment protection rule (reviewer precisa aprovar). Artefato do plan é o que executa, sem drift entre review e execução.

**Sempre fixe versões de actions.** `@v4`, `@v3`, `@v2`. Usar `@latest` em pipelines de produção significa que uma breaking change upstream pode derrubar seu deploy quando você mais precisa.

## Governance: guardrails pra GPU

Azure Policy pode enforçar regras no nível de subscription. Pra infra de AI, a policy mais impactante: bloquear provisionamento de VMs GPU sem tag `cost-center`:

```json
{
  "mode": "All",
  "policyRule": {
    "if": {
      "allOf": [
        {
          "field": "type",
          "equals": "Microsoft.Compute/virtualMachines"
        },
        {
          "field": "Microsoft.Compute/virtualMachines/sku.name",
          "in": [
            "Standard_NC24ads_A100_v4",
            "Standard_NC48ads_A100_v4",
            "Standard_ND96asr_v4"
          ]
        },
        {
          "field": "tags['cost-center']",
          "exists": "false"
        }
      ]
    },
    "then": {
      "effect": "deny"
    }
  }
}
```

Sem tag de cost center = sem GPU. Simples e efetivo.

## No próximo post

Agora que a infra está automatizada e governada, vamos falar do ciclo de vida do modelo: **MLOps**. Como um modelo vai de "funciona no meu notebook" pra "roda em produção com SLA". O que muda pra quem é de infra, e o que o time de ML espera de você nesse processo.
