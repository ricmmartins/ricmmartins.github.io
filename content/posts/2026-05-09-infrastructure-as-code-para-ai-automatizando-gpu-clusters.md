---
slug: "infrastructure-as-code-para-ai-automatizando-gpu-clusters"
translationKey: "2026/05/26/infrastructure-as-code-for-ai-automating-gpu-clusters"
aliases:
  - "/posts/infrastructure-as-code-para-ai-automatizando-gpu-clusters/"
title: "Infrastructure as Code para AI: automatizando GPU clusters"
description: "Um typo no SKU de VM pode custar $4.000 em três dias. IaC não é nice-to-have pra infra de AI. É sobrevivência. Terraform, Bicep e CI/CD pra clusters GPU."
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

Quinto post da série. No [anterior](/gpu-deep-dive-o-que-acontece-dentro-do-silicio/), entramos no detalhe da GPU. Agora é hora de automatizar o que fica ao redor dela. Entender GPU é metade do trabalho. Provisionar tudo isso de forma consistente, repetível e auditável é a outra metade.

## O typo de $4.000

Imagina o cenário: você provisiona um cluster GPU manualmente em East US 2 pra um experimento de ML. AKS com node pool `Standard_NC6s_v3`, accelerated networking, drivers NVIDIA, taints corretos. Leva quase um dia, mas funciona.

Três semanas depois, o mesmo time precisa do setup idêntico em West US 3. Você abre o portal, volta em thread de Slack, consulta uma wiki e tenta completar o resto de cabeça.

Alguém digita o SKU errado. No lugar de `Standard_NC6s_v3`, o pool sobe com **18 nós `Standard_D64s_v5`**. O job tenta rodar, não acha CUDA e cai pra CPU. Como nada falha de forma óbvia, o time percebe tarde. Três dias depois, a conta passa de **$4.000** em compute CPU que nem servia pro workload.

Esse tipo de cena é mais comum do que parece. E é exatamente o tipo de prejuízo que IaC evita.

## Por que IaC é não-negociável pra AI

Infra de aplicação web tradicional tolera erro barato. Infra de AI, não. Uma configuração ruim num App Service machuca pouco. Um cluster GPU ou um pool CPU superdimensionado no lugar errado machuca rápido.

| Razão | Por que importa pra AI |
|-------|------------------------|
| **Complexidade** | Quotas GPU por região, versões de driver, taints, InfiniBand, NVMe ephemeral, private endpoints. Ninguém segura isso tudo na cabeça |
| **Custo** | 4 nós `NC24ads_A100_v4` passam de ~$350 por dia. 4 nós `ND96asr_v4` passam de $2.600 por dia |
| **Reprodutibilidade** | ML experiments precisam ser repetíveis. Mesmo SKU, driver e topologia de rede |
| **Compliance** | Quem mudou o quê, quando e por quê. Git já entrega esse trilho de auditoria |

**Tradução infra ↔ AI:** quando o ML engineer diz "preciso do mesmo ambiente da semana passada", ele está pedindo reprodutibilidade de infra. Quando compliance pergunta "o que mudou", está pedindo audit trail. IaC responde os dois com o mesmo artefato: código versionado.

## Landscape de IaC pra AI

| Critério | Terraform | Bicep | Azure CLI | Pulumi |
|----------|-----------|-------|-----------|--------|
| **Paradigma** | Declarativo | Declarativo | Imperativo | Declarativo (code) |
| **Multi-cloud** | Sim | Não, só Azure | Não, só Azure | Sim |
| **State management** | Remote state file | Nenhum (ARM gerencia) | Nenhum | Remote state file |
| **Linguagem** | HCL | Bicep DSL | Bash/PowerShell | Python, TS, Go, C# |
| **Learning curve** | Moderada | Baixa (times Azure-native) | Baixa | Moderada-Alta |
| **Melhor pra** | Plataformas multi-cloud | Times 100% Azure | Automação rápida, glue | Times developer-first |

**Quando usar cada um:** Terraform quando você precisa de multi-cloud ou platform engineering em escala. Bicep quando é 100% Azure e você quer o caminho mais curto. Azure CLI pra glue, prototipagem e operação ad-hoc. Em muita empresa, tudo isso convive bem: Terraform ou Bicep pro provisioning, Azure CLI pra operações e GitHub Actions pra orquestrar.

## Terraform pra infra de AI

