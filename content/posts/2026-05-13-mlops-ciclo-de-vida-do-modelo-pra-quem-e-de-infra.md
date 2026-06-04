---
slug: "mlops-ciclo-de-vida-do-modelo-pra-quem-e-de-infra"
translationKey: "2026/05/30/mlops-model-lifecycle-for-infra-engineers"
aliases:
  - "/posts/mlops-ciclo-de-vida-do-modelo-pra-quem-e-de-infra/"
title: "MLOps: ciclo de vida do modelo pra quem é de infra"
description: "Um data scientist te manda model_final_v2_FIXED.pt e diz 'coloca em produção'. Soa familiar? MLOps é o mesmo CI/CD que você já conhece, aplicado a modelos de ML."
date: 2026-05-13T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - ai
  - infraestrutura
  - azure
  - mlops
  - azure-ml
  - mlflow
  - cicd
  - github-actions
series:
  - "AI para Engenheiros de Infraestrutura"
---

Sexto post da série. No [anterior](/infrastructure-as-code-para-ai-automatizando-gpu-clusters/), automatizamos provisioning de clusters GPU. Agora vamos falar do que acontece **depois** do hardware estar pronto: como um modelo vai de "funciona no meu notebook" pra "roda em produção com SLA".

## O modelo que chegou sem certidão de nascimento

Um data scientist manda uma mensagem no canal do time com um link pra um shared drive: *"Aqui está o modelo. É um checkpoint PyTorch de 15 GB. Precisamos em produção até sexta."*

Você abre a pasta e encontra um único arquivo: `model_final_v2_FIXED.pt`.

Começa a perguntar. Qual versão? Treinado com quais dados? Plano de rollback se as predições derem errado? SLAs de latência e throughput? Qual framework e versão de CUDA? As respostas são vagas. *"É o último. Funciona na minha máquina. Só coloca atrás de uma API."*

Esse filme você já viu antes, só com atores diferentes. Developers costumavam te dar um binário compilado e dizer "deploya isso". Esse caos levou a indústria a construir container registries, pipelines CI/CD, semantic versioning e rollback automatizado. Modelos não são diferentes. São artefatos: grandes, versionados, dependentes de ambiente. Merecem o mesmo lifecycle management.

## Modelos são artefatos: trate como tal

Se você já puxou uma imagem de um container registry, tageou um release no Git, ou promoveu um build de staging pra produção, já entende os conceitos core de model lifecycle.

| Conceito de Infra | Equivalente ML |
|-------------------|----------------|
| Container image | Model checkpoint (arquivo de pesos) |
| Container registry (ACR) | Model registry (Azure ML, MLflow) |
| CI build | Training run |
| CD release pipeline | Model deployment pipeline |
| Dockerfile (build manifest) | Training config (hyperparameters, data version, framework version) |
| Artifact signature | Model provenance e lineage |
| Blue/green deployment | A/B testing com traffic splitting |

Um arquivo de modelo sem metadados é como uma container image sem tag. Você pode deployar, mas não reproduzir, auditar, ou fazer rollback seguro.

## Model registries

O registry é a single source of truth pros modelos da organização. Guarda artefatos com metadados: versão, métricas de training, lineage e status de deployment.

### Azure Machine Learning Model Registry

```bash
# Registrar modelo de arquivo local
az ml model create \
  --name sentiment-classifier \
  --version 3 \
  --path ./outputs/model.pt \
  --type custom_model \
  --tags task=sentiment framework=pytorch \
  --resource-group ml-prod-rg \
  --workspace-name ml-prod-ws

# Listar versões do modelo
az ml model list \
  --name sentiment-classifier \
  --resource-group ml-prod-rg \
  --workspace-name ml-prod-ws \
  --output table

# Ver lineage: qual run produziu esse modelo
az ml model show \
  --name sentiment-classifier \
  --version 3 \
  --resource-group ml-prod-rg \
  --workspace-name ml-prod-ws \
  --query "jobs"
```

### MLflow (open-source, multi-framework)

MLflow é o padrão open-source pra experiment tracking e model management. Framework-agnostic, wrapa PyTorch, TensorFlow, scikit-learn. Azure ML integra nativamente com MLflow.

```bash
# Servidor MLflow local (dev/test)
mlflow server \
  --backend-store-uri sqlite:///mlflow.db \
  --default-artifact-root ./mlruns \
  --host 0.0.0.0 --port 5000

# Registrar modelo via CLI
mlflow models register \
  --model-uri runs:/<run-id>/model \
  --name sentiment-classifier

# Promover pra produção
mlflow models transition-stage \
  --name sentiment-classifier \
  --version 3 \
  --stage Production
```

