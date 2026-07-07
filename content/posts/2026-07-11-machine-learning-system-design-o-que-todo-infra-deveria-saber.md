---
slug: "machine-learning-system-design-o-que-todo-infra-deveria-saber"
aliases:
  - "/posts/machine-learning-system-design-o-que-todo-infra-deveria-saber/"
title: "Machine learning system design: o que todo infra deveria saber"
description: "Feature stores, model serving, A/B testing, data pipelines. A arquitetura completa de um sistema de ML em produção, traduzida pra quem já monta sistemas distribuídos."
date: 2026-07-11T10:00:00-04:00
categories:
  - AI
  - Arquitetura
tags:
  - ai-engineering
  - ml-system-design
  - mlops
  - arquitetura
series:
  - "AI por dentro: de tokens a agents"
---

O time de ML treinou um modelo que funciona no notebook. Accuracy de 94%. Todo mundo comemora. Aí vem a parte menos glamourosa: colocar isso em produção.

"Dá pra colocar isso numa API com 99.9% de uptime, latência < 200ms e 10K requests por segundo?"

É aqui que system design de ML cai no colo de infra. A boa notícia é que a maior parte do problema parece familiar. Serving, rollout, observabilidade e capacity planning continuam sendo trabalho de sistema distribuído. O pedaço realmente diferente existe, mas é menor do que o hype sugere.

## O mapa pro profissional de infra

| Conceito ML System | O que faz | Equivalente em infra |
|-------------------|-----------|---------------------|
| **Feature store** | Cache/storage de dados processados pro modelo | Redis/cache layer |
| **Model registry** | Versionamento de modelos treinados | Container registry (ACR) |
| **Model serving** | API que serve predições | App server (deployment de API) |
| **Training pipeline** | Processo de treinar o modelo | CI/CD pipeline |
| **Inference pipeline** | Fluxo de dados pra predição online | Request pipeline (middleware chain) |
| **A/B testing** | Comparar versões do modelo | Canary deployment |
| **Data drift** | Dados de produção mudando vs treinamento | Configuration drift |
| **Feature engineering** | Transformar dados brutos em inputs pro modelo | ETL / data transformation |

## A arquitetura de referência

