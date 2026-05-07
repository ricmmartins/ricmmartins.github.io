---
slug: "glossario-visual-infra-ai-sua-pedra-de-roseta"
translationKey: "2026/07/05/visual-glossary-infra-ai-your-rosetta-stone"
aliases:
  - "/posts/glossario-visual-infra-ai-sua-pedra-de-roseta/"
title: "Glossário visual infra ↔ AI: sua Pedra de Roseta"
description: "Todo termo de AI mapeado pra um conceito de infraestrutura que você já conhece. De 'model' a 'ZeRO', com analogias práticas e contexto de quando cada um aparece no seu trabalho."
date: 2026-06-18T10:00:00-04:00
categories:
  - AI
  - Azure
tags:
  - ai
  - infraestrutura
  - glossario
  - referencia
series:
  - "AI para Engenheiros de Infraestrutura"
---

Último post da série. No [anterior](/framework-de-adocao-ai-do-entusiasmo-a-governanca/), construímos o framework de adoção de 6 fases. Agora: seu quick-reference card permanente.

Você já fala infraestrutura fluentemente. AI não é uma língua estrangeira; é um dialeto. Este glossário mapeia cada termo de AI pra algo que você já entende.

## Como usar

Toda entrada tem: o **termo AI**, a **analogia de infra** entre parênteses, uma **definição concisa**, e **quando você vai encontrar isso** no seu trabalho. Organizado em 6 categorias. Pin essa página.

## Core AI concepts

| Termo AI | Analogia de infra | Definição | Quando aparece |
|----------|-------------------|-----------|----------------|
| **Model** | Binary compilado | O artefato treinado, deployável pra servir predictions. Contém os parâmetros aprendidos. | Managing deployments, versionando artefatos, sizing storage (modelos vão de MBs a centenas de GBs) |
| **Training** | Batch job | Processo de ensinar o modelo alimentando dados e ajustando parâmetros. Long-running, GPU-intensivo. | Provisionando GPU clusters, estimando duração de jobs, planejando bursts de compute |
| **Inference** | API endpoint | Rodar um modelo treinado com dados novos pra gerar respostas. Real-time, latency-sensitive. | Toda vez que um user ou sistema chama um serviço AI. É o workload de produção que você monitora e escala |
| **LLM** | Serviço API especializado (text-in, text-out) | Foundation model treinado em corpus massivo de texto pra entender e gerar linguagem humana. GPT-4, Claude, LLaMA. | Deployando endpoints Azure OpenAI, sizing token quotas, planejando capacidade |
| **Fine-tuning** | Customização de configuração | Adaptar modelo pré-treinado pro seu domínio treinando com seus dados. | Quando times precisam que modelo entenda terminologia interna ou processos específicos |
| **Foundation Model** | Base image / golden image | Modelo grande e pré-treinado (GPT-4, LLaMA, Mistral) pra ser adaptado pra muitas tarefas downstream. | Selecionando qual base model deployar ou fine-tunar. É o artefato inicial na maioria dos projetos AI |
| **Parameters / Weights** | Valores de configuração | Os valores numéricos internos que definem como o modelo processa input e gera output. GPT-4 tem trilhões. | Sizing infra: mais parâmetros = mais memória, mais compute, mais storage |
| **Epoch** | Ciclo de backup completo | Uma passada completa por todo o dataset de training. Modelos tipicamente treinam por dezenas a centenas de epochs. | Estimando duração e custo de training jobs |
| **Batch Size** | Chunk size | Número de amostras processadas antes de atualizar pesos. Maior = mais GPU memory, mais eficiente. | Tuning training jobs e troubleshooting OOM errors (reduzir batch size é geralmente o primeiro fix) |
| **Transfer Learning** | Reuso de template | Usar modelo pré-treinado em uma tarefa como ponto de partida pra outra, preservando conhecimento aprendido. | Quando times querem resultados mais rápido e barato partindo de um foundation model |

## Data e storage

| Termo AI | Analogia de infra | Definição | Quando aparece |
|----------|-------------------|-----------|----------------|
| **Dataset** | Data source / storage volume | Dados estruturados ou não usados pra treinar, validar ou testar um modelo. GBs a PBs. | Provisionando storage, planejando pipelines de dados, gerenciando access controls |
| **Embedding** | Hash / index key | Representação numérica vetorial de texto/imagens que captura significado semântico. Habilita similarity search. | Deployando RAG architectures, sizing vector databases |
| **Tokenization** | Serialização | Quebrar texto em unidades menores (tokens) que o modelo processa. Similar a serialização de objetos. | Calculando custos (paga por token), estimando context window usage, otimizando prompts |
| **Vector Database** | Search index | Database especializado que armazena embeddings e busca por similaridade (nearest-neighbor). | Deployando RAG, provisionando Azure AI Search com vector capabilities |
| **Feature Store** | Caching layer pra ML inputs | Repositório centralizado de features pré-computadas pra training e inference. | Arquitetando ML platforms que precisam de acesso low-latency a features |
| **Data Drift** | Schema change / distribuição de input mudou | Quando propriedades estatísticas dos dados de produção divergem dos dados de training. Degrada accuracy. | Model performance degrada sem code changes. O assassino silencioso de ML accuracy |