### Variables com validação (previne typo)

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

Essa `validation` não está ali de enfeite. Ela pega o erro no `terraform plan`, quando ainda é barato corrigir.

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

O taint `sku=gpu:NoSchedule` é o tipo de detalhe que salva dinheiro. Sem ele, DaemonSet de monitoramento, agente de log e workload sem GPU acabam pousando nos nós mais caros do cluster.

### Remote state (obrigatório)

Nunca guarde state de Terraform localmente quando está lidando com infra cara. Se você perder o state, perde também o mapa do que precisa destruir ou reconciliar.

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

Setup do storage, uma vez:

```bash
az group create --name rg-terraform-state --location eastus2

az storage account create \
  --name stterraformstate \
  --resource-group rg-terraform-state \
  --sku Standard_LRS \
  --encryption-services blob

az storage container create \
  --name tfstate \
  --account-name stterraformstate \
  --auth-mode login
```

## Bicep pra infra de AI

A grande vantagem do Bicep é simples: sem state file, sem backend, sem locking. O ARM cuida disso. Pra time 100% Azure, isso tira uma categoria inteira de preocupação operacional.

### GPU VM com NVIDIA Driver Extension

No exemplo abaixo, eu assumo que VNet, subnet e NIC já vieram de um módulo de rede e que a NIC existe quando esse arquivo roda.

