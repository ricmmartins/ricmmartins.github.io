---
slug: "troubleshooting-playbook-os-incidentes-que-vao-te-acordar-as-2am"
aliases:
  - "/posts/troubleshooting-playbook-os-incidentes-que-vao-te-acordar-as-2am/"
title: "Troubleshooting playbook: os incidentes que vão te acordar às 2AM"
description: "NVIDIA driver crash, CUDA OOM, pods stuck em Pending, 429 storm e latency spikes. Sintomas, diagnóstico, root cause e prevenção pra cada cenário real."
date: 2026-06-06T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - ai
  - infraestrutura
  - azure
  - troubleshooting
  - nvidia
  - kubernetes
  - gpu
  - azure-openai
series:
  - "AI para Engenheiros de Infraestrutura"
---

Décimo segundo post da série. No [anterior](/azure-openai-em-producao-tokens-throughput-e-alta-disponibilidade/), operamos Azure OpenAI com HA e retry correto. Agora: quando as coisas quebram (e vão quebrar).

Este post é organizado como cenários reais de falha. Cada um segue: **Sintomas → Diagnóstico → Root Cause → Resolução → Prevenção**. Leia uma vez pra reconhecimento de padrões. Depois deixe bookmarkado; você vai voltar aqui.

## Cenário 1: NVIDIA driver crash após kernel update

### Sintomas

Segunda de manhã. Time de ML reporta que todos os workloads GPU falharam no fim de semana. Ninguém deployou nada. Você faz SSH:

```bash
$ nvidia-smi
NVIDIA-SMI has failed because it couldn't communicate with the NVIDIA driver.
Make sure that the latest NVIDIA driver is installed and running.
```

Containers GPU não sobem. Training jobs mortos. O VM em si está normal, CPU workloads rodam.

### Diagnóstico

```bash
# Verificar mensagens do kernel
dmesg | grep -i nvidia
# [    4.212] NIST: module nvidia not found in modules.dep

# Kernel atual
uname -r
# 6.5.0-44-generic

# Driver instalado
dpkg -l | grep nvidia-driver
# nvidia-driver-535    535.183.01

# O que aconteceu
cat /var/log/apt/history.log | grep -A 5 "linux-image"
# unattended-upgrade instalou novo kernel
```

### Root cause

`unattended-upgrades` do Ubuntu instalou novo kernel automaticamente. O NVIDIA kernel module é compilado contra uma versão específica. Quando o VM rebootou no novo kernel, não havia módulo NVIDIA correspondente.

### Resolução

```bash
# Opção A: reinstalar driver extension (VMs Azure)
az vm extension set \
  --resource-group myRG \
  --vm-name myGPUVM \
  --name NvidiaGpuDriverLinux \
  --publisher Microsoft.HpcCompute \
  --version 1.9

# Opção B: pinar versão do kernel e reinstalar driver
sudo apt-mark hold linux-image-$(uname -r) linux-headers-$(uname -r)
sudo apt install --reinstall nvidia-driver-535
sudo reboot
```

### Prevenção

Desabilitar upgrades automáticos de kernel em todos os VMs GPU. Adicionar em `/etc/apt/apt.conf.d/50unattended-upgrades`:

```
Unattended-Upgrade::Package-Blacklist {
    "linux-image";
    "linux-headers";
    "linux-modules";
};
```

Usar a Azure NVIDIA GPU Driver Extension pro lifecycle de drivers. Tratar kernel upgrades como planned maintenance.

> **Essa falha é silenciosa.** O VM boota normal, passa health checks, responde a SSH. Só workloads GPU falham. Se você não monitora output do `nvidia-smi`, só descobre quando usuários reclamam.

## Cenário 2: CUDA Out of Memory durante fine-tuning

### Sintomas

Job de fine-tuning começa bem, roda 10-30 minutos, então crasheia:

```
RuntimeError: CUDA out of memory. Tried to allocate 2.00 GiB
(GPU 0; 79.15 GiB total capacity; 77.42 GiB already allocated;
1.08 GiB free; 78.50 GiB reserved in total by PyTorch)
```

