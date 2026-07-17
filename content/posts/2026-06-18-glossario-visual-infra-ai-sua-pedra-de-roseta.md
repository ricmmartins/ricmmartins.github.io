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

Último post da série. No [anterior](/framework-de-adocao-ai-do-entusiasmo-a-governanca/), a gente montou o framework de adoção em 6 fases. Agora vem a cola final.

Você já fala infraestrutura com fluência. AI não é idioma alienígena. É um dialeto com nome ruim e sigla demais. Este glossário faz a ponte entre os termos de AI e os conceitos de infra que você já usa todo dia.

**tl;dr:** Use este post como tabela de tradução rápida. Se um termo de AI travar a conversa, volte aqui e mapeie para o equivalente de infra antes de discutir ferramenta ou arquitetura.

## Como usar

Cada entrada tem o **termo de AI**, a **analogia de infra**, uma **definição curta** e **onde isso aparece na prática**. Organizei em 6 blocos pra ficar fácil achar o que interessa sem fingir que você lembra tudo de cabeça.

## Conceitos centrais de AI

| Termo AI | Analogia de infra | Definição | Quando aparece |
|----------|-------------------|-----------|----------------|
| **Model** | Binário compilado | O artefato treinado que você publica pra servir previsões ou respostas. Carrega os parâmetros aprendidos. | Deploy de modelo, versionamento de artefato e dimensionamento de storage |
| **Training** | Batch job | Processo de ensinar o modelo com dados e ajustar parâmetros. É longo e costuma gastar muita GPU. | Provisionamento de cluster com GPU, estimativa de duração de job e planejamento de pico de compute |
| **Inference** | API endpoint | Execução do modelo treinado em dados novos pra gerar resposta ou previsão. | Toda chamada ao serviço em produção. É a parte que você monitora e escala |
| **LLM** | Serviço de texto de propósito geral | Modelo de linguagem treinado em volume grande de texto pra entender e gerar linguagem natural. | Azure OpenAI, planejamento de quota, troubleshooting de token e latência |
| **Fine-tuning** | Customização de configuração | Ajuste de um modelo pré-treinado usando dado do seu domínio. | Quando o time precisa adaptar terminologia, estilo ou tarefa específica |
| **Foundation Model** | Base image | Modelo base, grande e pré-treinado, usado como ponto de partida pra várias tarefas. | Escolha do modelo inicial em quase todo projeto de AI |
| **Parameters / Weights** | Valores de configuração | Valores numéricos internos que definem como o modelo processa entrada e gera saída. Fabricantes muitas vezes não divulgam o total exato. | Conta de memória, compute e storage |
| **Epoch** | Passada completa no dataset | Uma passagem completa por todo o dataset de treino. Em fine-tuning isso aparece bastante; em pretraining grande a conversa costuma ser em tokens. | Estimativa de duração e custo de treino |
| **Batch Size** | Tamanho do lote | Quantidade de amostras processadas antes de atualizar os pesos. Quanto maior, mais memória consome. | Ajuste de treino e troubleshooting de OOM |
| **Transfer Learning** | Reuso de template | Uso de um modelo já treinado como base pra outra tarefa, reaproveitando conhecimento. | Projeto que quer resultado mais rápido sem começar do zero |

## Dados e armazenamento

| Termo AI | Analogia de infra | Definição | Quando aparece |
|----------|-------------------|-----------|----------------|
| **Dataset** | Fonte de dados ou volume | Conjunto de dados estruturados ou não usados pra treinar, validar ou testar um modelo. | Storage, pipeline de dados e controle de acesso |
| **Embedding** | Chave de índice semântico | Representação vetorial de texto, imagem ou outro conteúdo que preserva significado. | RAG, busca por similaridade e banco vetorial |
| **Tokenization** | Serialização | Quebra do texto em tokens que o modelo consegue processar. | Conta de custo, uso de janela de contexto e otimização de prompt |
| **Vector Database** | Índice de busca | Banco especializado em armazenar embeddings e buscar por similaridade. | Arquitetura RAG e Azure AI Search com vetor |
| **Feature Store** | Camada de cache pra features | Repositório centralizado de features pré-computadas pra treino e inferência. | Plataforma de ML com reuso e baixa latência |
| **Data Drift** | Mudança na distribuição de entrada | Quando os dados de produção deixam de parecer com os dados de treino e a qualidade cai. | Modelo degrada sem mudança de código |