## Compute e hardware

| Termo AI | Analogia de infra | Definição | Quando aparece |
|----------|-------------------|-----------|----------------|
| **GPU** | Coprocessador | Processador projetado pra computação paralela massiva, offloading matrix math da CPU. | Em todo lugar em AI infra: provisioning VM SKUs, monitoring utilization, managing costs |
| **CUDA** | GPU instruction set / SDK | Plataforma de parallel computing da NVIDIA que permite código executado em GPUs. | Instalando drivers, configurando containers GPU, troubleshooting "CUDA out of memory" |
| **HBM** | GPU RAM | Memória high-bandwidth empilhada no die do GPU. A100 tem 80 GB HBM2e. | Selecionando GPU SKUs: HBM capacity determina model size máximo que uma GPU suporta |
| **InfiniBand** | High-speed node-to-node networking | Interconnect ultra-low-latency e high-bandwidth pra distributed training. Muito mais rápido que Ethernet. | Provisionando multi-node GPU clusters (ND-series VMs) pra training jobs grandes |
| **NVLink** | GPU-to-GPU interconnect | Link high-speed conectando GPUs dentro de um único nó. ~10x a bandwidth de PCIe. | Sizing multi-GPU VMs: GPUs com NVLink compartilham dados rápido o suficiente pra agir como unified memory |
| **Tensor Core** | Unidade especializada de matrix math | Hardware dedicado em GPUs NVIDIA otimizado pra operações matrix multiply-and-accumulate que dominam AI. | Avaliando gerações de GPU: Tensor Cores são por que A100 é dramaticamente mais rápido pra AI que gaming GPU |

## Model operations

| Termo AI | Analogia de infra | Definição | Quando aparece |
|----------|-------------------|-----------|----------------|
| **Checkpoint** | Snapshot / backup | Cópia salva do estado do modelo durante training: weights, optimizer state, progresso. | Gerenciando storage (checkpoints podem ter dezenas de GBs cada), desenhando training fault-tolerant |
| **Gradient** | Error signal | Valor matemático indicando direção e magnitude dos ajustes de pesos pra reduzir erro. | Troubleshooting training instability: "exploding gradients" e "vanishing gradients" |
| **Hyperparameter** | Config value tunável | Valor setado antes do training que controla o processo: learning rate, batch size, layers. Como thread count ou pool size. | Quando data scientists pedem múltiplos training runs com configs diferentes: cada combo é um job separado |
| **MLOps** | DevOps pra modelos | Aplicar práticas DevOps (CI/CD, versioning, monitoring, automação) ao lifecycle de ML. | Construindo ML platforms, desenhando model deployment pipelines |
| **Model Registry** | Container registry pra modelos | Repositório versionado pra armazenar e gerenciar artefatos de modelo treinado. | Implementando MLOps pipelines que precisam versionar, promover e rollback model deployments |

## Deployment e serving

| Termo AI | Analogia de infra | Definição | Quando aparece |
|----------|-------------------|-----------|----------------|
| **Prompt** | API request body | Input de texto enviado ao modelo pra guiar output: instruções, contexto, exemplos, pergunta. | Toda interação com LLM. Prompt design impacta qualidade, token consumption e custo |
| **Completion** | API response body | Output gerado pelo modelo em resposta a um prompt. | Parsing responses, calculando output token costs, monitoring qualidade |
| **Context Window** | Tamanho máximo de request payload | Máximo de tokens que modelo processa em um request (prompt + completion combinados). | Desenhando prompts e RAG systems: exceder context window trunca input ou causa erros |
| **Inference Endpoint** | API endpoint servindo predictions | Modelo deployado exposto como HTTP API que aceita input e retorna predictions. | Provisionando, escalando e monitorando o serviço AI production-facing |
| **PTU** | Reserved capacity (como reserved instances) | Capacidade de compute pré-alocada e garantida pra modelos Azure OpenAI. Latência e throughput consistentes. | Quando workloads precisam de performance previsível: PTU elimina throttling a custo fixo |
| **RAG** | Enriquecimento dinâmico de prompt com dados externos | Pattern que busca documentos relevantes de uma knowledge base e injeta no prompt antes da geração. | Construindo soluções enterprise AI que precisam responder usando dados específicos e atualizados |
| **TPM** | Bandwidth / throughput quota | Máximo de tokens processados por minuto pra um deployment. Principal métrica de throughput pra LLM endpoints. | Sizing deployments, estimando custos, diagnosticando throttling |
| **RPM** | Request rate limit | Máximo de API calls por minuto pra um deployment. Independente de token quotas. | Capacity planning e troubleshooting HTTP 429 |