"Mas funcionou nos primeiros 500 steps."

### Diagnóstico

```bash
# Monitoramento contínuo de memória GPU
watch -n 1 nvidia-smi

# Log de memória pra análise
nvidia-smi --query-gpu=timestamp,memory.used,memory.free,utilization.gpu \
  --format=csv -l 5 > gpu_memory.csv
```

Calcular memória esperada (modelo 7B com Adam em BF16):

| Componente | Memória |
|-----------|---------|
| Parameters (BF16) | ~14 GB |
| Gradients (BF16) | ~14 GB |
| Optimizer States (FP32, Adam) | ~56 GB |
| Activations (varia com batch) | Variável |
| **Mínimo total** | **~84 GB + activations** |

### Root cause

Batch size = 8. No início do training, sequências curtas no dataset produziram tensors de activation pequenos. Conforme o data loader alcançou sequências mais longas, memória de activation cresceu até exceder o que sobrava na GPU. OOM não aconteceu no step 1 porque os primeiros batches cabiam.

### Resolução

```python
# Fix imediato: reduzir batch size, manter effective batch com accumulation
training_args = TrainingArguments(
    per_device_train_batch_size=2,       # Reduzido de 8
    gradient_accumulation_steps=4,        # Mantém effective batch = 8
)

# Fix melhor: gradient checkpointing (troca 20-30% velocidade por 60-80% menos memória)
model.gradient_checkpointing_enable()

# Pra modelos maiores: LoRA (treina <1% dos parâmetros)
from peft import LoraConfig, get_peft_model

lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# trainable params: 6.5M || all params: 6.74B || trainable%: 0.096%
```

### Prevenção

- Sempre calcular memória requerida antes de iniciar
- Setar `max_seq_length` explicitamente pra limitar activation memory
- Usar `gradient_accumulation_steps` pra manter effective batch com per-GPU batch pequeno

> Se OOM acontece em steps aleatórios (não consistentemente no step N), suspeite de sequências de comprimento variável. Sete `max_seq_length` e pad/truncate.

## Cenário 3: AKS GPU pods stuck em Pending

### Sintomas

```bash
$ kubectl get pods -n ml-team
NAME                        READY   STATUS    RESTARTS   AGE
training-job-7b-xyz         0/1     Pending   0          20m
```

### Diagnóstico

```bash
$ kubectl describe pod training-job-7b-xyz -n ml-team
Events:
  Warning  FailedScheduling  18m   0/12 nodes are available:
    3 node(s) had untolerated taint {sku=gpu:NoSchedule},
    9 node(s) didn't match Pod's node affinity/selector.
```

A mensagem de taint é a chave. AKS GPU node pools aplicam `sku=gpu:NoSchedule` por default. Pod precisa toleration correspondente.

```bash
# Verificar se é problema de quota
az vm list-usage --location eastus -o table | grep -i "Standard NC\|Standard ND"

# Verificar limites de scaling do node pool
az aks nodepool show --cluster-name myAKS --resource-group myRG \
  --name gpunp --query '{min:minCount, max:maxCount, current:count}'
```

### Root cause

Pod spec sem a toleration necessária. Scheduler vê GPU nodes como ineligíveis.

Outras causas comuns:
- GPU quota esgotada (cluster autoscaler não consegue provisionar novos nós)
- Node pool no `maxCount` (autoscaler quer escalar mas não pode)

### Resolução

```yaml
# Adicionar toleration no pod spec
spec:
  tolerations:
    - key: "sku"
      operator: "Equal"
      value: "gpu"
      effect: "NoSchedule"
  containers:
    - name: training
      resources:
        limits:
          nvidia.com/gpu: 1
```

Se quota é o problema:

```bash
az quota create \
  --resource-name "StandardNDSv2Family" \
  --scope "/subscriptions/{sub-id}/providers/Microsoft.Compute/locations/eastus" \
  --limit-object value=48 limit-object-type=LimitValue
```

