---
slug: "troubleshooting-playbook-os-incidentes-que-vao-te-acordar-as-2am"
translationKey: "2026/06/23/troubleshooting-playbook-incidents-that-will-wake-you-at-2am"
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

Décimo segundo post da série. No [anterior](/azure-openai-em-producao-tokens-throughput-e-alta-disponibilidade/), operamos Azure OpenAI com HA e retry decente. Agora vem a parte menos charmosa: quando o diagrama bonito encosta na vida real.

Este post está organizado em cenários reais de falha. Cada um segue: **Sintomas → Diagnóstico → Root cause → Resolução → Prevenção**. Leia uma vez pra formar repertório. Depois deixa salvo. Você ainda vai voltar aqui.

**tl;dr:** Este playbook cobre cinco falhas comuns em workloads de AI: driver, CUDA OOM, pod Pending, 429 e latência. A meta é reduzir o tempo entre sintoma, hipótese e ação segura.

## Cenário 1: NVIDIA driver crash após kernel update

### Sintomas

Segunda de manhã. O time de ML avisa que todos os workloads com GPU falharam no fim de semana. Ninguém fez deploy. Você entra por SSH:

```bash
$ nvidia-smi
NVIDIA-SMI has failed because it couldn't communicate with the NVIDIA driver.
Make sure that the latest NVIDIA driver is installed and running.
```

Container com GPU não sobe. Job de treino morreu. A VM parece saudável, e carga de CPU continua rodando normalmente.

### Diagnóstico

```bash
# Verificar se o módulo do driver existe para o kernel atual
modinfo nvidia
# modinfo: ERROR: Module nvidia not found.

# Kernel atual
uname -r
# 6.5.0-44-generic

# Verificar o estado do DKMS
dkms status | grep nvidia
# nvidia/535.183.01: added

# O que aconteceu
grep -A 5 "linux-image" /var/log/apt/history.log
# unattended-upgrade instalou um kernel novo
```

### Root cause

O `unattended-upgrades` do Ubuntu instalou um kernel novo sozinho. O módulo do driver NVIDIA precisa existir para a versão do kernel que está em execução. Se o DKMS ou a extensão de driver não recompilar direito, a VM volta com o kernel novo e sem um módulo NVIDIA compatível.

### Resolução

```bash
# Opção A: reinstalar a extensão de driver (VMs Azure)
az vm extension set \
  --resource-group myRG \
  --vm-name myGPUVM \
  --name NvidiaGpuDriverLinux \
  --publisher Microsoft.HpcCompute \
  --version 1.9

# Opção B: segurar a versão do kernel e reinstalar o driver
sudo apt-mark hold linux-image-$(uname -r) linux-headers-$(uname -r)
sudo apt install --reinstall nvidia-driver-535
sudo reboot
```

### Prevenção

Desabilite upgrade automático de kernel nas VMs com GPU. Adicione isto em `/etc/apt/apt.conf.d/50unattended-upgrades`:

```
Unattended-Upgrade::Package-Blacklist {
    "linux-image";
    "linux-headers";
    "linux-modules";
};
```

Use a Azure NVIDIA GPU Driver Extension pra gerenciar o ciclo de vida do driver e trate upgrade de kernel como manutenção planejada.

> **Essa falha é silenciosa.** A VM sobe, responde a SSH e passa health check. Só a parte de GPU morre. Se você não monitora `nvidia-smi`, descobre quando alguém começa a reclamar.

## Cenário 2: CUDA Out of Memory durante fine-tuning

### Sintomas

O job de fine-tuning começa bem, roda de 10 a 30 minutos e cai:

```
RuntimeError: CUDA out of memory. Tried to allocate 2.00 GiB
(GPU 0; 79.15 GiB total capacity; 77.42 GiB already allocated;
1.08 GiB free; 78.50 GiB reserved in total by PyTorch)
```

"Mas funcionou nos primeiros 500 steps."

### Diagnóstico