## Advanced concepts

| Termo AI | Analogia de infra | Definição | Quando aparece |
|----------|-------------------|-----------|----------------|
| **Data Parallelism** | Sharding data across GPUs | Estratégia onde dataset é dividido entre GPUs, cada uma processando batch diferente com cópia completa do modelo. | Escalando training pra múltiplas GPUs. Abordagem mais simples de distributed training |
| **Model Parallelism** | Sharding modelo across GPUs | Dividir modelo em múltiplas GPUs quando não cabe na memória de uma só. Cada GPU segura parte das layers. | Deployando modelos muito grandes (70B+ parâmetros) que excedem HBM de uma GPU |
| **LoRA** | Fine-tuning lightweight | Técnica que treina uma adapter layer pequena (~1-2% dos parâmetros) em vez do modelo inteiro. | Quando times querem customizar foundation model sem custo de full fine-tuning |
| **Mixed Precision** | Otimização de data type variável | Training com mix de FP32 e BF16/FP16, usando lower precision onde possível pra reduzir memória e aumentar throughput. | Otimizando training jobs: mixed precision pode quase dobrar throughput em GPUs modernas |
| **Quantization** | Compressão | Reduzir precisão do modelo (FP32 → INT8 ou INT4) pra shrink size e acelerar inference. Troca accuracy pequena por eficiência grande. | Deployando modelos com constraints de custo ou latência: quantization pode cortar memory usage em 4x+ |
| **Prompt Injection** | SQL injection pra AI | Ataque onde input não confiável é crafted pra override instruções do modelo, causando comportamento não intendido. | Securing AI endpoints expostos a user input. A preocupação de segurança #1 pra aplicações LLM |
| **ZeRO** | Memory optimization pra distributed training | Família de técnicas que particiona optimizer states, gradients e parameters entre GPUs pra eliminar redundância. | Training de modelos grandes que não cabem em GPU memory mesmo com data parallelism. Solução padrão em DeepSpeed |

## Quick reference: top 20 termos

Pin esse card. É sua Pedra de Roseta.

| # | Termo AI | Tradução infra |
|---|----------|----------------|
| 1 | **Model** | Binary compilado, output deployável de training |
| 2 | **Training** | Batch job long-running que produz um model |
| 3 | **Inference** | API call real-time contra modelo deployado |
| 4 | **GPU** | Coprocessador que offloads matrix math |
| 5 | **LLM** | Serviço API text-in/text-out |
| 6 | **Prompt** | API request body |
| 7 | **Completion** | API response body |
| 8 | **Token** | Unidade mínima de processamento (paga por token como paga por byte transferido) |
| 9 | **Context Window** | Tamanho máximo de request payload |
| 10 | **Fine-tuning** | Customizar base image com seus dados |
| 11 | **RAG** | Enriquecimento dinâmico de prompt com dados buscados |
| 12 | **Embedding** | Hash/index key numérico pra similarity search |
| 13 | **Checkpoint** | Snapshot/backup de training state |
| 14 | **TPM** | Bandwidth quota (tokens por minuto) |
| 15 | **PTU** | Reserved capacity (como reserved instances) |
| 16 | **CUDA** | GPU SDK/instruction set da NVIDIA |
| 17 | **LoRA** | Fine-tuning lightweight (<1% dos parâmetros) |
| 18 | **MLOps** | DevOps aplicado a model lifecycle |
| 19 | **Data Drift** | Distribuição de input mudou, modelo degrada |
| 20 | **Quantization** | Compressão de modelo (4x menos memória) |

## Encerramento da série

15 posts. Do primeiro conceito (por que engenheiros de infra importam pra AI) até este glossário completo. Se você acompanhou tudo, tem hoje uma base sólida pra operar workloads AI em produção com segurança, eficiência de custo e governança.

O livro completo, em inglês, está disponível gratuitamente em [ai4infra.com](https://www.ai4infra.com). Se preferiu a versão condensada em português com os exemplos práticos desta série, compartilhe com outros profissionais de infra que estão fazendo a transição pra AI.

AI não é uma revolução que substitui o que você sabe. É uma extensão. Seus skills de networking, storage, compute, segurança e automação são exatamente o que projetos AI precisam pra funcionar em produção. A diferença é que agora você tem o vocabulário e os patterns pra conectar os dois mundos.