### Prevenção

- Template todos os pod specs GPU com toleration pré-configurada
- Alertas em 80% do uso de GPU quota
- Configurar cluster autoscaler com headroom no `maxCount`

> Pod stuck em Pending não produz logs, porque não existe container. Sempre cheque `kubectl describe pod` pra events, não `kubectl logs`.

## Cenário 4: Azure OpenAI 429 storm

### Sintomas

30%+ dos requests retornando HTTP 429. Usuários reportam lentidão ou timeouts.

```json
{
  "error": {
    "code": "429",
    "message": "Requests to the ChatCompletions_Create Operation under Azure OpenAI API have exceeded the token rate limit..."
  }
}
```

### Diagnóstico

Verifique o header `Retry-After`:
- `Retry-After: 1` = excedeu por pouco
- `Retry-After: 30` = dramaticamente acima do limite

```bash
az monitor metrics list \
  --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{account}" \
  --metric "TokenTransaction" \
  --interval PT1M \
  --aggregation Total \
  --filter "ModelDeploymentName eq 'gpt-4o-prod'"
```

### Root cause

Deployment Standard com 80K TPM. Product launch gerou burst de 200K+ TPM. Standard enforça hard rate limits; todo request acima recebe 429.

### Resolução

1. **Imediato:** Implementar exponential backoff com jitter (código no post anterior)
2. **Curto prazo:** Segundo deployment em outra região pra overflow
3. **Longo prazo:** Avaliar PTU pra workloads previsíveis e de alto volume

### Prevenção

- Arquitetura multi-deployment com APIM fazendo load balancing
- Alertas em 80% do TPM provisionado
- Token-aware queue no client (estimar tokens antes de enviar)
- Logging de token count por request pra forecast antes de launches

## Cenário 5: Inference latency spike

### Sintomas

P99 latência pula de 200ms pra 3 segundos. Nenhum deployment, nenhuma mudança de config. "A AI tá lenta."

### Diagnóstico

```bash
# GPU occupada?
nvidia-smi --query-gpu=utilization.gpu,utilization.memory,temperature.gpu \
  --format=csv -l 2

# Container restartou?
kubectl get pods -n inference -w
kubectl describe pod model-serve-abc -n inference | grep -A 5 "Last State"

# Cold start? (modelo sendo recarregado)
kubectl logs model-serve-abc -n inference | grep -i "model loaded\|loading model"
# [2024-07-15 08:14:47] Model loaded in 164.2 seconds
```

164 segundos de model load = quase 3 minutos de latency hole a cada restart.

### Root cause (geralmente uma combinação)

1. **Container cold start:** Pod evicted (OOM, node drain, spot reclaim), modelo recarregando de Blob Storage (14+ GB over network)
2. **GPU thermal throttling:** 100% utilização sustentada → temperatura > 83°C → clock reduction automático
3. **Noisy neighbor:** Outro pod no mesmo nó consumindo CPU/memória/rede necessária pra pre/post-processing

### Resolução

**Pra cold starts:** init container que baixa model weights pra NVMe local antes do serving container iniciar. Readiness probe que só marca ready após modelo carregado.

**Pra thermal throttling:** monitorar `DCGM_FI_DEV_GPU_TEMP` e alertar acima de 78°C. Reduzir batch size pra diminuir utilização sustentada.

**Pra noisy neighbor:** usar `nodeSelector` ou taints dedicados pra isolar inference pods em nós exclusivos.

### Prevenção

- Readiness probe que verifica model loaded (não apenas container up)
- Cache de modelo em local NVMe (não download do Blob a cada start)
- Monitoring de temperatura GPU com alertas proativos
- Pods de inference em nós dedicados sem sharing

## No próximo post

Troubleshooting coberto. No próximo, saímos do operacional pra algo mais amplo: **AI use cases pra infra teams**. Como usar AI pra melhorar o seu próprio trabalho de infraestrutura, desde AIOps até análise de logs e capacity planning preditivo.