Um sistema de ML em produção tem mais componentes do que parece:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 990 564" width="100%" style="max-width:920px;height:auto" role="img" aria-labelledby="ml-system-architecture-title ml-system-architecture-desc">
<title id="ml-system-architecture-title">Arquitetura de referência de um sistema de ML em produção</title>
<desc id="ml-system-architecture-desc">Diagrama com três camadas: offline training, online serving e monitoring.</desc>
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
</marker>
</defs>
<g id="offline-training">
<rect x="20" y="20" width="922" height="170" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="460" y="45" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="bold" fill="#1a3a5c">OFFLINE (Training)</text>
<g id="offline-flow" fill="none" stroke="#666666" stroke-width="2" marker-end="url(#arrow)">
<line x1="178" y1="109" x2="218" y2="109" />
<line x1="378" y1="109" x2="408" y2="109" />
<line x1="548" y1="109" x2="578" y2="109" />
<line x1="698" y1="109" x2="728" y2="109" />
</g>
<g id="offline-nodes" font-family="Segoe UI, Arial, sans-serif">
<g>
<rect x="40" y="70" width="132" height="78" rx="6" fill="#f5f5f5" stroke="#666666" />
<text x="106" y="98" text-anchor="middle" font-size="12" font-weight="bold" fill="#333333">Data Sources</text>
<text x="106" y="113" text-anchor="middle" font-size="10" fill="#555">(SQL, Blob,</text>
<text x="106" y="128" text-anchor="middle" font-size="10" fill="#555">Events)</text>
</g>
<g>
<rect x="212" y="70" width="160" height="78" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="292" y="105.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">ETL/Feature Eng</text>
<text x="292" y="120.5" text-anchor="middle" font-size="10" fill="#555">(Spark, DBX)</text>
</g>
<g>
<rect x="402" y="70" width="140" height="78" rx="6" fill="#fff2cc" stroke="#d6b656" />
<text x="472" y="105.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">Feature Store</text>
<text x="472" y="120.5" text-anchor="middle" font-size="10" fill="#555">(Redis, SQL)</text>
</g>
<g>
<rect x="572" y="70" width="120" height="78" rx="6" fill="#d5e8d4" stroke="#82b366" />
<text x="632" y="105.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Training</text>
<text x="632" y="120.5" text-anchor="middle" font-size="10" fill="#555">(GPU)</text>
</g>
<g>
<rect x="722" y="70" width="190" height="78" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="817" y="105.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">Model Registry</text>
<text x="817" y="120.5" text-anchor="middle" font-size="10" fill="#555">Versionamento e artifacts</text>
</g>
</g>
</g>
<g id="online-serving">
<rect x="20" y="210" width="940" height="324" rx="8" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" />
<text x="460" y="235" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="bold" fill="#1a3a5c">ONLINE (Serving)</text>
<g id="online-flow" fill="none" stroke="#666666" stroke-width="2" marker-end="url(#arrow)">
<line x1="146" y1="308" x2="178" y2="308" />
<line x1="308" y1="308" x2="338" y2="308" />
<line x1="488" y1="308" x2="518" y2="308" />
<line x1="648" y1="308" x2="678" y2="308" />
<line x1="796" y1="308" x2="826" y2="308" />
</g>
<g id="online-nodes" font-family="Segoe UI, Arial, sans-serif">
<g>
<rect x="40" y="268" width="100" height="80" rx="6" fill="#f5f5f5" stroke="#666666" />
<text x="90" y="297" text-anchor="middle" font-size="12" font-weight="bold" fill="#333333">Request</text>
<text x="90" y="312" text-anchor="middle" font-size="10" fill="#555">Entrada</text>
<text x="90" y="327" text-anchor="middle" font-size="10" fill="#555">HTTP/API</text>
</g>
<g>
<rect x="172" y="268" width="130" height="80" rx="6" fill="#fff2cc" stroke="#d6b656" />
<text x="237" y="297" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">Feature</text>
<text x="237" y="312" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">Retrieval</text>
<text x="237" y="327" text-anchor="middle" font-size="10" fill="#555">(feature store)</text>
</g>
<g>
<rect x="332" y="268" width="150" height="80" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
<text x="407" y="297" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Pre-processing</text>
<text x="407" y="312" text-anchor="middle" font-size="10" fill="#555">(normalize,</text>
<text x="407" y="327" text-anchor="middle" font-size="10" fill="#555">encode)</text>
</g>
<g>
<rect x="512" y="268" width="130" height="80" rx="6" fill="#d5e8d4" stroke="#82b366" />
<text x="577" y="304.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Model Server</text>
<text x="577" y="319.5" text-anchor="middle" font-size="10" fill="#555">(GPU/CPU)</text>
</g>
<g>
<rect x="672" y="268" width="118" height="80" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<text x="731" y="297" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">Post-proc</text>
<text x="731" y="312" text-anchor="middle" font-size="10" fill="#555">(threshold,</text>
<text x="731" y="327" text-anchor="middle" font-size="10" fill="#555">format)</text>
</g>
<g>
<rect x="820" y="268" width="110" height="80" rx="6" fill="#f5f5f5" stroke="#666666" />
<text x="875" y="304.5" text-anchor="middle" font-size="12" font-weight="bold" fill="#333333">Response</text>
<text x="875" y="319.5" text-anchor="middle" font-size="10" fill="#555">Saída final</text>
</g>
</g>
</g>
<g id="monitoring">
<rect x="20" y="420" width="926" height="114" rx="8" fill="#f5f5f5" stroke="#666666" stroke-width="2" />
<text x="460" y="445" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="bold" fill="#333333">MONITORING</text>
<g font-family="Segoe UI, Arial, sans-serif">
<rect x="48" y="470" width="146" height="34" rx="6" fill="#dae8fc" stroke="#6c8ebf" />
<rect x="224" y="470" width="146" height="34" rx="6" fill="#d5e8d4" stroke="#82b366" />
<rect x="400" y="470" width="146" height="34" rx="6" fill="#fff2cc" stroke="#d6b656" />
<rect x="576" y="470" width="150" height="34" rx="6" fill="#e1d5e7" stroke="#9673a6" />
<rect x="756" y="470" width="160" height="34" rx="6" fill="#f8cecc" stroke="#b85450" />
<text x="121" y="491" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a3a5c">Latência</text>
<text x="297" y="491" text-anchor="middle" font-size="12" font-weight="bold" fill="#1b5e20">Throughput</text>
<text x="473" y="491" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6200">Data Drift</text>
<text x="651" y="491" text-anchor="middle" font-size="12" font-weight="bold" fill="#4a235a">Model Accuracy</text>
<text x="836" y="491" text-anchor="middle" font-size="12" font-weight="bold" fill="#8a1c1c">A/B Results</text>
</g>
</g>
</svg>