```bicep
@allowed([
  'Standard_NC6s_v3'
  'Standard_NC12s_v3'
  'Standard_NC24ads_A100_v4'
  'Standard_NC48ads_A100_v4'
  'Standard_NC96ads_A100_v4'
])
@description('GPU VM size: must be an N-series SKU')
param vmSize string = 'Standard_NC6s_v3'

param vmName string = 'vm-gpu-ai'
param nicName string = 'nic-gpu-ai'
param location string = resourceGroup().location
param adminUsername string = 'azureuser'
param sshPublicKey string

resource nic 'Microsoft.Network/networkInterfaces@2024-05-01' existing = {
  name: nicName
}

resource vm 'Microsoft.Compute/virtualMachines@2024-07-01' = {
  name: vmName
  location: location
  properties: {
    hardwareProfile: {
      vmSize: vmSize
    }
    osProfile: {
      computerName: vmName
      adminUsername: adminUsername
      linuxConfiguration: {
        disablePasswordAuthentication: true
        ssh: {
          publicKeys: [
            {
              path: '/home/${adminUsername}/.ssh/authorized_keys'
              keyData: sshPublicKey
            }
          ]
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
        managedDisk: {
          storageAccountType: 'Premium_LRS'
        }
        diskSizeGB: 256
      }
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: nic.id
        }
      ]
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

O decorator `@allowed` cumpre o mesmo papel da `validation` do Terraform: barra SKU errado antes de você descobrir o erro no faturamento.

### Estrutura modular pra produção

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1175 430" role="img" aria-labelledby="infra-structure-title infra-structure-desc">
<title id="infra-structure-title">Estrutura modular pra produção</title>
<desc id="infra-structure-desc">Diagrama da pasta infra com o arquivo main.bicep, a pasta modules e a pasta parameters.</desc>
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
</marker>
</defs>
<style>
.title { font-family:"Segoe UI", Arial, sans-serif; font-size:14px; font-weight:bold; fill:#222; }
.label { font-family:"Segoe UI", Arial, sans-serif; font-size:12px; font-weight:bold; fill:#222; }
.desc { font-family:"Segoe UI", Arial, sans-serif; font-size:10px; fill:#555; }
.primary { fill:#dae8fc; stroke:#6c8ebf; stroke-width:1.5; }
.success { fill:#d5e8d4; stroke:#82b366; stroke-width:1.5; }
.warning { fill:#fff2cc; stroke:#d6b656; stroke-width:1.5; }
.accent { fill:#e1d5e7; stroke:#9673a6; stroke-width:1.5; }
.neutral { fill:#f5f5f5; stroke:#666666; stroke-width:1.5; }
.line { stroke:#666666; stroke-width:1.5; fill:none; marker-end:url(#arrow); }
</style>
<g>
<rect class="primary" x="380" y="24" width="200" height="56" rx="8" />
<text class="title" x="480" y="56" text-anchor="middle">infra/</text>
</g>
<g>
<path class="line" d="M 386.8 81.8 L 261.8 121.8" />
<rect class="neutral" x="40" y="120" width="230" height="72" rx="6" />
<text class="label" x="155" y="152.5" text-anchor="middle">main.bicep</text>
<text class="desc" x="155" y="167.5" text-anchor="middle">Orquestrador</text>
</g>
<g>
<path class="line" d="M 480 80 L 470 100" />
<rect class="accent" x="310" y="100" width="320" height="330" rx="8" />
<text class="title" x="330" y="126">modules/</text>
<rect class="neutral" x="335" y="145" width="270" height="38" rx="6" />
<text class="label" x="470" y="160.5" text-anchor="middle">network.bicep</text>
<text class="desc" x="470" y="175.5" text-anchor="middle">VNet, subnets, NSGs, private endpoints</text>
<rect class="neutral" x="335" y="203" width="270" height="38" rx="6" />
<text class="label" x="470" y="218.5" text-anchor="middle">aks.bicep</text>
<text class="desc" x="470" y="233.5" text-anchor="middle">AKS cluster com GPU node pool</text>
<rect class="neutral" x="335" y="261" width="270" height="38" rx="6" />
<text class="label" x="470" y="276.5" text-anchor="middle">storage.bicep</text>
<text class="desc" x="470" y="291.5" text-anchor="middle">Storage account pra modelos e dados</text>
<rect class="neutral" x="335" y="319" width="270" height="38" rx="6" />
<text class="label" x="470" y="334.5" text-anchor="middle">monitoring.bicep</text>
<text class="desc" x="470" y="349.5" text-anchor="middle">Log Analytics, alerts, dashboards</text>
<rect class="neutral" x="335" y="377" width="270" height="38" rx="6" />
<text class="label" x="470" y="392.5" text-anchor="middle">keyvault.bicep</text>
<text class="desc" x="470" y="407.5" text-anchor="middle">Key Vault pra secrets</text>
</g>
<g>
<path class="line" d="M 490 80 L 795 120" />
<rect class="warning" x="670" y="120" width="250" height="200" rx="8" />
<text class="title" x="690" y="146">parameters/</text>
<rect class="success" x="690" y="165" width="210" height="34" rx="6" />
<text class="label" x="795" y="186" text-anchor="middle">dev.bicepparam</text>
<rect class="success" x="690" y="219" width="210" height="34" rx="6" />
<text class="label" x="795" y="240" text-anchor="middle">staging.bicepparam</text>
<rect class="success" x="690" y="273" width="210" height="34" rx="6" />
<text class="label" x="795" y="294" text-anchor="middle">prod.bicepparam</text>
</g>
</svg>

Um time novo consegue subir um ambiente inteiro, com padrão e compliance, mexendo só num arquivo de parâmetros.

## CI/CD: plan -> approve -> apply

Mudança de infra de AI não deveria sair do laptop de ninguém direto pra produção. Pipeline serve justamente pra pôr validação, revisão e trilha de auditoria no caminho.

### GitHub Actions com OIDC

```yaml
name: "AI Infrastructure: Plan & Apply"

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
      - uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: infra/tfplan

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
      - uses: actions/download-artifact@v4
        with:
          name: tfplan
          path: infra
      - run: terraform init
        working-directory: infra
      - run: terraform apply -input=false -auto-approve tfplan
        working-directory: infra
```

O fluxo é simples: PR gera `plan`. Merge em `main` dispara `apply`, mas só depois da proteção de environment e do artifact do plan atravessarem o pipeline. Assim o que foi revisado é exatamente o que será aplicado.

**Sempre fixe versões de actions.** `@v4`, `@v3`, `@v2`. Usar `@latest` em pipeline de produção é pedir surpresa ruim no pior dia possível.

## Governance: guardrails pra GPU

Azure Policy pode enforçar regra no nível da subscription. Pra infra de AI, uma policy simples e útil é barrar VM GPU sem tag `cost-center`:

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
          "field": "Microsoft.Compute/virtualMachines/hardwareProfile.vmSize",
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

Sem tag de cost center, sem GPU. Parece rígido. Na prática, é o tipo de rigidez que evita o cluster esquecido de sexta-feira.

## No próximo post

Agora que a infra está automatizada e governada, o próximo passo é falar do ciclo de vida do modelo: **MLOps**. Como um modelo sai de "funciona no meu notebook" pra "roda em produção com SLA". O que muda pra quem é de infra, e o que o time de ML espera de você nesse processo.