### Container Registry pra model serving

Quando modelos são servidos via containers (Triton, TorchServe, FastAPI wrapper), a imagem vira o artefato deployável:

```bash
# Build e push do container de serving
az acr build \
  --registry mlmodelsacr \
  --image sentiment-classifier:v3 \
  --file Dockerfile.serve .

# Verificar imagem
az acr repository show-tags \
  --name mlmodelsacr \
  --repository sentiment-classifier \
  --output table
```

### Qual registry usar?

| Critério | Azure ML Registry | MLflow Registry | ACR (Container) |
|----------|-------------------|-----------------|-----------------|
| **Melhor pra** | Times Azure-native | Multi-cloud / OSS | Serving containerizado |
| **Versionamento** | Built-in, imutável | Built-in com stages | Image tags |
| **Lineage tracking** | Profundo (jobs, data, env) | Run-level | Dockerfile only |
| **Infra overhead** | Managed | Self-hosted ou Azure ML | Managed (ACR) |
| **Quando evitar** | Necessidade multi-cloud | Precisa deep Azure integration | Modelos sem containers |

> **Cuidado:** Nunca use shared file systems ou blob storage como "registry". Sem versões imutáveis e APIs de metadata, você acaba com `model_final_v2_FIXED_actually_final.pt`.

## CI/CD pra modelos: o pipeline de promoção

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 320" role="img" aria-labelledby="mlops-pipeline-title mlops-pipeline-desc">
  <title id="mlops-pipeline-title">Pipeline de promoção de modelos</title>
  <desc id="mlops-pipeline-desc">Diagrama com os stages DEV, STAGING e PRODUCTION, mostrando responsabilidades e infraestrutura de cada etapa.</desc>
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
    .neutral { fill:#f5f5f5; stroke:#666666; stroke-width:1.5; }
    .arrow { stroke:#666666; stroke-width:1.5; fill:none; marker-end:url(#arrow); }
    .link { stroke:#666666; stroke-width:1.5; fill:none; }
  </style>

  <g>
    <rect class="primary" x="40" y="30" width="240" height="118" rx="8" />
    <text class="title" x="160" y="56" text-anchor="middle">DEV</text>
    <text class="label" x="60" y="82">Train</text>
    <text class="label" x="60" y="102">Track</text>
    <text class="label" x="60" y="122">Version</text>
    <line class="link" x1="160" y1="148" x2="160" y2="190" />
    <rect class="neutral" x="40" y="190" width="240" height="98" rx="6" />
    <text class="label" x="60" y="213">Infra</text>
    <text class="desc" x="60" y="232">GPU Compute</text>
    <text class="desc" x="60" y="248">Blob Storage</text>
    <text class="desc" x="60" y="264">Experiment Tracking</text>
  </g>

  <g>
    <path class="arrow" d="M 280 89 L 370 89" />
    <rect class="warning" x="370" y="30" width="240" height="118" rx="8" />
    <text class="title" x="490" y="56" text-anchor="middle">STAGING</text>
    <text class="label" x="390" y="82">Validate</text>
    <text class="label" x="390" y="102">Benchmark</text>
    <text class="label" x="390" y="122">Security</text>
    <line class="link" x1="490" y1="148" x2="490" y2="190" />
    <rect class="neutral" x="370" y="190" width="240" height="98" rx="6" />
    <text class="label" x="390" y="213">Infra</text>
    <text class="desc" x="390" y="232">Inference Infra</text>
    <text class="desc" x="390" y="248">Test Data Access</text>
    <text class="desc" x="390" y="264">Isolated Network</text>
  </g>

  <g>
    <path class="arrow" d="M 610 89 L 700 89" />
    <rect class="success" x="700" y="30" width="240" height="118" rx="8" />
    <text class="title" x="820" y="56" text-anchor="middle">PRODUCTION</text>
    <text class="label" x="720" y="82">Serve</text>
    <text class="label" x="720" y="102">Monitor</text>
    <text class="label" x="720" y="122">Auto-rollback</text>
    <line class="link" x1="820" y1="148" x2="820" y2="190" />
    <rect class="neutral" x="700" y="190" width="240" height="98" rx="6" />
    <text class="label" x="720" y="213">Infra</text>
    <text class="desc" x="720" y="228">Load Balanced</text>
    <text class="desc" x="720" y="242">Multi-replica</text>
    <text class="desc" x="720" y="256">Prod Network</text>
    <text class="desc" x="720" y="270">SLA-bound</text>
  </g>
</svg>

### Validation gates entre stages

| Gate | O que verifica | Infra necessária |
|------|---------------|-----------------|
| **Accuracy threshold** | Métricas ≥ baseline (ex: F1 > 0.92) | Storage de test dataset, compute pra avaliação |
| **Latency benchmark** | P95 ≤ SLA (ex: < 200ms) | Infra de load testing |
| **Throughput test** | Requests/sec ≥ target sob carga | Load generator (k6, Locust) |
| **Security scan** | Sem deps vulneráveis, artefato assinado | Container scanning (Defender) |
| **Cost estimate** | Custo projetado dentro do budget | Cost modeling baseado no SKU |

### GitHub Actions workflow pra deploy de modelo

```yaml
name: Model Deployment Pipeline

on:
  workflow_dispatch:
    inputs:
      model_name:
        description: 'Model name in registry'
        required: true
      model_version:
        description: 'Model version to deploy'
        required: true

env:
  AZURE_RG: ml-prod-rg
  AZURE_ML_WS: ml-prod-ws

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Download model from registry
        run: |
          az ml model download \
            --name ${{ inputs.model_name }} \
            --version ${{ inputs.model_version }} \
            --download-path ./model \
            --resource-group ${{ env.AZURE_RG }} \
            --workspace-name ${{ env.AZURE_ML_WS }}
      - name: Run accuracy validation
        run: |
          python scripts/validate_model.py \
            --model-path ./model \
            --test-data ./data/holdout.csv \
            --min-accuracy 0.92

  deploy-staging:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging endpoint
        run: |
          az ml online-deployment create \
            --name staging-${{ inputs.model_version }} \
            --endpoint-name sentiment-staging \
            --model azureml:${{ inputs.model_name }}:${{ inputs.model_version }} \
            --instance-type Standard_NC4as_T4_v3 \
            --instance-count 1 \
            --resource-group ${{ env.AZURE_RG }} \
            --workspace-name ${{ env.AZURE_ML_WS }}

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy canary (10% traffic)
        run: |
          az ml online-deployment create \
            --name prod-${{ inputs.model_version }} \
            --endpoint-name sentiment-prod \
            --model azureml:${{ inputs.model_name }}:${{ inputs.model_version }} \
            --instance-type Standard_NC4as_T4_v3 \
            --instance-count 2 \
            --resource-group ${{ env.AZURE_RG }} \
            --workspace-name ${{ env.AZURE_ML_WS }}

          az ml online-endpoint update \
            --name sentiment-prod \
            --traffic "prod-stable=90 prod-${{ inputs.model_version }}=10" \
            --resource-group ${{ env.AZURE_RG }} \
            --workspace-name ${{ env.AZURE_ML_WS }}
```

**Tradução infra ↔ AI:** Isso é seu pipeline blue/green, mas pra model weights ao invés de container images. A flag `--traffic` funciona exatamente como weighted routing no Azure Front Door: você shifta percentual de requests pro novo modelo enquanto o antigo continua servindo.

## Suas responsabilidades em cada stage

Como engenheiro de infra, seu ownership cobre o pipeline todo:

- **Compute provisioning**: GPU node pools pra training (Dev), VMs de inference pra validação (Staging), clusters GPU com autoscaling pra serving (Prod)
- **Networking**: VNets isoladas pra staging, private endpoints pro model registry, load balancer pra traffic splitting
- **Storage**: High-throughput blob pra dados de training, low-latency pra model artifacts, retention policies pra versões antigas
- **Secrets management**: Key Vault pra API keys, managed identity pra auth do pipeline, RBAC pro model registry
- **Monitoring**: Dashboards de deployment health, alerting de latência, triggers de rollback automatizado

## Traffic splitting: canary e blue/green pra modelos

Deploying um modelo não é evento binário. Você shifta tráfego gradualmente:

| Padrão | Como funciona | Quando usar |
|--------|--------------|-------------|
| **Canary** | 5-10% do tráfego pro novo modelo, aumenta gradualmente | Default pra a maioria dos deployments |
| **Blue/Green** | Ambiente completo paralelo, switch instantâneo | Quando precisa rollback instantâneo |
| **Shadow** | Novo modelo recebe tráfego real mas respostas são descartadas | Quando quer testar sem impactar usuários |

```bash
# Promover canary pra 100% após validação
az ml online-endpoint update \
  --name sentiment-prod \
  --traffic "prod-v3=100" \
  --resource-group ml-prod-rg \
  --workspace-name ml-prod-ws
```

## No próximo post

Agora que modelos estão deployados e servindo tráfego, como saber se estão saudáveis? No próximo post: **monitoramento e observabilidade pra AI**, incluindo model drift, GPU metrics, e como detectar degradação antes que o usuário perceba.