## Feature store: o cache que ML ama

Uma feature é um dado processado que o modelo usa como input. Exemplo: pra um modelo de fraude, features podem ser "total de transações nas últimas 24h", "média de valor por transação", "número de países diferentes".

O problema: calcular essas features em tempo real a cada request é caro. Feature store resolve isso separando o jogo em duas camadas: um storage offline pra treino e backfill, e um storage online de baixa latência pro request path.

```
Sem feature store:
Request → query 5 tabelas SQL → calcular agregações → normalizar → modelo
(latência: 500ms+ só pra montar o input)

Com feature store:
Request → lookup no Redis/cache → modelo
(latência: 5ms pra montar o input)
```

Na prática, muita arquitetura usa um par: Delta/Parquet/SQL no offline store e Redis no online store. O ponto importante é manter a mesma lógica de feature nos dois lados. Senão você ganha training-serving skew de brinde.

### Na prática com Azure

```bash
# Azure ML managed feature store ou Redis como feature store

# Opção 1: Redis pra features online
az redis create \
  --name ml-feature-store \
  --resource-group rg-ml-prod \
  --location eastus2 \
  --sku Standard \
  --vm-size c1

# Pipeline que pre-computa features e popula Redis
# Roda em schedule (a cada hora, por exemplo)
```

```python
import os
import json
import redis

redis_client = redis.Redis(
    host="ml-feature-store.redis.cache.windows.net",
    port=6380,
    ssl=True,
    password=os.environ["REDIS_KEY"],
    decode_responses=True
)

# Escrever features (batch job, roda periodicamente)
def update_user_features(user_id, features):
    redis_client.set(f"features:user:{user_id}", json.dumps(features), ex=86400)

# Ler features (online, no request path)
def get_user_features(user_id):
    data = redis_client.get(f"features:user:{user_id}")
    return json.loads(data) if data else None
```

## Model serving: como colocar o modelo atrás de uma API

Existem três padrões principais:

### 1. Model-as-a-Service (API externa)

Usar Azure OpenAI, GPT-4o, Claude via API. Você não hospeda o modelo.

- **Prós**: zero ops, escala automática, sempre atualizado
- **Contras**: latência de rede, custo por token, vendor lock-in, menos controle sobre runtime e tuning
- **Quando**: LLMs, modelos gerais, prototipação

### 2. Model-in-Container (self-hosted)

Empacotar o modelo num container e servir via API própria.

```dockerfile
# Dockerfile pra serving com FastAPI
FROM python:3.11-slim

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY model/ /app/model/
COPY serve.py /app/

WORKDIR /app
CMD ["uvicorn", "serve:app", "--host", "0.0.0.0", "--port", "8000"]
```