```bash
# Monitoramento contínuo de memória da GPU
watch -n 1 nvidia-smi

# Log de memória para análise
nvidia-smi --query-gpu=timestamp,memory.used,memory.free,utilization.gpu \
  --format=csv -l 5 > gpu_memory.csv
```

Calcule a memória esperada para um modelo 7B com Adam em BF16:

| Componente | Memória |
|-----------|---------|
| Parâmetros (BF16) | ~14 GB |
| Gradientes (BF16) | ~14 GB |
| Estados do otimizador (FP32, Adam) | ~56 GB |
| Ativações | Varia com o batch |
| **Mínimo total** | **~84 GB + ativações** |

### Root cause

O batch size estava em 8. No começo do treino, as sequências curtas do dataset geravam ativações menores. Quando o data loader chegou nas sequências longas, a memória de ativação cresceu até bater no limite. O OOM não apareceu no step 1 porque os primeiros batches cabiam.

### Resolução

```python
# Correção imediata: reduzir batch size e manter batch efetivo com acumulação
training_args = TrainingArguments(
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
)

# Correção melhor: gradient checkpointing troca mais compute por menos memória
model.gradient_checkpointing_enable()

# Para modelos maiores: LoRA treina uma fração pequena dos parâmetros
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

- Calcule a memória antes de começar
- Defina `max_seq_length` explicitamente pra segurar o tamanho das ativações
- Use `gradient_accumulation_steps` pra manter batch efetivo alto com batch por GPU menor

> Se o OOM aparece em steps aleatórios, e não sempre no mesmo step, desconfie de sequência com tamanho variável. `max_seq_length`, padding e truncation costumam resolver boa parte da novela.

## Cenário 3: AKS GPU pods presos em Pending

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

A mensagem de taint costuma entregar o problema. Node pools de GPU no AKS normalmente usam `sku=gpu:NoSchedule`. O pod precisa da toleration correspondente.

```bash
# Verificar se também existe problema de quota
az vm list-usage --location eastus -o table | grep -i "Standard NC\|Standard ND"

# Verificar limites de scale do node pool
az aks nodepool show --cluster-name myAKS --resource-group myRG \
  --name gpunp --query '{min:minCount, max:maxCount, current:count}'
```

### Root cause

O pod estava sem a toleration necessária. Para o scheduler, os nodes de GPU eram inelegíveis.

Outras causas comuns:
- Quota de GPU esgotada, então o cluster autoscaler não consegue subir novos nós
- Node pool já no `maxCount`, então o autoscaler até quer escalar, mas não pode

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

Se o problema for quota, descubra primeiro o nome exato da família na região:

```bash
az quota list \
  --scope "/subscriptions/{sub-id}/providers/Microsoft.Compute/locations/eastus" \
  --query "[].{family:name.value,limit:properties.limit.value}" \
  -o table
```

Depois atualize a família certa. Exemplo:

```bash
az quota update \
  --resource-name "standardNDSv2Family" \
  --resource-type dedicated \
  --scope "/subscriptions/{sub-id}/providers/Microsoft.Compute/locations/eastus" \
  --limit-object value=48
```

### Prevenção

- Template todos os pods de GPU com a toleration já embutida
- Crie alerta quando a quota de GPU passar de 80%
- Deixe folga no `maxCount` do autoscaler

> Pod preso em `Pending` não gera log, porque o container nem chegou a existir. Vá em `kubectl describe pod` e leia os eventos. `kubectl logs` não vai te salvar nessa hora.

## Cenário 4: Azure OpenAI 429 storm

### Sintomas

Mais de 30% dos requests começam a voltar com HTTP 429. Usuário reclama de lentidão ou timeout.

```json
{
  "error": {
    "code": "429",
    "message": "Requests to the ChatCompletions_Create Operation under Azure OpenAI API have exceeded the token rate limit..."
  }
}
```

### Diagnóstico

Olhe o header `Retry-After`:
- `Retry-After: 1` normalmente indica que você passou pouco do limite
- `Retry-After: 30` normalmente indica que você atropelou feio

Alguns SDKs expõem o mesmo sinal como `retry-after-ms`. O recado é o mesmo: recue.

```bash
az monitor metrics list \
  --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{account}" \
  --metrics "TokenTransaction" \
  --interval PT1M \
  --aggregation Total \
  --filter "ModelDeploymentName eq 'gpt-4o-prod'"