## Compute e hardware

| Termo AI | Analogia de infra | Definição | Quando aparece |
|----------|-------------------|-----------|----------------|
| **GPU** | Coprocessador | Processador desenhado pra computação paralela massiva, muito bom em multiplicação de matriz. | Escolha de VM, observabilidade e custo |
| **CUDA** | Plataforma e SDK de GPU | Plataforma de computação paralela da NVIDIA que permite rodar código na GPU. | Driver, container com GPU e troubleshooting de memória |
| **HBM** | RAM da GPU | Memória de alta largura de banda empilhada junto da GPU. Uma A100 de 80 GB usa HBM2e. | Escolha de SKU, porque o tamanho do modelo depende bastante disso |
| **InfiniBand** | Rede de alta velocidade entre nós | Interconexão de baixa latência e alta banda pra treino distribuído. | Cluster multi-node com GPU, em especial em séries ND |
| **NVLink** | Link GPU a GPU | Interconexão rápida entre GPUs do mesmo host. Entrega banda bem maior que PCIe, mas a diferença exata depende da geração. | VM com múltiplas GPUs e workloads com paralelismo de modelo |
| **Tensor Core** | Unidade especializada de multiplicação de matriz | Bloco de hardware da NVIDIA otimizado pra operações que dominam AI. | Comparação entre gerações de GPU |

## Operação de modelos

| Termo AI | Analogia de infra | Definição | Quando aparece |
|----------|-------------------|-----------|----------------|
| **Checkpoint** | Snapshot ou backup | Estado salvo do treino, incluindo pesos, estado do otimizador e progresso. | Retomada de treino e planejamento de storage |
| **Gradient** | Sinal de erro | Valor matemático que aponta direção e magnitude do ajuste necessário nos pesos. | Diagnóstico de instabilidade, como exploding ou vanishing gradients |
| **Hyperparameter** | Config tunável | Valor definido antes do treino, como learning rate ou batch size. | Grade de experimentos e múltiplos runs |
| **MLOps** | DevOps pra modelo | Aplicação de versionamento, CI/CD, observabilidade e automação ao ciclo de vida de ML. | Plataforma de ML e pipeline de promoção de modelo |
| **Model Registry** | Registry de artefato | Repositório versionado pra armazenar e promover modelos treinados. | Rollback, promoção entre ambientes e governança |

## Deploy e serving

| Termo AI | Analogia de infra | Definição | Quando aparece |
|----------|-------------------|-----------|----------------|
| **Prompt** | Corpo do request | Texto enviado ao modelo com instrução, contexto e pergunta. | Toda interação com LLM |
| **Completion** | Corpo da resposta | Saída gerada pelo modelo em resposta ao prompt. | Parsing, custo e avaliação de qualidade |
| **Context Window** | Tamanho máximo do payload | Total de tokens que o modelo consegue processar em uma chamada, somando prompt e resposta. | Desenho de prompt e arquitetura RAG |
| **Inference Endpoint** | API de produção | Endpoint HTTP que recebe entrada e devolve previsão ou texto gerado. | Escala, SLO e observabilidade |
| **PTU** | Capacidade reservada | Capacidade reservada no Azure OpenAI. Dá throughput e latência mais previsíveis dentro da capacidade comprada. | Workload estável que precisa de previsibilidade |
| **RAG** | Enriquecimento dinâmico do prompt | Padrão que busca conteúdo relevante e injeta no prompt antes da geração. | Chat corporativo, busca em documento e AI com dado atualizado |
| **TPM** | Quota de throughput | Máximo de tokens processados por minuto em um deployment. | Sizing, custo e troubleshooting de 429 |
| **RPM** | Quota de requests | Máximo de chamadas por minuto em um deployment. | Capacidade e limitação de taxa |

## Conceitos avançados