```python
# serve.py
from fastapi import FastAPI
import pickle
import numpy as np

app = FastAPI()

# Carregar modelo na inicialização (cold start)
with open("model/fraud_detector_v3.pkl", "rb") as f:
    model = pickle.load(f)

@app.post("/predict")
async def predict(features: dict):
    input_array = np.array([features["values"]])
    prediction = model.predict_proba(input_array)[0]
    return {"fraud_probability": float(prediction[1])}

@app.get("/health")
async def health():
    return {"status": "healthy", "model_version": "v3"}
```

```bash
# Deploy no Azure Container Apps
az containerapp create \
  --name ml-fraud-api \
  --resource-group rg-ml-prod \
  --environment ml-apps-env \
  --image acr-ml.azurecr.io/fraud-model:v3 \
  --ingress external \
  --target-port 8000 \
  --cpu 2 --memory 4Gi \
  --min-replicas 2 \
  --max-replicas 10 \
  --scale-rule-name http-rule \
  --scale-rule-type http \
  --scale-rule-http-concurrency 50
```

- **Prós**: controle total, dados ficam no seu ambiente, custo previsível
- **Contras**: ops overhead, cold start, precisa gerenciar scaling
- **Quando**: modelos menores (sklearn, XGBoost), requisitos de compliance, latência ultra-baixa

### 3. GPU Inference Server (modelos grandes)

Pra LLMs open-source ou modelos grandes que precisam de GPU.

```yaml
# endpoint.yml
$schema: https://azuremlschemas.azureedge.net/latest/managedOnlineEndpoint.schema.json
name: meu-llm-endpoint
auth_mode: key
```

```bash
az ml online-endpoint create \
  --file endpoint.yml \
  --resource-group rg-ml-prod \
  --workspace-name ml-workspace
```

```yaml
# llama-deployment.yml
$schema: https://azuremlschemas.azureedge.net/latest/managedOnlineDeployment.schema.json
name: llama-deployment
endpoint_name: meu-llm-endpoint
model: azureml://registries/azureml-meta/models/Meta-Llama-3-8B-Instruct/versions/2
instance_type: Standard_NC24ads_A100_v4
instance_count: 1
```

```bash
# Azure ML Online Endpoint com GPU
az ml online-deployment create \
  --name llama-deployment \
  --endpoint-name meu-llm-endpoint \
  --file llama-deployment.yml \
  --all-traffic \
  --resource-group rg-ml-prod \
  --workspace-name ml-workspace
```

- **Prós**: modelos open-source, customização total, sem custo por token
- **Contras**: GPU caro, cold start longo (minutos), ops complexa
- **Quando**: fine-tuned models, requisitos de privacidade extremos, volume alto que justifica o custo fixo

## A/B testing: canary deployment pra modelos

Quando lança uma nova versão do modelo, você não vai all-in. Rota uma porcentagem do tráfego pra nova versão e compara métricas.

```bash
# Azure ML: traffic split entre versões
az ml online-endpoint update \
  --name meu-endpoint \
  --resource-group rg-ml-prod \
  --workspace-name ml-workspace \
  --traffic "model-v2=90 model-v3=10"

# Depois de validar que v3 é melhor:
az ml online-endpoint update \
  --name meu-endpoint \
  --resource-group rg-ml-prod \
  --workspace-name ml-workspace \
  --traffic "model-v3=100"
```

Métricas pra comparar durante A/B:
- **Qualidade do modelo**: accuracy, precision/recall, ou a métrica de negócio equivalente
- **Latência**: v3 é mais lento? Modelos maiores costumam ser
- **Business metrics**: taxa de conversão, falsos positivos em fraude, abandono, SLA

Se o ground truth chega atrasado, use proxies online durante o canary e confirme a qualidade real depois, quando os labels aparecerem.

## Data drift: quando produção diverge do treinamento

O modelo foi treinado com dados de 2024. Estamos em 2026. O comportamento dos usuários mudou. Isso é data drift, e faz o modelo degradar silenciosamente.

Pensa em configuration drift: seu servidor era Ubuntu 22.04 no deploy, mas 6 meses depois tem pacotes diferentes, configs modificadas manualmente. Mesma ideia.

### Detectando drift