```

### Root cause

Deployment Standard com 80K TPM. O lançamento do produto gerou burst acima de 200K TPM. Deployment Standard aplica hard limit. O que passa do limite volta com 429.

### Resolução

1. **Imediato:** implementar exponential backoff com jitter
2. **Curto prazo:** criar um segundo deployment em outra região pra overflow
3. **Longo prazo:** avaliar PTU para carga previsível e alta

### Prevenção

- Arquitetura com múltiplos deployments e lógica explícita de roteamento no APIM
- Alertas em 80% do TPM contratado
- Fila no cliente com noção de tokens antes do envio
- Log de token por request pra prever pico antes de lançamento

## Cenário 5: P99 de inferência disparou

### Sintomas

A latência P99 salta de 200 ms pra 3 segundos. Ninguém fez deploy, ninguém mexeu em config. A frase da vez vira: "a AI tá lenta".

### Diagnóstico

```bash
# GPU ocupada?
nvidia-smi --query-gpu=utilization.gpu,utilization.memory,temperature.gpu \
  --format=csv -l 2

# Container reiniciou?
kubectl get pods -n inference -w
kubectl describe pod model-serve-abc -n inference | grep -A 5 "Last State"

# Cold start? Modelo sendo recarregado?
kubectl logs model-serve-abc -n inference | grep -i "model loaded\|loading model"
# [2024-07-15 08:14:47] Model loaded in 164.2 seconds
```

164 segundos pra carregar modelo não é um detalhe. É restart disfarçado de latência.

Se `Last State` mostrar `OOMKilled`, você já tem um suspeito forte. Se o pod entrou em `CrashLoopBackOff`, o Kubernetes está avisando que o processo morre mais rápido do que a plataforma consegue estabilizar.

### Root cause

1. **Cold start de container:** o pod foi evicted, sofreu node drain ou perdeu spot, então o modelo precisou ser recarregado do Blob Storage
2. **Thermal throttling de GPU:** uso sustentado encosta no limite térmico, o clock cai e a latência sobe junto
3. **Noisy neighbor:** outro pod no mesmo nó está consumindo CPU, memória ou rede que o pipeline de inferência precisava

### Resolução

**Pra cold start:** use init container pra baixar os pesos pra NVMe local antes do serving container subir. Configure readiness probe que só marca `Ready` depois do modelo carregado.

**Pra thermal throttling:** monitore `DCGM_FI_DEV_GPU_TEMP` e alerte antes da temperatura virar problema. Reduzir batch size costuma baixar a pressão sustentada na placa.

**Pra noisy neighbor:** use `nodeSelector` ou taints dedicados pra isolar pods de inferência em nós exclusivos.

### Prevenção

- Readiness probe que verifica modelo carregado, e não só container vivo
- Cache de modelo em NVMe local em vez de baixar do Blob a cada restart
- Monitoramento de temperatura de GPU com alerta proativo
- Pods de inferência em nós dedicados, sem compartilhamento desnecessário

## Leitura complementar

- [NVIDIA GPU Driver Extension for Linux](https://learn.microsoft.com/azure/virtual-machines/extensions/hpccompute-gpu-linux)
- [Azure N-series GPU driver setup for Linux](https://learn.microsoft.com/azure/virtual-machines/linux/n-series-driver-setup)
- [Use GPUs on AKS](https://learn.microsoft.com/azure/aks/use-nvidia-gpu)

## No próximo post

Se esse playbook estiver pronto antes do pager tocar, 2AM vira checklist em vez de caça ao fantasma. Troubleshooting coberto. No próximo, a conversa muda de lado: **AI use cases pra infra teams**. Não é AI como workload. É AI como ferramenta pro seu próprio operacional, de AIOps até análise de logs e capacity planning.