| Termo AI | Analogia de infra | Definição | Quando aparece |
|----------|-------------------|-----------|----------------|
| **Data Parallelism** | Sharding de dado entre GPUs | Estratégia em que cada GPU processa um batch diferente com uma cópia completa do modelo. | Escala horizontal de treino |
| **Model Parallelism** | Sharding do modelo | Divisão do modelo entre várias GPUs quando ele não cabe em uma só. | Modelos muito grandes, como 70B ou mais |
| **LoRA** | Fine-tuning leve | Técnica que treina um conjunto pequeno de adaptadores em vez do modelo inteiro. | Customização mais barata de foundation model |
| **Mixed Precision** | Otimização por tipo de dado | Uso combinado de FP32 com BF16 ou FP16 pra reduzir memória e aumentar throughput. | Treino em GPU moderna |
| **Quantization** | Compressão | Redução da precisão numérica do modelo, como FP32 pra INT8 ou INT4, pra baixar custo e acelerar inferência. | Deploy com restrição de memória ou latência |
| **Prompt Injection** | Injeção de instrução maliciosa | Ataque em que entrada não confiável tenta sobrescrever a instrução do sistema e desviar o comportamento do modelo. | Segurança de aplicação com LLM exposto a usuário |
| **ZeRO** | Otimização de memória distribuída | Conjunto de técnicas que reparte estados do otimizador, gradientes e parâmetros entre GPUs pra reduzir redundância. | Treino distribuído com modelo grande demais pra memória disponível |

## Referência rápida: 20 termos

Guarda esse quadro. Ele poupa tempo.

| # | Termo AI | Tradução infra |
|---|----------|----------------|
| 1 | **Model** | Binário treinado e publicável |
| 2 | **Training** | Batch job que produz o modelo |
| 3 | **Inference** | Chamada em tempo real a um modelo publicado |
| 4 | **GPU** | Coprocessador pra matemática paralela |
| 5 | **LLM** | Serviço de texto de propósito geral |
| 6 | **Prompt** | Corpo do request |
| 7 | **Completion** | Corpo da resposta |
| 8 | **Token** | Unidade mínima de processamento e cobrança |
| 9 | **Context Window** | Tamanho máximo do payload |
| 10 | **Fine-tuning** | Ajuste do modelo base com dado do seu domínio |
| 11 | **RAG** | Prompt enriquecido com dado buscado externamente |
| 12 | **Embedding** | Chave vetorial pra busca semântica |
| 13 | **Checkpoint** | Snapshot do treino |
| 14 | **TPM** | Quota de tokens por minuto |
| 15 | **PTU** | Capacidade reservada no Azure OpenAI |
| 16 | **CUDA** | Plataforma e SDK de GPU da NVIDIA |
| 17 | **LoRA** | Fine-tuning com adaptadores pequenos |
| 18 | **MLOps** | DevOps aplicado ao ciclo de vida do modelo |
| 19 | **Data Drift** | Dado de produção mudou e o modelo piorou |
| 20 | **Quantization** | Compressão do modelo pra gastar menos memória |

## Leitura complementar

- [Azure OpenAI API lifecycle](https://learn.microsoft.com/azure/foundry/openai/api-version-lifecycle)
- [Foundry model lifecycle and retirements](https://learn.microsoft.com/azure/foundry/openai/concepts/model-retirements)
- [Azure OpenAI quotas and limits](https://learn.microsoft.com/azure/foundry/openai/quotas-limits)
- [Use GPUs on AKS](https://learn.microsoft.com/azure/aks/use-nvidia-gpu)

## Encerramento da série

Foram 15 posts. Do primeiro conceito, que era por que engenheiro de infra importa pra AI, até este glossário. Se você chegou até aqui, já tem base pra conversar com data scientist, arquiteto, segurança e finanças sem tratar AI como truque de palco.

O livro completo, em inglês, continua disponível de graça em [ai4infra.com](https://www.ai4infra.com). Se esta série em português te poupou algumas horas de tropeço, manda pra outro profissional de infra que caiu em projeto de AI sem ter pedido muito.

AI não apaga o que você já sabe. Ela exige isso. Rede, storage, compute, segurança, automação, custo e resposta a incidente continuam no centro. Agora você só ganhou um vocabulário melhor pra ligar uma coisa na outra.