```python
from scipy.stats import ks_2samp
import numpy as np

def detect_drift(training_distribution, production_distribution, threshold=0.05):
    """Detecta drift usando Kolmogorov-Smirnov test."""
    statistic, p_value = ks_2samp(training_distribution, production_distribution)
    
    drifted = p_value < threshold
    return {
        "drifted": drifted,
        "statistic": statistic,
        "p_value": p_value
    }

# Exemplo: feature "transaction_amount" 
training_amounts = [50, 75, 100, 45, 200, ...]  # distribuição no treinamento
production_amounts = [500, 750, 1000, 450, ...]  # distribuição atual (inflação?)

result = detect_drift(training_amounts, production_amounts)
# {"drifted": True, "statistic": 0.82, "p_value": 0.0001}
# Alerta: feature mudou significativamente!
```

KS funciona bem pra features numéricas contínuas. Pra categóricas, eu costumo olhar chi-square, PSI ou Jensen-Shannon.

### Monitorando em produção

```yaml
# Trecho adicionado ao YAML existente do deployment
data_collector:
  sampling_rate: 0.1
  collections:
    request:
      enabled: true
    response:
      enabled: true
```

```bash
# Azure ML: atualizar o deployment com o YAML completo já contendo data_collector
az ml online-deployment update \
  --name model-v3 \
  --endpoint-name meu-endpoint \
  --file model-v3.yml \
  --resource-group rg-ml-prod \
  --workspace-name ml-workspace
```

## Batch vs Real-time inference

| Aspecto | Real-time (online) | Batch (offline) |
|---------|-------------------|-----------------|
| Latência | < 200ms | Minutos/horas |
| Trigger | Request HTTP | Schedule/evento |
| Scaling | Auto-scale por RPS | Scale por volume de dados |
| Custo | Pay per request/uptime | Pay per compute time |
| Exemplo | Fraude em transação | Score de crédito mensal |
| Infra | Container + GPU/CPU always-on | Spark job, Azure ML pipeline |

Na prática, muitos sistemas usam ambos:
- Batch pra pre-computar scores e popular feature store
- Real-time pra scoring final com features fresh

## Model registry: o container registry do ML

Assim como você versiona imagens Docker no ACR, modelos são versionados num registry.

```bash
# Registrar modelo no Azure ML
az ml model create \
  --name fraud-detector \
  --version 3 \
  --path ./model_artifacts/ \
  --resource-group rg-ml-prod \
  --workspace-name ml-workspace \
  --description "Fraud detection model v3. Trained on 2024Q4 data. AUC: 0.94"

# Listar versões
az ml model list \
  --name fraud-detector \
  --resource-group rg-ml-prod \
  --workspace-name ml-workspace \
  --output table
```

Cada versão tem metadata: quem treinou, com quais dados, quais métricas obteve, qual o hash dos artifacts. Rollback é simplesmente apontar o endpoint pra versão anterior.

## O que levar pra segunda-feira

- **ML em produção é 90% infra, 10% ML.** Feature stores, APIs, monitoring, CI/CD. Tudo que você já sabe.
- **Quando há features caras no request path, feature store vira o cache layer mais importante.** Sem ele, a latência de inference sobe rápido.
- **Model serving segue os mesmos patterns** de qualquer API: health checks, autoscaling, blue-green deploys. A diferença é cold start mais longo e uso de GPU.
- **A/B testing é canary deployment.** Mesma lógica, métricas diferentes (accuracy vs latência).
- **Data drift é silent killer.** Monitore as distribuições de input, não só métricas de infra.

O próximo post entra em **como AI Agents funcionam por dentro**: loop, tools, custo e guardrails.

## Leitura complementar

- [Machine Learning System Design 101](https://lnkd.in/dFGuMknJ) (Neo Kim, System Design Newsletter)
- [Azure ML endpoints documentation](https://learn.microsoft.com/azure/machine-learning/concept-endpoints)
- [Designing Machine Learning Systems](https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/) (Chip Huyen, O'Reilly)

